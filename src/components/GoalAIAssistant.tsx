"use client";

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useFinance } from '@/contexts/FinanceContext';
import { Sparkles, ArrowRight, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/db';

export function GoalAIAssistant() {
  const { goals, allTransactions, allAccounts, getAccountBalance } = useFinance();

  const suggestion = useMemo(() => {
    const activeGoal = goals.find(g => !g.is_completed);
    if (!activeGoal) return null;

    const totalBalance = allAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
    const remaining = activeGoal.target_amount - totalBalance;
    
    if (remaining <= 0) return null;

    // Simulação de insight da IA
    const foodExpenses = allTransactions
      .filter(t => t.type === 'EXPENSE' && t.description.toLowerCase().includes('ifood'))
      .reduce((s, t) => s + t.amount, 0);

    if (foodExpenses > 200) {
      const saving = foodExpenses * 0.2;
      const monthsSaved = Math.round(remaining / saving);
      return {
        goalName: activeGoal.name,
        message: `Se você reduzir 20% do seu gasto com delivery (${formatCurrency(saving)}), você atingirá sua meta de "${activeGoal.name}" ${monthsSaved} meses mais rápido!`
      };
    }

    return {
      goalName: activeGoal.name,
      message: `Você está a ${formatCurrency(remaining)} de distância da sua meta. Que tal automatizar um aporte mensal de 10% da sua renda?`
    };
  }, [goals, allTransactions, allAccounts, getAccountBalance]);

  if (!suggestion) return null;

  return (
    <Card className="bg-primary text-primary-foreground border-none shadow-lg overflow-hidden animate-scale-in">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-3 bg-white/20 rounded-2xl">
          <Sparkles className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Acelerador de Metas</p>
          <p className="text-xs font-medium leading-relaxed">
            {suggestion.message}
          </p>
        </div>
        <ArrowRight className="w-5 h-5 opacity-50" />
      </CardContent>
    </Card>
  );
}