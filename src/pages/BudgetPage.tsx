import { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { UserFilter } from '@/components/UserFilter';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, PieChart, Sparkles, Users } from 'lucide-react';
import { formatCurrency, getCurrentMonth, generateId } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function BudgetPage() {
  const { allTransactions, categories, allBudgets, saveBudget } = useFinance();
  const { currentUser } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    income: '',
    categoryLimits: {} as Record<string, string>
  });

  const budget = useMemo(() => {
    if (selectedUserId === 'all') {
      return allBudgets.find(b => b.user_id === null && b.month === selectedMonth) || null;
    }
    return allBudgets.find(b => b.user_id === selectedUserId && b.month === selectedMonth) || null;
  }, [allBudgets, selectedUserId, selectedMonth]);

  useEffect(() => {
    if (budget) {
      setBudgetForm({
        income: budget.income.toString(),
        categoryLimits: Object.fromEntries(Object.entries(budget.category_limits).map(([k, v]) => [k, v.toString()]))
      });
    } else {
      setBudgetForm({ income: '', categoryLimits: {} });
    }
  }, [budget]);

  const monthStats = useMemo(() => {
    const monthTransactions = allTransactions.filter(t => 
      t.effectiveMonth === selectedMonth && 
      t.status !== 'cancelled' &&
      (selectedUserId === 'all' || t.userId === selectedUserId)
    );
    
    const expenses = monthTransactions
      .filter(t => (t.type === 'EXPENSE' || t.type === 'CREDIT') && !t.description.includes('Pagamento de Fatura'))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const byCategory: Record<string, number> = {};
    monthTransactions.filter(t => (t.type === 'EXPENSE' || t.type === 'CREDIT') && !t.description.includes('Pagamento de Fatura')).forEach(t => {
      if (t.categoryId) byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
    });
    
    return { expenses, byCategory };
  }, [allTransactions, selectedMonth, selectedUserId]);

  const handleSaveBudget = async () => {
    try {
      await saveBudget({
        id: budget?.id || generateId(),
        userId: selectedUserId === 'all' ? null : selectedUserId,
        month: selectedMonth,
        income: parseFloat(budgetForm.income) || 0,
        savingsGoal: budget?.savings_goal || 0,
        categoryLimits: Object.fromEntries(
          Object.entries(budgetForm.categoryLimits)
            .filter(([_, v]) => v)
            .map(([k, v]) => [k, parseFloat(v) || 0])
        )
      });
      toast({ title: 'Orçamento salvo!' });
      setDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.kind === 'despesa');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Orçamento</h1>
          <p className="text-muted-foreground">Planeje seus limites por categoria</p>
        </div>
        <div className="flex items-center gap-3">
          <UserFilter value={selectedUserId} onChange={setSelectedUserId} className="w-[200px]" />
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary">
            <PieChart className="h-4 w-4 mr-2" />
            {budget ? 'Ajustar Limites' : 'Definir Orçamento'}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setSelectedMonth(format(subMonths(parse(selectedMonth, 'yyyy-MM', new Date()), 1), 'yyyy-MM'))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-lg font-medium min-w-[150px] text-center capitalize">{format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: ptBR })}</span>
        <Button variant="outline" size="icon" onClick={() => setSelectedMonth(format(addMonths(parse(selectedMonth, 'yyyy-MM', new Date()), 1), 'yyyy-MM'))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {!budget ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhum planejamento para {selectedUserId === 'all' ? 'a Família' : 'este usuário'} neste mês
            </h3>
            <Button onClick={() => setDialogOpen(true)}>Começar Planejamento</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-xl bg-income/10"><TrendingUp className="h-5 w-5 text-income" /></div><div><p className="text-sm text-muted-foreground">Renda Base {selectedUserId === 'all' && '(Família)'}</p><p className="text-2xl font-bold">{formatCurrency(budget.income)}</p></div></CardContent></Card>
            <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-xl bg-expense/10"><TrendingDown className="h-5 w-5 text-expense" /></div><div><p className="text-sm text-muted-foreground">Gasto Total {selectedUserId === 'all' && '(Família)'}</p><p className="text-2xl font-bold">{formatCurrency(monthStats.expenses)}</p></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedUserId === 'all' ? <Users className="w-5 h-5 text-primary" /> : null}
                Limites por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {expenseCategories.filter(c => budget.category_limits[c.id] > 0 || monthStats.byCategory[c.id] > 0).map(cat => {
                const spent = monthStats.byCategory[cat.id] || 0;
                const limit = budget.category_limits[cat.id] || 0;
                const percent = limit > 0 ? (spent / limit) * 100 : 0;
                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">{cat.icon} {cat.name}</span>
                      <span className="font-medium">{formatCurrency(spent)} / {formatCurrency(limit)}</span>
                    </div>
                    <Progress value={Math.min(percent, 100)} className={cn("h-2", percent > 100 ? "bg-expense/20" : "")} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planejamento de Limites - {selectedUserId === 'all' ? 'Família' : 'Individual'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Renda Base para Cálculo</Label>
              <Input type="number" value={budgetForm.income} onChange={e => setBudgetForm({...budgetForm, income: e.target.value})} placeholder="0.00" />
            </div>
            
            <div className="space-y-4">
              <Label>Limites por Categoria</Label>
              {expenseCategories.map(cat => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-muted rounded-lg">{cat.icon}</span>
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <Input type="number" className="w-24 h-8" value={budgetForm.categoryLimits[cat.id] || ''} onChange={e => setBudgetForm({...budgetForm, categoryLimits: {...budgetForm.categoryLimits, [cat.id]: e.target.value}})} placeholder="0.00" />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSaveBudget}>Salvar Orçamento</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}