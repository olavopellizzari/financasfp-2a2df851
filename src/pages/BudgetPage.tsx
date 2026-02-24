import { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, PieChart, Sparkles } from 'lucide-react';
import { db, Budget, formatCurrency, getCurrentMonth, generateId } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function BudgetPage() {
  const { transactions, categories, refresh } = useFinance();
  const { currentUser } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [budget, setBudget] = useState<Budget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    income: '',
    categoryLimits: {} as Record<string, string>
  });

  useEffect(() => {
    loadBudget();
  }, [selectedMonth, currentUser?.id]);

  const loadBudget = async () => {
    if (!currentUser) return;
    const budgets = await db.getAll<Budget>('budgets');
    const found = budgets.find(b => b.user_id === currentUser.id && b.month === selectedMonth);
    setBudget(found || null);
    if (found) {
      setBudgetForm({
        income: found.income.toString(),
        categoryLimits: Object.fromEntries(Object.entries(found.category_limits).map(([k, v]) => [k, v.toString()]))
      });
    }
  };

  const monthStats = useMemo(() => {
    const monthTransactions = transactions.filter(t => t.effectiveMonth === selectedMonth && t.status !== 'cancelled');
    const expenses = monthTransactions.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
    const byCategory: Record<string, number> = {};
    monthTransactions.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').forEach(t => {
      if (t.categoryId) byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
    });
    return { expenses, byCategory };
  }, [transactions, selectedMonth]);

  const applyPercentageRule = (rule: '50/30/20' | '70/20/10') => {
    const income = parseFloat(budgetForm.income) || 0;
    if (income <= 0) {
      toast({ title: "Informe sua renda primeiro", variant: "destructive" });
      return;
    }

    const newLimits: Record<string, string> = {};
    const expenseCats = categories.filter(c => c.type === 'expense' || c.type === 'both');
    
    // Lógica simplificada de distribuição
    const essentialLimit = rule === '50/30/20' ? income * 0.5 : income * 0.7;
    const lifestyleLimit = rule === '50/30/20' ? income * 0.3 : income * 0.2;

    // Distribui entre as primeiras categorias como exemplo
    expenseCats.slice(0, 5).forEach((cat, i) => {
      if (i < 3) newLimits[cat.id] = (essentialLimit / 3).toFixed(2);
      else newLimits[cat.id] = (lifestyleLimit / 2).toFixed(2);
    });

    setBudgetForm(prev => ({ ...prev, categoryLimits: newLimits }));
    toast({ title: `Regra ${rule} aplicada!` });
  };

  const handleSaveBudget = async () => {
    if (!currentUser) return;
    try {
      const budgetData: Budget = {
        id: budget?.id || generateId(),
        user_id: currentUser.id,
        month: selectedMonth,
        income: parseFloat(budgetForm.income) || 0,
        expenses: monthStats.expenses,
        savings_goal: budget?.savings_goal || 0,
        cycle_end_day: budget?.cycle_end_day || 28,
        category_limits: Object.fromEntries(Object.entries(budgetForm.categoryLimits).filter(([_, v]) => v).map(([k, v]) => [k, parseFloat(v) || 0])),
        created_at: budget?.created_at || new Date(),
        updatedAt: new Date()
      };
      budget ? await db.put('budgets', budgetData) : await db.add('budgets', budgetData);
      toast({ title: 'Orçamento salvo!' });
      setDialogOpen(false);
      await loadBudget();
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orçamento</h1>
          <p className="text-muted-foreground">Planeje seus limites por categoria</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gradient-primary">
          <PieChart className="h-4 w-4 mr-2" />
          {budget ? 'Ajustar Limites' : 'Definir Orçamento'}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setSelectedMonth(format(subMonths(parse(selectedMonth, 'yyyy-MM', new Date()), 1), 'yyyy-MM'))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-lg font-medium min-w-[150px] text-center">{format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: ptBR })}</span>
        <Button variant="outline" size="icon" onClick={() => setSelectedMonth(format(addMonths(parse(selectedMonth, 'yyyy-MM', new Date()), 1), 'yyyy-MM'))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {!budget ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center"><Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium mb-2">Nenhum planejamento para este mês</h3><Button onClick={() => setDialogOpen(true)}>Começar Planejamento</Button></CardContent></Card>
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-xl bg-income/10"><TrendingUp className="h-5 w-5 text-income" /></div><div><p className="text-sm text-muted-foreground">Renda Base</p><p className="text-2xl font-bold">{formatCurrency(budget.income)}</p></div></CardContent></Card>
            <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-xl bg-expense/10"><TrendingDown className="h-5 w-5 text-expense" /></div><div><p className="text-sm text-muted-foreground">Gasto Total</p><p className="text-2xl font-bold">{formatCurrency(monthStats.expenses)}</p></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Limites por Categoria</CardTitle></CardHeader>
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
          <DialogHeader><DialogTitle>Planejamento de Limites</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2"><Label>Renda Base para Cálculo</Label><Input type="number" value={budgetForm.income} onChange={e => setBudgetForm({...budgetForm, income: e.target.value})} placeholder="0.00" /></div>
            
            <div className="space-y-3">
              <Label>Sugestões Automáticas</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => applyPercentageRule('50/30/20')} className="flex-1"><Sparkles className="h-3 w-3 mr-2" /> Regra 50/30/20</Button>
                <Button variant="outline" size="sm" onClick={() => applyPercentageRule('70/20/10')} className="flex-1"><Sparkles className="h-3 w-3 mr-2" /> Regra 70/20/10</Button>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Limites Manuais</Label>
              {expenseCategories.slice(0, 12).map(cat => (
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