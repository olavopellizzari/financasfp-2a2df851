"use client";

import { useState, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/db';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isSameDay, 
  parseISO, 
  subDays, 
  startOfDay, 
  isWithinInterval,
  getYear,
  startOfYear,
  endOfYear
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
      content: `Olá ${currentUser?.name || 'usuário'}! Sou o Dyad AI. Agora tenho acesso total aos seus dados. Pode me perguntar sobre gastos por categoria, saldo de contas específicas, progresso de metas, faturas de cartões ou quanto qualquer membro da família gastou. Como posso ajudar?`,
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

      // --- 1. IDENTIFICAÇÃO DE ENTIDADES ---
      const targetUser = users.find(u => query.includes(u.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
      const targetAccount = allAccounts.find(a => query.includes(a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
      const targetCard = allCards.find(c => query.includes(c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
      const targetCategory = categories.find(c => query.includes(c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
      const targetGoal = goals.find(g => query.includes(g.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
      const targetDebt = debts.find(d => query.includes(d.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));

      // --- 2. IDENTIFICAÇÃO DE PERÍODO ---
      const today = startOfDay(new Date());
      let start: Date = startOfMonth(today);
      let end: Date = endOfMonth(today);
      let periodLabel = "este mês";

      if (query.includes('hoje')) {
        start = today; end = today; periodLabel = "hoje";
      } else if (query.includes('ontem')) {
        start = subDays(today, 1); end = subDays(today, 1); periodLabel = "ontem";
      } else if (query.includes('mes passado')) {
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth); end = endOfMonth(lastMonth);
        periodLabel = `em ${format(lastMonth, 'MMMM', { locale: ptBR })}`;
      } else if (query.includes('ano') || query.includes('este ano')) {
        start = startOfYear(today); end = endOfYear(today);
        periodLabel = `em ${getYear(today)}`;
      }

      // --- 3. LÓGICA DE RESPOSTA POR INTENÇÃO ---

      // A. Metas
      if (query.includes('meta') || query.includes('objetivo')) {
        if (targetGoal) {
          const totalBalance = allAccounts.filter(a => a.active !== false && !a.exclude_from_totals).reduce((s, a) => s + getAccountBalance(a.id), 0);
          const percent = (totalBalance / targetGoal.target_amount) * 100;
          response = `Sua meta **${targetGoal.name}** tem o alvo de **${formatCurrency(targetGoal.target_amount)}**. Com seu saldo atual, você já cobriu **${percent.toFixed(1)}%** do valor.`;
        } else {
          const activeGoals = goals.filter(g => !g.is_completed);
          response = `Você tem ${activeGoals.length} metas ativas. As principais são: ` + activeGoals.map(g => `\n• **${g.name}** (${formatCurrency(g.target_amount)})`).join('');
        }
      }
      // B. Dívidas
      else if (query.includes('divida') || query.includes('devo') || query.includes('emprestimo')) {
        if (targetDebt) {
          const remaining = targetDebt.total_amount - targetDebt.paid_amount;
          response = `A dívida **${targetDebt.name}** ainda possui um saldo de **${formatCurrency(remaining)}**. A próxima parcela é de **${formatCurrency(targetDebt.monthly_payment)}**.`;
        } else {
          const totalRemaining = debts.filter(d => d.is_active).reduce((s, d) => s + (d.total_amount - d.paid_amount), 0);
          response = `O total das suas dívidas ativas hoje é de **${formatCurrency(totalRemaining)}**.`;
        }
      }
      // C. Cartões / Faturas
      else if (query.includes('cartao') || query.includes('fatura') || query.includes('limite')) {
        if (targetCard) {
          const monthStr = format(start, 'yyyy-MM');
          const txs = allTransactions.filter(t => t.cardId === targetCard.id && t.mesFatura === monthStr && t.status !== 'cancelled');
          const total = txs.reduce((s, t) => t.type === 'REFUND' ? s - t.amount : s + t.amount, 0);
          response = `A fatura do cartão **${targetCard.name}** para ${periodLabel} está em **${formatCurrency(total)}**.`;
        } else {
          response = "Qual cartão você gostaria de consultar? Tenho dados do " + allCards.map(c => c.name).join(', ') + ".";
        }
      }
      // D. Saldo de Contas
      else if (query.includes('saldo') || query.includes('quanto eu tenho') || query.includes('dinheiro')) {
        if (targetAccount) {
          response = `O saldo atual na conta **${targetAccount.name}** é de **${formatCurrency(getAccountBalance(targetAccount.id))}**.`;
        } else {
          const total = allAccounts.filter(a => a.active !== false && !a.exclude_from_totals).reduce((s, a) => s + getAccountBalance(a.id), 0);
          response = `Seu saldo total disponível (consolidado) é de **${formatCurrency(total)}**.`;
        }
      }
      // E. Gastos e Receitas (O mais comum)
      else if (query.includes('gastei') || query.includes('recebi') || query.includes('gasto') || query.includes('renda') || query.includes('paguei')) {
        let filtered = allTransactions.filter(t => {
          const d = parseISO(t.purchaseDate);
          const inDate = d >= start && d <= end;
          if (!inDate) return false;
          
          if (targetUser && t.userId !== targetUser.id) return false;
          if (targetCategory && t.categoryId !== targetCategory.id) return false;
          if (targetAccount && t.accountId !== targetAccount.id) return false;
          if (targetCard && t.cardId !== targetCard.id) return false;
          
          return t.status !== 'cancelled';
        });

        const income = filtered.filter(t => t.type === 'INCOME' || t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
        const expense = filtered.filter(t => (t.type === 'EXPENSE' || t.type === 'CREDIT') && !t.description.includes('Pagamento de Fatura')).reduce((s, t) => s + t.amount, 0);

        const userTxt = targetUser ? ` de **${targetUser.name}**` : "";
        const catTxt = targetCategory ? ` em **${targetCategory.name}**` : "";
        
        if (query.includes('recebi') || query.includes('ganhei')) {
          response = `Você recebeu **${formatCurrency(income)}** ${periodLabel}${userTxt}${catTxt}.`;
        } else {
          response = `O total de gastos ${periodLabel}${userTxt}${catTxt} foi de **${formatCurrency(expense)}**.`;
        }

        if (filtered.length === 0) response = `Não encontrei registros ${periodLabel}${userTxt}${catTxt}.`;
      }
      // F. Orçamento / Limites
      else if (query.includes('orcamento') || query.includes('limite')) {
        const monthStr = format(start, 'yyyy-MM');
        const budget = allBudgets.find(b => b.month === monthStr && (targetUser ? b.user_id === targetUser.id : b.user_id === null));
        
        if (budget && targetCategory) {
          const limit = budget.category_limits[targetCategory.id] || 0;
          const spent = allTransactions
            .filter(t => t.effectiveMonth === monthStr && t.categoryId === targetCategory.id && (t.type === 'EXPENSE' || t.type === 'CREDIT'))
            .reduce((s, t) => s + t.amount, 0);
          
          response = `Para **${targetCategory.name}**, seu limite é **${formatCurrency(limit)}** e você já usou **${formatCurrency(spent)}** (${((spent/limit)*100).toFixed(0)}%).`;
        } else if (budget) {
          response = `O orçamento total planejado para ${periodLabel} é de **${formatCurrency(budget.income)}**.`;
        } else {
          response = `Não encontrei um orçamento definido para ${periodLabel}.`;
        }
      }
      // G. Fallback / Ajuda
      else {
        response = "Ainda não entendi essa pergunta. Tente algo como:\n" +
          "• 'Quanto gastei com Supermercado mês passado?'\n" +
          "• 'Qual o saldo do Itaú?'\n" +
          "• 'Como está minha meta de Viagem?'\n" +
          "• 'Quanto a [Nome] recebeu hoje?'\n" +
          "• 'Qual o valor da fatura do Nubank?'";
      }

      const assistantMessage: Message = { role: 'assistant', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1200);
  }, [allTransactions, allAccounts, allCards, getAccountBalance, categories, goals, debts, allBudgets, users, currentUser]);

  return { messages, isTyping, sendMessage: processMessage };
}