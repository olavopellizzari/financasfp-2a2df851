"use client";

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useFinance } from '@/contexts/FinanceContext';
import { Sparkles, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/db';
import { cn } from '@/lib/utils';

interface GoalAIAssistantProps {
  onClick?: (message: string) => void;
}

export function GoalAIAssistant({ onClick }: GoalAIAssistantProps) {
  const { goals, allTransactions, allAccounts, getAccountBalance } = useFinance();

  const suggestion = useMemo(() => {
    const activeGoal = goals.find(g => !g.is_completed);
    if (!activeGoal) return null;

    const totalBalance = allAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
    const remaining = activeGoal.target_amount - totalBalance;
    
    if (remaining <= 0) return null;

    // Simulação de insight da IA para o texto do card
    const foodExpenses = allTransactions
      .filter(t => t.type === 'EXPENSE' && t.description.toLowerCase().includes('ifood'))
      .reduce((s, t) => s + t.amount, 0);

    if (foodExpenses > 200) {
      const saving = foodExpenses * 0.2;
      const monthsSaved = Math.round(remaining / saving);
      return {
        goalName: activeGoal.name,
        message: `Se você reduzir 20% do seu gasto com delivery (${formatCurrency(saving)}), você atingirá sua meta de "${activeGoal.name}" ${monthsSaved} meses mais rápido!`,
        prompt: `Como posso economizar em delivery para atingir minha meta "${activeGoal.name}" mais rápido? Atualmente gasto ${formatCurrency(foodExpenses)} por mês.`
      };
    }

    return {
      goalName: activeGoal.name,
      message: `Você está a ${formatCurrency(remaining)} de distância da sua meta "${activeGoal.name}". Que tal automatizar um aporte mensal?`,
      prompt: `Estou a ${formatCurrency(remaining)} de distância da minha meta "${activeGoal.name}". Me dê dicas práticas de como economizar para chegar lá em 6 meses.`
    };
  }, [goals, allTransactions, allAccounts, getAccountBalance]);

  if (!suggestion) return null;

  return (
    <Card 
      className={cn(
        "bg-primary text-primary-foreground border-none shadow-lg overflow-hidden animate-scale-in cursor-pointer transition-all hover:brightness-110 active:scale-[0.98] group",
        !onClick && "cursor-default hover:brightness-100"
      )}
      onClick={() => onClick?.(suggestion.prompt)}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform">
          <Sparkles className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Acelerador de Metas</p>
          <p className="text-xs font-medium leading-relaxed">
            {suggestion.message}
          </p>
        </div>
        <div className="p-2 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-4 h-4 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}