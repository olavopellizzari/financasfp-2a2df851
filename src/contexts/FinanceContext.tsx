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
  Invoice,
  getCurrentMonth
} from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, addMonths, getDate, parse, isValid } from 'date-fns';

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
  // CRUD Operations
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
    if (!currentUser) {
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
        setAllAccounts(accData.data.map(a => ({
          ...a,
          userId: a.user_id,
          isShared: a.is_shared,
          isArchived: a.is_archived,
          initialBalance: a.balance
        })));
        setAccounts(accData.data.filter(a => a.user_id === currentUser.id || a.is_shared));
      }

      if (cardData.data) {
        setAllCards(cardData.data.map(c => ({
          ...c,
          userId: c.user_id,
          closingDay: c.closing_day,
          dueDay: c.due_day,
          isArchived: c.is_archived,
          defaultAccountId: c.default_account_id
        })));
        setCards(cardData.data.filter(c => c.user_id === currentUser.id));
      }

      if (txData.data) {
        const parseLocalDate = (dateStr: string) => {
          if (!dateStr) return new Date();
          const [year, month, day] = dateStr.split('-').map(Number);
          // Forçamos 12:00 para evitar que o fuso horário mude o dia ao converter para objeto Date
          return new Date(year, month - 1, day, 12, 0, 0);
        };

        const mappedTxs: Transaction[] = txData.data.map(t => ({
          id: t.id,
          userId: t.user_id,
          accountId: t.account_id,
          cardId: t.card_id,
          categoryId: t.category_id,
          amount: t.amount,
          description: t.description,
          type: t.type,
          status: t.status,
          purchaseDate: parseLocalDate(t.purchase_date),
          effectiveDate: parseLocalDate(t.effective_date),
          effectiveMonth: t.effective_month,
          mesFatura: t.mes_fatura,
          installmentNumber: t.installment_number,
          totalInstallments: t.total_installments,
          installmentGroupId: t.installment_group_id,
          isRecurring: t.is_recurring,
          isPaid: t.is_paid,
          notes: t.notes,
          createdAt: new Date(t.created_at)
        }));
        setAllTransactions(mappedTxs);
        setTransactions(mappedTxs.filter(t => t.userId === currentUser.id));
      }

      if (invData.data) {
        setInvoices(invData.data.map(i => ({
          id: i.id,
          cardId: i.card_id,
          userId: i.user_id,
          month: i.month,
          closingDate: new Date(i.closing_date),
          dueDate: new Date(i.due_date),
          totalAmount: i.total_amount,
          paidAmount: i.paid_amount,
          status: i.status,
          paidFromAccountId: i.paid_from_account_id,
          paidAt: i.paid_at ? new Date(i.paid_at) : null,
          createdAt: new Date(i.created_at),
          updatedAt: new Date(i.updated_at)
        })));
      }

      if (budData.data) {
        setAllBudgets(budData.data.map(b => ({
          id: b.id,
          userId: b.user_id,
          month: b.month,
          income: b.income,
          expenses: b.expenses,
          savingsGoal: b.savings_goal,
          cycleEndDay: b.cycle_end_day,
          categoryLimits: b.category_limits || {}
        })));
      }

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

    const balance = txs.reduce((sum, t) => {
      if (t.type === 'INCOME' || t.type === 'REFUND') return sum + t.amount;
      if (t.type === 'EXPENSE' || t.type === 'TRANSFER') return sum - t.amount;
      return sum;
    }, account.balance || 0);

    return balance;
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
    if (day >= card.closingDay) {
      return format(addMonths(purchaseDate, 1), 'yyyy-MM');
    }
    return format(purchaseDate, 'yyyy-MM');
  };

  // CRUD Operations
  const createTransaction = async (data: any) => {
    const formatDateForDB = (date: Date | string) => {
      if (typeof date === 'string') return date;
      return format(date, 'yyyy-MM-dd');
    };

    const { error } = await supabase.from('transactions').insert([{
      user_id: data.userId,
      account_id: data.accountId,
      card_id: data.card_id || data.cardId,
      category_id: data.categoryId,
      amount: data.amount,
      description: data.description,
      type: data.type,
      status: data.status || 'confirmed',
      purchase_date: formatDateForDB(data.purchaseDate),
      effective_date: formatDateForDB(data.effectiveDate || data.purchaseDate),
      effective_month: data.effectiveMonth,
      mes_fatura: data.mesFatura,
      installment_number: data.installmentNumber,
      total_installments: data.totalInstallments,
      installment_group_id: data.installmentGroupId,
      is_recurring: data.isRecurring,
      is_paid: data.is_paid ?? data.isPaid,
      notes: data.notes
    }]);
    if (error) throw error;
    await fetchData();
  };

  const updateTransaction = async (id: string, data: any) => {
    const formatDateForDB = (date: Date | string) => {
      if (typeof date === 'string') return date;
      return format(date, 'yyyy-MM-dd');
    };

    const updateData: any = {};
    if (data.userId) updateData.user_id = data.userId;
    if (data.accountId !== undefined) updateData.account_id = data.accountId;
    if (data.cardId !== undefined) updateData.card_id = data.cardId;
    if (data.categoryId) updateData.category_id = data.categoryId;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.description) updateData.description = data.description;
    if (data.type) updateData.type = data.type;
    if (data.status) updateData.status = data.status;
    if (data.purchaseDate) updateData.purchase_date = formatDateForDB(data.purchaseDate);
    if (data.effectiveMonth) updateData.effective_month = data.effectiveMonth;
    if (data.mesFatura !== undefined) updateData.mes_fatura = data.mesFatura;
    if (data.isPaid !== undefined) updateData.is_paid = data.isPaid;
    if (data.notes !== undefined) updateData.notes = data.notes;

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
      name: data.name,
      type: data.type,
      balance: data.balance,
      color: data.color,
      icon: data.icon,
      is_shared: data.isShared,
      is_archived: false
    }]);
    if (error) throw error;
    await fetchData();
  };

  const updateAccount = async (id: string, data: any) => {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.type) updateData.type = data.type;
    if (data.balance !== undefined) updateData.balance = data.balance;
    if (data.color) updateData.color = data.color;
    if (data.isShared !== undefined) updateData.is_shared = data.isShared;
    if (data.isArchived !== undefined) updateData.is_archived = data.isArchived;

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
      name: data.name,
      last_digits: data.lastDigits,
      brand: data.brand,
      limit: data.limit,
      closing_day: data.closingDay,
      due_day: data.dueDay,
      color: data.color,
      responsible_user_id: data.responsibleUserId,
      default_account_id: data.defaultAccountId,
      is_archived: false
    }]);
    if (error) throw error;
    await fetchData();
  };

  const updateCard = async (id: string, data: any) => {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.lastDigits) updateData.last_digits = data.lastDigits;
    if (data.brand) updateData.brand = data.brand;
    if (data.limit !== undefined) updateData.limit = data.limit;
    if (data.closingDay !== undefined) updateData.closing_day = data.closingDay;
    if (data.dueDay !== undefined) updateData.due_day = data.dueDay;
    if (data.color) updateData.color = data.color;
    if (data.responsibleUserId) updateData.responsible_user_id = data.responsibleUserId;
    if (data.defaultAccountId !== undefined) updateData.default_account_id = data.defaultAccountId;
    if (data.isArchived !== undefined) updateData.is_archived = data.isArchived;

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
      id: data.id,
      user_id: data.userId,
      month: data.month,
      income: data.income,
      savings_goal: data.savingsGoal,
      cycle_end_day: data.cycleEndDay || data.cycle_end_day,
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
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}