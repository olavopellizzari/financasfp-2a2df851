"use client";

import { useState, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, Transaction } from '@/lib/db';
import { format, startOfMonth, endOfMonth, subMonths, isSameDay, parseISO, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useAIChat() {
  const { allTransactions, allAccounts, getAccountBalance, categories } = useFinance();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Olá ${currentUser?.name || 'usuário'}! Sou seu assistente Dyad. Posso te dizer quanto você gastou ou recebeu hoje, no mês, por categoria ou em cada conta. O que deseja saber?`,
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
      const query = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let response = "";

      // 1. Identificar Intenção (Gasto ou Receita)
      const isExpenseQuery = query.includes('gastei') || query.includes('gasto') || query.includes('despesa') || query.includes('paguei');
      const isIncomeQuery = query.includes('recebi') || query.includes('ganhei') || query.includes('entrada') || query.includes('renda') || query.includes('salario');
      const isBalanceQuery = query.includes('saldo') || query.includes('quanto eu tenho') || query.includes('dinheiro');

      // 2. Identificar Período
      const today = startOfDay(new Date());
      let targetDateStart = null;
      let targetDateEnd = null;
      let periodLabel = "no período";

      if (query.includes('hoje')) {
        targetDateStart = today;
        periodLabel = "hoje";
      } else if (query.includes('ontem')) {
        targetDateStart = subDays(today, 1);
        periodLabel = "ontem";
      } else if (query.includes('mes passado')) {
        const lastMonth = subMonths(new Date(), 1);
        targetDateStart = startOfMonth(lastMonth);
        targetDateEnd = endOfMonth(lastMonth);
        periodLabel = `em ${format(lastMonth, 'MMMM', { locale: ptBR })}`;
      } else {
        // Padrão: Este mês
        targetDateStart = startOfMonth(new Date());
        targetDateEnd = endOfMonth(new Date());
        periodLabel = "este mês";
      }

      // 3. Identificar Categoria
      const targetCategory = categories.find(c => 
        query.includes(c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
      );

      // 4. Identificar Conta
      const targetAccount = allAccounts.find(a => 
        query.includes(a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
      );

      // --- LÓGICA DE RESPOSTA ---

      if (isBalanceQuery) {
        if (targetAccount) {
          const bal = getAccountBalance(targetAccount.id);
          response = `O saldo atual da conta **${targetAccount.name}** é de **${formatCurrency(bal)}**.`;
        } else {
          const total = allAccounts
            .filter(a => a.active !== false && !a.exclude_from_totals)
            .reduce((sum, a) => sum + getAccountBalance(a.id), 0);
          response = `Seu saldo total disponível (somando todas as contas ativas) é de **${formatCurrency(total)}**.`;
        }
      } 
      else if (isExpenseQuery || isIncomeQuery) {
        // Filtrar transações
        let filtered = allTransactions.filter(t => t.status !== 'cancelled');

        // Filtro de Data
        if (targetDateEnd) {
          filtered = filtered.filter(t => {
            const d = parseISO(t.purchaseDate);
            return d >= targetDateStart! && d <= targetDateEnd!;
          });
        } else {
          filtered = filtered.filter(t => isSameDay(parseISO(t.purchaseDate), targetDateStart!));
        }

        // Filtro de Categoria
        if (targetCategory) {
          filtered = filtered.filter(t => t.categoryId === targetCategory.id);
        }

        // Filtro de Conta
        if (targetAccount) {
          filtered = filtered.filter(t => t.accountId === targetAccount.id);
        }

        const income = filtered.filter(t => t.type === 'INCOME' || t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
        const expense = filtered.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);

        const catText = targetCategory ? ` na categoria **${targetCategory.name}**` : "";
        const accText = targetAccount ? ` na conta **${targetAccount.name}**` : "";

        if (isExpenseQuery && isIncomeQuery) {
          response = `Resumo ${periodLabel}${catText}${accText}: Você recebeu **${formatCurrency(income)}** e gastou **${formatCurrency(expense)}**.`;
        } else if (isIncomeQuery) {
          response = `Você recebeu um total de **${formatCurrency(income)}** ${periodLabel}${catText}${accText}.`;
        } else {
          response = `Você gastou um total de **${formatCurrency(expense)}** ${periodLabel}${catText}${accText}.`;
        }

        if (filtered.length === 0) {
          response = `Não encontrei nenhum lançamento ${periodLabel}${catText}${accText}.`;
        }
      }
      else {
        response = "Não entendi exatamente o que você busca. Tente perguntar algo como: 'Quanto gastei hoje?', 'Qual o saldo do Itaú?' ou 'Quanto recebi mês passado?'.";
      }

      const assistantMessage: Message = { role: 'assistant', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  }, [allTransactions, allAccounts, getAccountBalance, categories]);

  return { messages, isTyping, sendMessage: processMessage };
}