"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, Transaction } from '@/lib/db';
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
  BarChart3,
  PieChart as PieChartIcon,
  ChevronDown,
  AlertCircle,
  ArrowRight,
  History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval, getYear, isSameMonth, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface BalanceCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'income' | 'expense' | 'credit' | 'pending';
  isPrivate?: boolean;
  children?: React.ReactNode;
}

function BalanceCard({ title, amount, icon, variant = 'default', isPrivate, children }: BalanceCardProps) {
  const gradientClass = variant === 'primary' ? 'gradient-primary text-primary-foreground' : variant === 'income' ? 'bg-income/10' : variant === 'expense' ? 'bg-expense/10' : variant === 'credit' ? 'bg-credit/10' : variant === 'pending' ? 'bg-warning/10' : 'bg-card';
  const textColorClass = variant === 'primary' ? 'text-primary-foreground' : variant === 'income' ? 'text-income' : variant === 'expense' ? 'text-expense' : variant === 'credit' ? 'text-credit' : variant === 'pending' ? 'text-warning' : 'text-foreground';

  return (
    <Card className={cn("finance-card", gradientClass, variant === 'primary' && "shadow-primary border-0")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn("text-sm font-medium", variant === 'primary' ? "text-primary-foreground/80" : "text-muted-foreground")}>{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className={cn("text-2xl font-bold", textColorClass)}>
                {isPrivate ? '••••••' : formatCurrency(amount)}
              </p>
              {children}
            </div>
          </div>
          <div className={cn("p-2 rounded-lg", variant === 'primary' ? "bg-primary-foreground/20" : "bg-muted")}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { currentUser } = useAuth();
  const { allAccounts, allCards, allTransactions, categories, getAccountBalance, getCategoryById } = useFinance();
  const navigate = useNavigate();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'total');
  
  const selectedMonthStr = useMemo(() => format(selectedMonth, 'yyyy-MM'), [selectedMonth]);

  // Filtra as contas baseado na lógica da página de Contas
  const filteredAccounts = useMemo(() => {
    if (selectedUserId === 'total') return allAccounts;
    if (selectedUserId === 'all') return allAccounts.filter(a => a.is_shared === true);
    return allAccounts.filter(a => a.user_id === selectedUserId && !a.is_shared);
  }, [allAccounts, selectedUserId]);

  // Filtra as transações baseado nas contas filtradas
  const userFilteredTransactions = useMemo(() => {
    if (selectedUserId === 'total') return allTransactions;

    const accountIds = new Set(filteredAccounts.map(a => a.id));
    
    return allTransactions.filter(t => {
      // Se a transação tem conta, verifica se a conta está no filtro
      if (t.accountId) return accountIds.has(t.accountId);
      
      // Se for cartão, filtramos pelo dono do cartão (seguindo a lógica de exclusividade)
      if (t.cardId) {
        const card = allCards.find(c => c.id === t.cardId);
        if (!card) return false;
        if (selectedUserId === 'all') return false; // Cartões geralmente não são "família" no sentido de compartilhados
        return card.user_id === selectedUserId;
      }

      // Fallback para o usuário da transação
      if (selectedUserId === 'all') return false;
      return t.userId === selectedUserId;
    });
  }, [allTransactions, filteredAccounts, allCards, selectedUserId]);

  const launchTransactions = useMemo(() => {
    return userFilteredTransactions.filter(t => t.effectiveMonth === selectedMonthStr && t.status !== 'cancelled');
  }, [userFilteredTransactions, selectedMonthStr]);

  const stats = useMemo(() => {
    const income = launchTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expenses = launchTransactions.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const refunds = launchTransactions.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
    return { income, expenses: expenses - refunds, balance: income - (expenses - refunds) };
  }, [launchTransactions]);

  const totalBalance = useMemo(() => {
    return filteredAccounts.filter(a => a.active !== false).reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  }, [filteredAccounts, getAccountBalance]);

  // Agrupa transações para exibição na lista de "Últimas Transações"
  const displayTransactions = useMemo(() => {
    const result: any[] = [];
    const seenGroups = new Set<string>();

    // Ordena por data de compra (mais recentes primeiro)
    const sorted = [...userFilteredTransactions].sort((a, b) => 
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );

    sorted.forEach(tx => {
      if (tx.installmentGroupId) {
        if (!seenGroups.has(tx.installmentGroupId)) {
          seenGroups.add(tx.installmentGroupId);
          const totalAmount = tx.amount * (tx.totalInstallments || 1);
          result.push({
            ...tx,
            displayAmount: totalAmount,
            isGrouped: true
          });
        }
      } else {
        result.push({
          ...tx,
          displayAmount: tx.amount,
          isGrouped: false
        });
      }
    });

    return result;
  }, [userFilteredTransactions]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel</h1>
          <div className="flex items-center gap-2 mt-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">{format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <UserFilter 
            value={selectedUserId} 
            onChange={setSelectedUserId} 
            showTotalOption={true}
            className="w-[200px]" 
          />
          <Button variant="ghost" size="icon" onClick={() => setIsPrivate(!isPrivate)}>{isPrivate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</Button>
          <NotificationsPanel />
          <Button onClick={() => navigate('/transactions')} className="gradient-primary shadow-primary"><Plus className="w-4 h-4 mr-2" /> Novo Lançamento</Button>
        </div>
      </div>

      <QuickWidget selectedUserId={selectedUserId === 'total' ? 'all' : selectedUserId} date={selectedMonth} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard title="Saldo Atual" amount={totalBalance} icon={<Wallet className="w-5 h-5 text-primary-foreground" />} variant="primary" isPrivate={isPrivate}>
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground/60"><ChevronDown className="w-4 h-4" /></Button></PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              {filteredAccounts.map(acc => (
                <div key={acc.id} className="flex justify-between p-2 text-sm">
                  <span>{acc.name}</span>
                  <span className="font-bold">{formatCurrency(getAccountBalance(acc.id))}</span>
                </div>
              ))}
            </PopoverContent>
          </Popover>
        </BalanceCard>
        <BalanceCard title="Receitas" amount={stats.income} icon={<TrendingUp className="w-5 h-5 text-income" />} variant="income" isPrivate={isPrivate} />
        <BalanceCard title="Despesas" amount={stats.expenses} icon={<TrendingDown className="w-5 h-5 text-expense" />} variant="expense" isPrivate={isPrivate} />
        <BalanceCard title="Resultado" amount={stats.balance} icon={<BarChart3 className="w-5 h-5 text-warning" />} variant="pending" isPrivate={isPrivate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Últimas Transações</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayTransactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">{getCategoryById(tx.categoryId)?.icon || '💰'}</div>
                    <div>
                      <p className="text-sm font-medium">
                        {tx.description}
                        {tx.isGrouped && (
                          <span className="text-[10px] text-muted-foreground ml-2">
                            ({tx.totalInstallments}x de {formatCurrency(tx.amount)})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.purchaseDate), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  <span className={cn("font-bold", tx.type === 'INCOME' ? "text-income" : "text-expense")}>
                    {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.displayAmount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle className="text-lg">Resumo do Mês</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className={cn("text-3xl font-bold", stats.balance >= 0 ? "text-income" : "text-expense")}>
              {formatCurrency(stats.balance)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">Saldo previsto para o período</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}