import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserFilter } from '@/components/UserFilter';
import { CreditCard, Calendar, DollarSign, CheckCircle, AlertCircle, Clock, ChevronLeft, ChevronRight, Settings2, Loader2 } from 'lucide-react';
import { formatCurrency, getCurrentMonth, Invoice, Card as CardType, generateId } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { format, addMonths, subMonths, parse, setDate, isAfter, isValid, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const CARD_COLORS = ['#1e293b', '#ef4444', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899', '#f97316', '#eab308'];

export function InvoicesPage() {
  const { cards, transactions, accounts, invoices, refresh, allTransactions, allCards, updateCard, allAccounts, getAccountBalance } = useFinance();
  const { currentUser, isCurrentUserAdmin, users } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  
  // Estados para diálogos
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [cardFormData, setCardFormData] = useState({
    closingDay: '10',
    dueDay: '20',
    responsibleUserId: '',
    defaultAccountId: ''
  });

  const isAdmin = isCurrentUserAdmin();

  const safeParseMonth = (monthStr: string) => {
    const parsed = parse(monthStr, 'yyyy-MM', new Date());
    return isValid(parsed) ? parsed : new Date();
  };

  const generatedInvoices = useMemo(() => {
    const invoiceMap = new Map<string, { cardId: string; userId: string; month: string; total: number; transactions: typeof transactions }>();
    const txSource = isAdmin ? allTransactions : transactions;

    const baseDate = safeParseMonth(selectedMonth);
    const nextMonthStr = format(addMonths(baseDate, 1), 'yyyy-MM');

    const creditTransactions = txSource.filter(t => 
      t.cardId && 
      (t.type === 'CREDIT' || t.type === 'REFUND') && 
      t.status !== 'cancelled' &&
      t.effectiveMonth === nextMonthStr &&
      (selectedUserId === 'all' || t.userId === selectedUserId)
    );

    creditTransactions.forEach(tx => {
      const key = `${tx.cardId}-${selectedMonth}`;
      if (!invoiceMap.has(key)) {
        invoiceMap.set(key, { cardId: tx.cardId!, userId: tx.userId, month: selectedMonth, total: 0, transactions: [] });
      }
      const inv = invoiceMap.get(key)!;
      if (tx.type === 'REFUND') {
        inv.total -= tx.amount;
      } else {
        inv.total += tx.amount;
      }
      inv.transactions.push(tx);
    });

    return Array.from(invoiceMap.values());
  }, [transactions, allTransactions, isAdmin, selectedMonth, selectedUserId]);

  const displayInvoices = useMemo(() => {
    const result: Array<{
      id: string; card: CardType; month: string; total: number; paid: number;
      status: 'open' | 'closed' | 'paid' | 'partial'; closingDate: Date; dueDate: Date;
      transactionCount: number; existingInvoice?: Invoice;
    }> = [];

    const filteredCards = selectedCardId === 'all' ? cards : cards.filter(c => c.id === selectedCardId);
    const monthDate = safeParseMonth(selectedMonth);

    filteredCards.forEach(card => {
      const generated = generatedInvoices.find(g => g.cardId === card.id);
      const existing = invoices.find(i => i.card_id === card.id && i.month === selectedMonth);
      
      let closingDate = setDate(monthDate, card.closing_day);
      let dueDate = setDate(addMonths(monthDate, 1), card.due_day);

      const total = generated?.total || existing?.total_amount || 0;
      const paid = existing?.paid_amount || 0;
      
      let status: any = 'open';
      if (existing?.status) status = existing.status;
      else if (paid >= total && total > 0) status = 'paid';
      else if (paid > 0) status = 'partial';
      else if (isAfter(new Date(), closingDate)) status = 'closed';

      if (total !== 0 || existing) {
        result.push({
          id: existing?.id || `temp-${card.id}-${selectedMonth}`,
          card, month: selectedMonth, total, paid, status, closingDate, dueDate,
          transactionCount: generated?.transactions.length || 0, existingInvoice: existing
        });
      }
    });

    return result;
  }, [cards, generatedInvoices, invoices, selectedMonth, selectedCardId]);

  const handlePreviousMonth = () => {
    const date = safeParseMonth(selectedMonth);
    setSelectedMonth(format(subMonths(date, 1), 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const date = safeParseMonth(selectedMonth);
    setSelectedMonth(format(addMonths(date, 1), 'yyyy-MM'));
  };

  const handlePayInvoice = (invoice: typeof displayInvoices[0]) => {
    const existingOrNew: Invoice = invoice.existingInvoice || {
      id: generateId(), card_id: invoice.card.id,
      month: invoice.month, closing_date: invoice.closingDate as any, due_date: invoice.dueDate as any,
      total_amount: invoice.total, paid_amount: 0, status: 'closed', paid_from_account_id: null,
      paid_at: null
    };
    setSelectedInvoice(existingOrNew);
    setPaymentAmount((invoice.total - invoice.paid).toFixed(2));
    setPaymentAccountId(invoice.card.default_account_id || accounts[0]?.id || '');
    setPayDialogOpen(true);
  };

  const handleOpenConfig = (card: CardType) => {
    setEditingCard(card);
    setCardFormData({
      closingDay: card.closing_day.toString(),
      dueDay: card.due_day.toString(),
      responsibleUserId: card.responsible_user_id || card.user_id,
      defaultAccountId: card.default_account_id || ''
    });
    setConfigDialogOpen(true);
  };

  const handleSaveCardConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    setIsLoading(true);
    try {
      await updateCard(editingCard.id, {
        closingDay: parseInt(cardFormData.closingDay),
        dueDay: parseInt(cardFormData.dueDay),
        responsibleUserId: cardFormData.responsibleUserId,
        defaultAccountId: cardFormData.defaultAccountId
      });
      toast({ title: "Configurações salvas!" });
      setConfigDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice || !paymentAccountId || !paymentAmount) return;
    try {
      const amount = parseFloat(paymentAmount);
      const invoice = selectedInvoice;
      const newPaidAmount = invoice.paid_amount + amount;
      const updatedInvoice: Invoice = {
        ...invoice, paid_amount: newPaidAmount, status: newPaidAmount >= invoice.total_amount ? 'paid' : 'partial',
        paid_from_account_id: paymentAccountId, paid_at: new Date() as any
      };

      if (invoice.id.startsWith('temp-')) {
        updatedInvoice.id = generateId();
        await db.add('invoices', updatedInvoice);
      } else {
        await db.put('invoices', updatedInvoice);
      }

      const monthDate = safeParseMonth(invoice.month);
      await db.add('transactions', {
        id: generateId(), type: 'EXPENSE', amount, description: `Pagamento fatura ${cards.find(c => c.id === invoice.card_id)?.name} - ${format(monthDate, 'MMMM/yyyy', { locale: ptBR })}`,
        purchaseDate: new Date(), effectiveDate: invoice.due_date, effectiveMonth: format(invoice.due_date, 'yyyy-MM'), mesFatura: null, status: 'confirmed', isPaid: true, userId: currentUser?.id || '', accountId: paymentAccountId, cardId: null, invoiceId: updatedInvoice.id, categoryId: '', merchantId: null, tagIds: [], installmentGroupId: null, installmentNumber: null, totalInstallments: null, notes: '', importBatchId: null, isRecurring: false, recurrenceType: null, recurrenceCount: null, createdAt: new Date(), updatedAt: new Date()
      });
      
      toast({ title: 'Pagamento registrado!' });
      setPayDialogOpen(false);
      await refresh();
    } catch (error) {
      toast({ title: 'Erro', variant: 'destructive' });
    }
  };

  const displayMonthDate = safeParseMonth(selectedMonth);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Faturas</h1>
          <p className="text-muted-foreground">Gerencie suas faturas de cartão de crédito</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-lg font-medium min-w-[150px] text-center capitalize">{format(displayMonthDate, 'MMMM yyyy', { locale: ptBR })}</span>
          <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <UserFilter value={selectedUserId} onChange={setSelectedUserId} className="w-[180px]" />}
          <Select value={selectedCardId} onValueChange={setSelectedCardId}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos os cartões" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os cartões</SelectItem>{(isAdmin ? allCards : cards).filter(c => !c.is_archived).map(card => <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>

      <div className="grid gap-4">
        {displayInvoices.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhuma fatura encontrada para este período</p></CardContent></Card>
        ) : (
          displayInvoices.map(invoice => (
            <Card key={invoice.id} className="overflow-hidden">
              <div className="flex items-stretch">
                <div className="w-2" style={{ backgroundColor: invoice.card.color }} />
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl" style={{ backgroundColor: `${invoice.card.color}20` }}><CreditCard className="h-5 w-5" style={{ color: invoice.card.color }} /></div>
                      <div><h3 className="font-semibold">{invoice.card.name}</h3><p className="text-sm text-muted-foreground">•••• {invoice.card.last_digits} · {invoice.transactionCount} lançamentos</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenConfig(invoice.card)} title="Configurar Cartão">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>{invoice.status === 'paid' ? 'Paga' : invoice.status === 'closed' ? 'Fechada' : 'Aberta'}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div><p className="text-xs text-muted-foreground">Fechamento</p><p className="font-medium">{isValid(invoice.closingDate) ? format(invoice.closingDate, 'dd/MM/yyyy') : '---'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Vencimento</p><p className="font-medium">{isValid(invoice.dueDate) ? format(invoice.dueDate, 'dd/MM/yyyy') : '---'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Valor Total</p><p className="font-medium text-lg">{formatCurrency(invoice.total)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Restante</p><p className={cn("font-medium text-lg", invoice.total - invoice.paid > 0 ? 'text-expense' : 'text-income')}>{formatCurrency(invoice.total - invoice.paid)}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePayInvoice(invoice)} disabled={invoice.status === 'paid'}><DollarSign className="h-4 w-4 mr-1" />{invoice.status === 'paid' ? 'Paga' : 'Pagar Fatura'}</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Diálogo de Pagamento */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pagar Fatura</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Conta para débito</Label><Select value={paymentAccountId} onValueChange={setPaymentAccountId}><SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger><SelectContent>{accounts.filter(a => a.active !== false).map(account => <SelectItem key={account.id} value={account.id}>{account.name} - {formatCurrency(getAccountBalance(account.id))}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Valor do pagamento</Label><Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0,00" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button><Button onClick={handleConfirmPayment}>Confirmar Pagamento</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Configuração do Cartão */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Cartão: {editingCard?.name}</DialogTitle>
            <DialogDescription>Ajuste as datas e responsáveis pelo pagamento da fatura.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCardConfig} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia de Fechamento</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="31" 
                  value={cardFormData.closingDay} 
                  onChange={e => setCardFormData({...cardFormData, closingDay: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="31" 
                  value={cardFormData.dueDay} 
                  onChange={e => setCardFormData({...cardFormData, dueDay: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Usuário Responsável</Label>
              <Select value={cardFormData.responsibleUserId} onValueChange={v => setCardFormData({...cardFormData, responsibleUserId: v})}>
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
              <Select value={cardFormData.defaultAccountId} onValueChange={v => setCardFormData({...cardFormData, defaultAccountId: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
                <SelectContent>
                  {allAccounts.filter(a => a.active !== false).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Configurações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}