"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Transaction, TransactionType, Account, Card as CardType, Category, User } from '@/lib/db';
import { matchCategory } from '@/lib/category-matcher';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/MoneyInput';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { Check, CalendarIcon, Loader2, ArrowRight, Sparkles, Globe, Plane, Camera, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/db';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { AICategoryBadge } from '@/components/AICategoryBadge';
import { analyzeReceipt } from '@/lib/gemini';

interface TransactionFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction: Transaction | null;
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  users: User[];
  availableAccounts: Account[];
  availableCards: CardType[];
  categories: Category[];
  onDescriptionChange: (desc: string) => void;
}

const CURRENCIES = [
  { code: 'BRL', symbol: 'R$', name: 'Real' },
  { code: 'USD', symbol: '$', name: 'Dólar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Libra' },
];

export function TransactionForm({
  isOpen, onOpenChange, editingTransaction, formData, setFormData,
  onSubmit, isSaving, users, availableAccounts, availableCards, categories, onDescriptionChange
}: TransactionFormProps) {
  
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  const [categoryPopoverOpen, setCategoryPopoverOpen] = React.useState(false);
  const [showSuggestionAnimation, setShowSuggestionAnimation] = useState(false);
  const [isAISuggested, setIsAISuggested] = useState(false);
  const [showTravelMode, setShowTravelMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { getMerchantCategoryMapping } = useFinance();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (isOpen) {
      const isInternational = formData.currency && formData.currency !== 'BRL';
      setShowTravelMode(isInternational);
      
      if (!formData.currency) {
        setFormData(prev => ({
          ...prev,
          currency: 'BRL',
          exchangeRate: '1.00',
          originalAmount: prev.amount || '0.00'
        }));
      }
    }
  }, [isOpen]);

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await analyzeReceipt(base64, categories);
        
        setFormData(prev => ({
          ...prev,
          amount: result.amount?.toString() || prev.amount,
          description: result.description || prev.description,
          purchaseDate: result.date ? parseISO(result.date) : prev.purchaseDate,
          categoryId: result.categoryId || prev.categoryId
        }));
        setIsAISuggested(true);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erro no OCR:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    const isPaid = newType !== 'CREDIT';
    let categoryId = formData.categoryId;
    
    if (newType === 'TRANSFER') {
      const transferCat = categories.find(c => 
        c.name.toLowerCase() === 'transferência' || 
        c.name.toLowerCase() === 'transferencia'
      );
      if (transferCat) {
        categoryId = transferCat.id;
      }
    }
    
    setFormData({ ...formData, type: newType, isPaid, categoryId });
  };

  const handleDescriptionChange = async (newDescription: string) => {
    onDescriptionChange(newDescription);

    let suggestedCategoryId = '';
    if (currentUser?.id && newDescription.trim()) {
      const mapping = await getMerchantCategoryMapping(currentUser.id, newDescription);
      if (mapping) {
        suggestedCategoryId = mapping.categoryId;
      }
    }

    if (!suggestedCategoryId) {
      suggestedCategoryId = matchCategory(newDescription, categories, formData.type) || '';
    }

    if (suggestedCategoryId && suggestedCategoryId !== formData.categoryId) {
      setFormData(prev => ({ ...prev, description: newDescription, categoryId: suggestedCategoryId }));
      setShowSuggestionAnimation(true);
      setIsAISuggested(true);
      setTimeout(() => setShowSuggestionAnimation(false), 1500);
    } else {
      setFormData(prev => ({ ...prev, description: newDescription }));
      setShowSuggestionAnimation(false);
      if (!suggestedCategoryId) setIsAISuggested(false);
    }
  };

  const handleOriginalAmountChange = (val: string) => {
    const original = parseFloat(val) || 0;
    const rate = parseFloat(formData.exchangeRate) || 1;
    const converted = (original * rate).toFixed(2);
    setFormData({ ...formData, originalAmount: val, amount: converted });
  };

  const handleExchangeRateChange = (val: string) => {
    const rate = parseFloat(val) || 1;
    const original = parseFloat(formData.originalAmount) || 0;
    const converted = (original * rate).toFixed(2);
    setFormData({ ...formData, exchangeRate: val, amount: converted });
  };

  const handleCurrencyChange = (code: string) => {
    if (code === 'BRL') {
      setFormData({ ...formData, currency: code, exchangeRate: '1.00', amount: formData.originalAmount });
    } else {
      setFormData({ ...formData, currency: code });
    }
  };

  const selectedCurrency = CURRENCIES.find(c => c.code === formData.currency) || CURRENCIES[0];
  const isInternational = formData.currency !== 'BRL';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>{editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 rounded-full transition-all",
                  showTravelMode ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground"
                )}
                onClick={() => setShowTravelMode(!showTravelMode)}
              >
                <Plane className={cn("w-3 h-3", showTravelMode && "animate-bounce")} />
                Modo Viagem
              </Button>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className="h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 rounded-full bg-primary/5 text-primary border-primary/20"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
              >
                {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />}
                Escanear Recibo
              </Button>
              <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleScanReceipt} />
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={formData.type} onValueChange={(v: any) => handleTypeChange(v)}>
          <TabsList className="grid grid-cols-5 w-full overflow-x-auto">
            <TabsTrigger value="INCOME" className="text-[10px] sm:text-xs">Receita</TabsTrigger>
            <TabsTrigger value="EXPENSE" className="text-[10px] sm:text-xs">Despesa</TabsTrigger>
            <TabsTrigger value="TRANSFER" className="text-[10px] sm:text-xs">Transf.</TabsTrigger>
            <TabsTrigger value="CREDIT" className="text-[10px] sm:text-xs">Cartão</TabsTrigger>
            <TabsTrigger value="REFUND" className="text-[10px] sm:text-xs">Estorno</TabsTrigger>
          </TabsList>
          
          <form onSubmit={onSubmit} className="space-y-4 mt-4">
            
            {showTravelMode && (
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 border-dashed space-y-3 animate-scale-in">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Moeda & Câmbio
                  </Label>
                  <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold">Valor em {formData.currency}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">{selectedCurrency.symbol}</span>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={formData.originalAmount} 
                        onChange={e => handleOriginalAmountChange(e.target.value)}
                        className="pl-8 h-9 text-sm font-bold"
                      />
                    </div>
                  </div>
                  {isInternational && (
                    <div className="space-y-1.5 animate-scale-in">
                      <Label className="text-[10px] uppercase font-bold">Cotação (Câmbio)</Label>
                      <Input 
                        type="number" 
                        step="0.0001"
                        value={formData.exchangeRate} 
                        onChange={e => handleExchangeRateChange(e.target.value)}
                        className="h-9 text-sm font-bold"
                      />
                    </div>
                  )}
                </div>

                {isInternational && (
                  <div className="pt-2 border-t border-primary/10 border-dashed flex items-center justify-between text-[10px] font-bold text-primary uppercase">
                    <span>Total Convertido:</span>
                    <span>{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuário {formData.type === 'TRANSFER' && 'Origem'}</Label>
                <Select value={formData.userId} onValueChange={v => setFormData({ ...formData, userId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{users.filter(u => u.is_active !== false).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{(formData.type === 'CREDIT' || formData.type === 'REFUND') ? 'Cartão' : 'Conta Origem'}</Label>
                {(formData.type === 'CREDIT' || formData.type === 'REFUND') ? (
                  <Select value={formData.cardId} onValueChange={v => setFormData({ ...formData, cardId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{availableCards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Select value={formData.accountId} onValueChange={v => setFormData({ ...formData, accountId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{availableAccounts.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {formData.type === 'TRANSFER' && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm"><ArrowRight className="w-4 h-4" /> Destino</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Usuário Destino</Label>
                    <Select value={formData.destinationUserId} onValueChange={v => setFormData({ ...formData, destinationUserId: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{users.filter(u => u.is_active !== false).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Conta Destino</Label>
                    <Select value={formData.destinationAccountId} onValueChange={v => setFormData({ ...formData, destinationAccountId: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{availableAccounts.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-11 rounded-xl">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.purchaseDate ? format(formData.purchaseDate, "dd/MM/yyyy") : <span>Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formData.purchaseDate} onSelect={(date) => date && setFormData({ ...formData, purchaseDate: date })} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Valor Final (BRL)</Label>
                <MoneyInput 
                  value={formData.amount} 
                  onValueChange={v => setFormData({ ...formData, amount: v })} 
                  placeholder="0,00" 
                  required 
                  readOnly={isInternational}
                  className={cn(isInternational && "bg-muted/50")}
                />
              </div>
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
                {showSuggestionAnimation && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 animate-pulse-once">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Categoria</Label>
                  {isAISuggested && <AICategoryBadge />}
                </div>
                <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-between font-normal", isAISuggested && "border-primary/30 bg-primary/5")}>
                      {formData.categoryId ? sortedCategories.find((cat) => cat.id === formData.categoryId)?.name : "Selecionar..."}
                      <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma encontrada.</CommandEmpty>
                        <CommandGroup>
                          {sortedCategories.filter(c => formData.type === 'INCOME' ? c.type === 'income' : c.type === 'expense').map((cat) => (
                            <CommandItem key={cat.id} value={cat.name} onSelect={() => { setFormData({ ...formData, categoryId: cat.id }); setIsAISuggested(false); setCategoryPopoverOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", formData.categoryId === cat.id ? "opacity-100" : "opacity-0")} />
                              <span className="mr-2">{cat.icon}</span>{cat.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{formData.type === 'CREDIT' ? 'Parcelas' : 'Repetir'}</Label>
                {formData.type === 'CREDIT' ? (
                  <Input 
                    type="number" 
                    min="1" 
                    max="96" 
                    value={formData.installments} 
                    onChange={e => setFormData({ ...formData, installments: e.target.value })} 
                  />
                ) : (
                  <Select value={formData.recurrence} onValueChange={(v: any) => setFormData({ ...formData, recurrence: v })} disabled={!!editingTransaction}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não repetir</SelectItem>
                      <SelectItem value="custom">Repetir X vezes</SelectItem>
                      <SelectItem value="monthly">Mensal (Fixo)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {formData.type === 'CREDIT' && (parseInt(formData.installments) || 1) > 1 && (
              <div className="space-y-2 animate-fade-in">
                <Label>Valor da Parcela</Label>
                <Input 
                  value={formatCurrency((parseFloat(formData.amount) || 0) / (parseInt(formData.installments) || 1))} 
                  readOnly 
                  className="font-bold text-lg bg-muted/50 border-dashed" 
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-dashed">
              <div className="space-y-0.5"><Label className="text-sm font-bold">Lançamento Pago</Label></div>
              <Switch checked={formData.isPaid} onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })} />
            </div>

            <div className="flex gap-3 pt-4">
              <DialogClose asChild><Button variant="outline" className="flex-1">Cancelar</Button></DialogClose>
              <Button type="submit" className="flex-1 gradient-primary" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Salvar'}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}