import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  calculateMesFatura: (purchaseDate: Date, cardId: string) => string;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentUser || !currentUser.family_id) {
      setLoading(false);
      return;
    }

    try {
      const [catData, accData, cardData, txData, budData, invData, goalData, debtData] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('accounts').select('*').order('name'),
        supabase.from('cards').select('*').order('name'),
        supabase.from('transactions').select('*').order('purchase_date', { ascending: false }),
        supabase.from('budgets').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('goals').select('*'),
        supabase.from('debts').select('*')
      ]);

      if (catData.data) {
        setCategories(catData.data.map(c => ({
          ...c,
          type: c.kind === 'receita' ? 'income' : 'expense'
        })));
      }
      
      if (accData.data) {
        setAllAccounts(accData.data as Account[]);
      }

      if (cardData.data) {
        setAllCards(cardData.data as Card[]);
      }

      if (txData.data) {
        const mappedTxs: Transaction[] = txData.data.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          purchaseDate: t.purchase_date,
          effectiveDate: t.effective_date,
          effectiveMonth: t.effective_month,
          mesFatura: t.mes_fatura,
          status: t.status,
          isPaid: t.is_paid,
          userId: t.user_id,
          accountId: t.account_id,
          cardId: t.card_id,
          categoryId: t.category_id,
          installmentGroupId: t.installment_group_id,
          installmentNumber: t.installment_number,
          totalInstallments: t.total_installments,
          notes: t.notes || '',
          isRecurring: t.is_recurring,
          createdAt: new Date(t.created_at)
        }));
        setAllTransactions(mappedTxs);
      }

      if (invData.data) setInvoices(invData.data as Invoice[]);
      if (budData.data) setAllBudgets(budData.data as Budget[]);
      if (goalData.data) setGoals(goalData.data as Goal[]);
      if (debtData.data) setDebts(debtData.data as Debt[]);

    } catch (error) {
      console.error('[FinanceContext] Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getAccountBalance = (accountId: string) => {
    const account = allAccounts.find(a => a.id === accountId);
    if (!account) return 0;

    const txs = allTransactions.filter(t => 
      t.accountId === accountId && 
      t.status === 'confirmed' && 
      t.isPaid === true
    );

    return txs.reduce((sum, t) => {
      if (t.type === 'INCOME' || t.type === 'REFUND') return sum + t.amount;
      if (t.type === 'EXPENSE' || t.type === 'TRANSFER') return sum - t.amount;
      return sum;
    }, account.opening_balance || 0);
  };

  const getCardBalance = (cardId: string) => {
    const txs = allTransactions.filter(t => t.cardId === cardId && t.status !== 'cancelled');
    return txs.reduce((sum, t) => {
      if (t.type === 'REFUND') return sum - t.amount;
      return sum + t.amount;
    }, 0);
  };

  const getCategoryById = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  const calculateMesFatura = (purchaseDate: Date, cardId: string) => {
    if (!purchaseDate || !isValid(purchaseDate)) return format(new Date(), 'yyyy-MM');
    const card = allCards.find(c => c.id === cardId);
    if (!card) return format(purchaseDate, 'yyyy-MM');
    const day = getDate(purchaseDate);
    return format(day >= card.closing_day ? addMonths(purchaseDate, 1) : purchaseDate, 'yyyy-MM');
  };

  const createTransaction = async (data: any) => {
    const { error } = await supabase.from('transactions').insert([{
      user_id: data.userId,
      account_id: data.accountId,
      card_id: data.cardId,
      category_id: data.categoryId,
      amount: data.amount,
      description: data.description,
      type: data.type,
      status: data.status || 'confirmed',
      purchase_date: format(data.purchaseDate, 'yyyy-MM-dd'),
      effective_date: format(data.effectiveDate || data.purchaseDate, 'yyyy-MM-dd'),
      effective_month: data.effectiveMonth,
      mes_fatura: data.mesFatura,
      installment_number: data.installmentNumber,
      total_installments: data.totalInstallments,
      installment_group_id: data.installmentGroupId,
      is_recurring: data.isRecurring,
      is_paid: data.isPaid,
      notes: data.notes
    }]);
    if (error) throw error;
    await fetchData();
  };

  const updateTransaction = async (id: string, data: any) => {
    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isPaid !== undefined) updateData.is_paid = data.isPaid;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.status !== undefined) updateData.status = data.status;

    const { error } = await supabase.from('transactions').update(updateData).eq('id', id);
    if (error) throw error;
    await fetchData();
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    await fetchData();
  };

  const createAccount = async (data: any) => {
    const { error } = await supabase.from('accounts').insert([{
      household_id: currentUser?.family_id,
      user_id: data.userId || currentUser?.id,
      name: data.name,
      bank: data.bank, // Adicionado campo bank
      account_type: data.type === 'checking' ? 'corrente' : data.type,
      opening_balance: data.balance,
      opening_date: new Date().toISOString().split('T')[0],
      active: true,
      is_shared: data.isShared ?? true
    }]);
    if (error) throw error;
    await fetchData();
  };

  const updateAccount = async (id: string, data: any) => {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.bank) updateData.bank = data.bank; // Adicionado campo bank
    if (data.balance !== undefined) updateData.opening_balance = data.balance;
    if (data.isArchived !== undefined) updateData.active = !data.isArchived;
    if (data.isShared !== undefined) updateData.is_shared = data.isShared;
    if (data.userId !== undefined) updateData.user_id = data.userId;

    const { error } = await supabase.from('accounts').update(updateData).eq('id', id);
    if (error) throw error;
    await fetchData();
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;
    await fetchData();
  };

  const createCard = async (data: any) => {
    const { error } = await supabase.from('cards').insert([{
      user_id: data.userId,
      household_id: currentUser?.family_id,
      name: data.name,
      last_digits: data.lastDigits,
      brand: data.brand,
      limit: data.limit,
      closing_day: data.closingDay,
      due_day: data.dueDay,
      color: data.color,
      responsible_user_id: data.responsibleUserId,
      default_account_id: data.defaultAccountId
    }]);
    if (error) throw error;
    await fetchData();
  };

  const updateCard = async (id: string, data: any) => {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.limit !== undefined) updateData.limit = data.limit;
    if (data.closingDay !== undefined) updateData.closing_day = data.closingDay;
    if (data.dueDay !== undefined) updateData.due_day = data.dueDay;

    const { error } = await supabase.from('cards').update(updateData).eq('id', id);
    if (error) throw error;
    await fetchData();
  };

  const deleteCard = async (id: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) throw error;
    await fetchData();
  };

  const saveBudget = async (data: any) => {
    const { error } = await supabase.from('budgets').upsert({
      user_id: data.userId,
      month: data.month,
      income: data.income,
      savings_goal: data.savingsGoal,
      category_limits: data.categoryLimits
    });
    if (error) throw error;
    await fetchData();
  };

  return (
    <FinanceContext.Provider value={{ 
      accounts: allAccounts, allAccounts, cards: allCards, allCards, transactions: allTransactions, allTransactions, 
      categories, allBudgets, invoices, goals, debts, loading, refresh: fetchData,
      getAccountBalance, getCardBalance, getCategoryById,
      createTransaction, updateTransaction, deleteTransaction,
      createAccount, updateAccount, deleteAccount,
      createCard, updateCard, deleteCard,
      saveBudget, calculateMesFatura
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