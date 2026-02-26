"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, Transaction, TransactionType, generateId } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { UserFilter } from '@/components/UserFilter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Plus, 
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CreditCard,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Wallet,
  RotateCcw,
  CheckCircle2,
  Clock,
  Filter,
  Pencil,
  ArrowRight,
  Undo2,
  AlertCircle,
  Sparkles,
  ChevronsUpDown,
  ArrowLeft
} from 'lucide-react';
import { format, addMonths, addYears, subMonths, isValid, parseISO, startOfDay, isAfter, isSameDay, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

const TIPOS_TRANSACAO: { value: TransactionType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'INCOME', label: 'Receita', icon: ArrowUpRight, color: 'text-income' },
  { value: 'EXPENSE', label: 'Despesa', icon: ArrowDownRight, color: 'text-expense' },
  { value: 'TRANSFER', label: 'Transferência', icon: ArrowLeftRight, color: 'text-primary' },
  { value: 'CREDIT', label: 'Cartão', icon: CreditCard, color: 'text-credit' },
  { value: 'REFUND', label: 'Estorno', icon: Undo2, color: 'text-income' },
];

const KEYWORD_CATEGORY_MAP: Record<string, string> = {
  'ifood': 'Delivery (iFood/Rappi)',
  'rappi': 'Delivery (iFood/Rappi)',
  'uber': 'Apps (Uber/99)',
  '99app': 'Apps (Uber/99)',
  'netflix': 'Streaming (Netflix/HBO)',
  'spotify': 'Spotify / Música',
  'amazon': 'Vendas (E-commerce)',
  'mercado livre': 'Vendas (E-commerce)',
  'posto': 'Combustível (Gasolina)',
  'gasolina': 'Combustível (Gasolina)',
  'shell': 'Combustível (Gasolina)',
  'ipiranga': 'Combustível (Gasolina)',
  'farmacia': 'Farmácia & Remédios',
  'droga': 'Farmácia & Remédios',
  'panvel': 'Farmácia & Remédios',
  'raia': 'Farmácia & Remédios',
  'academia': 'Academia & Crossfit',
  'smartfit': 'Academia & Crossfit',
  'aluguel': 'Aluguel / Hipoteca',
  'condominio': 'Condomínio & Taxas',
  'luz': 'Energia (Luz)',
  'energia': 'Energia (Luz)',
  'agua': 'Saneamento (Água)',
  'internet': 'Internet Fibra',
  'salario': 'Salário Mensal',
  'pix': 'Outras Despesas',
  'restaurante': 'Restaurantes & Jantares',
  'padaria': 'Cafés & Lanches',
  'cafe': 'Cafés & Lanches',
  'supermercado': 'Supermercado Mensal',
  'giassi': 'Supermercado Mensal',
  'angeloni': 'Supermercado Mensal',
  'bistek': 'Supermercado Mensal',
  'fort': 'Supermercado Mensal',
  'koch': 'Supermercado Mensal',
};

const formatLocal = (date: Date | string, formatStr: string) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return format(d, formatStr, { locale: ptBR });
};

const parseInputDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0);
  return isValid(d) ? d : new Date();
};

