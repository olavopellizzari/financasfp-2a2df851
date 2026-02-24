import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Plus, 
  Wallet, 
  AlertTriangle, 
  CheckCircle, 
  TrendingDown,
  CalendarIcon,
  Pencil,
  Trash2,
  DollarSign
} from 'lucide-react';
import { db, Debt, formatCurrency, generateId } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, differenceInDays, differenceInMonths, isBefore, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function DebtsPage() {
  const { currentUser } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const [debtForm, setDebtForm] = useState({
    name: '',
    totalAmount: '',
    paidAmount: '',
    interestRate: '',
    startDate: new Date(),
    dueDate: new Date(),
    monthlyPayment: '',
    notes: ''
  });

  useEffect(() => {
    loadDebts();
  }, [currentUser?.id]);

  const loadDebts = async () => {
    if (!currentUser) return;
    const data = await db.getAll<Debt>('debts');
    setDebts(data.filter(d => d.user_id === currentUser.id));
  };

  const handleSaveDebt = async () => {
    if (!currentUser || !debtForm.name || !debtForm.totalAmount) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      const debt: Debt = {
        id: editingDebt?.id || generateId(),
        user_id: currentUser.id,
        name: debtForm.name,
        total_amount: parseFloat(debtForm.totalAmount) || 0,
        paid_amount: parseFloat(debtForm.paidAmount) || 0,
        interest_rate: parseFloat(debtForm.interestRate) || 0,
        start_date: debtForm.startDate as any,
        due_date: debtForm.dueDate as any,
        monthly_payment: parseFloat(debtForm.monthlyPayment) || 0,
        is_active: true,
        notes: debtForm.notes,
        createdAt: editingDebt?.createdAt || new Date(),
        updatedAt: new Date()
      };

      if (debt.paid_amount >= debt.total_amount) {
        debt.is_active = false;
      }

      if (editingDebt) {
        await db.put('debts', debt);
        toast({ title: 'Dívida atualizada!' });
      } else {
        await db.add('debts', debt);
        toast({ title: 'Dívida registrada!' });
      }

      setDialogOpen(false);
      resetForm();
      await loadDebts();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar dívida', variant: 'destructive' });
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
      notes: debt.notes
    });
    setDialogOpen(true);
  };

  const handleDeleteDebt = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta dívida?')) return;
    try {
      await db.delete('debts', id);
      toast({ title: 'Dívida excluída!' });
      await loadDebts();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir dívida', variant: 'destructive' });
    }
  };

  const handlePayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentAmount(debt.monthly_payment.toString());
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedDebt || !paymentAmount) return;

    try {
      const amount = parseFloat(paymentAmount);
      const newPaidAmount = selectedDebt.paid_amount + amount;

      const updatedDebt: Debt = {
        ...selectedDebt,
        paid_amount: newPaidAmount,
        is_active: newPaidAmount < selectedDebt.total_amount,
        updatedAt: new Date()
      };

      await db.put('debts', updatedDebt);

      if (!updatedDebt.is_active) {
        toast({ title: '🎉 Parabéns!', description: 'Dívida quitada!' });
      } else {
        toast({ title: 'Pagamento registrado!' });
      }

      setPaymentDialogOpen(false);
      await loadDebts();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao registrar pagamento', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingDebt(null);
    setDebtForm({
      name: '',
      totalAmount: '',
      paidAmount: '',
      interestRate: '',
      startDate: new Date(),
      dueDate: new Date(),
      monthlyPayment: '',
      notes: ''
    });
  };

  const activeDebts = debts.filter(d => d.is_active);
  const paidDebts = debts.filter(d => !d.is_active);
  const totalDebt = activeDebts.reduce((sum, d) => sum + (d.total_amount - d.paid_amount), 0);
  const overdueDebts = activeDebts.filter(d => isBefore(new Date(d.due_date), new Date()));
  const monthlyPayments = activeDebts.reduce((sum, d) => sum + d.monthly_payment, 0);

  const safeFormatDate = (date: Date | string, formatStr: string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(d)) return '---';
    return format(d, formatStr, { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dívidas</h1>
          <p className="text-muted-foreground">Controle suas dívidas e financiamentos</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Dívida
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-expense/20">
                <TrendingDown className="h-5 w-5 text-expense" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Restante</p>
                <p className="text-2xl font-bold text-expense">{formatCurrency(totalDebt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-2xl font-bold">{overdueDebts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mensalidades</p>
                <p className="text-2xl font-bold">{formatCurrency(monthlyPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-income/20">
                <CheckCircle className="h-5 w-5 text-income" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quitadas</p>
                <p className="text-2xl font-bold">{paidDebts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Debts */}
      {activeDebts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Dívidas Ativas</h2>
          <div className="grid gap-4">
            {activeDebts.map(debt => {
              const percentage = (debt.paid_amount / debt.total_amount) * 100;
              const remaining = debt.total_amount - debt.paid_amount;
              const isOverdue = isBefore(new Date(debt.due_date), new Date());
              const monthsRemaining = differenceInMonths(new Date(debt.due_date), new Date());

              return (
                <Card key={debt.id} className={isOverdue ? 'border-destructive' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{debt.name}</h3>
                          {isOverdue && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Vencida
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Vencimento: {safeFormatDate(debt.due_date, 'dd/MM/yyyy')}
                          {monthsRemaining > 0 && ` (${monthsRemaining} meses restantes)`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditDebt(debt)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDebt(debt.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Total</p>
                        <p className="font-semibold">{formatCurrency(debt.total_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pago</p>
                        <p className="font-semibold text-income">{formatCurrency(debt.paid_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Restante</p>
                        <p className="font-semibold text-expense">{formatCurrency(remaining)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Parcela Mensal</p>
                        <p className="font-semibold">{formatCurrency(debt.monthly_payment)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span>{percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={percentage} className="h-3" />
                    </div>

                    <Button variant="outline" onClick={() => handlePayment(debt)}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Registrar Pagamento
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Paid Debts */}
      {paidDebts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-income" />
            Dívidas Quitadas
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {paidDebts.map(debt => (
              <Card key={debt.id} className="bg-income/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-income" />
                    <div>
                      <h3 className="font-semibold">{debt.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(debt.total_amount)} quitados
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {debts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma dívida cadastrada</h3>
            <p className="text-muted-foreground mb-4">Registre suas dívidas para acompanhar o progresso</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Dívida
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Debt Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDebt ? 'Editar Dívida' : 'Nova Dívida'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Nome da Dívida *</Label>
              <Input
                value={debtForm.name}
                onChange={(e) => setDebtForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Financiamento Casa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Total *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={debtForm.totalAmount}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Já Pago</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={debtForm.paidAmount}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, paidAmount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parcela Mensal</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={debtForm.monthlyPayment}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, monthlyPayment: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de Juros (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={debtForm.interestRate}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, interestRate: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {isValid(debtForm.startDate) ? format(debtForm.startDate, 'dd/MM/yyyy') : '---'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={debtForm.startDate}
                      onSelect={(date) => date && setDebtForm(prev => ({ ...prev, startDate: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {isValid(debtForm.dueDate) ? format(debtForm.dueDate, 'dd/MM/yyyy') : '---'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={debtForm.dueDate}
                      onSelect={(date) => date && setDebtForm(prev => ({ ...prev, dueDate: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={debtForm.notes}
                onChange={(e) => setDebtForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveDebt}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor do Pagamento</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {selectedDebt && (
              <p className="text-sm text-muted-foreground">
                Restante após pagamento: {formatCurrency(selectedDebt.total_amount - selectedDebt.paid_amount - (parseFloat(paymentAmount) || 0))}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmPayment}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
