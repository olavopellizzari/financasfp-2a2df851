"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, Transaction, TransactionType, generateId } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { TransactionActions } from '@/components/transactions/TransactionActions';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Search, Wallet, CreditCard, ChevronLeft, ChevronRight, Filter, LayoutGrid } from 'lucide-react';
import { format, addMonths, subMonths, parseISO, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

export function TransactionsPage() {
  const { currentUser, users } = useAuth();
  const { allTransactions, allAccounts, allCards, categories, calculateMesFatura, createTransaction, updateTransaction, deleteTransaction, getCategoryById, refresh } = useFinance();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = searchParams.get('view') || 'accounts';
  const isCardMode = activeTab === 'cards';
  
  const selectedAccountId = searchParams.get('accountId') || 'all';
  const selectedCardId = searchParams.get('cardId') || 'all';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'total');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  useEffect(() => {
    if (currentUser?.id) {
      setFormData(prev => ({ ...prev, userId: currentUser.id, destinationUserId: currentUser.id }));
    }
  }, [currentUser?.id]);

  const selectedMonthStr = useMemo(() => format(currentMonth, 'yyyy-MM'), [currentMonth]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      if (selectedUserId !== 'total') {
        if (selectedUserId === 'all') {
          const familyAccountIds = new Set(allAccounts.filter(a => a.is_shared && !a.user_id).map(a => a.id));
          const familyCardIds = new Set(allCards.filter(c => (c as any).is_shared && !c.user_id).map(c => c.id));
          const isFamilyEntity = (tx.accountId && familyAccountIds.has(tx.accountId)) || (tx.cardId && familyCardIds.has(tx.cardId));
          if (!isFamilyEntity) return false;
        } else {
          const userAccountIds = new Set(allAccounts.filter(a => a.user_id === selectedUserId).map(a => a.id));
          const userCardIds = new Set(allCards.filter(c => c.user_id === selectedUserId).map(c => c.id));
          const belongsToUser = (tx.accountId && userAccountIds.has(tx.accountId)) || (tx.cardId && userCardIds.has(tx.cardId)) || (tx.userId === selectedUserId);
          if (!belongsToUser) return false;
        }
      }

      if (isCardMode) {
        if (!tx.cardId) return false;
        if (selectedCardId !== 'all' && tx.cardId !== selectedCardId) return false;
        if (tx.mesFatura !== selectedMonthStr) return false;
      } else {
        if (tx.cardId) return false;
        if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId) return false;
        if (tx.effectiveMonth !== selectedMonthStr) return false;
      }
      
      const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'ALL' || tx.type === filterType;
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [allTransactions, selectedMonthStr, searchQuery, filterType, isCardMode, selectedUserId, allAccounts, allCards, selectedAccountId, selectedCardId]);

  const monthStats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const refunds = filteredTransactions.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
    return { income, totalExpenses: expenses - refunds, balance: income - (expenses - refunds) };
  }, [filteredTransactions]);

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

  const handleOpenDialog = () => {
    setEditingTransaction(null);
    setFormData(prev => ({
      ...prev,
      type: isCardMode ? 'CREDIT' : 'EXPENSE',
      amount: '',
      description: '',
      purchaseDate: new Date(),
      categoryId: '',
      accountId: selectedAccountId !== 'all' ? selectedAccountId : (allAccounts.find(a => a.user_id === currentUser?.id || (a.is_shared && !a.user_id))?.id || ''),
      cardId: isCardMode ? (selectedCardId !== 'all' ? selectedCardId : (allCards.find(c => c.user_id === currentUser?.id || ((c as any).is_shared && !c.user_id))?.id || '')) : '',
      installments: '1',
      isPaid: !isCardMode,
      recurrence: 'none',
      notes: ''
    }));
    setIsDialogOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    const account = tx.accountId ? allAccounts.find(a => a.id === tx.accountId) : null;
    const card = tx.cardId ? allCards.find(c => c.id === tx.cardId) : null;
    const isExclusiveToOther = (account?.user_id && account.user_id !== currentUser?.id) || (card?.user_id && card.user_id !== currentUser?.id);
    if (isExclusiveToOther) {
      toast({ title: "Acesso Negado", description: "Você não pode alterar lançamentos de contas exclusivas de outros usuários.", variant: "destructive" });
      return;
    }
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

  const handleDelete = async (txIds: string[]) => {
    const allowedIds = txIds.filter(id => {
      const tx = allTransactions.find(t => t.id === id);
      if (!tx) return false;
      const account = tx.accountId ? allAccounts.find(a => a.id === tx.accountId) : null;
      const card = tx.cardId ? allCards.find(c => c.id === tx.cardId) : null;
      return !(account?.user_id && account.user_id !== currentUser?.id) && !(card?.user_id && card.user_id !== currentUser?.id);
    });
    if (allowedIds.length === 0) {
      toast({ title: "Ação não permitida", description: "Nenhum dos lançamentos selecionados pode ser excluído por você.", variant: "destructive" });
      return;
    }
    if (window.confirm(`Excluir ${allowedIds.length} lançamento(s)?`)) {
      try {
        for (const id of allowedIds) { await deleteTransaction(id); }
        toast({ title: 'Excluído!', description: `${allowedIds.length} lançamento(s) removido(s).` });
        setSelectedIds(new Set());
        await refresh();
      } catch (error: any) { toast({ title: 'Erro ao excluir', description: error.message, variant: "destructive" }); }
    }
  };

  const handleTogglePaid = async (tx: Transaction) => {
    const account = tx.accountId ? allAccounts.find(a => a.id === tx.accountId) : null;
    const card = tx.cardId ? allCards.find(c => c.id === tx.cardId) : null;
    if ((account?.user_id && account.user_id !== currentUser?.id) || (card?.user_id && card.user_id !== currentUser?.id)) {
      toast({ title: "Acesso Negado", description: "Você não pode alterar o status de lançamentos em contas exclusivas de outros usuários.", variant: "destructive" });
      return;
    }
    await updateTransaction(tx.id, { isPaid: !tx.isPaid });
    toast({ title: 'Status atualizado!', description: `Lançamento marcado como ${tx.isPaid ? 'Pendente' : 'Pago'}.` });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const totalAmount = parseFloat(formData.amount);
      const totalInstallments = parseInt(formData.installments) || 1;
      const installmentAmount = totalAmount / totalInstallments;

      const baseData = {
        userId: formData.userId,
        type: formData.type,
        amount: installmentAmount,
        description: formData.description,
        purchaseDate: formData.purchaseDate,
        categoryId: formData.categoryId,
        isPaid: formData.isPaid,
        notes: formData.notes,
        isRecurring: formData.recurrence !== 'none',
        installmentGroupId: null,
        installmentNumber: null,
        totalInstallments: null,
        effectiveMonth: format(formData.purchaseDate, 'yyyy-MM'),
        mes_fatura: null
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          ...baseData,
          amount: totalAmount,
          purchaseDate: format(formData.purchaseDate, 'yyyy-MM-dd'),
          effectiveDate: format(formData.purchaseDate, 'yyyy-MM-dd'),
          effectiveMonth: format(formData.purchaseDate, 'yyyy-MM'),
          mes_fatura: formData.cardId ? calculateMesFatura(formData.purchaseDate, formData.cardId) : null,
          accountId: formData.accountId,
          cardId: formData.cardId,
        });
        toast({ title: 'Lançamento atualizado!' });
      } else if (formData.type === 'TRANSFER') {
        const transferCatId = formData.categoryId || categories.find(c => 
          c.name.toLowerCase() === 'transferência' || 
          c.name.toLowerCase() === 'transferencia'
        )?.id || '';

        const senderName = users.find(u => u.id === formData.userId)?.name || 'Outra Conta';
        const receiverName = users.find(u => u.id === formData.destinationUserId)?.name || 'Outra Conta';

        await createTransaction({ 
          ...baseData, 
          type: 'EXPENSE', 
          accountId: formData.accountId, 
          categoryId: transferCatId, 
          description: `Transferência para ${receiverName}`, 
          isPaid: true 
        });

        await createTransaction({ 
          ...baseData, 
          type: 'INCOME', 
          userId: formData.destinationUserId, 
          accountId: formData.destinationAccountId, 
          categoryId: transferCatId, 
          description: `Transferência de ${senderName}`, 
          isPaid: true 
        });

        toast({ title: 'Transferência criada!' });
      } else if (formData.type === 'CREDIT' || formData.type === 'REFUND') {
        if (!formData.cardId) throw new Error('Selecione um cartão.');
        const groupId = totalInstallments > 1 ? generateId() : null;
        
        const firstMesFaturaStr = calculateMesFatura(formData.purchaseDate, formData.cardId);
        const firstMesFaturaDate = parse(firstMesFaturaStr, 'yyyy-MM', new Date());

        for (let i = 0; i < totalInstallments; i++) {
          const currentMesFaturaDate = addMonths(firstMesFaturaDate, i);
          const currentMesFatura = format(currentMesFaturaDate, 'yyyy-MM');
          
          // Incrementa a data da compra para que cada parcela caia no mês seguinte
          const currentPurchaseDate = addMonths(formData.purchaseDate, i);
          
          await createTransaction({
            ...baseData,
            description: formData.description,
            purchaseDate: currentPurchaseDate,
            cardId: formData.cardId,
            effectiveMonth: currentMesFatura,
            mes_fatura: currentMesFatura,
            accountId: null,
            installmentGroupId: groupId,
            installmentNumber: i + 1,
            totalInstallments: totalInstallments,
            isPaid: false
          });
        }
        toast({ title: 'Lançamento(s) de cartão criado(s)!' });
      } else {
        if (!formData.accountId) throw new Error('Selecione uma conta.');
        await createTransaction({ ...baseData, accountId: formData.accountId, cardId: null });
        toast({ title: 'Lançamento criado!' });
      }

      setIsDialogOpen(false);
      setSelectedIds(new Set());
      await refresh();
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: "destructive" }); } finally { setIsSaving(false); }
  };

  const availableAccounts = useMemo(() => allAccounts.filter(a => (a.is_shared && !a.user_id) || a.user_id === currentUser?.id), [allAccounts, currentUser?.id]);
  const availableCards = useMemo(() => allCards.filter(c => ((c as any).is_shared && !c.user_id) || c.user_id === currentUser?.id), [allCards, currentUser?.id]);
  const selectedTransactions = useMemo(() => filteredTransactions.filter(tx => selectedIds.has(tx.id)), [filteredTransactions, selectedIds]);

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Lançamentos</h1>
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenDialog} className="gradient-primary shadow-primary px-3 sm:px-4"><Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Novo</span></Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { const newParams = new URLSearchParams(searchParams); newParams.set('view', v); setSearchParams(newParams); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-md"><TabsTrigger value="accounts" className="gap-2"><Wallet className="h-4 w-4" /> Contas</TabsTrigger><TabsTrigger value="cards" className="gap-2"><CreditCard className="h-4 w-4" /> Cartões</TabsTrigger></TabsList>
      </Tabs>

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
            {isCardMode ? (
              <Select value={selectedCardId} onValueChange={(v) => updateFilter('cardId', v)}><SelectTrigger className="w-full sm:w-[180px]"><CreditCard className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Todos os Cartões" /></SelectTrigger><SelectContent><SelectItem value="all"><div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Todos os Cartões</div></SelectItem>{allCards.filter(c => !c.is_archived).map(card => (<SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>))}</SelectContent></Select>
            ) : (
              <Select value={selectedAccountId} onValueChange={(v) => updateFilter('accountId', v)}><SelectTrigger className="w-full sm:w-[180px]"><Wallet className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Todas as Contas" /></SelectTrigger><SelectContent><SelectItem value="all"><div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Todas as Contas</div></SelectItem>{allAccounts.filter(a => a.active !== false).map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent></Select>
            )}
            <div className="relative flex-1 min-w-[150px] sm:min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
            
            {!isCardMode && (
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                  <SelectItem value="REFUND">Estorno</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="finance-card overflow-hidden">
        <CardContent className="p-0">
          <TransactionTable 
            transactions={filteredTransactions} selectedIds={selectedIds} 
            onToggleSelect={(id) => { const newSelectedIds = new Set(selectedIds); if (newSelectedIds.has(id)) newSelectedIds.delete(id); else newSelectedIds.add(id); setSelectedIds(newSelectedIds); }}
            onToggleSelectAll={() => { if (selectedIds.size === filteredTransactions.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredTransactions.map(t => t.id))); }}
            onEdit={handleEdit} onDelete={(tx) => handleDelete([tx.id])} onTogglePaid={handleTogglePaid} getCategoryById={getCategoryById} users={users as any}
            accounts={allAccounts} cards={allCards}
          />
        </CardContent>
      </Card>

      <TransactionForm 
        isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} editingTransaction={editingTransaction}
        formData={formData} setFormData={setFormData} onSubmit={handleSubmit} isSaving={isSaving}
        users={users as any} availableAccounts={availableAccounts} availableCards={availableCards} categories={categories}
        onDescriptionChange={(desc) => setFormData({ ...formData, description: desc })}
      />

      <TransactionActions selectedTransactions={selectedTransactions} onEdit={handleEdit} onDelete={handleDelete} onTogglePaid={handleTogglePaid} onClearSelection={() => setSelectedIds(new Set())} />
    </div>
  );
}