"use client";

import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/db';
import { subMonths, format } from 'date-fns';

export interface AIInsight {
  type: 'warning' | 'success' | 'info' | 'tip';
  title: string;
  message: string;
  category?: string;
}

export function useAIAssistant() {
  const { allTransactions, allBudgets, goals, categories, getCategoryById } = useFinance();
  const { currentUser } = useAuth();

  const insights = useMemo(() => {
    const list: AIInsight[] = [];
    if (!currentUser || allTransactions.length === 0) return list;

    const now = new Date();
    const currentMonthStr = format(now, 'yyyy-MM');
    const lastMonthStr = format(subMonths(now, 1), 'yyyy-MM');

    // 1. Análise de Gastos vs Mês Anterior
    const currentMonthTxs = allTransactions.filter(t => t.effectiveMonth === currentMonthStr && (t.type === 'EXPENSE' || t.type === 'CREDIT'));
    const lastMonthTxs = allTransactions.filter(t => t.effectiveMonth === lastMonthStr && (t.type === 'EXPENSE' || t.type === 'CREDIT'));

    const currentTotal = currentMonthTxs.reduce((s, t) => s + t.amount, 0);
    const lastTotal = lastMonthTxs.reduce((s, t) => s + t.amount, 0);

    if (lastTotal > 0) {
      const diff = ((currentTotal - lastTotal) / lastTotal) * 100;
      if (diff > 15) {
        list.push({
          type: 'warning',
          title: 'Aumento de Gastos',
          message: `Seus gastos este mês estão ${diff.toFixed(0)}% maiores que no mês passado. Que tal revisar os lançamentos recentes?`
        });
      } else if (diff < -10 && currentTotal > 0) {
        list.push({
          type: 'success',
          title: 'Economia Detectada',
          message: `Parabéns! Você está gastando ${Math.abs(diff).toFixed(0)}% menos que no mês anterior até agora.`
        });
      }
    }

    // 2. Análise de Orçamento (Budget)
    const budget = allBudgets.find(b => (b.user_id === currentUser.id || !b.user_id) && b.month === currentMonthStr);
    if (budget) {
      Object.entries(budget.category_limits).forEach(([catId, limit]) => {
        const spent = currentMonthTxs.filter(t => t.categoryId === catId).reduce((s, t) => s + t.amount, 0);
        const cat = getCategoryById(catId);
        if (limit > 0 && spent > limit) {
          list.push({
            type: 'warning',
            title: 'Limite Excedido',
            message: `Você ultrapassou o limite de ${formatCurrency(limit)} na categoria ${cat?.name || 'Outros'}.`,
            category: cat?.name
          });
        } else if (limit > 0 && spent > limit * 0.8) {
          list.push({
            type: 'tip',
            title: 'Atenção ao Limite',
            message: `Você já utilizou 80% do seu orçamento para ${cat?.name || 'Outros'}.`,
            category: cat?.name
          });
        }
      });
    }

    // 3. Análise de Metas (Goals)
    const activeGoals = goals.filter(g => !g.is_completed && (g.user_id === currentUser.id));
    if (activeGoals.length > 0) {
      const topGoal = activeGoals[0];
      list.push({
        type: 'info',
        title: 'Foco no Objetivo',
        message: `Lembre-se da sua meta: "${topGoal.name}". Cada pequena economia hoje te deixa mais perto de ${formatCurrency(topGoal.target_amount)}.`
      });
    }

    // 4. Dicas Genéricas de IA baseadas em comportamento
    const diningOutCat = categories.find(c => c.name.toLowerCase().includes('restaurante') || c.name.toLowerCase().includes('delivery'));
    if (diningOutCat) {
      const diningSpent = currentMonthTxs.filter(t => t.categoryId === diningOutCat.id).reduce((s, t) => s + t.amount, 0);
      if (diningSpent > currentTotal * 0.25) {
        list.push({
          type: 'tip',
          title: 'Insight de Alimentação',
          message: 'Seus gastos com restaurantes/delivery representam mais de 25% do seu total. Cozinhar em casa no próximo final de semana pode gerar uma boa economia!'
        });
      }
    }

    return list;
  }, [allTransactions, allBudgets, goals, categories, currentUser, getCategoryById]);

  return { insights };
}