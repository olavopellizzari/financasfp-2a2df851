import React, { createContext, useContext, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { 
  Account, 
  Card, 
  Transaction, 
  Category, 
  Budget, 
  Goal, 
  Debt,
  Invoice
} from '@/lib/db';
import { format, addMonths, getDate, isValid, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface FinanceContextType {
  accounts: Account[];
  allAccounts: Account[];
  cards: Card[];
  allCards: Card[];
  transactions: Transaction[];
  allTransactions: Transaction[];
  categories: Category[];
  allBudgets: Budget[];
  invoices: Invoice[];
  goals: Goal[];
  debts: Debt[];
  loading: boolean;
  refresh: () => Promise<void>;
  getAccountBalance: (accountId: string) => number;
  getCardBalance: (cardId: string) => number;
  getCategoryById: (categoryId: string) => Category | undefined;
  createTransaction: (data: any) => Promise<void>;
  updateTransaction: (id: string, data: any) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  createAccount: (data: any) => Promise<void>;
  updateAccount: (id: string, data: any) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  createCard: (data: any) => Promise<void>;
  updateCard: (id: string, data: any) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  saveBudget: (data: any) => Promise<void>;
  saveGoal: (data: any) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  saveDebt: (data: any) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  calculateMesFatura: (purchaseDate: Date, cardId: string) => string;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, users } = useAuth();
  const queryClient = useQueryClient();
  const familyId = currentUser?.family_id;
  const familyUserIds = useMemo(() => users.map(u => u.id), [users]);

  // Queries individuais com TanStack Query
  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ['categories', familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const { data } = await supabase
        .from('categories')
        .select('*')
        .or(`household_id.eq.${familyId},household_id.is.null`)
        .order('name');
      
      const catMap = new Map<string, any>();
      data?.forEach(c => {
        catMap.set(c.name.toLowerCase(), { ...c, type: c.kind === 'receita' ? 'income' : 'expense' });
      });
      return Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!familyId
  });

  const { data: allAccountsRaw = [], isLoading: loadingAccs } = useQuery({
    queryKey: ['accounts', familyId],
    queryFn: async () => {
      const { data } = await supabase.from('accounts').select('*').eq('household_id', familyId).order('name');
      return (data || []) as Account[];
    },
    enabled: !!familyId
  });

  const { data: allCardsRaw = [], isLoading: loadingCards } = useQuery({
    queryKey: ['cards', familyId],
    queryFn: async () => {
      const { data } = await supabase.from('cards').select('*').eq('household_id', familyId).order('name');
      return (data || []) as Card[];
    },
    enabled: !!familyId
  });

  const { data: allTransactionsRaw = [], isLoading: loadingTxs } = useQuery({
    queryKey: ['transactions', familyUserIds],
    queryFn: async () => {
      if (familyUserIds.length === 0) return [];
      const { data } = await supabase.from('transactions').select('*').in('user_id', familyUserIds).order('purchase_date', { ascending: false });
      return (data || []).map(t => ({
        id: t.id, type: t.type, amount: t.amount, description: t.description,
        purchaseDate: t.purchase_date, effectiveDate: t.effective_date,
        effectiveMonth: t.effective_month, mesFatura: t.mes_fatura,
        status: t.status, isPaid: t.is_paid, userId: t.user_id,
        accountId: t.account_id, cardId: t.card_id, categoryId: t.category_id,
        installmentGroupId: t.installment_group_id, installmentNumber: t.installment_number,
        totalInstallments: t.total_installments, notes: t.notes || '',
        isRecurring: t.is_recurring, createdAt: new Date(t.created_at)
      })) as Transaction[];
    },
    enabled: familyUserIds.length > 0
  });

  const { data: allBudgets = [] } = useQuery({
    queryKey: ['budgets', familyUserIds],
    queryFn: async () => {
      const { data } = await supabase.from('budgets').select('*').in('user_id', familyUserIds);
      return (data || []) as Budget[];
    },
    enabled: familyUserIds.length > 0
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', familyUserIds],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('*').in('user_id', familyUserIds);
      return (data || []) as Invoice[];
    },
    enabled: familyUserIds.length > 0
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', familyUserIds],
    queryFn: async () => {
      const { data } = await supabase.from('goals').select('*').in('user_id', familyUserIds);
      return (data || []) as Goal[];
    },
    enabled: familyUserIds.length > 0
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts', familyUserIds],
    queryFn: async () => {
      const { data } = await supabase.from('debts').select('*').in('user_id', familyUserIds);
      return (data || []) as Debt[];
    },
    enabled: familyUserIds.length > 0
  });

  // Filtros para o usuário logado
  const filteredAccounts = useMemo(() => {
    return allAccountsRaw.filter(a => a.user_id === currentUser?.id || a.is_shared);
  }, [allAccountsRaw, currentUser?.id]);

  const filteredCards = useMemo(() => {
    return allCardsRaw.filter(c => c.user_id === currentUser?.id || (c as any).is_shared);
  }, [allCardsRaw, currentUser?.id]);

  const filteredTransactions = useMemo(() => {
    return allTransactionsRaw.filter(t => t.userId === currentUser?.id);
  }, [allTransactionsRaw, currentUser?.id]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    await queryClient.invalidateQueries({ queryKey: ['cards'] });
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
    await queryClient.invalidateQueries({ queryKey: ['budgets'] });
    await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    await queryClient.invalidateQueries({ queryKey: ['goals'] });
    await queryClient.invalidateQueries({ queryKey: ['debts'] });
  };

  const getAccountBalance = (accountId: string) => {
    const account = allAccountsRaw.find(a => a.id === accountId);
    if (!account) return 0;
    const txs = allTransactionsRaw.filter(t => t.accountId === accountId && t.status === 'confirmed' && t.isPaid === true);
    return txs.reduce((sum, t) => {
      if (t.type === 'INCOME' || t.type === 'REFUND') return sum + t.amount;
      if (t.type === 'EXPENSE' || t.type === 'TRANSFER') return sum - t.amount;
      return sum;
    }, account.opening_balance || 0);
  };

  const getCardBalance = (cardId: string) => {
    const txs = allTransactionsRaw.filter(t => t.cardId === cardId && t.status !== 'cancelled');
    return txs.reduce((sum, t) => t.type === 'REFUND' ? sum - t.amount : sum + t.amount, 0);
  };

  const getCategoryById = (categoryId: string) => categories.find(c => c.id === categoryId);

  const calculateMesFatura = (purchaseDate: Date, cardId: string) => {
    if (!purchaseDate || !isValid(purchaseDate)) return format(new Date(), 'yyyy-MM');
    const card = allCardsRaw.find(c => c.id === cardId);
    if (!card) return format(purchaseDate, 'yyyy-MM');
    const day = getDate(purchaseDate);
    return day >= card.closing_day ? format(addMonths(purchaseDate, 1), 'yyyy-MM') : format(purchaseDate, 'yyyy-MM');
  };

  // Mutadores
  const createTransaction = async (data: any) => {
    const pDate = data.purchaseDate instanceof Date ? data.purchaseDate : new Date(data.purchaseDate);
    const eDate = data.effectiveDate ? (data.effectiveDate instanceof Date ? data.effectiveDate : new Date(data.effectiveDate)) : pDate;

    const { error } = await supabase.from('transactions').insert([{
      user_id: data.userId, 
      account_id: data.accountId || null, 
      card_id: data.cardId || null,
      category_id: data.categoryId || null, 
      amount: data.amount, 
      description: data.description, 
      type: data.type,
      status: data.status || 'confirmed', 
      purchase_date: format(pDate, 'yyyy-MM-dd'),
      effective_date: format(eDate, 'yyyy-MM-dd'),
      effective_month: data.effectiveMonth, 
      mes_fatura: data.mes_fatura,
      installment_number: data.installmentNumber, 
      total_installments: data.total_installments,
      installment_group_id: data.installmentGroupId, 
      is_recurring: data.isRecurring, 
      is_paid: data.isPaid, 
      notes: data.notes
    }]);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const updateTransaction = async (id: string, data: any) => {
    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isPaid !== undefined) updateData.is_paid = data.isPaid;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.userId !== undefined) updateData.user_id = data.userId;
    
    if (data.purchaseDate !== undefined) {
      const pDate = data.purchaseDate instanceof Date ? data.purchaseDate : parseISO(data.purchaseDate);
      updateData.purchase_date = format(pDate, 'yyyy-MM-dd');
      updateData.effective_date = format(pDate, 'yyyy-MM-dd');
      const currentTx = allTransactionsRaw.find(t => t.id === id);
      if (currentTx) {
        if (currentTx.cardId) {
          const mesFatura = calculateMesFatura(pDate, currentTx.cardId);
          updateData.mes_fatura = mesFatura;
          updateData.effective_month = mesFatura;
        } else {
          updateData.effective_month = format(pDate, 'yyyy-MM');
          updateData.mes_fatura = null;
        }
      }
    }
    const { error } = await supabase.from('transactions').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const createAccount = async (data: any) => {
    const { error } = await supabase.from('accounts').insert([{
      household_id: familyId, user_id: data.userId || currentUser?.id, name: data.name, bank: data.bank,
      account_type: data.type === 'checking' ? 'corrente' : data.type, opening_balance: data.balance,
      opening_date: new Date().toISOString().split('T')[0], active: true, is_shared: data.isShared ?? true,
      exclude_from_totals: data.excludeFromTotals ?? false
    }]);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const updateAccount = async (id: string, data: any) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.bank !== undefined) updateData.bank = data.bank;
    if (data.type !== undefined) updateData.account_type = data.type === 'checking' ? 'corrente' : data.type;
    if (data.balance !== undefined) updateData.opening_balance = data.balance;
    if (data.isArchived !== undefined) updateData.active = !data.isArchived;
    if (data.isShared !== undefined) updateData.is_shared = data.isShared;
    if (data.excludeFromTotals !== undefined) updateData.exclude_from_totals = data.excludeFromTotals;
    if (data.userId !== undefined) updateData.user_id = data.userId;
    const { error } = await supabase.from('accounts').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const createCard = async (data: any) => {
    const { error } = await supabase.from('cards').insert([{
      user_id: data.userId || currentUser?.id, household_id: familyId, name: data.name, last_digits: data.lastDigits,
      brand: data.brand, limit: data.limit, closing_day: data.closingDay, due_day: data.dueDay, color: data.color,
      responsible_user_id: data.responsibleUserId, default_account_id: data.defaultAccountId, is_shared: data.isShared ?? false
    }]);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const updateCard = async (id: string, data: any) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.limit !== undefined) updateData.limit = data.limit;
    if (data.closingDay !== undefined) updateData.closing_day = data.closingDay;
    if (data.dueDay !== undefined) updateData.due_day = data.dueDay;
    if (data.lastDigits !== undefined) updateData.last_digits = data.lastDigits;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.responsibleUserId !== undefined) updateData.responsible_user_id = data.responsibleUserId;
    if (data.defaultAccountId !== undefined) updateData.default_account_id = data.defaultAccountId;
    if (data.isShared !== undefined) updateData.is_shared = data.isShared;
    if (data.userId !== undefined) updateData.user_id = data.userId;
    const { error } = await supabase.from('cards').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const deleteCard = async (id: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const saveBudget = async (data: any) => {
    const { error } = await supabase.from('budgets').upsert({
      id: data.id,
      user_id: data.userId, 
      month: data.month, 
      income: data.income,
      savings_goal: data.savingsGoal, 
      category_limits: data.categoryLimits
    });
    if (error) throw new Error(error.message);
    await refresh();
  };

  const saveGoal = async (data: any) => {
    const { error } = await supabase.from('goals').upsert({
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      target_amount: data.target_amount,
      current_amount: data.current_amount,
      deadline: data.deadline,
      icon: data.icon,
      color: data.color,
      is_completed: data.is_completed
    });
    if (error) throw new Error(error.message);
    await refresh();
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };

  const saveDebt = async (data: any) => {
    const { error } = await supabase.from('debts').upsert({
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      total_amount: data.total_amount,
      paid_amount: data.paid_amount,
      interest_rate: data.interest_rate,
      start_date: data.start_date,
      due_date: data.due_date,
      monthly_payment: data.monthly_payment,
      is_active: data.is_active,
      notes: data.notes
    });
    if (error) throw new Error(error.message);
    await refresh();
  };

  const deleteDebt = async (id: string) => {
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };

  return (
    <FinanceContext.Provider value={{ 
      accounts: filteredAccounts, allAccounts: allAccountsRaw, 
      cards: filteredCards, allCards: allCardsRaw, 
      transactions: filteredTransactions, allTransactions: allTransactionsRaw, 
      categories, allBudgets, invoices, goals, debts, 
      loading: loadingCats || loadingAccs || loadingCards || loadingTxs, 
      refresh, getAccountBalance, getCardBalance, getCategoryById,
      createTransaction, updateTransaction, deleteTransaction,
      createAccount, updateAccount, deleteAccount,
      createCard, updateCard, deleteCard,
      saveBudget, saveGoal, deleteGoal, saveDebt, deleteDebt, calculateMesFatura
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
}