export function TransactionsPage() {
  const { currentUser, users, isCurrentUserAdmin } = useAuth();
  const { 
    allTransactions, allAccounts, allCards, categories, calculateMesFatura,
    createTransaction, updateTransaction, deleteTransaction, getCategoryById, refresh
  } = useFinance();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const isCardMode = searchParams.get('type') === 'card';
  const filterCardId = searchParams.get('cardId');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'edit' | 'delete' | null>(null);
  const [selectedTxForBulk, setSelectedTxForBulk] = useState<Transaction | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Partial<Transaction> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TransactionType>(isCardMode ? 'CREDIT' : 'EXPENSE');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  const [formData, setFormData] = useState({
    userId: currentUser?.id || '',
    type: (isCardMode ? 'CREDIT' : 'EXPENSE') as TransactionType,
    amount: '',
    description: '',
    purchaseDate: new Date(),
    mesFatura: format(new Date(), 'yyyy-MM'),
    categoryId: '',
    accountId: '',
    cardId: filterCardId || '',
    installments: '1',
    isPaid: false,
    recurrence: 'none' as 'none' | 'monthly' | 'annual' | 'custom',
    recurrenceCount: '12',
    destinationUserId: currentUser?.id || '',
    destinationAccountId: '',
    notes: ''
  });

  const isAdmin = isCurrentUserAdmin();
  
  const selectedMonthStr = useMemo(() => {
    if (!currentMonth || !isValid(currentMonth)) return format(new Date(), 'yyyy-MM');
    return format(currentMonth, 'yyyy-MM');
  }, [currentMonth]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      // Lógica de filtragem baseada no modo (Cartão vs Conta)
      if (isCardMode) {
        if (tx.type !== 'CREDIT' && tx.type !== 'REFUND') return false;
        if (filterCardId && tx.cardId !== filterCardId) return false;
      } else {
        if (tx.type === 'CREDIT' || tx.type === 'REFUND') return false;
      }

      const matchesMonth = tx.effectiveMonth === selectedMonthStr;
      const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'ALL' || tx.type === filterType;
      const matchesUser = selectedUserId === 'all' || tx.userId === selectedUserId;
      return matchesMonth && matchesSearch && matchesType && matchesUser;
    }).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [allTransactions, selectedMonthStr, searchQuery, filterType, selectedUserId, isCardMode, filterCardId]);

  const monthStats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'INCOME' && t.status !== 'cancelled').reduce((s, t) => s + t.amount, 0);
    const expensesOnly = filteredTransactions.filter(t => (t.type === 'EXPENSE' || t.type === 'CREDIT') && t.status !== 'cancelled');
    const totalExpenses = expensesOnly.reduce((s, t) => s + t.amount, 0);
    const refunds = filteredTransactions.filter(t => t.type === 'REFUND' && t.status !== 'cancelled').reduce((s, t) => s + t.amount, 0);
    
    return { income, totalExpenses: totalExpenses - refunds, balance: income - (totalExpenses - refunds) };
  }, [filteredTransactions]);

  const handleDescriptionChange = useCallback((desc: string) => {
    setFormData(prev => ({ ...prev, description: desc }));
    
    if (desc.length > 2 && !editingTransaction) {
      const normalizedDesc = desc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const historyMatch = allTransactions.find(t => 
        t.description.toLowerCase().includes(normalizedDesc) && 
        t.categoryId && 
        t.userId === formData.userId
      );
      
      if (historyMatch && historyMatch.categoryId) {
        setFormData(prev => ({ ...prev, categoryId: historyMatch.categoryId }));
        return;
      }

      for (const [keyword, catName] of Object.entries(KEYWORD_CATEGORY_MAP)) {
        if (normalizedDesc.includes(keyword)) {
          const cat = categories.find(c => c.name === catName);
          if (cat) {
            setFormData(prev => ({ ...prev, categoryId: cat.id }));
            return;
          }
        }
      }
    }
  }, [allTransactions, editingTransaction, formData.userId, categories]);

  const resetForm = () => {
    setEditingTransaction(null);
    const defaultType = isCardMode ? 'CREDIT' : activeTab;
    setFormData({
      userId: currentUser?.id || '',
      type: defaultType,
      amount: '',
      description: defaultType === 'TRANSFER' ? 'Transferência entre contas' : '',
      purchaseDate: new Date(),
      mesFatura: format(new Date(), 'yyyy-MM'),
      categoryId: '',
      accountId: allAccounts[0]?.id || '',
      cardId: filterCardId || allCards[0]?.id || '',
      installments: '1',
      isPaid: defaultType === 'INCOME' || defaultType === 'TRANSFER' || defaultType === 'REFUND',
      recurrence: 'none',
      recurrenceCount: '12',
      destinationUserId: currentUser?.id || '',
      destinationAccountId: '',
      notes: ''
    });
  };

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && allTransactions.length > 0) {
      const tx = allTransactions.find(t => t.id === editId);
      if (tx) {
        handleEdit(tx);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, allTransactions]);

  useEffect(() => {
    if ((formData.type === 'CREDIT' || formData.type === 'REFUND') && formData.cardId && !editingTransaction) {
      setFormData(prev => ({ 
        ...prev, 
        mesFatura: calculateMesFatura(formData.purchaseDate, formData.cardId) 
      }));
    }
  }, [formData.purchaseDate, formData.cardId, formData.type, calculateMesFatura, editingTransaction]);

  const handleOpenDialog = () => {
    if (!isCardMode && allAccounts.length === 0) {
      toast({ title: "Conta necessária", description: "Crie uma conta antes de lançar transações.", variant: "destructive" });
      navigate('/accounts');
      return;
    }
    if (isCardMode && allCards.length === 0) {
      toast({ title: "Cartão necessário", description: "Crie um cartão antes de lançar gastos.", variant: "destructive" });
      navigate('/cards');
      return;
    }
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setActiveTab(tx.type);
    setFormData({
      userId: tx.userId,
      type: tx.type,
      amount: tx.amount.toString(),
      description: tx.description,
      purchaseDate: new Date(tx.purchaseDate),
      mesFatura: tx.mesFatura || format(new Date(tx.purchaseDate), 'yyyy-MM'),
      categoryId: tx.categoryId,
      accountId: (tx.type === 'CREDIT' || tx.type === 'REFUND') ? '' : (tx.accountId || ''),
      cardId: (tx.type === 'CREDIT' || tx.type === 'REFUND') ? tx.cardId || '' : '',
      installments: (tx.totalInstallments || 1).toString(),
      isPaid: tx.isPaid,
      recurrence: tx.isRecurring ? 'monthly' : 'none',
      recurrenceCount: (tx.totalInstallments || 12).toString(),
      destinationUserId: tx.userId,
      destinationAccountId: '',
      notes: tx.notes
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (tx: Transaction) => {
    if (tx.installmentGroupId) {
      setSelectedTxForBulk(tx);
      setBulkActionType('delete');
      setBulkDialogOpen(true);
    } else {
      if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
        await deleteTransaction(tx.id);
        toast({ title: 'Lançamento excluído!' });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir os ${selectedIds.size} lançamentos selecionados?`)) return;
    try {
      for (const id of Array.from(selectedIds)) await deleteTransaction(id);
      toast({ title: 'Lançamentos excluídos!', description: `${selectedIds.size} itens foram removidos.` });
      setSelectedIds(new Set());
      await refresh();
    } catch (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTransactions.map(tx => tx.id)));
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = parseFloat(formData.amount) || 0;

    if (editingTransaction) {
      const updates: any = {
        userId: formData.userId,
        type: formData.type,
        amount: totalAmount,
        description: formData.description,
        categoryId: formData.categoryId,
        isPaid: formData.isPaid,
        notes: formData.notes
      };

      if (editingTransaction.installmentGroupId) {
        setPendingUpdates(updates);
        setSelectedTxForBulk(editingTransaction);
        setBulkActionType('edit');
        setBulkDialogOpen(true);
      } else {
        await updateTransaction(editingTransaction.id, updates);
        toast({ title: 'Lançamento atualizado!' });
        setIsDialogOpen(false);
      }
      return;
    }

    if (formData.type === 'TRANSFER') {
      await createTransaction({
        type: 'TRANSFER', amount: totalAmount, description: formData.description || `Transferência para ${allAccounts.find(a => a.id === formData.destinationAccountId)?.name}`,
        purchaseDate: formData.purchaseDate, effectiveDate: formData.purchaseDate, effectiveMonth: format(formData.purchaseDate, 'yyyy-MM'),
        mesFatura: null, status: 'confirmed', isPaid: true, userId: formData.userId, accountId: formData.accountId, cardId: null, categoryId: '', notes: formData.notes, isRecurring: false
      });
      await createTransaction({
        type: 'INCOME', amount: totalAmount, description: formData.description || `Transferência de ${allAccounts.find(a => a.id === formData.accountId)?.name}`,
        purchaseDate: formData.purchaseDate, effectiveDate: formData.purchaseDate, effectiveMonth: format(formData.purchaseDate, 'yyyy-MM'),
        mesFatura: null, status: 'confirmed', isPaid: true, userId: formData.destinationUserId, accountId: formData.destinationAccountId, cardId: null, categoryId: '', notes: formData.notes, isRecurring: false
      });
      toast({ title: 'Transferência realizada!' });
      setIsDialogOpen(false);
      return;
    }

    const numInstallments = parseInt(formData.installments) || 1;
    const isRecurring = formData.recurrence !== 'none';
    const iterations = formData.recurrence === 'custom' ? parseInt(formData.recurrenceCount) : (isRecurring ? (formData.recurrence === 'monthly' ? 60 : 10) : numInstallments);
    const installmentAmount = totalAmount / (isRecurring ? 1 : numInstallments);
    const groupId = (numInstallments > 1 || isRecurring) ? generateId() : null;

    for (let i = 0; i < iterations; i++) {
      const dateForIteration = formData.recurrence === 'annual' ? addYears(formData.purchaseDate, i) : addMonths(formData.purchaseDate, i);
      let currentMesFatura = null;
      let effectiveMonthStr = format(dateForIteration, 'yyyy-MM');
      
      if (formData.type === 'INCOME') {
        effectiveMonthStr = format(addMonths(dateForIteration, 1), 'yyyy-MM');
      } else if ((formData.type === 'CREDIT' || formData.type === 'REFUND') && formData.cardId) {
        const baseCalculatedMonth = calculateMesFatura(formData.purchaseDate, formData.cardId);
        const baseMonthDate = parse(baseCalculatedMonth, 'yyyy-MM', new Date());
        currentMesFatura = format(addMonths(baseMonthDate, i), 'yyyy-MM');
        effectiveMonthStr = format(addMonths(baseMonthDate, i + 1), 'yyyy-MM');
      }
      
      await createTransaction({
        type: formData.type, 
        amount: installmentAmount, 
        description: formData.description,
        purchaseDate: dateForIteration,
        effectiveDate: dateForIteration, 
        effectiveMonth: effectiveMonthStr, 
        mesFatura: currentMesFatura, 
        status: 'confirmed', 
        isPaid: i === 0 ? formData.isPaid : false, 
        userId: formData.userId, 
        accountId: (formData.type === 'CREDIT' || formData.type === 'REFUND') ? null : (formData.accountId || null), 
        cardId: (formData.type === 'CREDIT' || formData.type === 'REFUND') ? formData.cardId || null : null, 
        categoryId: formData.categoryId, 
        installmentGroupId: groupId, 
        installmentNumber: i + 1, 
        totalInstallments: iterations, 
        notes: formData.notes, 
        isRecurring: isRecurring
      });
    }
    setIsDialogOpen(false);
    toast({ title: isRecurring ? 'Lançamentos fixos criados!' : 'Lançamento(s) criado(s)!' });
  };

  const handleBulkAction = async (scope: 'single' | 'future') => {
    if (!selectedTxForBulk || !bulkActionType) return;
    const groupId = selectedTxForBulk.installmentGroupId;
    const relatedTxs = allTransactions.filter(t => t.installmentGroupId === groupId);
    const currentEffDate = startOfDay(parseISO(selectedTxForBulk.effectiveDate));

    if (bulkActionType === 'delete') {
      if (scope === 'single') await deleteTransaction(selectedTxForBulk.id);
      else {
        const toDelete = relatedTxs.filter(t => {
          const txDate = startOfDay(parseISO(t.effectiveDate));
          return isAfter(txDate, currentEffDate) || isSameDay(txDate, currentEffDate);
        });
        for (const tx of toDelete) await deleteTransaction(tx.id);
      }
      toast({ title: scope === 'single' ? 'Lançamento excluído!' : 'Série excluída!' });
    } else if (bulkActionType === 'edit' && pendingUpdates) {
      if (scope === 'single') {
        await updateTransaction(selectedTxForBulk.id, pendingUpdates);
      } else {
        const toUpdate = relatedTxs.filter(t => {
          const txDate = startOfDay(parseISO(t.effectiveDate));
          return isAfter(txDate, currentEffDate) || isSameDay(txDate, currentEffDate);
        });
        for (const tx of toUpdate) await updateTransaction(tx.id, pendingUpdates);
      }
      toast({ title: 'Lançamentos atualizados!' });
      setIsDialogOpen(false);
    }
    setBulkDialogOpen(false);
    setSelectedTxForBulk(null);
    setBulkActionType(null);
    setPendingUpdates(null);
    await refresh();
  };

  const handleTogglePaid = async (tx: Transaction) => {
    const newStatus = !tx.isPaid;
    await updateTransaction(tx.id, { isPaid: newStatus });
    toast({ title: newStatus ? 'Lançamento pago!' : 'Lançamento pendente!' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {isCardMode && (
            <Button variant="ghost" size="icon" asChild className="rounded-full">
              <Link to="/cards"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{isCardMode ? 'Lançamentos de Cartão' : 'Lançamentos'}</h1>
            <p className="text-muted-foreground">
              {isCardMode ? 'Histórico detalhado de gastos no crédito' : 'Histórico de movimentações financeiras (Contas)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && <UserFilter value={selectedUserId} onChange={setSelectedUserId} className="w-[180px]" />}
          <Button onClick={handleOpenDialog} className="gradient-primary shadow-primary">
            <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-slide-up">
          <span className="text-sm font-bold">{selectedIds.size} selecionados</span>
          <div className="h-4 w-px bg-background/20" />
          <Button variant="ghost" size="sm" className="text-background hover:bg-background/10" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-2" /> Excluir Selecionados
          </Button>
          <Button variant="ghost" size="sm" className="text-background hover:bg-background/10" onClick={() => setSelectedIds(new Set())}>
            <X className="w-4 h-4 mr-2" /> Cancelar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-income/10 border-income/20"><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{isCardMode ? 'Estornos' : 'Receitas'}</p><ArrowUpRight className="w-4 h-4 text-income" /></div><p className="text-xl font-bold text-income">{formatCurrency(isCardMode ? monthStats.income : monthStats.income)}</p></CardContent></Card>
        <Card className="bg-expense/10 border-expense/20"><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{isCardMode ? 'Gastos no Cartão' : 'Despesas'}</p><ArrowDownRight className="w-4 h-4 text-expense" /></div><p className="text-xl font-bold text-expense">{formatCurrency(monthStats.totalExpenses)}</p></CardContent></Card>
        <Card className="bg-muted border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{isCardMode ? 'Total da Fatura' : 'Saldo do Mês'}</p><Wallet className="w-4 h-4 text-muted-foreground" /></div><p className={cn("text-xl font-bold", monthStats.balance >= 0 ? 'text-income' : 'text-expense')}>{formatCurrency(isCardMode ? monthStats.totalExpenses : monthStats.balance)}</p></CardContent></Card>
      </div>

      <Card className="finance-card">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-bold min-w-[120px] text-center capitalize">{formatLocal(currentMonth, 'MMMM yyyy')}</span>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar descrição..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}><SelectTrigger className="w-[140px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem>{TIPOS_TRANSACAO.filter(t => isCardMode ? (t.value === 'CREDIT' || t.value === 'REFUND') : (t.value !== 'CREDIT' && t.value !== 'REFUND')).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="finance-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-4 w-10"><Checkbox checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0} onCheckedChange={toggleSelectAll} /></th>
                <th className="text-left p-4 font-semibold">Data</th>
                <th className="text-left p-4 font-semibold">Descrição</th>
                <th className="text-left p-4 font-semibold">Categoria</th>
                <th className="text-left p-4 font-semibold">Usuário</th>
                <th className="text-right p-4 font-semibold">Valor</th>
                <th className="text-center p-4 font-semibold">Status</th>
                <th className="text-right p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTransactions.map(tx => {
                const category = getCategoryById(tx.categoryId);
                const txUser = users.find(u => u.id === tx.userId);
                const typeInfo = TIPOS_TRANSACAO.find(t => t.value === tx.type)!;
                return (
                  <tr key={tx.id} className={cn("hover:bg-muted/30 transition-colors group", tx.isPaid && tx.type === 'EXPENSE' ? "opacity-60 grayscale-[0.5]" : "", selectedIds.has(tx.id) && "bg-primary/5")}>
                    <td className="p-4"><Checkbox checked={selectedIds.has(tx.id)} onCheckedChange={() => toggleSelect(tx.id)} /></td>
                    <td className="p-4"><div className="flex flex-col"><span className="font-medium">{formatLocal(tx.purchaseDate, 'dd/MM/yy')}</span><span className="text-[10px] text-muted-foreground uppercase">{formatLocal(tx.purchaseDate, 'EEEE')}</span></div></td>
                    <td className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><typeInfo.icon className={cn("w-4 h-4", typeInfo.color)} /></div><div className="flex flex-col"><span className={cn("font-semibold", tx.isPaid && tx.type === 'EXPENSE' && "line-through text-muted-foreground")}>{tx.description}</span>{tx.installmentGroupId && <Badge variant="secondary" className="w-fit text-[10px] h-4 px-1">Parcela {tx.installmentNumber}/{tx.totalInstallments}</Badge>}</div></div></td>
                    <td className="p-4"><Badge variant="outline" className="font-normal">{category?.icon} {category?.name || 'Sem Categoria'}</Badge></td>
                    <td className="p-4"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: txUser?.avatar_color || '#94a3b8' }}>{txUser?.name.charAt(0).toUpperCase() || '?'}</div><span className="text-xs truncate max-w-[80px]">{txUser?.name || 'Sistema'}</span></div></td>
                    <td className="p-4 text-right font-semibold"><span className={typeInfo.color}>{tx.type === 'INCOME' || tx.type === 'REFUND' ? '+' : '-'} {formatCurrency(tx.amount)}</span></td>
                    <td className="p-4 text-center"><button onClick={() => handleTogglePaid(tx)} className={cn("flex items-center gap-1 mx-auto px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-all", tx.isPaid ? "bg-income/10 text-income hover:bg-income/20" : "bg-warning/10 text-warning hover:bg-warning/20 border border-warning/20")}>{tx.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {tx.isPaid ? "Pago" : "Pendente"}</button></td>
                    <td className="p-4 text-right"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => handleTogglePaid(tx)} className={cn("h-8 w-8", tx.isPaid ? "text-muted-foreground" : "text-income")}>{tx.isPaid ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}</Button><Button size="icon" variant="ghost" onClick={() => handleEdit(tx)} className="h-8 w-8 text-muted-foreground"><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => handleDelete(tx)} className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{bulkActionType === 'delete' ? 'Excluir Lançamento' : 'Editar Lançamento'}</DialogTitle><DialogDescription>Este lançamento faz parte de uma série. O que deseja fazer?</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><Button variant="outline" onClick={() => handleBulkAction('single')}>{bulkActionType === 'delete' ? 'Excluir apenas este' : 'Editar apenas este'}</Button><Button className="gradient-primary" onClick={() => handleBulkAction('future')}>{bulkActionType === 'delete' ? 'Excluir este e os próximos' : 'Editar este e os próximos'}</Button></div><DialogFooter><Button variant="ghost" onClick={() => setBulkDialogOpen(false)}>Cancelar</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle></DialogHeader>
          <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); setFormData(prev => ({ ...prev, type: v, isPaid: v === 'INCOME' || v === 'TRANSFER' || v === 'REFUND' })); }}>
            <TabsList className="grid grid-cols-5 w-full">
              {TIPOS_TRANSACAO
                .filter(t => isCardMode ? (t.value === 'CREDIT' || t.value === 'REFUND') : (t.value !== 'CREDIT' && t.value !== 'REFUND'))
                .map(t => <TabsTrigger key={t.value} value={t.value} className="gap-1 px-1"><t.icon className="w-3 h-3" />{t.label}</TabsTrigger>)}
            </TabsList>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Usuário {activeTab === 'TRANSFER' && 'Origem'}</Label><Select value={formData.userId} onValueChange={v => setFormData({ ...formData, userId: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{users.filter(u => u.is_active !== false).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>{(formData.type === 'CREDIT' || formData.type === 'REFUND') ? 'Cartão' : 'Conta Origem'}</Label>{(formData.type === 'CREDIT' || formData.type === 'REFUND') ? <Select value={formData.cardId} onValueChange={v => setFormData({ ...formData, cardId: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{allCards.filter(c => !c.is_archived).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select> : <Select value={formData.accountId} onValueChange={v => setFormData({ ...formData, accountId: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{allAccounts.filter(a => a.active && (a.user_id === formData.userId || a.is_shared)).map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select>}</div>
              </div>
              {activeTab === 'TRANSFER' && (<div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4"><div className="flex items-center gap-2 text-primary font-bold text-sm"><ArrowRight className="w-4 h-4" /> Destino da Transferência</div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Usuário Destino</Label><Select value={formData.destinationUserId} onValueChange={v => setFormData({ ...formData, destinationUserId: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{users.filter(u => u.is_active !== false).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Conta Destino</Label><Select value={formData.destinationAccountId} onValueChange={v => setFormData({ ...formData, destinationAccountId: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{allAccounts.filter(a => a.active && (a.user_id === formData.destinationUserId || a.is_shared)).map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div></div></div>)}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data da Compra</Label><Input type="date" value={isValid(formData.purchaseDate) ? format(formData.purchaseDate, 'yyyy-MM-dd') : ''} onChange={e => setFormData({ ...formData, purchaseDate: parseInputDate(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0,00" required /></div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <div className="relative">
                  <Input 
                    value={formData.description} 
                    onChange={e => handleDescriptionChange(e.target.value)} 
                    placeholder="Ex: iFood, Aluguel..." 
                    required 
                  />
                  {formData.categoryId && !editingTransaction && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-primary font-bold animate-fade-in">
                      <Sparkles className="w-3 h-3" /> Categoria sugerida
                    </div>
                  )}
                </div>
              </div>
              {activeTab !== 'TRANSFER' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categoryPopoverOpen}
                          className="w-full justify-between font-normal"
                        >
                          {formData.categoryId
                            ? sortedCategories.find((cat) => cat.id === formData.categoryId)?.name
                            : "Selecionar categoria..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[240px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar categoria..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                            <CommandGroup>
                              {sortedCategories
                                .filter(c => formData.type === 'INCOME' ? c.type === 'income' : c.type === 'expense' || c.type === 'both')
                                .map((cat) => (
                                  <CommandItem
                                    key={cat.id}
                                    value={cat.name}
                                    onSelect={() => {
                                      setFormData({ ...formData, categoryId: cat.id });
                                      setCategoryPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.categoryId === cat.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="mr-2">{cat.icon}</span>
                                    {cat.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {!editingTransaction && (<div className="space-y-2"><Label>Repetir</Label><Select value={formData.recurrence} onValueChange={(v: any) => setFormData({ ...formData, recurrence: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não repetir</SelectItem><SelectItem value="custom">Repetir X vezes</SelectItem><SelectItem value="monthly">Mensal (Fixo)</SelectItem><SelectItem value="annual">Anual (Fixo)</SelectItem></SelectContent></Select></div>)}
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-dashed"><div className="space-y-0.5"><Label className="text-sm font-bold">Lançamento Pago</Label><p className="text-[10px] text-muted-foreground">Marque se o valor já saiu/entrou na conta</p></div><Switch checked={formData.isPaid} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPaid: checked }))} /></div>
              {formData.recurrence === 'custom' && !editingTransaction && (<div className="space-y-2 p-3 bg-primary/5 border border-primary/10 rounded-xl"><Label>Número de Repetições (Meses)</Label><Input type="number" min="1" max="60" value={formData.recurrenceCount} onChange={e => setFormData({ ...formData, recurrenceCount: e.target.value })} /><p className="text-[10px] text-muted-foreground mt-1">O valor total será repetido em cada mês.</p></div>)}
              {(formData.type === 'CREDIT' || formData.type === 'REFUND') && !editingTransaction && formData.recurrence === 'none' && <div className="space-y-2"><Label>Parcelas</Label><Select value={formData.installments} onValueChange={v => setFormData({ ...formData, installments: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 24 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>)}</SelectContent></Select></div>}
              <div className="flex gap-3 pt-4"><DialogClose asChild><Button variant="outline" className="flex-1">Cancelar</Button></DialogClose><Button type="submit" className="flex-1 gradient-primary">Salvar</Button></div>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}