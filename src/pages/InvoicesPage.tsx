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
import { CreditCard, Calendar, DollarSign, CheckCircle, AlertCircle, Clock, ChevronLeft, ChevronRight, Settings2, Loader2, Pencil, Trash2, ChevronDown, ChevronUp, List } from 'lucide-react';
import { formatCurrency, getCurrentMonth, Invoice, Card as CardType, generateId, Transaction } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { format, addMonths, subMonths, parse, setDate, isAfter, isValid, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function InvoicesPage() {
  const { cards, transactions, accounts, invoices, refresh, allTransactions, allCards, updateCard, allAccounts, getAccountBalance, getCategoryById, deleteTransaction } = useFinance();
  const { currentUser, isCurrentUserAdmin, users } = useAuth();
  const navigate = useNavigate();
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  
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

  const toggleInvoiceDetails = (id: string) => {
    const newSet = new Set(expandedInvoices);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedInvoices(newSet);
  };

  const generatedInvoices = useMemo(() => {
    const invoiceMap = new Map<string, { cardId: string; userId: string; month: string; total: number; transactions: Transaction[] }>();
    const txSource = allTransactions;

    const creditTransactions = txSource.filter(t => 
      t.cardId && 
      (t.type === 'CREDIT' || t.type === 'REFUND') && 
      t.status !== 'cancelled' &&
      t.mesFatura === selectedMonth
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
  }, [allTransactions, selectedMonth]);

  const displayInvoices = useMemo(() => {
    const result: Array<{
      id: string; card: CardType; month: string; total: number; paid: number;
      status: 'open' | 'closed' | 'paid' | 'partial'; closingDate: Date; dueDate: Date;
      transactionCount: number; transactions: Transaction[]; existingInvoice?: Invoice;
    }> = [];

    const filteredCards = selectedCardId === 'all' ? cards : cards.filter(c => c.id === selectedCardId);
    const invoiceMonthDate = safeParseMonth(selectedMonth);

    filteredCards.forEach(card => {
      const generated = generatedInvoices.find(g => g.cardId === card.id);
      const existing = invoices.find(i => i.card_id === card.id && i.month === selectedMonth);
      
      const closingDate = setDate(invoiceMonthDate, card.closing_day);
      const dueDate = setDate(invoiceMonthDate, card.due_day);

      const total = generated?.total || existing?.total_amount || 0;
      const paid = existing?.paid_amount || 0;
      
      let status: any = 'open';
      if (existing?.status) status = existing.status;
      else if (paid >= total && total > 0) status = 'paid';
      else if (paid > 0) status = 'partial';
      else if (isAfter(new Date(), closingDate)) status = 'closed';

      result.push({
        id: existing?.id || `temp-${card.id}-${selectedMonth}`,
        card, month: selectedMonth, total, paid, status, closingDate, dueDate,
        transactionCount: generated?.transactions.length || 0,
        transactions: generated?.transactions || [],
        existingInvoice: existing
      });
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
      const cardName = cards.find(c => c.id === invoice.card_id)?.name || 'Cartão';
      
      // Lançamento automático na conta como "Fatura Paga"
      await db.add('transactions', {
        id: generateId(), 
        type: 'EXPENSE', 
        amount, 
        description: `Fatura Paga: ${cardName} - ${format(monthDate, 'MMMM/yyyy', { locale: ptBR })}`,
        purchaseDate: new Date().toISOString().split('T')[0], 
        effectiveDate: invoice.due_date, 
        effectiveMonth: format(new Date(invoice.due_date), 'yyyy-MM'), 
        mesFatura: null, 
        status: 'confirmed', 
        isPaid: true, 
        userId: currentUser?.id || '', 
        accountId: paymentAccountId, 
        cardId: null, 
        categoryId: '', 
        notes: '', 
        isRecurring: false, 
        createdAt: new Date()
      });
      
      toast({ title: 'Pagamento registrado!' });
      setPayDialogOpen(false);
      await refresh();
    } catch (error) {
      toast({ title: 'Erro', variant: 'destructive' });
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Excluir este lançamento?')) return;
    await deleteTransaction(id);
    toast({ title: 'Lançamento excluído' });
  };

  const displayMonthDate = safeParseMonth(selectedMonth);

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Faturas</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Gerencie suas faturas de cartão de crédito</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-center">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePreviousMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm sm:text-lg font-bold min-w-[120px] sm:min-w-[150px] text-center capitalize">{format(displayMonthDate, 'MMMM yyyy', { locale: ptBR })}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedCardId} onValueChange={setSelectedCardId}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Todos os cartões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cartões</SelectItem>
              {(isAdmin ? allCards : cards).filter(c => !c.is_archived).map(card => (
                <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6">
        {displayInvoices.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhum cartão cadastrado.</p></CardContent></Card>
        ) : (
          displayInvoices.map(invoice => (
            <Card key={invoice.id} className="overflow-hidden border-none shadow-md">
              <div className="flex items-stretch">
                <div className="w-1.5 sm:w-2" style={{ backgroundColor: invoice.card.color }} />
                <div className="flex-1 p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 sm:p-3 rounded-xl" style={{ backgroundColor: `${invoice.card.color}20` }}><CreditCard className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: invoice.card.color }} /></div>
                      <div><h3 className="font-bold text-base sm:text-lg">{invoice.card.name}</h3><p className="text-[10px] text-muted-foreground uppercase tracking-wider">•••• {invoice.card.last_digits} · {invoice.transactionCount} lançamentos</p></div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenConfig(invoice.card)} title="Configurar Cartão">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'} className={cn("text-[10px] h-5", invoice.status === 'paid' ? 'bg-income text-white' : '')}>{invoice.status === 'paid' ? 'Paga' : invoice.status === 'closed' ? 'Fechada' : 'Aberta'}</Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <div className="space-y-1"><p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Fechamento</p><p className="text-xs sm:text-sm font-semibold">{isValid(invoice.closingDate) ? format(invoice.closingDate, 'dd/MM/yyyy') : '---'}</p></div>
                    <div className="space-y-1"><p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Vencimento</p><p className="text-xs sm:text-sm font-semibold">{isValid(invoice.dueDate) ? format(invoice.dueDate, 'dd/MM/yyyy') : '---'}</p></div>
                    <div className="space-y-1"><p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Valor Total</p><p className="font-bold text-lg sm:text-xl">{formatCurrency(invoice.total)}</p></div>
                    <div className="space-y-1"><p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Restante</p><p className={cn("font-bold text-lg sm:text-xl", invoice.total - invoice.paid > 0 ? 'text-expense' : 'text-income')}>{formatCurrency(invoice.total - invoice.paid)}</p></div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-primary p-0 h-auto"
                        onClick={() => toggleInvoiceDetails(invoice.id)}
                      >
                        {expandedInvoices.has(invoice.id) ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                        Detalhamento
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePayInvoice(invoice)} disabled={invoice.status === 'paid' || invoice.total === 0} className="h-8 text-xs"><DollarSign className="h-3.5 w-3.5 mr-1" />{invoice.status === 'paid' ? 'Paga' : 'Pagar'}</Button>
                    </div>
                    
                    {expandedInvoices.has(invoice.id) && (
                      <div className="bg-muted/30 rounded-xl sm:rounded-2xl overflow-hidden animate-slide-up">
                        <div className="table-container max-h-[300px] overflow-y-auto">
                          {invoice.transactions.length > 0 ? (
                            <table className="w-full text-xs">
                              <thead className="bg-muted/50 sticky top-0 z-10">
                                <tr>
                                  <th className="text-left p-3 font-bold uppercase whitespace-nowrap">Data</th>
                                  <th className="text-left p-3 font-bold uppercase whitespace-nowrap">Descrição</th>
                                  <th className="text-left p-3 font-bold uppercase whitespace-nowrap">Categoria</th>
                                  <th className="text-right p-3 font-bold uppercase whitespace-nowrap">Valor</th>
                                  <th className="p-3"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50">
                                {invoice.transactions.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()).map(tx => {
                                  const cat = getCategoryById(tx.categoryId);
                                  return (
                                    <tr key={tx.id} className="hover:bg-muted/50 transition-colors group">
                                      <td className="p-3 whitespace-nowrap">{format(new Date(tx.purchaseDate), 'dd/MM/yy')}</td>
                                      <td className="p-3">
                                        <div className="flex flex-col min-w-[100px]">
                                          <span className="font-semibold truncate max-w-[150px]">{tx.description}</span>
                                          {tx.totalInstallments && tx.totalInstallments > 1 && (
                                            <span className="text-[9px] text-primary font-bold">
                                              Parcela {tx.installmentNumber}/{tx.totalInstallments}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-3"><Badge variant="outline" className="font-normal text-[9px] whitespace-nowrap">{cat?.icon} {cat?.name}</Badge></td>
                                      <td className="p-3 text-right font-bold whitespace-nowrap">
                                        <span className={cn(tx.type === 'REFUND' ? 'text-income' : 'text-expense')}>
                                          {tx.type === 'REFUND' ? '+' : '-'} {formatCurrency(tx.amount)}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/transactions?edit=${tx.id}`)}><Pencil className="h-3 w-3" /></Button>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteTx(tx.id)}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-8 text-center text-muted-foreground text-xs">Nenhum lançamento nesta fatura.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>Pagar Fatura</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Conta para débito</Label><Select value={paymentAccountId} onValueChange={setPaymentAccountId}><SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger><SelectContent>{accounts.filter(a => a.active !== false).map(account => <SelectItem key={account.id} value={account.id}>{account.name} - {formatCurrency(getAccountBalance(account.id))}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Valor do pagamento</Label><Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0,00" /></div>
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setPayDialogOpen(false)} className="flex-1">Cancelar</Button><Button onClick={handleConfirmPayment} className="flex-1">Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Configurar Cartão</DialogTitle>
            <DialogDescription className="text-xs">Ajuste as das e responsáveis pelo pagamento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCardConfig} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia Fechamento</Label>
                <Input type="number" min="1" max="31" value={cardFormData.closingDay} onChange={e => setCardFormData({...cardFormData, closingDay: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Dia Vencimento</Label>
                <Input type="number" min="1" max="31" value={cardFormData.dueDay} onChange={e => setCardFormData({...cardFormData, dueDay: e.target.value})} required />
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
              <Label>Conta Padrão</Label>
              <Select value={cardFormData.defaultAccountId} onValueChange={v => setCardFormData({...cardFormData, defaultAccountId: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
                <SelectContent>
                  {allAccounts.filter(a => a.active !== false).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setConfigDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}