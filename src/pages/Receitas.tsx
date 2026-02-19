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

const Receitas = () => {
  const { householdId } = useHousehold();
  const [items, setItems] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  const load = () => {
    if (!householdId) return;
    supabase.from('receitas').select('*, accounts(name), categories(name)').eq('household_id', householdId).order('paid_at', { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setItems(data); });
    supabase.from('accounts').select('id, name').eq('household_id', householdId).eq('active', true).then(({ data }) => { if (data) setAccounts(data); });
    supabase.from('categories').select('id, name').eq('household_id', householdId).eq('kind', 'receita').then(({ data }) => { if (data) setCategories(data); });
  };

  useEffect(load, [householdId]);

  const handleSave = async () => {
    if (!householdId || !accountId) return;
    const { error } = await supabase.from('receitas').insert({
      household_id: householdId, account_id: accountId, category_id: categoryId || null,
      description, amount: parseFloat(amount), paid_at: paidAt,
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Receita adicionada' });
    setOpen(false);
    setDescription('');
    setAmount('');
    load();
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold">Receitas</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nova</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Receita</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Descrição</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
                <div><Label>Valor</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div><Label>Data</Label><Input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} /></div>
                <div>
                  <Label>Conta</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3">
          {items.map(r => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{r.description}</p>
                  <p className="text-sm text-muted-foreground">{r.paid_at} · {(r.accounts as any)?.name} · {(r.categories as any)?.name || '-'}</p>
                </div>
                <p className="font-bold currency-positive">{formatCurrency(Number(r.amount))}</p>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma receita.</p>}
        </div>
      </div>
    </AppLayout>
  );
};

export default Receitas;
