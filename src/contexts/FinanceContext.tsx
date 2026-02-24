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
import { toast } from '@/hooks/use-toast';
import { format, addMonths, getDate, isValid } from 'date-fns';

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

      if (catData.data) setCategories(catData.data);
      
      if (accData.data) {
        const mapped = accData.data.map(a => ({
          ...a,
          userId: a.user_id,
          isShared: a.is_shared,
          isArchived: a.is_archived,
          initialBalance: a.balance
        }));
        setAllAccounts(mapped);
        setAccounts(mapped.filter(a => a.userId === currentUser.id || a.isShared));
      }

      if (cardData.data) {
        const mapped = cardData.data.map(c => ({
          ...c,
          userId: c.user_id,
          closingDay: c.closing_day,
          dueDay: c.due_day,
          isArchived: c.is_archived,
          defaultAccountId: c.default_account_id
        }));
        setAllCards(mapped);
        setCards(mapped.filter(c => c.userId === currentUser.id));
      }

      if (txData.data) {
        const mappedTxs: Transaction[] = txData.data.map(t => ({
          ...t,
          userId: t.user_id,
          accountId: t.account_id,
          cardId: t.card_id,
          categoryId: t.category_id,
          purchaseDate: new Date(t.purchase_date),
          effectiveDate: new Date(t.effective_date),
          effectiveMonth: t.effective_month,
          mesFatura: t.mes_fatura,
          installmentNumber: t.installment_number,
          totalInstallments: t.total_installments,
          installmentGroupId: t.installment_group_id,
          isRecurring: t.is_recurring,
          isPaid: t.is_paid,
          createdAt: new Date(t.created_at)
        }));
        setAllTransactions(mappedTxs);
        setTransactions(mappedTxs.filter(t => t.userId === currentUser.id));
      }

      if (invData.data) setInvoices(invData.data);
      if (budData.data) setAllBudgets(budData.data);
      if (goalData.data) setGoals(goalData.data);
      if (debtData.data) setDebts(debtData.data);

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
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
    }, account.balance || 0);
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
    return format(day >= card.closingDay ? addMonths(purchaseDate, 1) : purchaseDate, 'yyyy-MM');
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
    if (data.description) updateData.description = data.description;
    if (data.isPaid !== undefined) updateData.is_paid = data.isPaid;
    if (data.categoryId) updateData.category_id = data.categoryId;

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
      user_id: data.userId,
      household_id: currentUser?.family_id,
      name: data.name,
      type: data.type,
      balance: data.balance,
      color: data.color,
      icon: data.icon,
      is_shared: data.isShared
    }]);
    if (error) throw error;
    await fetchData();
  };

  const updateAccount = async (id: string, data: any) => {
    const { error } = await supabase.from('accounts').update({
      name: data.name,
      balance: data.balance,
      is_archived: data.isArchived
    }).eq('id', id);
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
    const { error } = await supabase.from('cards').update({
      name: data.name,
      limit: data.limit,
      closing_day: data.closingDay,
      due_day: data.dueDay
    }).eq('id', id);
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
      accounts, allAccounts, cards, allCards, transactions, allTransactions, 
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