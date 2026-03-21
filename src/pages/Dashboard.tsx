"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, Transaction } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserFilter } from '@/components/UserFilter';
import { QuickWidget } from '@/components/QuickWidget';
import { AIInsightsCard } from '@/components/AIInsightsCard';
import { VoiceTransactionDialog } from '@/components/VoiceTransactionDialog';
import { AIChatFloatingButton } from '@/components/AIChatFloatingButton';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { FinancialHealthScore } from '@/components/FinancialHealthScore';
import { PredictiveCashflow } from '@/components/PredictiveCashflow';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronDown,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  Target,
  Trophy,
  Calculator,
  Mic,
  History,
  Sparkles,
  Users,
  MessageSquare,
  HeartPulse,
  Tags
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval, getYear, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/hooks/use-toast';
import { useAIChat } from '@/hooks/use-ai-chat';

interface BalanceCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'income' | 'expense' | 'credit' | 'pending';
  isPrivate?: boolean;
  children?: React.ReactNode;
}

function BalanceCard({ title, amount, icon, variant = 'default', isPrivate, children }: BalanceCardProps) {
  const gradientClass = variant === 'primary' ? 'gradient-primary text-primary-foreground' : variant === 'income' ? 'bg-income/10' : variant === 'expense' ? 'bg-expense/10' : variant === 'credit' ? 'bg-purple-500/10' : variant === 'pending' ? 'bg-warning/10' : 'bg-card';
  const textColorClass = variant === 'primary' ? 'text-primary-foreground' : variant === 'income' ? 'text-income' : variant === 'expense' ? 'text-expense' : variant === 'credit' ? 'text-purple-600' : variant === 'pending' ? 'text-warning' : 'text-foreground';

  return (
    <Card className={cn("finance-card border-none shadow-sm", gradientClass, variant === 'primary' && "shadow-primary")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn("text-[10px] font-bold uppercase tracking-wider", variant === 'primary' ? "text-primary-foreground/80" : "text-muted-foreground")}>{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className={cn("text-xl font-bold", textColorClass)}>
                {isPrivate ? '••••••' : formatCurrency(amount)}
              </p>
              {children}
            </div>
          </div>
          <div className={cn("p-2 rounded-lg", variant === 'primary' ? "bg-primary-foreground/20" : "bg-white/50")}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { currentUser, users } = useAuth();
  const { allAccounts, allCards, allTransactions, categories, allBudgets, goals, debts, getAccountBalance, getCategoryById, createTransaction, refresh } = useFinance();
  const navigate = useNavigate();
  const { sendMessage } = useAIChat();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'total');
  const [chartView, setChartView] = useState<'mensal' | 'anual'>('mensal');
  
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [formData, setFormData] = useState({
    userId: currentUser?.id || '',
    type: 'EXPENSE' as any,
    amount: '',
    description: '',
    purchaseDate: new Date(),
    categoryId: '',
    accountId: '',
    cardId: '',
    installments: '1',
    isPaid: true,
    recurrence: 'none',
    destinationUserId: currentUser?.id || '',
    destinationAccountId: '',
    notes: ''
  });

  useEffect(() => {
    if (currentUser?.id && selectedUserId === 'total') {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser?.id]);

  const selectedMonthStr = useMemo(() => format(selectedMonth, 'yyyy-MM'), [selectedMonth]);

  const filteredAccounts = useMemo(() => {
    if (selectedUserId === 'total') return allAccounts;
    if (selectedUserId === 'all') return allAccounts.filter(a => a.is_shared && !a.user_id);
    return allAccounts.filter(a => a.user_id === selectedUserId);
  }, [allAccounts, selectedUserId]);

  const userFilteredTransactions = useMemo(() => {
    const baseTxs = allTransactions.filter(t => {
      if (t.type === 'TRANSFER') return false;
      const cat = getCategoryById(t.categoryId);
      const catName = cat?.name?.toLowerCase() || '';
      if (catName.includes('transferencia') || catName.includes('transferência')) return false;
      return true;
    });

    if (selectedUserId === 'total') return baseTxs;

    if (selectedUserId === 'all') {
      const familyAccountIds = new Set(allAccounts.filter(a => a.is_shared && !a.user_id).map(a => a.id));
      const familyCardIds = new Set(allCards.filter(c => (c as any).is_shared && !c.user_id).map(c => c.id));
      return baseTxs.filter(t => 
        (t.accountId && familyAccountIds.has(t.accountId)) || 
        (t.cardId && familyCardIds.has(t.cardId))
      );
    }

    const userAccountIds = new Set(allAccounts.filter(a => a.user_id === selectedUserId).map(a => a.id));
    const userCardIds = new Set(allCards.filter(c => c.user_id === selectedUserId).map(c => c.id));
    
    return baseTxs.filter(t => {
      if (t.accountId) return userAccountIds.has(t.accountId);
      if (t.cardId) return userCardIds.has(t.cardId);
      return t.userId === selectedUserId;
    });
  }, [allTransactions, allAccounts, allCards, selectedUserId, getCategoryById]);

  const launchTransactions = useMemo(() => {
    return userFilteredTransactions.filter(t => t.effectiveMonth === selectedMonthStr && t.status !== 'cancelled');
  }, [userFilteredTransactions, selectedMonthStr]);

  const stats = useMemo(() => {
    const income = launchTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expenses = launchTransactions
      .filter(t => t.type === 'EXPENSE' && !t.description.includes('Pagamento de Fatura'))
      .reduce((s, t) => s + t.amount, 0);
    const cardExpenses = launchTransactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const refunds = launchTransactions.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = expenses + cardExpenses - refunds;
    return { income, expenses, cardExpenses: cardExpenses - refunds, totalExpenses, balance: income - totalExpenses };
  }, [launchTransactions]);

  const totalBalance = useMemo(() => {
    return filteredAccounts
      .filter(a => a.active !== false && !a.exclude_from_totals)
      .reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  }, [filteredAccounts, getAccountBalance]);

  const currentBudget = useMemo(() => {
    if (selectedUserId === 'total') return null;
    const targetId = selectedUserId === 'all' ? null : selectedUserId;
    return allBudgets.find(b => b.user_id === targetId && b.month === selectedMonthStr) || null;
  }, [allBudgets, selectedUserId, selectedMonthStr]);

  const budgetProgress = useMemo(() => {
    if (!currentBudget) return [];
    const categoryMap: Record<string, number> = {};
    launchTransactions
      .filter(t => (t.type === 'EXPENSE' || t.type === 'CREDIT' || t.type === 'REFUND') && !t.description.includes('Pagamento de Fatura'))
      .forEach(t => {
        if (t.categoryId) {
          const val = t.type === 'REFUND' ? -t.amount : t.amount;
          categoryMap[t.categoryId] = (categoryMap[t.categoryId] || 0) + val;
        }
      });

    return Object.entries(currentBudget.category_limits)
      .map(([catId, limit]) => {
        const cat = getCategoryById(catId);
        const spent = categoryMap[catId] || 0;
        return { id: catId, name: cat?.name || 'Outros', icon: cat?.icon || '📁', limit, spent, percent: limit > 0 ? (spent / limit) * 100 : 0 };
      })
      .filter(b => b.limit > 0 || b.spent > 0)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 4);
  }, [currentBudget, launchTransactions, getCategoryById]);

  const userGoals = useMemo(() => {
    if (selectedUserId === 'total') return goals.slice(0, 3);
    return goals.filter(g => g.user_id === selectedUserId).slice(0, 3);
  }, [goals, selectedUserId]);

  const userDebts = useMemo(() => {
    const source = selectedUserId === 'total' ? debts : (selectedUserId === 'all' ? debts.filter(d => !d.user_id) : debts.filter(d => d.user_id === selectedUserId));
    return source.filter(d => d.is_active).slice(0, 3);
  }, [debts, selectedUserId]);

  const fluxData = useMemo(() => {
    const year = getYear(selectedMonth);
    const months = eachMonthOfInterval({ start: startOfYear(new Date(year, 0, 1)), end: endOfYear(new Date(year, 0, 1)) });
    return months.map(m => {
      const mStr = format(m, 'yyyy-MM');
      const txs = userFilteredTransactions.filter(t => t.effectiveMonth === mStr && t.status !== 'cancelled');
      const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expenses = txs.filter(t => (t.type === 'EXPENSE' || t.type === 'CREDIT') && !t.description.includes('Pagamento de Fatura')).reduce((s, t) => s + t.amount, 0);
      const refunds = txs.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
      return { name: format(m, 'MMM', { locale: ptBR }), receitas: income, despesas: expenses - refunds };
    });
  }, [userFilteredTransactions, selectedMonth]);

  const topExpensesData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    launchTransactions.filter(t => (t.type === 'EXPENSE' || t.type === 'CREDIT' || t.type === 'REFUND') && !t.description.includes('Pagamento de Fatura')).forEach(t => {
      const cat = getCategoryById(t.categoryId);
      const name = cat?.name || 'Outros';
      const amount = t.type === 'REFUND' ? -t.amount : t.amount;
      categoryMap[name] = (categoryMap[name] || 0) + amount;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value: Math.max(0, value) })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [launchTransactions, getCategoryById]);

  const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#14b8a6', '#6366f1', '#ef4444', '#94a3b8'];

  const lastTransactions = useMemo(() => {
    const groupedTransactions = new Map<string, Transaction[]>();
    
    userFilteredTransactions.forEach(tx => {
      if (tx.installmentGroupId) {
        if (!groupedTransactions.has(tx.installmentGroupId)) {
          groupedTransactions.set(tx.installmentGroupId, []);
        }
        groupedTransactions.get(tx.installmentGroupId)?.push(tx);
      } else {
        groupedTransactions.set(tx.id, [tx]);
      }
    });

    const processedTransactions: any[] = [];

    groupedTransactions.forEach((txs) => {
      if (txs.length > 1) {
        const firstTx = txs.reduce((prev, current) => 
          (prev.installmentNumber || 0) < (current.installmentNumber || 0) ? prev : current
        );
        const totalAmount = txs.reduce((sum, t) => sum + t.amount, 0);
        
        processedTransactions.push({
          ...firstTx,
          amount: totalAmount,
          isParcelled: true,
          totalInstallments: txs[0].totalInstallments
        });
      } else {
        processedTransactions.push(txs[0]);
      }
    });

    return processedTransactions
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .slice(0, 8);
  }, [userFilteredTransactions]);

  const cardActivity = useMemo(() => {
    const activity: Record<string, { name: string; color: string; amount: number }> = {};
    launchTransactions.filter(t => t.cardId && (t.type === 'CREDIT' || t.type === 'REFUND')).forEach(t => {
      const card = allCards.find(c => c.id === t.cardId);
      if (!card) return;
      if (!activity[card.id]) activity[card.id] = { name: card.name, color: card.color, amount: 0 };
      activity[card.id].amount += t.type === 'REFUND' ? -t.amount : t.amount;
    });
    return Object.values(activity).sort((a, b) => b.amount - a.amount);
  }, [launchTransactions, allCards]);

  const chartData = useMemo(() => {
    if (chartView === 'mensal') {
      const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dayStr = format(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day), 'yyyy-MM-dd');
        const txs = launchTransactions.filter(t => t.purchaseDate === dayStr && t.status !== 'cancelled');
        const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const expenses = txs.filter(t => (t.type === 'EXPENSE' || t.type === 'CREDIT') && !t.description.includes('Pagamento de Fatura')).reduce((s, t) => s + t.amount, 0);
        const refunds = txs.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
        return { name: day.toString(), receitas: income, despesas: expenses - refunds };
      });
    }
    return fluxData;
  }, [chartView, selectedMonth, launchTransactions, fluxData]);

  const handleVoiceResult = (result: any) => {
    const defaultAccount = allAccounts.find(a => a.user_id === currentUser?.id && a.account_type === 'corrente') || allAccounts[0];
    
    setFormData({
      ...formData,
      type: result.type,
      amount: result.amount?.toString() || '',
      description: result.description,
      accountId: defaultAccount?.id || '',
      isPaid: result.type !== 'CREDIT'
    });
    setIsFormOpen(true);
    toast({ title: "Voz processada!", description: "Confira os detalhes do lançamento." });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createTransaction({
        ...formData,
        amount: parseFloat(formData.amount),
        purchaseDate: formData.purchaseDate,
        effectiveDate: formData.purchaseDate,
        status: 'confirmed'
      });
      setIsFormOpen(false);
      await refresh();
      toast({ title: "Sucesso!", description: "Lançamento realizado com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-full overflow-x-hidden pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel</h1>
          <div className="flex items-center gap-2 mt-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">{format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <UserFilter value={selectedUserId} onChange={setSelectedUserId} showTotalOption={true} className="w-[160px] sm:w-[200px] shrink-0" />
          <Button variant="ghost" size="icon" onClick={() => setIsPrivate(!isPrivate)} className="shrink-0">{isPrivate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="shrink-0 rounded-full border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setIsVoiceDialogOpen(true)}
          >
            <Mic className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button className="gradient-primary shadow-primary shrink-0 px-3 sm:px-4"><Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Novo</span> <ChevronDown className="ml-2 h-4 w-4 opacity-50 hidden sm:inline" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56"><DropdownMenuItem onClick={() => navigate('/transactions')} className="gap-2 cursor-pointer"><ArrowDownRight className="w-4 h-4 text-expense" /> Lançamento em Conta</DropdownMenuItem><DropdownMenuItem onClick={() => navigate('/transactions?type=card')} className="gap-2 cursor-pointer"><CreditCard className="w-4 h-4 text-credit" /> Lançamento em Cartão</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <QuickWidget selectedUserId={selectedUserId === 'total' ? 'all' : selectedUserId} date={selectedMonth} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FinancialHealthScore />
            <PredictiveCashflow />
          </div>

          <Accordion type="multiple" defaultValue={["financial-balance", "smart-control", "transaction-flow", "category-distribution"]} className="w-full space-y-4">
            <AccordionItem value="financial-balance" className="border-none shadow-md rounded-xl overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline bg-card hover:bg-muted/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Balanço Financeiro</CardTitle>
                    <CardDescription>Visão geral das suas finanças.</CardDescription>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-6 bg-card">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <BalanceCard title="Saldo Atual" amount={totalBalance} icon={<Wallet className="w-4 h-4 text-primary-foreground" />} variant="primary" isPrivate={isPrivate}><Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground/60"><ChevronDown className="w-4 h-4" /></Button></PopoverTrigger><PopoverContent className="w-64 p-2">{filteredAccounts.map(acc => (<div key={acc.id} className="flex justify-between p-2 text-sm"><span className={cn(acc.exclude_from_totals && "text-muted-foreground line-through")}>{acc.name}</span><span className="font-bold">{formatCurrency(getAccountBalance(acc.id))}</span></div>))}</PopoverContent></Popover></BalanceCard>
                  <BalanceCard title="Receitas" amount={stats.income} icon={<TrendingUp className="w-4 h-4 text-income" />} variant="income" isPrivate={isPrivate} />
                  <BalanceCard title="Despesas" amount={stats.expenses} icon={<TrendingDown className="h-4 w-4 text-expense" />} variant="expense" isPrivate={isPrivate} />
                  <BalanceCard title="Cartão" amount={stats.cardExpenses} icon={<CreditCard className="w-4 h-4 text-purple-600" />} variant="credit" isPrivate={isPrivate}><Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-purple-600/60"><ChevronDown className="w-4 h-4" /></Button></PopoverTrigger><PopoverContent className="w-64 p-2">{cardActivity.length > 0 ? cardActivity.map((card, idx) => (<div key={idx} className="flex justify-between p-2 text-sm"><span>{card.name}</span><span className="font-bold">{formatCurrency(card.amount)}</span></div>)) : (<p className="text-xs text-center text-muted-foreground p-2">Nenhum gasto no cartão.</p>)}</PopoverContent></Popover></BalanceCard>
                  <BalanceCard title="Resultado" amount={stats.balance} icon={<BarChart3 className="w-4 h-4 text-warning" />} variant="pending" isPrivate={isPrivate} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="smart-control" className="border-none shadow-md rounded-xl overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline bg-card hover:bg-muted/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Controle Financeiro Inteligente</CardTitle>
                    <CardDescription>Insights e assistente Dyad AI.</CardDescription>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-6 bg-card">
                <AIInsightsCard onSendMessage={sendMessage} onOpenChat={setIsAIChatOpen} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="transaction-flow" className="border-none shadow-md rounded-xl overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline bg-card hover:bg-muted/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Fluxo de Lançamentos</CardTitle>
                    <CardDescription>Análise mensal e anual de receitas e despesas.</CardDescription>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-6 bg-card">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Fluxo de Lançamentos</CardTitle><div className="flex bg-muted p-1 rounded-lg"><Button variant={chartView === 'mensal' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-[10px] px-3" onClick={() => setChartView('mensal')}>Mensal</Button><Button variant={chartView === 'anual' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-[10px] px-3" onClick={() => setChartView('anual')}>Anual</Button></div></CardHeader>
                  <CardContent><div className="h-[250px] sm:h-[300px] w-full mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} /><YAxis hide /><Tooltip cursor={{ fill: '#f5f5f5' }} content={({ active, payload }) => { if (active && payload && payload.length) { return (<div className="bg-white p-3 border rounded-xl shadow-xl"><p className="text-xs font-bold mb-2">{payload[0].payload.name}</p><div className="space-y-1"><p className="text-[10px] text-income flex justify-between gap-4">Receitas: <span>{formatCurrency(payload[0].value as number)}</span></p><p className="text-[10px] text-expense flex justify-between gap-4">Despesas: <span>{formatCurrency(payload[1].value as number)}</span></p></div></div>); } return null; }} /><Bar dataKey="receitas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} /><Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} /></BarChart></ResponsiveContainer></div></CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="category-distribution" className="border-none shadow-md rounded-xl overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline bg-card hover:bg-muted/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Tags className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Gastos por Categoria</CardTitle>
                    <CardDescription>Distribuição percentual das suas despesas.</CardDescription>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-6 bg-card">
                <div className="h-[300px] w-full">
                  {topExpensesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topExpensesData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {topExpensesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <PieChartIcon className="w-12 h-12 opacity-20 mb-2" />
                      <p className="text-xs">Nenhum gasto registrado neste período.</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" /> Centro de Planejamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="budget" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="budget" className="text-xs">Orçamento</TabsTrigger>
                  <TabsTrigger value="goals" className="text-xs">Metas</TabsTrigger>
                  <TabsTrigger value="debts" className="text-xs">Dívidas</TabsTrigger>
                </TabsList>

                <TabsContent value="budget" className="space-y-4 animate-fade-in">
                  {budgetProgress.length > 0 ? (
                    <div className="space-y-4">
                      {budgetProgress.map(item => (
                        <div key={item.id} className="p-3 bg-muted/30 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium flex items-center gap-2">{item.icon} {item.name}</span>
                            <span className="text-[10px] font-bold">{item.percent.toFixed(0)}%</span>
                          </div>
                          <Progress value={Math.min(item.percent, 100)} className={cn("h-1.5", item.percent > 100 ? "bg-expense/20" : "")} />
                          <div className="flex justify-between text-[9px] text-muted-foreground">
                            <span>{formatCurrency(item.spent)}</span>
                            <span>limite {formatCurrency(item.limit)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground opacity-20" />
                      <p className="text-xs text-muted-foreground">Nenhum orçamento definido.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="goals" className="space-y-4 animate-fade-in">
                  {userGoals.length > 0 ? (
                    <div className="space-y-3">
                      {userGoals.map(goal => {
                        const percent = (totalBalance / goal.target_amount) * 100;
                        return (
                          <div key={goal.id} className="p-3 bg-muted/30 rounded-xl flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${goal.color}20` }}>{goal.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between mb-1">
                                <span className="text-xs font-bold truncate">{goal.name}</span>
                                <span className="text-[10px] font-bold" style={{ color: goal.color }}>{percent.toFixed(0)}%</span>
                              </div>
                              <Progress value={Math.min(percent, 100)} className="h-1.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <Target className="w-8 h-8 mx-auto text-muted-foreground opacity-20" />
                      <p className="text-xs text-muted-foreground">Sem metas ativas.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="debts" className="space-y-4 animate-fade-in">
                  {userDebts.length > 0 ? (
                    <div className="space-y-3">
                      {userDebts.map(debt => {
                        const percent = (debt.paid_amount / debt.total_amount) * 100;
                        return (
                          <div key={debt.id} className="p-3 bg-muted/30 rounded-xl">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-bold">{debt.name}</span>
                              <span className="text-[10px] font-bold text-expense">{percent.toFixed(0)}% pago</span>
                            </div>
                            <Progress value={percent} className="h-1.5 bg-expense/10" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <Trophy className="h-8 w-8 mx-auto text-muted-foreground opacity-20" />
                      <p className="text-xs text-muted-foreground">Sem dívidas ativas.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Últimas Atividades
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" onClick={() => navigate('/transactions')}>Ver todas</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lastTransactions.length > 0 ? lastTransactions.map(tx => {
                  const cat = getCategoryById(tx.categoryId);
                  return (
                    <div key={tx.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg">{cat?.icon || '💰'}</div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate max-w-[120px]">{tx.description}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(tx.purchaseDate), 'dd/MM/yy')}</p>
                        </div>
                      </div>
                      <span className={cn("text-xs font-bold", tx.type === 'INCOME' || tx.type === 'REFUND' ? "text-income" : "text-expense")}>
                        {tx.type === 'INCOME' || tx.type === 'REFUND' ? '+' : '-'} {isPrivate ? '••••' : formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                }) : (
                  <p className="text-xs text-center text-muted-foreground py-4">Nenhum movimentação.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <VoiceTransactionDialog 
        isOpen={isVoiceDialogOpen} 
        onOpenChange={setIsVoiceDialogOpen} 
        onResult={handleVoiceResult} 
      />

      <AIChatFloatingButton isOpen={isAIChatOpen} setIsOpen={setIsAIChatOpen} />

      <TransactionForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        editingTransaction={null}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleFormSubmit}
        isSaving={isSaving}
        users={users as any}
        availableAccounts={allAccounts.filter(a => a.user_id === currentUser?.id || a.is_shared)}
        availableCards={allCards.filter(c => c.user_id === currentUser?.id || (c as any).is_shared)}
        categories={categories}
        onDescriptionChange={(desc) => setFormData({ ...formData, description: desc })}
      />
    </div>
  );
}