"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/db';
import { Wallet, TrendingUp, TrendingDown, CreditCard, BarChart3, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  totalBalance: number;
  income: number;
  expenses: number;
  cardExpenses: number;
  balance: number;
  isPrivate: boolean;
  accounts: any[];
  getAccountBalance: (id: string) => number;
}

export function DashboardStats({ totalBalance, income, expenses, cardExpenses, balance, isPrivate, accounts, getAccountBalance }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard title="Saldo Atual" amount={totalBalance} icon={<Wallet className="w-4 h-4" />} variant="primary" isPrivate={isPrivate}>
        <Popover>
          <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-60"><ChevronDown className="w-4 h-4" /></Button></PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            {accounts.map(acc => (
              <div key={acc.id} className="flex justify-between p-2 text-sm">
                <span>{acc.name}</span>
                <span className="font-bold">{formatCurrency(getAccountBalance(acc.id))}</span>
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </StatCard>
      <StatCard title="Receitas" amount={income} icon={<TrendingUp className="w-4 h-4 text-income" />} variant="income" isPrivate={isPrivate} />
      <StatCard title="Despesas" amount={expenses} icon={<TrendingDown className="h-4 w-4 text-expense" />} variant="expense" isPrivate={isPrivate} />
      <StatCard title="Cartão" amount={cardExpenses} icon={<CreditCard className="w-4 h-4 text-purple-600" />} variant="credit" isPrivate={isPrivate} />
      <StatCard title="Resultado" amount={balance} icon={<BarChart3 className="w-4 h-4 text-warning" />} variant="pending" isPrivate={isPrivate} />
    </div>
  );
}

function StatCard({ title, amount, icon, variant = 'default', isPrivate, children }: any) {
  const variants: any = {
    primary: 'gradient-primary text-primary-foreground',
    income: 'bg-income/10 text-income',
    expense: 'bg-expense/10 text-expense',
    credit: 'bg-purple-500/10 text-purple-600',
    pending: 'bg-warning/10 text-warning',
  };

  return (
    <Card className={cn("finance-card border-none shadow-sm", variants[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase opacity-70">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xl font-bold">{isPrivate ? '••••••' : formatCurrency(amount)}</p>
              {children}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-white/20">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}