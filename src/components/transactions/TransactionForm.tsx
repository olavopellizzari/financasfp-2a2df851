"use client";

import React, { useEffect, useState } from 'react';
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
import { format } from 'date-fns';
import { Check, ChevronsUpDown, CalendarIcon, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/db';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { AICategoryBadge } from '@/components/AICategoryBadge';

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

export function TransactionForm({
  isOpen, onOpenChange, editingTransaction, formData, setFormData,
  onSubmit, isSaving, users, availableAccounts, availableCards, categories, onDescriptionChange
}: TransactionFormProps) {
  
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  const [categoryPopoverOpen, setCategoryPopoverOpen] = React.useState(false);
  const [showSuggestionAnimation, setShowSuggestionAnimation] = useState(false);
  const [isAISuggested, setIsAISuggested] = useState(false);

  const { getMerchantCategoryMapping } = useFinance();
  const { currentUser } = useAuth();

  const parsedAmount = parseFloat(formData.amount) || 0;
  const parsedInstallments = parseInt(formData.installments) || 1;
  const installmentValue = parsedInstallments > 0 ? parsedAmount / parsedInstallments : 0;

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
    let source = '';

    if (currentUser?.id && newDescription.trim()) {
      const mapping = await getMerchantCategoryMapping(currentUser.id, newDescription);
      if (mapping) {
        suggestedCategoryId = mapping.categoryId;
        source = 'history';
      }
    }

    if (!suggestedCategoryId) {
      suggestedCategoryId = matchCategory(newDescription, categories, formData.type) || '';
      source = suggestedCategoryId ? 'ai' : '';
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle>{editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle></DialogHeader>
        <Tabs value={formData.type} onValueChange={(v: any) => handleTypeChange(v)}>
          <TabsList className="grid grid-cols-5 w-full overflow-x-auto">
            <TabsTrigger value="INCOME" className="text-[10px] sm:text-xs">Receita</TabsTrigger>
            <TabsTrigger value="EXPENSE" className="text-[10px] sm:text-xs">Despesa</TabsTrigger>
            <TabsTrigger value="TRANSFER" className="text-[10px] sm:text-xs">Transf.</TabsTrigger>
            <TabsTrigger value="CREDIT" className="text-[10px] sm:text-xs">Cartão</TabsTrigger>
            <TabsTrigger value="REFUND" className="text-[10px] sm:text-xs">Estorno</TabsTrigger>
          </TabsList>
          <form onSubmit={onSubmit} className="space-y-4 mt-4">
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
                <Label>Valor {formData.type === 'CREDIT' && formData.installments > 1 ? 'Total' : ''}</Label>
                <MoneyInput 
                  value={formData.amount} 
                  onValueChange={v => setFormData({ ...formData, amount: v })} 
                  placeholder="0,00" 
                  required 
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

            {formData.type === 'CREDIT' && parsedInstallments > 1 && (
              <div className="space-y-2 animate-fade-in">
                <Label>Valor da Parcela</Label>
                <Input 
                  value={formatCurrency(installmentValue)} 
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