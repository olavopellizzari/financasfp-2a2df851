"use client";

import { useState, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/db';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useAIChat() {
  const { allTransactions, allAccounts, getAccountBalance, goals, categories } = useFinance();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Olá ${currentUser?.name || 'usuário'}! Sou seu assistente Dyad. Como posso ajudar com suas finanças hoje?`,
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const processMessage = useCallback(async (text: string) => {
    const userMessage: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simula processamento da IA
    setTimeout(() => {
      const query = text.toLowerCase();
      let response = "";

      // Lógica de resposta baseada em palavras-chave e dados reais
      if (query.includes('saldo') || query.includes('quanto eu tenho')) {
        const total = allAccounts
          .filter(a => a.active !== false && !a.exclude_from_totals)
          .reduce((sum, a) => sum + getAccountBalance(a.id), 0);
        response = `Seu saldo total disponível em todas as contas (não ocultas) é de ${formatCurrency(total)}.`;
      } 
      else if (query.includes('gastei') || query.includes('gastos') || query.includes('despesa')) {
        const now = new Date();
        const monthStr = format(now, 'yyyy-MM');
        const monthTxs = allTransactions.filter(t => t.effectiveMonth === monthStr && (t.type === 'EXPENSE' || t.type === 'CREDIT'));
        const total = monthTxs.reduce((s, t) => s + t.amount, 0);
        response = `Neste mês (${format(now, 'MMMM')}), você já gastou um total de ${formatCurrency(total)}.`;
      }
      else if (query.includes('meta') || query.includes('objetivo')) {
        const activeGoals = goals.filter(g => !g.is_completed);
        if (activeGoals.length > 0) {
          const goal = activeGoals[0];
          response = `Você tem ${activeGoals.length} metas ativas. A principal é "${goal.name}", onde você já atingiu uma boa parte do objetivo de ${formatCurrency(goal.target_amount)}.`;
        } else {
          response = "Você ainda não definiu nenhuma meta financeira. Que tal criar uma para economizar para o futuro?";
        }
      }
      else if (query.includes('ajuda') || query.includes('o que você faz')) {
        response = "Eu posso te informar seu saldo total, quanto você gastou no mês, o status das suas metas e dar dicas de economia baseadas no seu perfil!";
      }
      else {
        response = "Interessante! Como assistente financeiro, posso te dar detalhes sobre seus saldos, gastos mensais e metas. Experimente perguntar 'Qual meu saldo total?' ou 'Quanto gastei este mês?'.";
      }

      const assistantMessage: Message = { role: 'assistant', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  }, [allTransactions, allAccounts, getAccountBalance, goals, currentUser]);

  return { messages, isTyping, sendMessage: processMessage };
}