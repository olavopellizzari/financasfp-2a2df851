"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, Transaction, TransactionType, generateId } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserFilter } from '@/components/UserFilter';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, ArrowUpRight, ArrowDownRight, Wallet, ChevronLeft, ChevronRight, Filter, X, Trash2 } from 'lucide-react';
import { format, addMonths, subMonths, isValid, parseISO, startOfDay, isAfter, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

export function TransactionsPage() {
  const { currentUser, users } = useAuth();
  const { allTransactions, allAccounts, allCards, categories, calculateMesFatura, createTransaction, updateTransaction, deleteTransaction, getCategoryById, refresh } = useFinance();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const isCardMode = searchParams.get('type') === 'card';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  
  const [selectedUserId, setSelectedUserId] = useState<string>('total');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    userId: currentUser?.id || '',
    type: (isCardMode ? 'CREDIT' : 'EXPENSE') as TransactionType,
    amount: '',
    description: '',
    purchaseDate: new Date(),
    categoryId: '',
    accountId: '',
    cardId: '',
    installments: '1',
    isPaid: false,
    recurrence: 'none',
    destinationUserId: currentUser?.id || '',
    destinationAccountId: '',
    notes: ''
  });

  useEffect(() => {
    if (currentUser?.id) {
      setFormData(prev => ({ ...prev, userId: currentUser.id, destinationUserId: currentUser.id }));
    }
  }, [currentUser?.id]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, type: (isCardMode ? 'CREDIT' : 'EXPENSE') as TransactionType }));
  }, [isCardMode]);

  useEffect(() => {
    const cardIdFromUrl = searchParams.get('cardId');
    if (isCardMode && cardIdFromUrl) {
      setFormData(prev => ({ ...prev, cardId: cardIdFromUrl }));
    }
  }, [isCardMode, searchParams]);

  const selectedMonthStr = useMemo(() => format(currentMonth, 'yyyy-MM'), [currentMonth]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      if (selectedUserId !== 'total') {
        if (selectedUserId === 'all') {
          const isShared = !tx.userId || allAccounts.find(a => a.id === tx.accountId)?.is_shared || allCards.find(c => c.id === tx.cardId)?.is_shared;
          if (!isShared) return false;
        } else if (tx.userId !== selectedUserId) {
          return false;
        }
      }

      if (isCardMode) {
        if (tx.type !== 'CREDIT' && tx.type !== 'REFUND') return false;
        if (tx.mesFatura !== selectedMonthStr) return false;
      } else {
        if (tx.type === 'CREDIT' || tx.type === 'REFUND') return false;
        if (tx.effectiveMonth !== selectedMonthStr) return false;
      }
      
      const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'ALL' || tx.type === filterType;
      
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [allTransactions, selectedMonthStr, searchQuery, filterType, isCardMode, selectedUserId, allAccounts, allCards]);

  const monthStats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const refunds = filteredTransactions.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
    return { income, totalExpenses: expenses - refunds, balance: income - (expenses - refunds) };
  }, [filteredTransactions]);

  const handleOpenDialog = () => {
    setEditingTransaction(null);
    setFormData(prev => ({
      ...prev,
      amount: '',
      description: '',
      purchaseDate: new Date(),
      categoryId: '',
      accountId: allAccounts.find(a => a.user_id === currentUser?.id || a.is_shared)?.id || '',
      cardId: isCardMode ? (allCards.find(c => c.user_id === currentUser?.id || (c as any).is_shared)?.id || '') : '',
      installments: '1',
      isPaid: false,
      recurrence: 'none',
      notes: ''
    }));
    setIsDialogOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormData({ 
      userId: tx.userId,
      type: tx.type,
      amount: tx.amount.toString(),
      description: tx.description,
      purchaseDate: parseISO(tx.purchaseDate),
      categoryId: tx.categoryId,
      accountId: tx.accountId || '',
      cardId: tx.cardId || '',
      installments: tx.totalInstallments?.toString() || '1',
      isPaid: tx.isPaid,
      recurrence: tx.isRecurring ? 'monthly' : 'none',
      destinationUserId: '',
      destinationAccountId: '',
      notes: tx.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (tx: Transaction) => {
    if (window.confirm('Excluir este lançamento?')) {
      await deleteTransaction(tx.id);
      toast({ title: 'Excluído!' });
    }
  };

  const handleTogglePaid = async (tx: Transaction) => {
    await updateTransaction(tx.id, { isPaid: !tx.isPaid });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const baseData = {
        userId: formData.userId,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        purchaseDate: formData.purchaseDate,
        categoryId: formData.categoryId,
        isPaid: formData.isPaid,
        notes: formData.notes,
        isRecurring: formData.recurrence !== 'none',
        installmentGroupId: null,
        installmentNumber: null,
        totalInstallments: null,
        effectiveMonth: selectedMonthStr,
        mes_fatura: null
      };

      if (formData.type === 'TRANSFER') {
        await createTransaction({
          ...baseData,
          type: 'EXPENSE',
          accountId: formData.accountId,
          categoryId: categories.find(c => c.name === 'Transferência')?.id || '',
          description: `Transferência para ${users.find(u => u.id === formData.destinationUserId)?.name || 'Outra Conta'}`,
          isPaid: true
        });
        await createTransaction({
          ...baseData,
          type: 'INCOME',
          userId: formData.destinationUserId,
          accountId: formData.destinationAccountId,
          categoryId: categories.find(c => c.name === 'Transferência')?.id || '',
          description: `Transferência de ${users.find(u => u.id === formData.userId)?.name || 'Outra Conta'}`,
          isPaid: true
        });
      } else if (formData.type === 'CREDIT' || formData.type === 'REFUND') {
        if (!formData.cardId) throw new Error('Selecione um cartão para lançamentos de cartão.');
        
        const totalInstallments = parseInt(formData.installments) || 1;
        const groupId = totalInstallments > 1 ? generateId() : null;

        for (let i = 0; i < totalInstallments; i++) {
          const installmentDate = addMonths(formData.purchaseDate, i);
          const mesFatura = calculateMesFatura(installmentDate, formData.cardId);
          const installmentDesc = totalInstallments > 1 
            ? `${formData.description} (${i + 1}/${totalInstallments})` 
            : formData.description;

          await createTransaction({
            ...baseData,
            description: installmentDesc,
            purchaseDate: installmentDate,
            cardId: formData.cardId,
            effectiveMonth: mesFatura,
            mes_fatura: mesFatura,
            accountId: null,
            installmentGroupId: groupId,
            installmentNumber: i + 1,
            totalInstallments: totalInstallments
          });
        }
      } else {
        if (!formData.accountId) throw new Error('Selecione uma conta para este lançamento.');
        await createTransaction({
          ...baseData,
          accountId: formData.accountId,
          cardId: null,
        });
      }

      setIsDialogOpen(false);
      toast({ title: 'Salvo com sucesso!' });
      await refresh();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const availableAccounts = useMemo(() => {
    return allAccounts.filter(a => a.user_id === formData.userId || a.is_shared);
  }, [allAccounts, formData.userId]);

  const availableCards = useMemo(() => {
    return allCards.filter(c => c.user_id === formData.userId || (c as any).is_shared);
  }, [allCards, formData.userId]);

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{isCardMode ? 'Lançamentos de Cartão' : 'Lançamentos'}</h1>
        <div className="flex items-center gap-3">
          <UserFilter 
            value={selectedUserId} 
            onChange={setSelectedUserId} 
            showTotalOption={true}
            className="w-full sm:w-[180px] shrink-0"
          />
          <Button onClick={handleOpenDialog} className="gradient-primary shadow-primary px-3 sm:px-4">
            <Plus className="w-4 h-4 sm:mr-2" /> 
            <span className="hidden sm:inline">Novo</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-income/10"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Receitas</p><p className="text-lg font-bold text-income">{formatCurrency(monthStats.income)}</p></CardContent></Card>
        <Card className="bg-expense/10"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Despesas</p><p className="text-lg font-bold text-expense">{formatCurrency(monthStats.totalExpenses)}</p></CardContent></Card>
        <Card className="bg-muted"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo</p><p className="text-lg font-bold">{formatCurrency(monthStats.balance)}</p></CardContent></Card>
      </div>

      <Card className="finance-card">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-bold min-w-[120px] text-center capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[150px] sm:min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}><SelectTrigger className="w-full sm:w-[140px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem><SelectItem value="INCOME">Receita</SelectItem><SelectItem value="EXPENSE">Despesa</SelectItem><SelectItem value="CREDIT">Cartão</SelectItem><SelectItem value="REFUND">Estorno</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      <Card className="finance-card overflow-hidden">
        <TransactionTable 
          transactions={filteredTransactions} 
          selectedIds={selectedIds} 
          onToggleSelect={(id) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); }}
          onToggleSelectAll={() => setSelectedIds(selectedIds.size === filteredTransactions.length ? new Set() : new Set(filteredTransactions.map(t => t.id)))}
          onEdit={handleEdit} onDelete={handleDelete} onTogglePaid={handleTogglePaid}
          getCategoryById={getCategoryById} users={users as any}
        />
      </Card>

      <TransactionForm 
        isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} editingTransaction={editingTransaction}
        formData={formData} setFormData={setFormData} onSubmit={handleSubmit} isSaving={isSaving}
        users={users as any} availableAccounts={availableAccounts} availableCards={availableCards} categories={categories}
        onDescriptionChange={(desc) => setFormData({ ...formData, description: desc })}
      />
    </div>
  );
}