"use client";

import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/db';
import { subMonths, format, parseISO, getDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AIInsight {
  type: 'warning' | 'success' | 'info' | 'tip';
  title: string;
  message: string;
  category?: string;
  actionable?: string;
}

export function useAIAssistant() {
  const { allTransactions, allBudgets, goals, categories, getCategoryById } = useFinance();
  const { currentUser } = useAuth();

  const insights = useMemo(() => {
    const list: AIInsight[] = [];
    if (!currentUser || allTransactions.length === 0) return list;

    const now = new Date();
    const currentMonthStr = format(now, 'yyyy-MM');
    
    // 1. Análise de Gastos vs Média dos últimos 3 meses
    const last3Months = [1, 2, 3].map(i => format(subMonths(now, i), 'yyyy-MM'));
    const currentMonthTxs = allTransactions.filter(t => t.effectiveMonth === currentMonthStr && (t.type === 'EXPENSE' || t.type === 'CREDIT'));
    
    const categorySpikes: Record<string, { current: number; history: number[] }> = {};
    
    allTransactions.forEach(t => {
      if (t.type !== 'EXPENSE' && t.type !== 'CREDIT') return;
      if (!t.categoryId) return;
      
      if (!categorySpikes[t.categoryId]) categorySpikes[t.categoryId] = { current: 0, history: [] };
      
      if (t.effectiveMonth === currentMonthStr) {
        categorySpikes[t.categoryId].current += t.amount;
      } else if (last3Months.includes(t.effectiveMonth)) {
        categorySpikes[t.categoryId].history.push(t.amount);
      }
    });

    Object.entries(categorySpikes).forEach(([catId, data]) => {
      const avgHistory = data.history.length > 0 ? data.history.reduce((a, b) => a + b, 0) / 3 : 0;
      if (avgHistory > 50 && data.current > avgHistory * 1.3) {
        const cat = getCategoryById(catId);
        const diffPercent = ((data.current - avgHistory) / avgHistory) * 100;
        list.push({
          type: 'warning',
          title: 'Aumento Súbito',
          message: `Seus gastos com ${cat?.name || 'uma categoria'} subiram ${diffPercent.toFixed(0)}% em relação à média dos últimos 3 meses.`,
          category: cat?.name,
          actionable: `Por que gastei tanto com ${cat?.name} este mês?`
        });
      }
    });

    // 2. Sugestão de Economia baseada no Orçamento
    const budget = allBudgets.find(b => (b.user_id === currentUser.id || !b.user_id) && b.month === currentMonthStr);
    if (budget) {
      const totalLimit = Object.values(budget.category_limits).reduce((a, b) => a + b, 0);
      const totalSpent = currentMonthTxs.reduce((s, t) => s + t.amount, 0);
      
      if (totalLimit > 0 && totalSpent > totalLimit * 0.9) {
        list.push({
          type: 'tip',
          title: 'Meta de Economia',
          message: `Você já atingiu 90% do seu orçamento total planejado. Tente reduzir gastos não essenciais nos próximos dias.`,
          actionable: "Como posso economizar até o fim do mês?"
        });
      }
    }

    // 3. Alerta de Dia de Pico (Análise Comportamental)
    const dayOfWeekSpending: Record<number, number> = {};
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    allTransactions.filter(t => (t.type === 'EXPENSE' || t.type === 'CREDIT')).forEach(t => {
      const day = getDay(parseISO(t.purchaseDate));
      dayOfWeekSpending[day] = (dayOfWeekSpending[day] || 0) + t.amount;
    });

    const peakDay = Object.entries(dayOfWeekSpending).sort((a, b) => b[1] - a[1])[0];
    if (peakDay) {
      const dayIdx = parseInt(peakDay[0]);
      list.push({
        type: 'info',
        title: 'Padrão de Consumo',
        message: `Detectamos que seu maior volume de gastos ocorre às ${dayNames[dayIdx]}s. Cuidado com compras por impulso nesse dia!`,
        actionable: `Dicas para gastar menos na ${dayNames[dayIdx]}`
      });
    }

    return list;
  }, [allTransactions, allBudgets, goals, categories, currentUser, getCategoryById]);

  return { insights };
}