"use client";

import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, subMonths, isAfter, startOfMonth, parseISO } from 'date-fns';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export function useGamification() {
  const { allTransactions, allBudgets, allAccounts, getAccountBalance } = useFinance();
  const { currentUser } = useAuth();

  const stats = useMemo(() => {
    if (!currentUser) return { xp: 0, level: 1, nextLevelXp: 100, progress: 0, badges: [] };

    const userTxs = allTransactions.filter(t => t.userId === currentUser.id);
    
    // 1. XP por Transações (10 XP cada)
    const txXp = userTxs.length * 10;

    // 2. XP por Orçamentos batidos (100 XP cada mês que não estourou o total)
    // Analisamos os últimos 6 meses
    let budgetXp = 0;
    let budgetMaster = true;
    const last6Months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), i + 1), 'yyyy-MM'));
    
    last6Months.forEach(month => {
      const budget = allBudgets.find(b => b.user_id === currentUser.id && b.month === month);
      if (budget) {
        const spent = allTransactions
          .filter(t => t.userId === currentUser.id && t.effectiveMonth === month && (t.type === 'EXPENSE' || t.type === 'CREDIT'))
          .reduce((s, t) => s + t.amount, 0);
        
        const totalLimit = Object.values(budget.category_limits).reduce((a, b) => a + b, 0);
        if (totalLimit > 0 && spent <= totalLimit) {
          budgetXp += 100;
        } else if (totalLimit > 0) {
          budgetMaster = false;
        }
      }
    });

    // 3. XP por Saldo Positivo (200 XP por mês)
    // Simplificado: verifica se no fim dos meses anteriores o saldo era > 0
    let savingsXp = 0;
    let firstMonthPositive = false;
    
    last6Months.forEach(month => {
      const monthTxs = allTransactions.filter(t => t.userId === currentUser.id && t.effectiveMonth <= month);
      const balance = monthTxs.reduce((s, t) => {
        if (t.type === 'INCOME' || t.type === 'REFUND') return s + t.amount;
        return s - t.amount;
      }, 0);
      
      if (balance > 0) {
        savingsXp += 200;
        firstMonthPositive = true;
      }
    });

    const totalXp = txXp + budgetXp + savingsXp;
    
    // Lógica de Nível: Cada nível exige 500 XP a mais que o anterior
    // Nível 1: 0-500, Nível 2: 500-1000, etc.
    const level = Math.floor(totalXp / 500) + 1;
    const currentLevelXp = totalXp % 500;
    const progress = (currentLevelXp / 500) * 100;

    // 4. Conquistas (Badges)
    const badges: Badge[] = [
      {
        id: 'poupador',
        name: 'Poupador Iniciante',
        description: 'Primeiro mês encerrado com saldo positivo.',
        icon: '🌱',
        unlocked: firstMonthPositive
      },
      {
        id: 'consistente',
        name: 'Consistente',
        description: 'Lançamentos realizados nos últimos 7 dias.',
        icon: '🔥',
        unlocked: userTxs.some(t => isAfter(parseISO(t.purchaseDate), subMonths(new Date(), 0.25)))
      },
      {
        id: 'mestre',
        name: 'Mestre do Orçamento',
        description: 'Não estourou nenhuma categoria no último mês.',
        icon: '🏆',
        unlocked: budgetMaster && allBudgets.some(b => b.user_id === currentUser.id)
      }
    ];

    const levelTitles: Record<number, string> = {
      1: 'Iniciante Financeiro',
      2: 'Aprendiz de Poupador',
      3: 'Organizador Ativo',
      4: 'Estrategista de Gastos',
      5: 'Mestre das Finanças',
      6: 'Investidor Consciente',
      7: 'Guardião do Patrimônio',
      8: 'Sábio do Dinheiro',
      9: 'Magnata da Disciplina',
      10: 'Lenda da Prosperidade'
    };

    return {
      xp: totalXp,
      level,
      levelTitle: levelTitles[Math.min(level, 10)],
      nextLevelXp: 500,
      currentLevelXp,
      progress,
      badges
    };
  }, [allTransactions, allBudgets, currentUser]);

  return stats;
}