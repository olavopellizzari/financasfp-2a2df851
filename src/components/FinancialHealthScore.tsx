"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, PolarRadiusAxis } from 'recharts';
import { ShieldCheck, TrendingUp, AlertTriangle, Zap, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FinancialHealthScore() {
  const { allTransactions, allAccounts, getAccountBalance, debts } = useFinance();
  const { currentUser } = useAuth();

  const metrics = useMemo(() => {
    if (!currentUser) return null;

    const userTxs = allTransactions.filter(t => t.userId === currentUser.id && t.status !== 'cancelled');
    const income = userTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expenses = userTxs.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    
    const totalBalance = allAccounts
      .filter(a => a.user_id === currentUser.id || a.is_shared)
      .reduce((sum, a) => sum + getAccountBalance(a.id), 0);

    const activeDebts = debts.filter(d => (d.user_id === currentUser.id || !d.user_id) && d.is_active);
    const totalDebt = activeDebts.reduce((sum, d) => sum + (d.total_amount - d.paid_amount), 0);

    // 1. Taxa de Poupança (0-100)
    const savingsRate = income > 0 ? Math.max(0, Math.min(100, ((income - expenses) / income) * 100)) : 0;
    
    // 2. Reserva de Emergência (0-100) - Alvo: 6 meses de despesas
    const avgMonthlyExpense = expenses / 3 || 1;
    const emergencyFundRatio = Math.min(100, (totalBalance / (avgMonthlyExpense * 6)) * 100);

    // 3. Índice de Endividamento (0-100) - Invertido (menos dívida = mais score)
    const debtRatio = Math.max(0, 100 - (totalDebt / (income * 12 || 1)) * 100);

    // 4. Consistência (0-100) - Baseado em lançamentos recentes
    const recentTxs = userTxs.filter(t => new Date(t.purchaseDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const consistency = Math.min(100, recentTxs.length * 20);

    const score = Math.round((savingsRate + emergencyFundRatio + debtRatio + consistency) / 4 * 10);

    return {
      score,
      data: [
        { subject: 'Poupança', A: savingsRate, fullMark: 100 },
        { subject: 'Reserva', A: emergencyFundRatio, fullMark: 100 },
        { subject: 'Dívida', A: debtRatio, fullMark: 100 },
        { subject: 'Frequência', A: consistency, fullMark: 100 },
      ],
      status: score > 700 ? 'Excelente' : score > 400 ? 'Bom' : 'Atenção'
    };
  }, [allTransactions, allAccounts, getAccountBalance, debts, currentUser]);

  if (!metrics) return null;

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-primary" /> Saúde Financeira
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-8 border-muted" />
            <div 
              className={cn(
                "absolute inset-0 rounded-full border-8 transition-all duration-1000",
                metrics.score > 700 ? "border-income" : metrics.score > 400 ? "border-primary" : "border-expense"
              )}
              style={{ clipPath: `inset(0 0 0 0)`, strokeDasharray: '100 100' }}
            />
            <div className="text-center">
              <p className="text-4xl font-black tracking-tighter">{metrics.score}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{metrics.status}</p>
            </div>
          </div>

          <div className="flex-1 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={metrics.data}>
                <PolarGrid stroke="hsl(var(--muted-foreground) / 0.2)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}