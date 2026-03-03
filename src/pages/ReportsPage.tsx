import { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserFilter } from '@/components/UserFilter';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3, 
  Calendar,
  FileSpreadsheet,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Target,
  Zap,
  ShoppingBag,
  Users,
  Sparkles,
  AlertTriangle,
  Activity,
  Download,
  LayoutGrid
} from 'lucide-react';
import { formatCurrency, getCurrentMonth } from '@/lib/db';
import { format, parse, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval, getYear, isAfter, startOfDay, getDate, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPie, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export function ReportsPage() {
  const { allTransactions, categories, allAccounts, allCards } = useFinance();
  const { currentUser, users } = useAuth();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'total');

  // Sincroniza o filtro inicial
  useEffect(() => {
    if (currentUser?.id && selectedUserId === 'total') {
      // Mantemos 'total' como padrão se o usuário quiser ver tudo, 
      // ou podemos mudar para o ID do usuário se preferir começar pelo individual.
    }
  }, [currentUser?.id]);

  const safeParseMonth = (monthStr: string) => {
    const parsed = parse(monthStr, 'yyyy-MM', new Date());
    return isValid(parsed) ? parsed : new Date();
  };

  // --- FILTRAGEM ROBUSTA (Igual ao Dashboard) ---
  const filteredSource = useMemo(() => {
    if (selectedUserId === 'total') return allTransactions;

    if (selectedUserId === 'all') {
      const familyAccountIds = new Set(allAccounts.filter(a => a.is_shared && !a.user_id).map(a => a.id));
      const familyCardIds = new Set(allCards.filter(c => (c as any).is_shared && !c.user_id).map(c => c.id));
      return allTransactions.filter(t => 
        (t.accountId && familyAccountIds.has(t.accountId)) || 
        (t.cardId && familyCardIds.has(t.cardId))
      );
    }

    const userAccountIds = new Set(allAccounts.filter(a => a.user_id === selectedUserId).map(a => a.id));
    const userCardIds = new Set(allCards.filter(c => c.user_id === selectedUserId).map(c => c.id));
    
    return allTransactions.filter(t => {
      if (t.accountId) return userAccountIds.has(t.accountId);
      if (t.cardId) return userCardIds.has(t.cardId);
      return t.userId === selectedUserId;
    });
  }, [allTransactions, allAccounts, allCards, selectedUserId]);

  const getUserName = (id: string) => {
    if (id === 'total') return 'Consolidado (Tudo)';
    if (id === 'all') return 'Contas da Família';
    return users.find(u => u.id === id)?.name || 'Usuário';
  };

  // --- DADOS MENSAIS ---
  const monthlyStats = useMemo(() => {
    const monthTransactions = filteredSource.filter(t => 
      t.effectiveMonth === selectedMonth && t.status !== 'cancelled'
    );

    const income = monthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0);

    const refunds = monthTransactions
      .filter(t => t.type === 'REFUND')
      .reduce((sum, t) => sum + t.amount, 0);

    const netExpense = expenses - refunds;
    const savingsRate = income > 0 ? ((income - netExpense) / income) * 100 : 0;

    const fixed = monthTransactions
      .filter(t => (t.type === 'EXPENSE' || t.type === 'CREDIT') && (t.installmentGroupId || t.isRecurring))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const variable = netExpense - fixed;

    const merchants: Record<string, number> = {};
    monthTransactions.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').forEach(t => {
      const desc = t.description.split('(')[0].trim();
      merchants[desc] = (merchants[desc] || 0) + t.amount;
    });
    const topMerchants = Object.entries(merchants)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { 
      income, 
      expenses: netExpense, 
      balance: income - netExpense, 
      savingsRate,
      fixed,
      variable,
      topMerchants,
      count: monthTransactions.length,
      transactions: monthTransactions
    };
  }, [filteredSource, selectedMonth]);

  const dailySpendingData = useMemo(() => {
    const date = safeParseMonth(selectedMonth);
    const days = eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
    
    return days.map(day => {
      const dayNum = getDate(day);
      const dayTxs = monthlyStats.transactions.filter(t => {
        const txDate = typeof t.purchaseDate === 'string' ? parse(t.purchaseDate, 'yyyy-MM-dd', new Date()) : new Date(t.purchaseDate);
        return isValid(txDate) && getDate(txDate) === dayNum && (t.type === 'EXPENSE' || t.type === 'CREDIT' || t.type === 'REFUND');
      });
      const amount = dayTxs.reduce((sum, t) => t.type === 'REFUND' ? sum - t.amount : sum + t.amount, 0);
      return { day: dayNum.toString().padStart(2, '0'), amount: Math.max(0, amount) };
    });
  }, [monthlyStats, selectedMonth]);

  const categoryData = useMemo(() => {
    const byCategory: Record<string, { amount: number; category: any }> = {};
    monthlyStats.transactions.forEach(t => {
      if (t.categoryId && (t.type === 'EXPENSE' || t.type === 'CREDIT' || t.type === 'REFUND')) {
        if (!byCategory[t.categoryId]) {
          byCategory[t.categoryId] = { amount: 0, category: categories.find(c => c.id === t.categoryId) };
        }
        const val = t.type === 'REFUND' ? -t.amount : t.amount;
        byCategory[t.categoryId].amount += val;
      }
    });
    return Object.entries(byCategory)
      .map(([id, { amount, category }]) => ({
        id, name: category?.name || 'Sem categoria', value: Math.max(0, amount),
        color: category?.color || '#6366f1', icon: category?.icon || '📁'
      }))
      .filter(c => c.value > 0).sort((a, b) => b.value - a.value);
  }, [monthlyStats, categories]);

  // --- DADOS ANUAIS ---
  const annualData = useMemo(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 0, 1));
    const months = eachMonthOfInterval({ start, end });
    let accumulatedBalance = 0;
    
    const today = startOfDay(new Date());
    const currentMonthIdx = today.getFullYear() === selectedYear ? today.getMonth() : (selectedYear < today.getFullYear() ? 12 : -1);

    const baseData = months.map((month, index) => {
      const monthStr = format(month, 'yyyy-MM');
      const monthTransactions = filteredSource.filter(t => t.effectiveMonth === monthStr && t.status !== 'cancelled');
      const income = monthTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
      const expenses = monthTransactions.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
      const refunds = monthTransactions.filter(t => t.type === 'REFUND').reduce((sum, t) => sum + t.amount, 0);
      const netExpense = expenses - refunds;
      const monthBalance = income - netExpense;
      accumulatedBalance += monthBalance;

      return {
        month: format(month, 'MMM', { locale: ptBR }),
        monthFull: format(month, 'MMMM', { locale: ptBR }),
        income, expenses: netExpense, balance: monthBalance, accumulated: accumulatedBalance,
        isFuture: index > currentMonthIdx
      };
    });

    const pastMonthsWithData = baseData.filter((m, idx) => idx <= currentMonthIdx && (m.income > 0 || m.expenses > 0));
    const avgMonthlyBalance = pastMonthsWithData.length > 0 
      ? pastMonthsWithData.reduce((sum, m) => sum + m.balance, 0) / pastMonthsWithData.length 
      : 0;

    let projectedAccumulated = baseData[Math.max(0, Math.min(currentMonthIdx, 11))]?.accumulated || 0;
    
    return baseData.map((m, idx) => {
      if (idx <= currentMonthIdx) {
        return { ...m, projected: m.accumulated };
      } else {
        projectedAccumulated += avgMonthlyBalance;
        return { ...m, projected: projectedAccumulated };
      }
    });
  }, [filteredSource, selectedYear]);

  const annualTotals = useMemo(() => {
    const totals = annualData.reduce((acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      balance: acc.balance + m.balance
    }), { income: 0, expenses: 0, balance: 0 });
    
    const activeMonths = annualData.filter(m => m.income > 0 || m.expenses > 0);
    const activeCount = activeMonths.length || 1;
    
    const sortedMonths = [...activeMonths].sort((a, b) => a.balance - b.balance);
    const bestMonth = sortedMonths[sortedMonths.length - 1] || null;
    const worstMonth = sortedMonths[0] || null;
      
    return { ...totals, avgMonthlyExpense: totals.expenses / activeCount, bestMonth, worstMonth, activeCount };
  }, [annualData]);

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const userName = getUserName(selectedUserId);
      const timestamp = format(new Date(), "dd/MM/yyyy HH:mm");

      doc.setFontSize(20);
      doc.setTextColor(34, 197, 94);
      doc.text("Relatório Financeiro Anual", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Ano de Referência: ${selectedYear}`, 14, 30);
      doc.text(`Filtro: ${userName}`, 14, 35);
      doc.text(`Gerado em: ${timestamp}`, 14, 40);

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Resumo Consolidado", 14, 55);

      const summaryData = [
        ["Total de Receitas", formatCurrency(annualTotals.income)],
        ["Total de Despesas", formatCurrency(annualTotals.expenses)],
        ["Saldo Acumulado", formatCurrency(annualTotals.balance)],
        ["Média Mensal de Gastos", formatCurrency(annualTotals.avgMonthlyExpense)]
      ];

      autoTable(doc, {
        startY: 60,
        head: [["Indicador", "Valor"]],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] }
      });

      doc.text("Detalhamento Mensal", 14, (doc as any).lastAutoTable.finalY + 15);

      const tableData = annualData.map(m => [
        m.monthFull.charAt(0).toUpperCase() + m.monthFull.slice(1),
        formatCurrency(m.income),
        formatCurrency(m.expenses),
        formatCurrency(m.balance)
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [["Mês", "Receitas", "Despesas", "Saldo"]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55] },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
      });

      doc.save(`Relatorio_Anual_${selectedYear}_${userName.replace(/\s/g, '_')}.pdf`);
      toast({ title: "PDF Gerado!" });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const displayMonthDate = safeParseMonth(selectedMonth);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios Inteligentes</h1>
          <p className="text-muted-foreground">Análise profunda da sua saúde financeira</p>
        </div>
        <div className="flex items-center gap-3">
          <UserFilter 
            value={selectedUserId} 
            onChange={setSelectedUserId} 
            showTotalOption={true}
            className="w-[200px]" 
          />
        </div>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
          <TabsTrigger value="monthly" className="gap-2"><Calendar className="h-4 w-4" /> Mensal</TabsTrigger>
          <TabsTrigger value="annual" className="gap-2"><BarChart3 className="h-4 w-4" /> Anual</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(format(subMonths(displayMonthDate, 1), 'yyyy-MM'))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-lg font-bold min-w-[160px] text-center capitalize">{format(displayMonthDate, 'MMMM yyyy', { locale: ptBR })}</span>
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(format(addMonths(displayMonthDate, 1), 'yyyy-MM'))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-income/10 border-income/20"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-income text-white shadow-lg"><ArrowUpRight className="h-5 w-5" /></div><div><p className="text-xs font-bold text-muted-foreground uppercase">Receitas</p><p className="text-xl font-bold text-income">{formatCurrency(monthlyStats.income)}</p></div></div></CardContent></Card>
            <Card className="bg-expense/10 border-expense/20"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-expense text-white shadow-lg"><ArrowDownRight className="h-5 w-5" /></div><div><p className="text-xs font-bold text-muted-foreground uppercase">Despesas</p><p className="text-xl font-bold text-expense">{formatCurrency(monthlyStats.expenses)}</p></div></div></CardContent></Card>
            <Card className="bg-primary/10 border-primary/20"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-primary text-white shadow-lg"><Wallet className="h-5 w-5" /></div><div><p className="text-xs font-bold text-muted-foreground uppercase">Saldo</p><p className="text-xl font-bold text-primary">{formatCurrency(monthlyStats.balance)}</p></div></div></CardContent></Card>
            <Card className="bg-warning/10 border-warning/20"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-warning text-white shadow-lg"><Target className="h-5 w-5" /></div><div><p className="text-xs font-bold text-muted-foreground uppercase">Economia</p><p className="text-xl font-bold text-warning">{monthlyStats.savingsRate.toFixed(1)}%</p></div></div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Gastos Diários (Altos e Baixos)</CardTitle></CardHeader>
              <CardContent><div className="h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dailySpendingData}><defs><linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--expense))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--expense))" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip formatter={(value: number) => formatCurrency(value)} /><Area type="monotone" dataKey="amount" stroke="hsl(var(--expense))" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={3} /></AreaChart></ResponsiveContainer></div></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Perfil de Gastos</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gastos Fixos</span><span className="font-bold">{formatCurrency(monthlyStats.fixed)}</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(monthlyStats.fixed / (monthlyStats.expenses || 1)) * 100}%` }} /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gastos Variáveis</span><span className="font-bold">{formatCurrency(monthlyStats.variable)}</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-orange-500" style={{ width: `${(monthlyStats.variable / (monthlyStats.expenses || 1)) * 100}%` }} /></div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Top 5 Estabelecimentos</p>
                  <div className="space-y-3">
                    {monthlyStats.topMerchants.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[150px]">{m.name}</span>
                        <span className="font-bold">{formatCurrency(m.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="annual" className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}><SelectTrigger className="w-32 font-bold"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (<SelectItem key={y} value={y.toString()}>{y}</SelectItem>))}</SelectContent></Select>
              <Button variant="outline" onClick={handleExportPDF} className="gap-2">
                <Download className="h-4 w-4" /> Baixar PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="finance-card-gradient"><CardContent className="pt-6"><p className="text-xs font-bold text-primary-foreground/80 uppercase">Receitas Totais {selectedYear}</p><p className="text-3xl font-bold text-primary-foreground">{formatCurrency(annualTotals.income)}</p></CardContent></Card>
            <Card className="finance-card-dark"><CardContent className="pt-6"><p className="text-xs font-bold text-white/80 uppercase">Despesas Totais {selectedYear}</p><p className="text-3xl font-bold text-white">{formatCurrency(annualTotals.expenses)}</p></CardContent></Card>
            <Card className={cn("finance-card", annualTotals.balance >= 0 ? "border-income" : "border-expense")}><CardContent className="pt-6"><p className="text-xs font-bold text-muted-foreground uppercase">Saldo Acumulado {selectedYear}</p><p className={cn("text-3xl font-bold", annualTotals.balance >= 0 ? "text-income" : "text-expense")}>{formatCurrency(annualTotals.balance)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Fluxo de Caixa Mensal</CardTitle></CardHeader>
            <CardContent><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={annualData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend verticalAlign="top" height={36}/><Bar dataKey="income" name="Receitas" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} /><Bar dataKey="expenses" name="Despesas" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Evolução Patrimonial & Projeção</CardTitle>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary" /><span>Realizado</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Projetado</span></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={annualData}>
                  <defs>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis hide />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border shadow-lg p-4 rounded-xl min-w-[200px]">
                          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase">{data.monthFull}</p>
                          <div className="space-y-2">
                            {!data.isFuture && <p className="text-sm flex justify-between">Realizado: <span className="font-bold text-primary">{formatCurrency(data.accumulated)}</span></p>}
                            <p className="text-sm flex justify-between">Projetado: <span className="font-bold text-green-600">{formatCurrency(data.projected)}</span></p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Area type="monotone" dataKey="projected" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProj)" />
                  <Area type="monotone" dataKey="accumulated" stroke="hsl(var(--primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorReal)" dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                </AreaChart></ResponsiveContainer></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Destaques do Ano</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {annualTotals.bestMonth && (
                  <div className="p-4 rounded-xl bg-income/10 border border-income/20">
                    <div className="flex items-center gap-3 mb-1">
                      <ArrowUpRight className="h-4 w-4 text-income" />
                      <p className="text-xs font-bold text-income uppercase">Melhor Mês</p>
                    </div>
                    <p className="font-bold capitalize">{annualTotals.bestMonth.monthFull}</p>
                    <p className="text-lg font-bold text-income">+{formatCurrency(annualTotals.bestMonth.balance)}</p>
                  </div>
                )}
                {annualTotals.worstMonth && (
                  <div className="p-4 rounded-xl bg-expense/10 border border-expense/20">
                    <div className="flex items-center gap-3 mb-1">
                      <ArrowDownRight className="h-4 w-4 text-expense" />
                      <p className="text-xs font-bold text-expense uppercase">Pior Mês</p>
                    </div>
                    <p className="font-bold capitalize">{annualTotals.worstMonth.monthFull}</p>
                    <p className="text-lg font-bold text-expense">{formatCurrency(annualTotals.worstMonth.balance)}</p>
                  </div>
                )}
                <div className="p-4 rounded-xl bg-muted border border-border">
                  <div className="flex items-center gap-3 mb-1">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-bold text-muted-foreground uppercase">Média de Gastos</p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(annualTotals.avgMonthlyExpense)}</p>
                  <p className="text-[10px] text-muted-foreground">Baseado em {annualTotals.activeCount} meses ativos</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}