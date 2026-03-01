import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
import { format, addMonths, subMonths, getDate, isValid, parseISO } from 'date-fns';

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
  const { currentUser, users } = useAuth();
  const [allAccountsRaw, setAllAccounts] = useState<Account[]>([]);
  const [allCardsRaw, setAllCards] = useState<Card[]>([]);
  const [allTransactionsRaw, setAllTransactions] = useState<Transaction[]>([]);
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
      const familyId = currentUser.family_id;
      const familyUserIds = users.map(u => u.id);

      if (familyUserIds.length === 0) {
        familyUserIds.push(currentUser.id);
      }

      const [catData, accData, cardData, txData, budData, invData, goalData, debtData] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .or(`household_id.eq.${familyId},household_id.is.null`)
          .order('name'),
        supabase.from('accounts').select('*').eq('household_id', familyId).order('name'),
        supabase.from('cards').select('*').eq('household_id', familyId).order('name'),
        supabase.from('transactions').select('*').in('user_id', familyUserIds).order('purchase_date', { ascending: false }),
        supabase.from('budgets').select('*').in('user_id', familyUserIds),
        supabase.from('invoices').select('*').in('user_id', familyUserIds),
        supabase.from('goals').select('*').in('user_id', familyUserIds),
        supabase.from('debts').select('*').in('user_id', familyUserIds)
      ]);

      if (catData.data) {
        const catMap = new Map<string, any>();
        catData.data.filter(c => !c.household_id).forEach(c => {
          catMap.set(c.name.toLowerCase(), {
            ...c,
            type: c.kind === 'receita' ? 'income' : 'expense'
          });
        });
        catData.data.filter(c => c.household_id).forEach(c => {
          catMap.set(c.name.toLowerCase(), {
            ...c,
            type: c.kind === 'receita' ? 'income' : 'expense'
          });
        });
        setCategories(Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      }
      
      if (accData.data) setAllAccounts(accData.data as Account[]);
      if (cardData.data) setAllCards(cardData.data as Card[]);

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
  }, [currentUser, users]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lógica de Privacidade: Filtra o que o usuário atual pode ver
  const filteredAccounts = useMemo(() => {
    return allAccountsRaw.filter(a => a.is_shared || a.user_id === currentUser?.id);
  }, [allAccountsRaw, currentUser?.id]);

  const filteredCards = useMemo(() => {
    return allCardsRaw.filter(c => (c as any).is_shared || c.user_id === currentUser?.id);
  }, [allCardsRaw, currentUser?.id]);

  const filteredTransactions = useMemo(() => {
    return allTransactionsRaw.filter(t => {
      if (t.accountId) {
        const acc = allAccountsRaw.find(a => a.id === t.accountId);
        if (acc && !acc.is_shared && acc.user_id !== currentUser?.id) return false;
      }
      if (t.cardId) {
        const card = allCardsRaw.find(c => c.id === t.cardId);
        if (card && !(card as any).is_shared && card.user_id !== currentUser?.id) return false;
      }
      return true;
    });
  }, [allTransactionsRaw, allAccountsRaw, allCardsRaw, currentUser?.id]);

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
    return txs.reduce((sum, t) => {
      if (t.type === 'REFUND') return sum - t.amount;
      return sum + t.amount;
    }, 0);
  };

  const getCategoryById = (categoryId: string) => categories.find(c => c.id === categoryId);

  const calculateMesFatura = (purchaseDate: Date, cardId: string) => {
    if (!purchaseDate || !isValid(purchaseDate)) return format(new Date(), 'yyyy-MM');
    const card = allCardsRaw.find(c => c.id === cardId);
    if (!card) return format(purchaseDate, 'yyyy-MM');

    const day = getDate(purchaseDate);
    
    if (day >= card.closing_day) {
      return format(addMonths(purchaseDate, 1), 'yyyy-MM');
    }
    
    return format(purchaseDate, 'yyyy-MM');
  };

  const createTransaction = async (data: any) => {
    const { error } = await supabase.from('transactions').insert([{
      user_id: data.userId,
      household_id: currentUser?.family_id,
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
      mes_fatura: data.mes_fatura,
      installment_number: data.installmentNumber,
      total_installments: data.total_installments,
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
    
    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  const createAccount = async (data: any) => {
    const { error } = await supabase.from('accounts').insert([{
      household_id: currentUser?.family_id,
      user_id: data.userId || currentUser?.id,
      name: data.name,
      bank: data.bank,
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
    if (data.bank) updateData.bank = data.bank;
    if (data.balance !== undefined) updateData.opening_balance = data.balance;
    if (data.isArchived !== undefined) updateData.active = !data.isArchived;
    if (data.isShared !== undefined) updateData.is_shared = data.isShared;
    if (data.userId !== undefined) updateData.user_id = data.userId;
    
    const { error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  const createCard = async (data: any) => {
    const { error } = await supabase.from('cards').insert([{
      user_id: data.userId || currentUser?.id,
      household_id: currentUser?.family_id,
      name: data.name,
      last_digits: data.lastDigits,
      brand: data.brand,
      limit: data.limit,
      closing_day: data.closingDay,
      due_day: data.dueDay,
      color: data.color,
      responsible_user_id: data.responsibleUserId,
      default_account_id: data.defaultAccountId,
      is_shared: data.isShared ?? false
    }]);
    if (error) throw error;
    await fetchData();
  };

  const updateCard = async (id: string, data: any) => {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.limit !== undefined) updateData.limit = data.limit;
    if (data.closingDay !== undefined) updateData.closing_day = data.closingDay;
    if (data.due_day !== undefined) updateData.due_day = data.dueDay;
    if (data.lastDigits !== undefined) updateData.last_digits = data.lastDigits;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.responsibleUserId !== undefined) updateData.responsible_user_id = data.responsibleUserId;
    if (data.defaultAccountId !== undefined) updateData.default_account_id = data.defaultAccountId;
    if (data.isShared !== undefined) updateData.is_shared = data.isShared;
    if (data.userId !== undefined) updateData.user_id = data.userId;
    
    const { error } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  const deleteCard = async (id: string) => {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id);

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
      accounts: filteredAccounts, allAccounts: allAccountsRaw, 
      cards: filteredCards, allCards: allCardsRaw, 
      transactions: filteredTransactions, allTransactions: allTransactionsRaw, 
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