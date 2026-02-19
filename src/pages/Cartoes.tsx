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
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const { toast } = useToast();

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
    if (!householdId || !cardName) return;
    const { error } = await supabase.from('card_purchases').insert({
      household_id: householdId, account_id: accountId || null, description,
      amount_total: parseFloat(amountTotal), installments_count: parseInt(installmentsCount),
      card_name: cardName, purchase_at: purchaseAt, first_statement_month: firstMonth,
      category_id: categoryId || null,
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Compra parcelada adicionada' });
    setOpen(false);
    setDescription('');
    setAmountTotal('');
    load();
  };

  const totalMonth = installments.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-heading font-bold">Cartões</h2>

        <Tabs defaultValue="parcelas">
          <TabsList>
            <TabsTrigger value="parcelas">Parcelas do Mês</TabsTrigger>
            <TabsTrigger value="compras">Compras</TabsTrigger>
          </TabsList>

          <TabsContent value="parcelas" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-semibold">{monthLabel(month)}</span>
                <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <Select value={cardFilter} onValueChange={setCardFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {CARD_NAMES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-primary text-primary-foreground">
              <CardContent className="py-4">
                <p className="text-sm opacity-80">Total Fatura {monthLabel(month)}</p>
                <p className="text-2xl font-bold">{formatCurrency(totalMonth)}</p>
              </CardContent>
            </Card>

            {installments.map(inst => (
              <Card key={inst.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{(inst.card_purchases as any)?.description}</p>
                    <p className="text-sm text-muted-foreground">{inst.card_name} · Parcela {inst.installment_number}/{inst.installments_count}</p>
                  </div>
                  <p className="font-bold">{formatCurrency(Number(inst.amount))}</p>
                </CardContent>
              </Card>
            ))}
            {installments.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma parcela neste mês.</p>}
          </TabsContent>

          <TabsContent value="compras" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nova Compra</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Compra Parcelada</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Descrição</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
                    <div><Label>Valor Total</Label><Input type="number" step="0.01" value={amountTotal} onChange={e => setAmountTotal(e.target.value)} /></div>
                    <div><Label>Parcelas (1-36)</Label><Input type="number" min="1" max="36" value={installmentsCount} onChange={e => setInstallmentsCount(e.target.value)} /></div>
                    <div><Label>Cartão</Label><Select value={cardName} onValueChange={setCardName}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{CARD_NAMES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Data da Compra</Label><Input type="date" value={purchaseAt} onChange={e => setPurchaseAt(e.target.value)} /></div>
                    <div><Label>Primeira Fatura (YYYY-MM)</Label><Input value={firstMonth} onChange={e => setFirstMonth(e.target.value)} /></div>
                    <div><Label>Categoria</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Conta (opcional)</Label><Select value={accountId} onValueChange={setAccountId}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={handleSave} className="w-full">Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {purchases.map(p => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{p.description}</p>
                    <p className="text-sm text-muted-foreground">{p.card_name} · {p.purchase_at} · {p.installments_count}x · {(p.categories as any)?.name || '-'}</p>
                  </div>
                  <p className="font-bold">{formatCurrency(Number(p.amount_total))}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Cartoes;
