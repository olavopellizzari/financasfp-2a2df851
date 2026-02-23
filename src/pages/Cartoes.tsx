import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/hooks/useHousehold';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, currentMonth, monthLabel, addMonths } from '@/lib/format';
import { Plus, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';

const CARD_NAMES = ['C6 Família', 'C6 Marina', 'NuBank Olavo'];

const Cartoes = () => {
  const { householdId } = useHousehold();
  const [month, setMonth] = useState(currentMonth());
  const [cardFilter, setCardFilter] = useState('all');
  const [installments, setInstallments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [description, setDescription] = useState('');
  const [amountTotal, setAmountTotal] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [cardName, setCardName] = useState('');
  const [purchaseAt, setPurchaseAt] = useState(new Date().toISOString().split('T')[0]);
  const [firstMonth, setFirstMonth] = useState(currentMonth());
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');

  const load = () => {
    if (!householdId) return;
    let query = supabase.from('installments').select('*, card_purchases(description, purchase_at)').eq('household_id', householdId).eq('statement_month', month).order('card_name').order('installment_number');
    if (cardFilter !== 'all') query = query.eq('card_name', cardFilter);
    query.then(({ data }) => { if (data) setInstallments(data); });

    supabase.from('card_purchases').select('*, categories(name)').eq('household_id', householdId).order('purchase_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setPurchases(data); });
    supabase.from('accounts').select('id, name').eq('household_id', householdId).eq('active', true).then(({ data }) => { if (data) setAccounts(data); });
    supabase.from('categories').select('id, name').eq('household_id', householdId).eq('kind', 'cartao').then(({ data }) => { if (data) setCategories(data); });
  };

  useEffect(load, [householdId, month, cardFilter]);

  const handleSave = async () => {
    if (!householdId || !cardName || !amountTotal || !description) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha descrição, valor e cartão.', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.from('card_purchases').insert({
      household_id: householdId,
      account_id: accountId || null,
      purchase_at: purchaseAt,
      description,
      category_id: categoryId || null,
      card_name: cardName,
      amount_total: parseFloat(amountTotal),
      installments_count: parseInt(installmentsCount),
      first_statement_month: firstMonth,
    });

    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Compra parcelada adicionada com sucesso!' });
    setOpen(false);
    resetForm();
    load();
  };

  const resetForm = () => {
    setDescription('');
    setAmountTotal('');
    setInstallmentsCount('1');
    setCardName('');
    setCategoryId('');
  };

  const totalMonth = installments.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold">Cartões</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nova Compra</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nova Compra Parcelada</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label>Descrição</Label>
                  <Input placeholder="Ex: Supermercado" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Valor Total</Label>
                    <Input type="number" step="0.01" value={amountTotal} onChange={e => setAmountTotal(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Parcelas</Label>
                    <Input type="number" min="1" max="36" value={installmentsCount} onChange={e => setInstallmentsCount(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Cartão</Label>
                  <Select value={cardName} onValueChange={setCardName}>
                    <SelectTrigger><SelectValue placeholder="Selecionar cartão" /></SelectTrigger>
                    <SelectContent>{CARD_NAMES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Data da Compra</Label>
                    <Input type="date" value={purchaseAt} onChange={e => setPurchaseAt(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Primeira Fatura</Label>
                    <Input placeholder="YYYY-MM" value={firstMonth} onChange={e => setFirstMonth(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Compra'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="parcelas">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="parcelas">Parcelas do Mês</TabsTrigger>
            <TabsTrigger value="compras">Histórico de Compras</TabsTrigger>
          </TabsList>

          <TabsContent value="parcelas" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-card p-1 rounded-lg border">
                <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-semibold px-2 min-w-[100px] text-center">{monthLabel(month)}</span>
                <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <Select value={cardFilter} onValueChange={setCardFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cartões</SelectItem>
                  {CARD_NAMES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-primary text-primary-foreground overflow-hidden">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total da Fatura em {monthLabel(month)}</p>
                  <p className="text-3xl font-bold">{formatCurrency(totalMonth)}</p>
                </div>
                <CreditCard className="h-12 w-12 opacity-20" />
              </CardContent>
            </Card>

            <div className="grid gap-3">
              {installments.map(inst => (
                <Card key={inst.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{(inst.card_purchases as any)?.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {inst.card_name} · Parcela {inst.installment_number} de {inst.installments_count}
                      </p>
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(Number(inst.amount))}</p>
                  </CardContent>
                </Card>
              ))}
              {installments.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground">Nenhuma parcela encontrada para este período.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="compras" className="space-y-4 mt-4">
            <div className="grid gap-3">
              {purchases.map(p => (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{p.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.card_name} · {new Date(p.purchase_at).toLocaleDateString('pt-BR')} · {p.installments_count}x
                      </p>
                      <p className="text-xs text-primary mt-1">{(p.categories as any)?.name || 'Sem categoria'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(Number(p.amount_total))}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(Number(p.amount_total) / p.installments_count)} / mês</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {purchases.length === 0 && (
                <p className="text-muted-foreground text-center py-12">Nenhuma compra registrada.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Cartoes;