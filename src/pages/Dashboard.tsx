"use client";

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, Transaction, Category, Card as CardType } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserFilter } from '@/components/UserFilter';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { QuickWidget } from '@/components/QuickWidget';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Plus,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronDown,
  AlertCircle,
  ArrowRight,
  History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parse, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval, getYear, setDate, differenceInDays, startOfDay, isSameMonth, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface BalanceCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'income' | 'expense' | 'credit' | 'pending';
  subtitle?: string;
  isPrivate?: boolean;
  children?: React.ReactNode;
}

function BalanceCard({ title, amount, icon, variant = 'default', subtitle, isPrivate, children }: BalanceCardProps) {
  const gradientClass = variant === 'primary' ? 'gradient-primary text-primary-foreground' : variant === 'income' ? 'bg-income/10' : variant === 'expense' ? 'bg-expense/10' : variant === 'credit' ? 'bg-credit/10' : variant === 'pending' ? 'bg-warning/10' : 'bg-card';
  const textColorClass = variant === 'primary' ? 'text-primary-foreground' : variant === 'income' ? 'text-income' : variant === 'expense' ? 'text-expense' : variant === 'credit' ? 'text-credit' : variant === 'pending' ? 'text-warning' : 'text-foreground';

  return (
    <Card className={`finance-card ${gradientClass} ${variant === 'primary' ? 'shadow-primary border-0' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-sm font-medium ${variant === 'primary' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-2xl font-bold ${textColorClass}`}>
                {isPrivate ? '••••••' : formatCurrency(amount)}
              </p>
              {children}
            </div>
            {subtitle && <p className={`text-xs mt-1 ${variant === 'primary' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${variant === 'primary' ? 'bg-primary-foreground/20' : 'bg-muted'}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { currentUser, users, isCurrentUserAdmin } = useAuth();
  const { accounts, allAccounts, cards, allCards, transactions, allTransactions, categories, allBudgets, getAccountBalance, getCategoryById } = useFinance();
  const navigate = useNavigate();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isPrivate, setIsPrivate] = useState(false);
  const [viewType, setViewType] = useState<'monthly' | 'annual'>('monthly');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  
  const isAdmin = isCurrentUserAdmin();
  
  const selectedMonthStr = useMemo(() => {
    if (!selectedMonth || !isValid(selectedMonth)) return format(new Date(), 'yyyy-MM');
    return format(selectedMonth, 'yyyy-MM');
  }, [selectedMonth]);

  const userFilteredTransactions = useMemo(() => {
    const source = isAdmin ? allTransactions : transactions;
    return source.filter(t => selectedUserId === 'all' || t.userId === selectedUserId);
  }, [allTransactions, transactions, selectedUserId, isAdmin]);

  const filteredAccounts = useMemo(() => {
    const source = isAdmin ? allAccounts : accounts;
    return source.filter(a => selectedUserId === 'all' || a.userId === selectedUserId);
  }, [allAccounts, accounts, selectedUserId, isAdmin]);

  const filteredCards = useMemo(() => {
    const source = isAdmin ? allCards : cards;
    return source.filter(c => selectedUserId === 'all' || c.userId === selectedUserId);
  }, [allCards, cards, selectedUserId, isAdmin]);

  const hasAccounts = useMemo(() => filteredAccounts.length > 0, [filteredAccounts]);

  const launchTransactions = useMemo(() => {
    return userFilteredTransactions.filter(t => t.effectiveMonth === selectedMonthStr && t.status !== 'cancelled');
  }, [userFilteredTransactions, selectedMonthStr]);

  const activityTransactions = useMemo(() => {
    return userFilteredTransactions.filter(t => {
      const date = t.purchaseDate instanceof Date ? t.purchaseDate : new Date(t.purchaseDate);
      return isValid(date) && isSameMonth(date, selectedMonth) &&
      t.status !== 'cancelled' &&
      (!t.installmentNumber || t.installmentNumber === 1);
    });
  }, [userFilteredTransactions, selectedMonth]);

  const recentTransactions = useMemo(() => {
    return [...userFilteredTransactions]
      .sort((a, b) => new Date(b.createdAt || b.purchaseDate).getTime() - new Date(a.createdAt || a.purchaseDate).getTime())
      .slice(0, 10);
  }, [userFilteredTransactions]);

  const stats = useMemo(() => {
    const income = launchTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = launchTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const totalCredit = launchTransactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const totalRefund = launchTransactions.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);

    return { 
      income, 
      totalExpenses, 
      totalCredit: totalCredit - totalRefund,
      balance: income - totalExpenses - (totalCredit - totalRefund) 
    };
  }, [launchTransactions]);

  const cashFlowData = useMemo(() => {
    const getMonthData = (monthStr: string) => {
      const txs = userFilteredTransactions.filter(t => t.effectiveMonth === monthStr && t.status !== 'cancelled');
      const inc = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
      const ref = txs.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
      const finalExp = exp - ref;
      return { income: inc, expense: finalExp, balance: inc - finalExp };
    };

    if (viewType === 'monthly') {
      const start = startOfYear(selectedMonth);
      const months = eachMonthOfInterval({ start, end: endOfYear(selectedMonth) });
      return months.map(date => {
        const mStr = format(date, 'yyyy-MM');
        const data = getMonthData(mStr);
        return { name: format(date, 'MMM', { locale: ptBR }), ...data };
      });
    } else {
      const currentYear = getYear(selectedMonth);
      return Array.from({ length: 5 }).map((_, i) => {
        const year = currentYear - (4 - i);
        let yearInc = 0; let yearExp = 0;
        for (let m = 1; m <= 12; m++) {
          const mStr = `${year}-${String(m).padStart(2, '0')}`;
          const data = getMonthData(mStr);
          yearInc += data.income; yearExp += data.expense;
        }
        return { name: year.toString(), income: yearInc, expense: yearExp, balance: yearInc - yearExp };
      });
    }
  }, [userFilteredTransactions, selectedMonth, viewType]);

  const cardSpending = useMemo(() => {
    return filteredCards.map(card => {
      const amount = activityTransactions.filter(t => t.cardId === card.id).reduce((s, t) => {
        if (t.type === 'REFUND') return s - t.amount;
        return s + t.amount;
      }, 0);
      return { name: card.name, amount, color: card.color };
    }).filter(c => c.amount !== 0).sort((a, b) => b.amount - a.amount);
  }, [activityTransactions, filteredCards]);

  const categorySpending = useMemo(() => {
    const grouped = activityTransactions
      .filter(tx => tx.type === 'EXPENSE' || tx.type === 'CREDIT' || tx.type === 'REFUND')
      .reduce((acc, tx) => {
        const cat = categories.find(c => c.id === tx.categoryId);
        const catName = cat?.name || 'Outros';
        const amount = tx.type === 'REFUND' ? -tx.amount : tx.amount;
        acc[catName] = (acc[catName] || 0) + amount;
        return acc;
      }, {} as Record<string, number>);
    
    const values = Object.values(grouped);
    const total = values.reduce((s: number, v: number) => s + v, 0);
    
    return Object.entries(grouped).map(([name, amount]) => {
      const numAmount = amount as number;
      const numTotal = total as number;
      return { 
        name, 
        amount: numAmount, 
        percent: numTotal > 0 ? (numAmount / numTotal) * 100 : 0, 
        color: categories.find(c => c.name === name)?.color || '#94a3b8' 
      };
    }).sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [activityTransactions, categories]);

  const totalBalance = useMemo(() => {
    return filteredAccounts.filter(a => !a.isArchived).reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  }, [filteredAccounts, getAccountBalance]);

  const safeFormatDate = (date: Date | string, formatStr: string) => {
    if (!date) return '';
    let d: Date;
    if (typeof date === 'string') {
      if (date.includes('-') && date.length <= 10) {
        const [year, month, day] = date.split('-').map(Number);
        d = new Date(year, month - 1, day, 12, 0, 0);
      } else {
        d = new Date(date);
      }
    } else {
      d = date;
    }
    if (!isValid(d)) return '';
    return format(d, formatStr, { locale: ptBR });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel</h1>
          <div className="flex items-center gap-2 mt-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">{safeFormatDate(selectedMonth, 'MMMM yyyy')}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <UserFilter value={selectedUserId} onChange={setSelectedUserId} className="w-[180px]" />
          <Button variant="ghost" size="icon" onClick={() => setIsPrivate(!isPrivate)} title={isPrivate ? "Mostrar valores" : "Ocultar valores"}>{isPrivate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</Button>
          <NotificationsPanel />
          <Button onClick={() => navigate('/transactions')} className="gradient-primary shadow-primary"><Plus className="w-4 h-4 mr-2" /> Novo Lançamento</Button>
        </div>
      </div>

      <QuickWidget selectedUserId={selectedUserId} date={selectedMonth} />

      {!hasAccounts && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 animate-slide-up">
          <AlertCircle className="h-5 w-5" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <div>
              <AlertTitle className="font-bold">Ação Necessária: Cadastre uma Conta</AlertTitle>
              <AlertDescription>Para gerenciar seus pagamentos e ter um controle real do seu saldo, você precisa cadastrar uma conta bancária ou carteira.</AlertDescription>
            </div>
            <Button variant="destructive" size="sm" onClick={() => navigate('/accounts')} className="shrink-0">Cadastrar Agora<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <BalanceCard title="Saldo Atual" amount={totalBalance} icon={<Wallet className="w-5 h-5 text-primary-foreground" />} variant="primary" isPrivate={isPrivate}>
          <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"><ChevronDown className="w-4 h-4" /></Button></PopoverTrigger><PopoverContent className="w-64 p-2"><div className="space-y-2"><p className="text-xs font-bold text-muted-foreground px-2 py-1">Saldos por Conta</p>{filteredAccounts.filter(a => !a.isArchived).map(acc => (<div key={acc.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} /><span className="text-sm font-medium">{acc.name}</span></div><span className="text-sm font-bold">{isPrivate ? '•••' : formatCurrency(getAccountBalance(acc.id))}</span></div>))}</div></PopoverContent></Popover>
        </BalanceCard>
        <BalanceCard title="Receitas (Lançamentos)" amount={stats.income} icon={<TrendingUp className="w-5 h-5 text-income" />} variant="income" isPrivate={isPrivate} />
        <BalanceCard title="Despesas (Lançamentos)" amount={stats.totalExpenses} icon={<TrendingDown className="w-5 h-5 text-expense" />} variant="expense" isPrivate={isPrivate} />
        <BalanceCard title="Cartão (Lançamentos)" amount={stats.totalCredit} icon={<CreditCard className="w-5 h-5 text-credit" />} variant="credit" isPrivate={isPrivate} />
        <BalanceCard title="Resultado Lançamentos" amount={stats.balance} icon={<BarChart3 className="w-5 h-5 text-warning" />} variant="pending" isPrivate={isPrivate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Fluxo de Lançamentos</CardTitle>
            <div className="flex bg-muted p-1 rounded-lg">
              <button onClick={() => setViewType('monthly')} className={cn("px-3 py-1 text-xs rounded-md transition-all", viewType === 'monthly' ? "bg-background shadow-sm font-bold" : "text-muted-foreground")}>Mensal</button>
              <button onClick={() => setViewType('annual')} className={cn("px-3 py-1 text-xs rounded-md transition-all", viewType === 'annual' ? "bg-background shadow-sm font-bold" : "text-muted-foreground")}>Anual</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border shadow-lg p-3 rounded-xl">
                          <p className="font-bold mb-2">{payload[0].payload.name}</p>
                          <div className="space-y-1">
                            <p className="text-xs text-income flex justify-between gap-4">Receitas: <span>{formatCurrency(payload[0].value as number)}</span></p>
                            <p className="text-xs text-expense flex justify-between gap-4">Despesas: <span>{formatCurrency(payload[1].value as number)}</span></p>
                            <div className="border-t pt-1 mt-1"><p className="text-xs font-bold flex justify-between gap-4">Saldo: <span>{formatCurrency(payload[0].payload.balance)}</span></p></div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Resumo de Lançamentos</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className={cn("text-3xl font-bold", stats.balance >= 0 ? 'text-income' : 'text-expense')}>{isPrivate ? '••••••' : `${stats.balance >= 0 ? '+' : ''}${formatCurrency(stats.balance)}`}</p>
              <p className="text-xs text-muted-foreground mt-1">Resultado baseado no planejamento de vencimentos</p>
            </div>
            <div className="space-y-4">
              <div className="pt-4 border-t">
                <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">Comprometimento da Renda</span><span className="font-bold">{stats.income > 0 ? Math.round(((stats.totalExpenses + stats.totalCredit) / stats.income) * 100) : 0}%</span></div>
                <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${Math.min(stats.income > 0 ? ((stats.totalExpenses + stats.totalCredit) / stats.income) * 100 : 0, 100)}%` }} /></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-credit" /> Gastos por Cartão (Atividade Real)</CardTitle></CardHeader>
          <CardContent>{cardSpending.length > 0 ? (<div className="space-y-4">{cardSpending.map(card => (<div key={card.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-card shadow-sm"><CreditCard className="w-4 h-4" style={{ color: card.color }} /></div><span className="font-medium">{card.name}</span></div><span className="font-bold">{isPrivate ? '•••' : formatCurrency(card.amount)}</span></div>))}</div>) : (<div className="py-8 text-center text-muted-foreground">Nenhum gasto no cartão este mês</div>)}</CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-primary" /> Top 10 Despesas (Atividade Real)</CardTitle></CardHeader>
          <CardContent>{categorySpending.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center"><div className="h-[200px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categorySpending} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="amount">{categorySpending.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip formatter={(value: number) => formatCurrency(value)} /></PieChart></ResponsiveContainer></div><div className="space-y-2">{categorySpending.slice(0, 5).map(cat => (<div key={cat.name} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2 min-w-0"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} /><span className="truncate">{cat.name}</span></div><span className="font-bold shrink-0 ml-2">{cat.percent.toFixed(0)}%</span></div>))}{categorySpending.length > 5 && (<p className="text-[10px] text-muted-foreground text-center pt-2">E mais {categorySpending.length - 5} categorias...</p>)}</div></div>) : (<div className="py-8 text-center text-muted-foreground">Nenhum gasto registrado este mês</div>)}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Últimas Transações (Sistema)</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>Ver todas</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map(tx => {
                  const cat = getCategoryById(tx.categoryId);
                  return (
                    <div key={tx.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg">
                          {cat?.icon || '💰'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[120px]">{tx.description}</p>
                          <p className="text-[10px] text-muted-foreground">{safeFormatDate(tx.purchaseDate, 'dd/MM/yy')}</p>
                        </div>
                      </div>
                      <span className={cn("text-sm font-bold", (tx.type === 'INCOME' || tx.type === 'REFUND') ? 'text-income' : 'text-expense')}>
                        {(tx.type === 'INCOME' || tx.type === 'REFUND') ? '+' : '-'} {isPrivate ? '•••' : formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground">Nenhuma transação recente</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}