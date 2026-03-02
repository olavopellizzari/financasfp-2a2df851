import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Calculator
} from 'lucide-react';
import { Debt, formatCurrency, generateId } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, isBefore, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function DebtsPage() {
  const { currentUser, users } = useAuth();
  const { debts, saveDebt, deleteDebt } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'all');

  const [debtForm, setDebtForm] = useState({
    name: '',
    totalAmount: '',
    paidAmount: '',
    interestRate: '',
    startDate: new Date(),
    dueDate: new Date(),
    monthlyPayment: '',
    installmentsCount: '',
    frequency: 'monthly' as 'monthly' | 'semiannual' | 'annual',
    notes: '',
    userId: currentUser?.id || ''
  });

  const filteredDebts = useMemo(() => {
    if (selectedUserId === 'all') return debts;
    return debts.filter(d => d.user_id === selectedUserId);
  }, [debts, selectedUserId]);

  const handleSaveDebt = async () => {
    if (!debtForm.name || !debtForm.totalAmount) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      const debt: any = {
        id: editingDebt?.id || generateId(),
        user_id: debtForm.userId || currentUser?.id,
        name: debtForm.name,
        total_amount: parseFloat(debtForm.totalAmount) || 0,
        paid_amount: parseFloat(debtForm.paidAmount) || 0,
        interest_rate: parseFloat(debtForm.interestRate) || 0,
        start_date: format(debtForm.startDate, 'yyyy-MM-dd'),
        due_date: format(debtForm.dueDate, 'yyyy-MM-dd'),
        monthly_payment: parseFloat(debtForm.monthlyPayment) || 0,
        is_active: (parseFloat(debtForm.paidAmount) || 0) < (parseFloat(debtForm.totalAmount) || 0),
        notes: debtForm.notes
      };

      await saveDebt(debt);
      toast({ title: editingDebt ? 'Dívida atualizada!' : 'Dívida registrada!' });
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro ao salvar dívida', variant: 'destructive' });
    }
  };

  const handleEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setDebtForm({
      name: debt.name,
      totalAmount: debt.total_amount.toString(),
      paidAmount: debt.paid_amount.toString(),
      interestRate: debt.interest_rate.toString(),
      startDate: new Date(debt.start_date),
      dueDate: new Date(debt.due_date),
      monthlyPayment: debt.monthly_payment.toString(),
      installmentsCount: '',
      frequency: debt.frequency || 'monthly',
      notes: debt.notes,
      userId: debt.user_id
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
      name: '', totalAmount: '', paidAmount: '', interestRate: '',
      startDate: new Date(), dueDate: new Date(), monthlyPayment: '',
      installmentsCount: '', frequency: 'monthly', notes: '', userId: currentUser?.id || ''
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
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Nova Dívida</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-expense/10 border-expense/20"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-expense text-white"><TrendingDown className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Restante</p><p className="text-2xl font-bold text-expense">{formatCurrency(totalDebt)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Dívidas Ativas</p><p className="text-2xl font-bold">{activeDebts.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-income/10"><CheckCircle className="h-5 w-5 text-income" /></div><div><p className="text-sm text-muted-foreground">Quitadas</p><p className="text-2xl font-bold">{paidDebts.length}</p></div></div></CardContent></Card>
      </div>

      <div className="grid gap-4">
        {activeDebts.map(debt => {
          const percentage = (debt.paid_amount / debt.total_amount) * 100;
          return (
            <Card key={debt.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div><h3 className="font-semibold text-lg">{debt.name}</h3><p className="text-sm text-muted-foreground">Vencimento: {format(new Date(debt.due_date), 'dd/MM/yyyy')}</p></div>
                  <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => handleEditDebt(debt)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteDebt(debt.id)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{formatCurrency(debt.total_amount)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Pago</p><p className="font-semibold text-income">{formatCurrency(debt.paid_amount)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Restante</p><p className="font-semibold text-expense">{formatCurrency(debt.total_amount - debt.paid_amount)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Parcela</p><p className="font-semibold">{formatCurrency(debt.monthly_payment)}</p></div>
                </div>
                <div className="space-y-2 mb-4"><div className="flex justify-between text-sm"><span>Progresso</span><span>{percentage.toFixed(0)}%</span></div><Progress value={percentage} className="h-2" /></div>
                <Button variant="outline" onClick={() => { setSelectedDebt(debt); setPaymentAmount(debt.monthly_payment.toString()); setPaymentDialogOpen(true); }}><DollarSign className="h-4 w-4 mr-2" /> Registrar Pagamento</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingDebt ? 'Editar Dívida' : 'Nova Dívida'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Responsável</Label><Select value={debtForm.userId} onValueChange={v => setDebtForm({...debtForm, userId: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Nome da Dívida *</Label><Input value={debtForm.name} onChange={(e) => setDebtForm(prev => ({ ...prev, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor Total *</Label><Input type="number" step="0.01" value={debtForm.totalAmount} onChange={(e) => setDebtForm(prev => ({ ...prev, totalAmount: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Valor da Parcela</Label><Input type="number" step="0.01" value={debtForm.monthlyPayment} onChange={(e) => setDebtForm(prev => ({ ...prev, monthlyPayment: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Já Pago</Label><Input type="number" step="0.01" value={debtForm.paidAmount} onChange={(e) => setDebtForm(prev => ({ ...prev, paidAmount: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={format(debtForm.dueDate, 'yyyy-MM-dd')} onChange={(e) => setDebtForm(prev => ({ ...prev, dueDate: new Date(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSaveDebt}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4"><div className="space-y-2"><Label>Valor do Pagamento</Label><Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button><Button onClick={handleConfirmPayment}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}