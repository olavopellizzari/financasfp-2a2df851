import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/hooks/useHousehold';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { Plus } from 'lucide-react';

const PAYMENT_METHODS = ['Pix', 'Débito', 'Dinheiro', 'C6 Família', 'C6 Marina', 'NuBank Olavo'];

const DespesasVariaveis = () => {
  const { householdId } = useHousehold();
  const [items, setItems] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [type, setType] = useState<string>('Pago');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [plannedMonth, setPlannedMonth] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const load = () => {
    if (!householdId) return;
    supabase.from('despesas_variaveis').select('*, accounts(name), categories(name)').eq('household_id', householdId).order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setItems(data); });
    supabase.from('accounts').select('id, name').eq('household_id', householdId).eq('active', true).then(({ data }) => { if (data) setAccounts(data); });
    supabase.from('categories').select('id, name').eq('household_id', householdId).eq('kind', 'despesa').then(({ data }) => { if (data) setCategories(data); });
  };

  useEffect(load, [householdId]);

  const handleSave = async () => {
    if (!householdId || !accountId) return;
    const { error } = await supabase.from('despesas_variaveis').insert({
      household_id: householdId, account_id: accountId, type: type as any,
      description, amount: parseFloat(amount), category_id: categoryId || null,
      paid_at: type === 'Pago' ? paidAt : null,
      planned_month: type === 'Planejado' ? plannedMonth : null,
      payment_method: paymentMethod || null,
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Despesa variável adicionada' });
    setOpen(false);
    setDescription('');
    setAmount('');
    load();
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold">Despesas Variáveis</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nova</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Despesa Variável</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Descrição</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
                <div><Label>Valor</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pago">Pago</SelectItem>
                      <SelectItem value="Planejado">Planejado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {type === 'Pago' && <div><Label>Data Pagamento</Label><Input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} /></div>}
                {type === 'Planejado' && <div><Label>Mês Planejado (YYYY-MM)</Label><Input value={plannedMonth} onChange={e => setPlannedMonth(e.target.value)} placeholder="2025-03" /></div>}
                <div><Label>Conta</Label><Select value={accountId} onValueChange={setAccountId}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Categoria</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div>
                  <Label>Método de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3">
          {items.map(d => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{d.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {d.type === 'Pago' ? `Pago em ${d.paid_at}` : `Planejado: ${d.planned_month}`}
                    {' · '}{(d.accounts as any)?.name} · {(d.categories as any)?.name || '-'}
                    {d.payment_method && ` · ${d.payment_method}`}
                  </p>
                </div>
                <p className="font-bold currency-negative">{formatCurrency(Number(d.amount))}</p>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma despesa variável.</p>}
        </div>
      </div>
    </AppLayout>
  );
};

export default DespesasVariaveis;
