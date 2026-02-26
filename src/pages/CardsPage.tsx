import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, getCurrentMonth, Card as CardType, Transaction } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  Plus, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Info,
  Cpu,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { format, parse, addMonths, subMonths, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const CARD_COLORS = [
  '#1e293b', '#ef4444', '#3b82f6', '#22c55e', 
  '#8b5cf6', '#ec4899', '#f97316', '#eab308'
];

export function CardsPage() {
  const { allCards, allTransactions, invoices, getCategoryById, createCard, updateCard, deleteCard, deleteTransaction, allAccounts } = useFinance();
  const { currentUser, users } = useAuth();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  
  // Estado para o diálogo
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    lastDigits: '',
    brand: 'Visa',
    limit: '',
    closingDay: '10',
    dueDay: '20',
    color: CARD_COLORS[0],
    responsibleUserId: currentUser?.id || '',
    defaultAccountId: ''
  });

  const selectedDate = useMemo(() => {
    const d = parse(selectedMonth, 'yyyy-MM', new Date());
    return isValid(d) ? d : new Date();
  }, [selectedMonth]);

  const cardsWithStats = useMemo(() => {
    return allCards.filter(card => card.user_id === currentUser?.id || (card as any).is_shared).map(card => {
      // Filtra transações que pertencem à fatura do mês selecionado
      const currentInvoiceTransactions = allTransactions.filter(t => 
        t.cardId === card.id && 
        t.mesFatura === selectedMonth &&
        t.status !== 'cancelled'
      );

      const totalCurrentInvoice = currentInvoiceTransactions.reduce((sum, t) => {
        if (t.type === 'REFUND') return sum - t.amount;
        return sum + t.amount;
      }, 0);

      const allCardTransactions = allTransactions.filter(t => t.cardId === card.id && t.status !== 'cancelled');
      const totalSpentEver = allCardTransactions.reduce((sum, t) => {
        if (t.type === 'REFUND') return sum - t.amount;
        return sum + t.amount;
      }, 0);

      const totalPaidInInvoices = invoices
        .filter(inv => inv.card_id === card.id)
        .reduce((sum, inv) => sum + inv.paid_amount, 0);

      const totalDebt = totalSpentEver - totalPaidInInvoices;
      const availableLimit = Math.max(0, card.limit - totalDebt);
      const usedPercentage = Math.min((totalDebt / card.limit) * 100, 100);

      return {
        ...card,
        totalCurrentInvoice,
        totalDebt,
        availableLimit,
        usedPercentage,
        transactions: currentInvoiceTransactions
      };
    });
  }, [allCards, allTransactions, invoices, selectedMonth, currentUser]);

  const resetForm = () => {
    setEditingCard(null);
    setFormData({
      name: '',
      lastDigits: '',
      brand: 'Visa',
      limit: '',
      closingDay: '10',
      dueDay: '20',
      color: CARD_COLORS[0],
      responsibleUserId: currentUser?.id || '',
      defaultAccountId: allAccounts[0]?.id || ''
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (card: CardType) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      lastDigits: card.last_digits || '',
      brand: card.brand || 'Visa',
      limit: card.limit.toString(),
      closingDay: card.closing_day.toString(),
      dueDay: card.due_day.toString(),
      color: card.color,
      responsibleUserId: card.responsible_user_id || card.user_id,
      defaultAccountId: card.default_account_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = {
        ...formData,
        userId: currentUser?.id,
        limit: parseFloat(formData.limit) || 0,
        closingDay: parseInt(formData.closingDay) || 1,
        dueDay: parseInt(formData.dueDay) || 1,
      };

      if (editingCard) {
        await updateCard(editingCard.id, data);
        toast({ title: "Cartão atualizado!" });
      } else {
        await createCard(data);
        toast({ title: "Cartão criado!" });
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cartão?')) return;
    try {
      await deleteCard(id);
      toast({ title: "Cartão excluído!" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const handleEditTransaction = (tx: Transaction) => {
    navigate(`/transactions?edit=${tx.id}`);
  };

  const handleDeleteTransaction = async (tx: Transaction) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try {
      await deleteTransaction(tx.id);
      toast({ title: "Lançamento excluído!" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const safeFormatDate = (date: Date | string, formatStr: string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(d)) return '';
    return format(d, formatStr, { locale: ptBR });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Gestão visual de limites e faturas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(format(subMonths(selectedDate, 1), 'yyyy-MM'))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold px-4 min-w-[140px] text-center capitalize">
              {safeFormatDate(selectedDate, 'MMMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(format(addMonths(selectedDate, 1), 'yyyy-MM'))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleOpenCreate} className="gradient-primary shadow-primary">
            <Plus className="w-4 h-4 mr-2" /> Novo Cartão
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {cardsWithStats.map(card => (
          <div key={card.id} className="space-y-4">
            {/* Visual do Cartão Físico */}
            <div 
              className="relative h-56 w-full rounded-[24px] p-8 text-white shadow-2xl overflow-hidden transition-all hover:scale-[1.01] group"
              style={{ 
                background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)`,
                boxShadow: `0 20px 40px -15px ${card.color}66`
              }}
            >
              {/* Elementos Decorativos do Cartão */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-2xl" />
              
              <div className="relative h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-medium opacity-80 uppercase tracking-widest">Nome do Cartão</p>
                    <h3 className="text-2xl font-bold tracking-tight">{card.name}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Cpu className="w-10 h-10 opacity-50 rotate-90" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(card)}><Pencil className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(card.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Limite Disponível</p>
                    <p className="text-3xl font-black tracking-tighter">
                      {formatCurrency(card.availableLimit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[16px] font-mono tracking-[4px] opacity-90">
                      •••• {card.last_digits || '0000'}
                    </p>
                    <p className="text-[10px] font-bold opacity-70 uppercase mt-1">
                      {card.brand || 'Crédito'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhes e Lançamentos */}
            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-2xl">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Fatura {safeFormatDate(selectedDate, 'MMM')}</p>
                    <p className="text-xl font-bold text-expense">{formatCurrency(card.totalCurrentInvoice)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-2xl">
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Dívida Total</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent><p className="text-xs">Soma de todas as parcelas futuras</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency(card.totalDebt)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Uso do Limite ({formatCurrency(card.limit)})</span>
                    <span>{card.usedPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        card.usedPercentage > 90 ? "bg-destructive" : card.usedPercentage > 70 ? "bg-warning" : "bg-primary"
                      )}
                      style={{ width: `${card.usedPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" /> 
                      Lançamentos de {safeFormatDate(selectedDate, 'MMMM')}
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-bold uppercase text-primary hover:bg-primary/5"
                      onClick={() => navigate('/transactions')}
                    >
                      Ver todos <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                    {card.transactions.length > 0 ? (
                      card.transactions.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()).map(tx => {
                        const cat = getCategoryById(tx.categoryId);
                        return (
                          <div key={tx.id} className="flex items-center justify-between group p-2 rounded-xl hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg">
                                {cat?.icon || '💰'}
                              </div>
                              <div>
                                <p className="text-sm font-medium leading-none">{tx.description}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {safeFormatDate(tx.purchaseDate, 'dd/MM/yy')}
                                  {tx.totalInstallments > 1 && ` • ${tx.installmentNumber}/${tx.totalInstallments}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn("text-sm font-bold", tx.type === 'REFUND' ? 'text-income' : 'text-expense')}>
                                {tx.type === 'REFUND' ? '+' : '-'} {formatCurrency(tx.amount)}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => handleEditTransaction(tx)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteTransaction(tx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center">
                        <p className="text-xs text-muted-foreground">Nenhum lançamento nesta fatura.</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Diálogo de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
            <DialogDescription>Configure os detalhes do seu cartão de crédito.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Cartão</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ex: Nubank" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Bandeira</Label>
                <Select value={formData.brand} onValueChange={v => setFormData({...formData, brand: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="Mastercard">Mastercard</SelectItem>
                    <SelectItem value="Elo">Elo</SelectItem>
                    <SelectItem value="Amex">Amex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Últimos 4 dígitos</Label>
                <Input 
                  value={formData.lastDigits} 
                  onChange={e => setFormData({...formData, lastDigits: e.target.value})} 
                  placeholder="0000" 
                  maxLength={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite Total</Label>
                <Input 
                  type="number" 
                  value={formData.limit} 
                  onChange={e => setFormData({...formData, limit: e.target.value})} 
                  placeholder="0.00" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia de Fechamento</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="31" 
                  value={formData.closingDay} 
                  onChange={e => setFormData({...formData, closingDay: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="31" 
                  value={formData.dueDay} 
                  onChange={e => setFormData({...formData, dueDay: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Usuário Responsável</Label>
              <Select value={formData.responsibleUserId} onValueChange={v => setFormData({...formData, responsibleUserId: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conta Padrão para Pagamento</Label>
              <Select value={formData.defaultAccountId} onValueChange={v => setFormData({...formData, defaultAccountId: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
                <SelectContent>
                  {allAccounts.filter(a => a.active !== false).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cor do Cartão</Label>
              <div className="flex flex-wrap gap-2">
                {CARD_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      formData.color === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({...formData, color})}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Cartão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}