"use client";

import { useState, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { askGemini } from '@/lib/gemini';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useAIChat() {
  const { 
    allTransactions, 
    allAccounts, 
    allCards,
    getAccountBalance, 
    categories, 
    goals, 
    debts, 
    allBudgets 
  } = useFinance();
  
  const { currentUser, users } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Olá ${currentUser?.name || 'usuário'}! Sou o Dyad AI, turbinado com Gemini Flash. Agora entendo perfeitamente suas finanças. Pode me perguntar qualquer coisa sobre seus gastos, metas ou saldos!`,
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const processMessage = useCallback(async (text: string) => {
    const userMessage: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Prepara o contexto financeiro simplificado para não exceder tokens desnecessariamente
      const context = {
        userName: currentUser?.name,
        accounts: allAccounts.map(a => ({ name: a.name, balance: getAccountBalance(a.id), type: a.account_type })),
        cards: allCards.map(c => ({ name: c.name, limit: c.limit })),
        recentTransactions: allTransactions.slice(0, 20).map(t => ({ 
          desc: t.description, 
          val: t.amount, 
          date: t.purchaseDate, 
          type: t.type,
          cat: categories.find(c => c.id === t.categoryId)?.name
        })),
        goals: goals.map(g => ({ name: g.name, target: g.target_amount, current: g.current_amount })),
        debts: debts.filter(d => d.is_active).map(d => ({ name: d.name, total: d.total_amount, remaining: d.total_amount - d.paid_amount }))
      };

      const response = await askGemini(text, context);

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: response, 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erro Gemini:", error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Desculpe, tive um problema ao processar sua pergunta. Pode tentar novamente?",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [allTransactions, allAccounts, allCards, getAccountBalance, categories, goals, debts, currentUser]);

  return { messages, isTyping, sendMessage: processMessage };
}