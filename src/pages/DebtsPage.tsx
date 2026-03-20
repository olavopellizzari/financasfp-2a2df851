import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/MoneyInput';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { UserFilter } from '@/components/UserFilter';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Wallet, 
  AlertTriangle, 
  CheckCircle, 
  TrendingDown,
  CalendarIcon,
  Pencil,
  Trash2,
  DollarSign,
  Calculator,
  Clock,
  Users
} from 'lucide-react';
import { Debt, formatCurrency, generateId } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, isBefore, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function DebtsPage() {
  const { currentUser, users, isCurrentUserAdmin } = useAuth();
  const { debts, saveDebt, deleteDebt } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('0.00');
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'all');

  const [debtForm, setDebtForm] = useState({
    name: '',
    totalAmount: '0.00',
    paidAmount: '0.00',
    interestRate: '0',
    startDate: new Date(),
    dueDate: new Date(),
    monthlyPayment: '0.00',
    installmentsCount: '',
    frequency: 'monthly' as 'monthly' | 'semiannual' | 'annual',
    notes: '',
    userId: currentUser?.id || 'family'
  });

  const isAdmin = isCurrentUserAdmin();

  const filteredDebts = useMemo(() => {
    if (selectedUserId === 'all') return debts;
    if (selectedUserId === 'family') return debts.filter(d => !d.user_id);
    return debts.filter(d => d.user_id === selectedUserId);
  }, [debts, selectedUserId]);

  // Lógica de ajuste automático
  const handleTotalAmountChange = (val: string) => {
    const total = parseFloat(val) || 0;
    const count = parseInt(debtForm.installmentsCount) || 0;
    
    let newMonthly = debtForm.monthlyPayment;
    if (total > 0 && count > 0) {
      newMonthly = (total / count).toFixed(2);
    }

    setDebtForm(prev => ({ ...prev, totalAmount: val, monthlyPayment: newMonthly }));
  };

  const handleMonthlyPaymentChange = (val: string) => {
    const monthly = parseFloat(val) || 0;
    const count = parseInt(debtForm.installmentsCount) || 0;
    
    let newTotal = debtForm.totalAmount;
    if (monthly > 0 && count > 0) {
      newTotal = (monthly * count).toFixed(2);
    }

    setDebtForm(prev => ({ ...prev, monthlyPayment: val, totalAmount: newTotal }));
  };

  const handleInstallmentsCountChange = (val: string) => {
    const count = parseInt(val) || 0;
    const total = parseFloat(debtForm.totalAmount) || 0;
    const monthly = parseFloat(debtForm.monthlyPayment) || 0;
    
    let newMonthly = debtForm.monthlyPayment;
    let newTotal = debtForm.totalAmount;

    if (count > 0) {
      if (total > 0) {
        newMonthly = (total / count).toFixed(2);
      } else if (monthly > 0) {
        newTotal = (monthly * count).toFixed(2);
      }
    }

    setDebtForm(prev => ({ 
      ...prev, 
      installmentsCount: val, 
      monthlyPayment: newMonthly,
      totalAmount: newTotal
    }));
  };

  const handleSaveDebt = async () => {
    if (!debtForm.name || !debtForm.totalAmount) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    if (!currentUser?.family_id) {
      toast({ title: 'Erro', description: 'Família não identificada', variant: 'destructive' });
      return;
    }

    try {
      const debt: any = {
        id: editingDebt?.id || generateId(),
        user_id: debtForm.userId === 'family' ? null : debtForm.userId,
        household_id: currentUser.family_id,
        name: debtForm.name,
        total_amount: parseFloat(debtForm.totalAmount) || 0,
        paid_amount: parseFloat(debtForm.paidAmount) || 0,
        interest_rate: parseFloat(debtForm.interestRate) || 0,
        start_date: format(debtForm.startDate, 'yyyy-MM-dd'),
        due_date: format(debtForm.dueDate, 'yyyy-MM-dd'),
        monthly_payment: parseFloat(debtForm.monthlyPayment) || 0,
        installments_count: parseInt(debtForm.installmentsCount) || null,
        frequency: debtForm.frequency,
        is_active: (parseFloat(debtForm.paidAmount) || 0) < (parseFloat(debtForm.totalAmount) || 0),
        notes: debtForm.notes
      };

      await saveDebt(debt);
      toast({ title: editingDebt ? 'Dívida atualizada!' : 'Dívida registrada!' });
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar dívida', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setDebtForm({
      name: debt.name,
      totalAmount: debt.total_amount.toFixed(2),
      paidAmount: debt.paid_amount.toFixed(2),
      interestRate: debt.interest_rate.toString(),
      startDate: parseISO(debt.start_date),
      dueDate: parseISO(debt.due_date),
      monthlyPayment: debt.monthly_payment.toFixed(2),
      installmentsCount: debt.installments_count?.toString() || '',
      frequency: debt.frequency || 'monthly',
      notes: debt.notes,
      userId: debt.user_id || 'family'
    });
    setDialogOpen(true);
  };

  const handleDeleteDebt = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta dívida?')) return;
    try {
      await deleteDebt(id);
      toast({ title: 'Dívida excluída!' });
    } catch (error) {
      toast({ title: 'Erro ao excluir dívida', variant: 'destructive' });
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedDebt || !paymentAmount) return;
    try {
      const amount = parseFloat(paymentAmount);
      const newPaidAmount = selectedDebt.paid_amount + amount;
      await saveDebt({
        ...selectedDebt,
        paid_amount: newPaidAmount,
        is_active: newPaidAmount < selectedDebt.total_amount
      });
      toast({ title: 'Pagamento registrado!' });
      setPaymentDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro ao registrar pagamento', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingDebt(null);
    setDebtForm({
      name: '', totalAmount: '0.00', paidAmount: '0.00', interestRate: '0',
      startDate: new Date(), dueDate: new Date(), monthlyPayment: '0.00',
      installmentsCount: '', frequency: 'monthly', notes: '', userId: currentUser?.id || 'family'
    });
  };

  const activeDebts = filteredDebts.filter(d => d.is_active);
  const paidDebts = filteredDebts.filter(d => !d.is_active);
  const totalDebt = activeDebts.reduce((sum, d) => sum + (d.total_amount - d.paid_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dívidas</h1>
          <p className="text-muted-foreground">Controle suas dívidas e financiamentos</p>
        </div>
        <div className="flex items-center gap-3">
          <UserFilter value={selectedUserId} onChange={setSelectedUserId} className="w-[200px]" />
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gradient-primary shadow-primary px-3 sm:px-4">
            <Plus className="w-4 h-4 sm:mr-2" /> 
            <span className="hidden sm:inline">Nova Dívida</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-expense/10 border-expense/20"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-expense text-white shadow-lg"><TrendingDown className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Restante</p><p className="text-2xl font-bold text-expense">{formatCurrency(totalDebt)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Dívidas Ativas</p><p className="text-2xl font-bold">{activeDebts.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-income/10"><CheckCircle className="h-5 w-5 text-income" /></div><div><p className="text-sm text-muted-foreground">Quitadas</p><p className="text-2xl font-bold">{paidDebts.length}</p></div></div></CardContent></Card>
      </div>

      <div className="grid gap-4">
        {activeDebts.map(debt => {
          const percentage = (debt.paid_amount / debt.total_amount) * 100;
          const frequencyLabel = debt.frequency === 'monthly' ? 'Mensal' : debt.frequency === 'semiannual' ? 'Semestral' : 'Anual';
          const debtUser = users.find(u => u.id === debt.user_id);
          
          return (
            <Card key={debt.id} className="finance-card group">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{debt.name}</h3>
                      {!debt.user_id ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] h-5">
                          <Users className="w-3 h-3 mr-1" /> Família
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {debtUser?.name || 'Usuário'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      <span>Vencimento: {format(parseISO(debt.due_date), 'dd/MM/yyyy')}</span>
                      <Badge variant="outline" className="h-4 text-[10px] uppercase">{frequencyLabel}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditDebt(debt)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDebt(debt.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total</p>
                    <p className="font-bold">{formatCurrency(debt.total_amount)}</p>
                  </div>
                  <div className="p-3 bg-income/5 rounded-xl">
                    <p className="text-[10px] font-bold text-income uppercase mb-1">Pago</p>
                    <p className="font-bold text-income">{formatCurrency(debt.paid_amount)}</p>
                  </div>
                  <div className="p-3 bg-expense/5 rounded-xl">
                    <p className="text-[10px] font-bold text-expense uppercase mb-1">Restante</p>
                    <p className="font-bold text-expense">{formatCurrency(debt.total_amount - debt.paid_amount)}</p>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-xl">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Parcela</p>
                    <p className="font-bold">{formatCurrency(debt.monthly_payment)}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground uppercase">Progresso da Quitação</span>
                    <span>{percentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
                <Button variant="outline" className="w-full sm:w-auto rounded-xl" onClick={() => { setSelectedDebt(debt); setPaymentAmount(debt.monthly_payment.toFixed(2)); setPaymentDialogOpen(true); }}>
                  <DollarSign className="h-4 w-4 mr-2" /> Registrar Pagamento
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle>{editingDebt ? 'Editar Dívida' : 'Nova Dívida'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={debtForm.userId} onValueChange={v => setDebtForm({...debtForm, userId: v})}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Família (Compartilhada)</span>
                    </div>
                  </SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: u.avatar_color }} />
                        <span>{u.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome da Dívida *</Label>
              <Input value={debtForm.name} onChange={(e) => setDebtForm(prev => ({ ...prev, name: e.target.value }))} className="rounded-xl h-11" placeholder="Ex: Financiamento Carro" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Total *</Label>
                <MoneyInput value={debtForm.totalAmount} onValueChange={(v) => handleTotalAmountChange(v)} className="rounded-xl h-11" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Valor da Parcela</Label>
                <MoneyInput value={debtForm.monthlyPayment} onValueChange={(v) => handleMonthlyPaymentChange(v)} className="rounded-xl h-11" placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={debtForm.frequency} onValueChange={(v: any) => setDebtForm({...debtForm, frequency: v})}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="semiannual">Semestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qtd. Parcelas</Label>
                <Input type="number" value={debtForm.installmentsCount} onChange={(e) => handleInstallmentsCountChange(e.target.value)} className="rounded-xl h-11" placeholder="Ex: 12" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Já Pago</Label>
                <MoneyInput value={debtForm.paidAmount} onValueChange={(v) => setDebtForm(prev => ({ ...prev, paidAmount: v }))} className="rounded-xl h-11" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Próximo Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-11 rounded-xl",
                        !debtForm.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {debtForm.dueDate ? format(debtForm.dueDate, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={debtForm.dueDate}
                      onSelect={(date) => date && setDebtForm(prev => ({ ...prev, dueDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 h-11 rounded-xl">Cancelar</Button>
            <Button onClick={handleSaveDebt} className="flex-1 h-11 rounded-xl gradient-primary">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-sm rounded-[24px]">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor do Pagamento</Label>
              <MoneyInput value={paymentAmount} onValueChange={(v) => setPaymentAmount(v)} className="rounded-xl h-11" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="flex-1 h-11 rounded-xl">Cancelar</Button>
            <Button onClick={handleConfirmPayment} className="flex-1 h-11 rounded-xl gradient-primary">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}