"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { HeartPulse, Info, CheckCircle2, AlertTriangle, TrendingUp, Wallet, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';

export function FinancialHealthScore() {
  const { allTransactions, allAccounts, getAccountBalance, debts } = useFinance();
  const { currentUser } = useAuth();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
      raw: { savingsRate, emergencyFundRatio, debtRatio, consistency },
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

  const getScoreColor = (val: number) => {
    if (val > 70) return "text-income";
    if (val > 40) return "text-primary";
    return "text-expense";
  };

  const getScoreBg = (val: number) => {
    if (val > 70) return "bg-income/10";
    if (val > 40) return "bg-primary/10";
    return "bg-expense/10";
  };

  return (
    <>
      <Card 
        className="border-none shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] group"
        onClick={() => setIsDetailsOpen(true)}
      >
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-primary" /> Saúde Financeira
          </CardTitle>
          <div className="p-1 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-3 h-3 text-primary" />
          </div>
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md rounded-[32px] p-8">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <HeartPulse className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold">Sua Saúde Financeira</DialogTitle>
            <DialogDescription>
              Entenda como calculamos sua pontuação de <strong>{metrics.score}</strong> pontos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-income" />
                  <span className="text-sm font-bold">Taxa de Poupança</span>
                </div>
                <span className={cn("text-xs font-bold", getScoreColor(metrics.raw.savingsRate))}>
                  {metrics.raw.savingsRate.toFixed(0)}%
                </span>
              </div>
              <Progress value={metrics.raw.savingsRate} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Quanto da sua renda sobra após as despesas. O ideal é acima de 20%.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">Reserva de Emergência</span>
                </div>
                <span className={cn("text-xs font-bold", getScoreColor(metrics.raw.emergencyFundRatio))}>
                  {metrics.raw.emergencyFundRatio.toFixed(0)}%
                </span>
              </div>
              <Progress value={metrics.raw.emergencyFundRatio} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Seu saldo atual em relação a 6 meses de gastos. Essencial para segurança.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-bold">Controle de Dívidas</span>
                </div>
                <span className={cn("text-xs font-bold", getScoreColor(metrics.raw.debtRatio))}>
                  {metrics.raw.debtRatio.toFixed(0)}%
                </span>
              </div>
              <Progress value={metrics.raw.debtRatio} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                O quanto suas dívidas comprometem sua renda anual. Menos é melhor.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-bold">Consistência</span>
                </div>
                <span className={cn("text-xs font-bold", getScoreColor(metrics.raw.consistency))}>
                  {metrics.raw.consistency.toFixed(0)}%
                </span>
              </div>
              <Progress value={metrics.raw.consistency} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Frequência com que você registra seus gastos. Manter o app atualizado ajuda no controle.
              </p>
            </div>
          </div>

          <div className={cn("p-4 rounded-2xl border border-dashed flex items-start gap-3", getScoreBg(metrics.score / 10))}>
            <Info className={cn("w-4 h-4 shrink-0 mt-0.5", getScoreColor(metrics.score / 10))} />
            <p className="text-[11px] font-medium leading-relaxed">
              {metrics.score > 700 
                ? "Parabéns! Você tem um excelente controle. Continue investindo e mantendo sua reserva." 
                : metrics.score > 400 
                ? "Bom caminho! Tente aumentar sua taxa de poupança ou reduzir dívidas para subir de nível."
                : "Atenção! Foque em registrar todos os gastos e criar uma pequena reserva de emergência primeiro."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}