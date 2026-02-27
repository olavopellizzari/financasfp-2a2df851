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
  History,
  ArrowDownRight,
  ArrowUpRight,
  Users,
  User as UserIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval, getYear, isSameMonth, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { currentUser, users } = useAuth();
  const { allAccounts, allCards, allTransactions, categories, getAccountBalance, getCategoryById } = useFinance();
  const navigate = useNavigate();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'total');
  
  useEffect(() => {
    if (currentUser?.id && selectedUserId === 'total') {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser?.id]);

  const selectedMonthStr = useMemo(() => format(selectedMonth, 'yyyy-MM'), [selectedMonth]);

  const filteredAccounts = useMemo(() => {
    if (selectedUserId === 'total') return allAccounts;
    if (selectedUserId === 'all') return allAccounts.filter(a => a.is_shared === true);
    return allAccounts.filter(a => a.user_id === selectedUserId && !a.is_shared);
  }, [allAccounts, selectedUserId]);

  const userFilteredTransactions = useMemo(() => {
    if (selectedUserId === 'total') return allTransactions;

    const accountIds = new Set(filteredAccounts.map(a => a.id));
    
    return allTransactions.filter(t => {
      if (t.accountId) return accountIds.has(t.accountId);
      
      if (t.cardId) {
        const card = allCards.find(c => c.id === t.cardId);
        if (!card) return false;
        if (selectedUserId === 'all') return (card as any).is_shared === true;
        return card.user_id === selectedUserId && !(card as any).is_shared;
      }

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

  const accountTransactions = useMemo(() => {
    return userFilteredTransactions
      .filter(tx => tx.type === 'INCOME' || tx.type === 'EXPENSE' || tx.type === 'TRANSFER')
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .slice(0, 5);
  }, [userFilteredTransactions]);

  const cardTransactions = useMemo(() => {
    const result: any[] = [];
    const seenGroups = new Set<string>();

    const sorted = userFilteredTransactions
      .filter(tx => tx.type === 'CREDIT' || tx.type === 'REFUND')
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

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

    return result.slice(0, 5);
  }, [userFilteredTransactions]);

  // Agrupamento de faturas por dono, respeitando o filtro selecionado
  const invoiceGroups = useMemo(() => {
    const groups: Record<string, { name: string; color?: string; isShared: boolean; cards: any[] }> = {
      family: { name: 'Família', isShared: true, cards: [] }
    };

    // Filtra os cartões de acordo com o filtro de usuário selecionado
    const cardsToShow = allCards.filter(card => {
      if (selectedUserId === 'total') return true;
      if (selectedUserId === 'all') return (card as any).is_shared === true;
      return card.user_id === selectedUserId && !(card as any).is_shared;
    });

    cardsToShow.forEach(card => {
      const isShared = (card as any).is_shared;
      const ownerId = card.user_id;
      const owner = users.find(u => u.id === ownerId);

      const cardTxs = allTransactions.filter(t => 
        t.cardId === card.id && 
        t.mesFatura === selectedMonthStr && 
        t.status !== 'cancelled'
      );

      const total = cardTxs.reduce((sum, t) => t.type === 'REFUND' ? sum - t.amount : sum + t.amount, 0);

      if (total === 0 && cardTxs.length === 0) return;

      const cardData = { ...card, total };

      if (isShared) {
        groups.family.cards.push(cardData);
      } else if (ownerId) {
        if (!groups[ownerId]) {
          groups[ownerId] = { 
            name: owner?.name || 'Usuário', 
            color: owner?.avatar_color, 
            isShared: false, 
            cards: [] 
          };
        }
        groups[ownerId].cards.push(cardData);
      }
    });

    return Object.values(groups).filter(g => g.cards.length > 0);
  }, [allCards, allTransactions, selectedMonthStr, users, selectedUserId]);

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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gradient-primary shadow-primary">
                <Plus className="w-4 h-4 mr-2" /> Novo Lançamento <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/transactions')} className="gap-2 cursor-pointer">
                <ArrowDownRight className="w-4 h-4 text-expense" /> Lançamento em Conta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/transactions?type=card')} className="gap-2 cursor-pointer">
                <CreditCard className="w-4 h-4 text-credit" /> Lançamento em Cartão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <BalanceCard title="Despesas" amount={stats.expenses} icon={<TrendingDown className="h-5 w-5 text-expense" />} variant="expense" isPrivate={isPrivate} />
        <BalanceCard title="Resultado" amount={stats.balance} icon={<BarChart3 className="w-5 h-5 text-warning" />} variant="pending" isPrivate={isPrivate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quadro de Faturas do Mês */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Faturas de {format(selectedMonth, 'MMMM', { locale: ptBR })}
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => navigate('/invoices')}>Ver faturas</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invoiceGroups.length > 0 ? invoiceGroups.map((group, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    {group.isShared ? (
                      <Users className="w-3 h-3 text-primary" />
                    ) : (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                    )}
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                      {group.isShared ? 'Cartões da Família' : `Exclusivos: ${group.name}`}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.cards.map(card => (
                      <div 
                        key={card.id} 
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-transparent hover:border-border transition-all cursor-pointer group"
                        onClick={() => navigate(`/transactions?type=card&cardId=${card.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: card.color }}>
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{card.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">•••• {card.last_digits}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-expense">{isPrivate ? '••••' : formatCurrency(card.total)}</p>
                          <ArrowRight className="w-3 h-3 ml-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-8 text-center">
                  <p className="text-xs text-muted-foreground">Nenhum gasto no cartão para este mês.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Resumo do Mês</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className={cn("text-3xl font-bold", stats.balance >= 0 ? "text-income" : "text-expense")}>
              {isPrivate ? '••••••' : formatCurrency(stats.balance)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">Saldo previsto para o período</p>
            <div className="mt-6 w-full space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Receitas</span>
                <span className="font-bold text-income">{isPrivate ? '••••' : formatCurrency(stats.income)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Despesas</span>
                <span className="font-bold text-expense">{isPrivate ? '••••' : formatCurrency(stats.expenses)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Últimas em Conta
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => navigate('/transactions')}>Ver tudo</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accountTransactions.length > 0 ? accountTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg">{getCategoryById(tx.categoryId)?.icon || '💰'}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[120px]">{tx.description}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(tx.purchaseDate), 'dd/MM/yy')}</p>
                    </div>
                  </div>
                  <span className={cn("text-sm font-bold", tx.type === 'INCOME' ? "text-income" : "text-expense")}>
                    {tx.type === 'INCOME' ? '+' : '-'} {isPrivate ? '••••' : formatCurrency(tx.amount)}
                  </span>
                </div>
              )) : (
                <p className="text-xs text-center text-muted-foreground py-4">Nenhuma movimentação.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Últimas no Cartão
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => navigate('/transactions?type=card')}>Ver tudo</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cardTransactions.length > 0 ? cardTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg">{getCategoryById(tx.categoryId)?.icon || '💳'}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[120px]">{tx.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(tx.purchaseDate), 'dd/MM/yy')}
                        {tx.isGrouped && <span className="ml-1 opacity-70">({tx.totalInstallments}x)</span>}
                      </p>
                    </div>
                  </div>
                  <span className={cn("text-sm font-bold", tx.type === 'REFUND' ? "text-income" : "text-expense")}>
                    {tx.type === 'REFUND' ? '+' : '-'} {isPrivate ? '••••' : formatCurrency(tx.displayAmount)}
                  </span>
                </div>
              )) : (
                <p className="text-xs text-center text-muted-foreground py-4">Nenhum gasto no cartão.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}