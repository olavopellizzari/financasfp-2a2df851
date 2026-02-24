"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { QuickWidget } from '@/components/QuickWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  TrendingUp, 
  Calendar, 
  Plus,
  Calculator,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  History,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Zap
} from 'lucide-react';
import { db, CycleSnapshot, formatCurrency, generateId, getCurrentMonth } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, parse, differenceInDays, setDate, getDate, addMonths, subMonths, startOfDay, isAfter, isSameMonth, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';

export function EvolutionPage() {
  const { currentUser, users } = useAuth();
  const { allTransactions, allAccounts, allBudgets, getAccountBalance, saveBudget } = useFinance();
  const [snapshots, setSnapshots] = useState<CycleSnapshot[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'all');
  
  const [viewDate, setViewDate] = useState(new Date());
  
  const selectedMonthStr = useMemo(() => {
    if (!viewDate || !isValid(viewDate)) return format(new Date(), 'yyyy-MM');
    return format(viewDate, 'yyyy-MM');
  }, [viewDate]);

  const [configForm, setConfigForm] = useState({
    userId: currentUser?.id || '',
    netSalary: '',
    savingsGoal: '',
    cycleEndDay: '28'
  });

  const [snapshotForm, setSnapshotForm] = useState({
    userId: currentUser?.id || 'all',
    month: getCurrentMonth(),
    totalBalance: ''
  });

  const loadSnapshots = useCallback(async () => {
    const snaps = await db.getAll<CycleSnapshot>('cycleSnapshots');
    setSnapshots(snaps);
    return snaps;
  }, []);

  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

  useEffect(() => {
    const targetUserId = configForm.userId;
    if (targetUserId) {
      const bud = allBudgets.find(b => b.user_id === targetUserId && b.month === selectedMonthStr);
      setConfigForm(prev => ({
        ...prev,
        netSalary: bud?.income.toString() || '',
        savingsGoal: bud?.savings_goal.toString() || '',
        cycleEndDay: (bud?.cycle_end_day || 28).toString()
      }));
    }
  }, [configForm.userId, selectedMonthStr, allBudgets]);

  const cycleInfo = useMemo(() => {
    if (!viewDate || !isValid(viewDate)) return null;

    const today = startOfDay(new Date());
    const isCurrentMonth = isSameMonth(viewDate, today);
    const referenceDate = isCurrentMonth ? today : startOfDay(viewDate);
    
    const parsedDate = parse(selectedMonthStr, 'yyyy-MM', new Date());
    if (!isValid(parsedDate)) return null;
    
    const nextMonthStr = format(addMonths(parsedDate, 1), 'yyyy-MM');

    const targetBudgets = selectedUserId === 'all'
      ? allBudgets.filter(b => b.month === selectedMonthStr)
      : allBudgets.filter(b => b.user_id === selectedUserId && b.month === selectedMonthStr);

    const targetTransactions = (selectedUserId === 'all' ? allTransactions : allTransactions.filter(t => t.userId === selectedUserId))
      .filter(t => t.effectiveMonth === nextMonthStr && t.status !== 'cancelled');

    if (targetBudgets.length === 0) return null;

    const salary = targetBudgets.reduce((sum, b) => sum + b.income, 0);
    const goal = targetBudgets.reduce((sum, b) => sum + b.savings_goal, 0);
    const cycleEndDay = targetBudgets[0]?.cycle_end_day || 28;

    const spent = targetTransactions
      .filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT' || t.type === 'REFUND')
      .reduce((sum, t) => t.type === 'REFUND' ? sum - t.amount : sum + t.amount, 0);

    let endDate = setDate(parsedDate, cycleEndDay);
    const daysRemaining = Math.max(1, differenceInDays(startOfDay(endDate), referenceDate));
    const available = (salary - goal) - spent;
    const limit = available / daysRemaining;

    return { salary, goal, spent, available, daysRemaining, limit, endDate };
  }, [allBudgets, allTransactions, selectedUserId, selectedMonthStr, viewDate]);

  const evolutionData = useMemo(() => {
    const today = new Date();
    const currentBalance = (selectedUserId === 'all' ? allAccounts : allAccounts.filter(a => a.user_id === selectedUserId))
      .reduce((sum, a) => sum + getAccountBalance(a.id), 0);

    const historyData = [];
    let runningBalance = currentBalance;
    const userTxs = allTransactions.filter(t => (selectedUserId === 'all' || t.userId === selectedUserId) && t.status !== 'cancelled');

    for (let i = 0; i < 6; i++) {
      const monthDate = subMonths(today, i);
      const mStr = format(monthDate, 'yyyy-MM');
      const snap = snapshots.find(s => s.month === mStr && (selectedUserId === 'all' || s.userId === selectedUserId));
      
      if (snap && i > 0) runningBalance = snap.totalBalance;

      historyData.unshift({
        month: format(monthDate, 'MMM/yy', { locale: ptBR }),
        fullMonth: mStr,
        saldo: runningBalance,
        isFuture: false
      });

      const monthTxs = userTxs.filter(t => t.effectiveMonth === mStr);
      const monthIncome = monthTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const monthExpense = monthTxs.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
      const monthRefund = monthTxs.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
      const netChange = monthIncome - (monthExpense - monthRefund);
      runningBalance -= netChange;
    }

    const last3Months = historyData.slice(-4, -1);
    const avgSavings = last3Months.length > 0 
      ? last3Months.reduce((acc, curr, idx, arr) => {
          if (idx === 0) return 0;
          return acc + (curr.saldo - arr[idx-1].saldo);
        }, 0) / (last3Months.length - 1)
      : (cycleInfo?.goal || 0);

    const growthRate = avgSavings > 0 ? avgSavings : (cycleInfo?.goal || 0);
    const futureData = [];
    let projectedBalance = currentBalance;

    for (let i = 1; i <= 6; i++) {
      const futureDate = addMonths(today, i);
      projectedBalance += growthRate;
      futureData.push({
        month: format(futureDate, 'MMM/yy', { locale: ptBR }),
        fullMonth: format(futureDate, 'yyyy-MM'),
        saldo: null,
        projected: projectedBalance,
        isFuture: true
      });
    }

    return [...historyData.map(d => ({ ...d, projected: d.saldo })), ...futureData];
  }, [snapshots, selectedUserId, allAccounts, getAccountBalance, allTransactions, cycleInfo]);

  const handleSaveConfig = async () => {
    const existing = allBudgets.find(b => b.user_id === configForm.userId && b.month === selectedMonthStr);
    await saveBudget({
      id: existing?.id || generateId(), 
      userId: configForm.userId, 
      month: selectedMonthStr,
      income: parseFloat(configForm.netSalary) || 0, 
      expenses: existing?.expenses || 0,
      savingsGoal: parseFloat(configForm.savingsGoal) || 0, 
      cycleEndDay: parseInt(configForm.cycleEndDay) || 28,
      categoryLimits: existing?.category_limits || {}, 
      createdAt: existing?.created_at || new Date(), 
      updatedAt: new Date()
    });
    toast({ title: 'Configuração salva!' });
    setConfigDialogOpen(false);
  };

  const handleSaveSnapshot = async () => {
    try {
      const usersToRegister = snapshotForm.userId === 'all'
        ? users.filter(u => u.is_active !== false)
        : [users.find(u => u.id === snapshotForm.userId)!];

      for (const user of usersToRegister) {
        let balance = parseFloat(snapshotForm.totalBalance);
        if (isNaN(balance) || snapshotForm.userId === 'all') {
          const userAccs = allAccounts.filter(a => a.user_id === user.id || a.is_shared);
          balance = userAccs.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
        }

        const existingSnaps = await db.getAll<CycleSnapshot>('cycleSnapshots');
        const existing = existingSnaps.find(s => s.month === snapshotForm.month && s.userId === user.id);

        const snapshot: CycleSnapshot = {
          id: existing?.id || generateId(),
          month: snapshotForm.month,
          day: getDate(new Date()),
          userId: user.id,
          totalBalance: balance,
          savingsGoal: 0,
          accountBalances: {},
          createdAt: existing?.createdAt || new Date()
        };
        await db.put('cycleSnapshots', snapshot);
      }
      toast({ title: 'Patrimônio registrado!' });
      setDialogOpen(false);
      await loadSnapshots();
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Evolução & Ciclo</h1>
          <p className="text-muted-foreground">Gestão de limite diário e patrimônio automático</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[200px]"><Users className="h-4 w-4 mr-2" /><SelectValue placeholder="Usuário" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Família (Consolidado)</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => {
            if (selectedUserId !== 'all') {
              setConfigForm(prev => ({ ...prev, userId: selectedUserId }));
            } else {
              setConfigForm(prev => ({ ...prev, userId: currentUser?.id || '' }));
            }
            setConfigDialogOpen(true);
          }} className="gradient-primary"><Calculator className="h-4 w-4 mr-2" /> Configurar Ciclo</Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 bg-muted/30 p-2 rounded-xl border border-dashed">
        <Button variant="outline" size="icon" onClick={() => setViewDate(subMonths(viewDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="flex flex-col items-center min-w-[150px]"><span className="text-xs font-bold text-muted-foreground uppercase">Mês de Referência</span><span className="text-lg font-bold capitalize">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</span></div>
        <Button variant="outline" size="icon" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <QuickWidget selectedUserId={selectedUserId} date={viewDate} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="finance-card"><CardContent className="p-5"><p className="text-xs font-bold text-muted-foreground uppercase mb-1">Salário Líquido</p><p className="text-2xl font-bold text-income">{cycleInfo ? formatCurrency(cycleInfo.salary) : '---'}</p></CardContent></Card>
        <Card className="finance-card"><CardContent className="p-5"><p className="text-xs font-bold text-muted-foreground uppercase mb-1">Meta de Economia</p><p className="text-2xl font-bold text-primary">{cycleInfo ? formatCurrency(cycleInfo.goal) : '---'}</p></CardContent></Card>
        <Card className="finance-card"><CardContent className="p-5"><p className="text-xs font-bold text-muted-foreground uppercase mb-1">Gasto no Ciclo</p><p className="text-2xl font-bold text-expense">{cycleInfo ? formatCurrency(cycleInfo.spent) : '---'}</p></CardContent></Card>
        <Card className="finance-card bg-primary/5 border-primary/20"><CardContent className="p-5"><p className="text-xs font-bold text-primary uppercase mb-1">Disponível</p><p className="text-2xl font-bold text-primary">{cycleInfo ? formatCurrency(cycleInfo.available) : '---'}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Evolução Patrimonial & Projeção</CardTitle>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary" /><span>Realizado</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Projetado</span></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border shadow-lg p-4 rounded-xl min-w-[220px]">
                          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase">{format(parse(data.fullMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: ptBR })}</p>
                          <div className="space-y-3">
                            {!data.isFuture && (
                              <div>
                                <p className="text-xs text-muted-foreground">Patrimônio Real</p>
                                <p className="text-2xl font-bold text-primary">{formatCurrency(data.saldo)}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground">{data.isFuture ? 'Patrimônio Esperado' : 'Projeção Base'}</p>
                              <p className="text-xl font-bold text-green-600">{formatCurrency(data.projected)}</p>
                            </div>
                            {data.isFuture && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
                                <Sparkles className="w-3 h-3" /> Baseado na sua média de economia
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Area type="monotone" dataKey="projected" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProj)" />
                  <Area type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorSaldo)" dot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-lg">Histórico de Fechamentos</CardTitle><Button variant="ghost" size="icon" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /></Button></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {evolutionData.filter(d => !d.isFuture).slice().reverse().map((item, idx, arr) => {
                const diff = idx < arr.length - 1 ? item.saldo - arr[idx+1].saldo : 0;
                const parsedItemDate = parse(item.fullMonth, 'yyyy-MM', new Date());
                const displayDate = isValid(parsedItemDate)
                  ? format(parsedItemDate, 'MMMM yyyy', { locale: ptBR })
                  : item.fullMonth;

                return (
                  <div key={item.fullMonth} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div><p className="text-sm font-bold capitalize">{displayDate}</p><p className="text-[10px] text-muted-foreground">Patrimônio Calculado</p></div>
                    <div className="text-right"><p className="text-sm font-bold">{formatCurrency(item.saldo || 0)}</p><p className={cn("text-[10px] font-bold", diff >= 0 ? "text-income" : "text-expense")}>{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</p></div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DIALOGS */}
      <Dialog open={configDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Configuração do Ciclo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Usuário</Label><Select value={configForm.userId} onValueChange={v => setConfigForm({...configForm, userId: v})}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Salário Líquido</Label><Input type="number" value={configForm.netSalary} onChange={e => setConfigForm({...configForm, netSalary: e.target.value})} /></div>
            <div className="space-y-2"><Label>Meta de Economia</Label><Input type="number" value={configForm.savingsGoal} onChange={e => setConfigForm({...configForm, savingsGoal: e.target.value})} /></div>
            <div className="space-y-2"><Label>Dia de Fechamento</Label><Input type="number" value={configForm.cycleEndDay} onChange={e => setConfigForm({...configForm, cycleEndDay: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancelar</Button><Button onClick={handleSaveConfig}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Registro Manual</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Mês</Label><Input type="month" value={snapshotForm.month} onChange={e => setSnapshotForm({...snapshotForm, month: e.target.value})} /></div>
            <div className="space-y-2"><Label>Saldo Total (Opcional)</Label><Input type="number" value={snapshotForm.totalBalance} onChange={e => setSnapshotForm({...snapshotForm, totalBalance: e.target.value})} placeholder="0.00" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSaveSnapshot}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}