import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/hooks/useHousehold';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { Plus } from 'lucide-react';

const Contas = () => {
  const { householdId } = useHousehold();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('corrente');
  const [balance, setBalance] = useState('0');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = () => {
    if (!householdId) return;
    supabase.from('accounts').select('*').eq('household_id', householdId).order('name')
      .then(({ data }) => { if (data) setAccounts(data); });
  };

  useEffect(load, [householdId]);

  const handleSave = async () => {
    if (!householdId) return;
    if (editId) {
      await supabase.from('accounts').update({ name, account_type: type, opening_balance: parseFloat(balance), opening_date: date }).eq('id', editId);
    } else {
      await supabase.from('accounts').insert({ household_id: householdId, name, account_type: type, opening_balance: parseFloat(balance), opening_date: date });
    }
    toast({ title: editId ? 'Conta atualizada' : 'Conta criada' });
    setOpen(false);
    setEditId(null);
    setName('');
    setBalance('0');
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('accounts').update({ active: !active }).eq('id', id);
    load();
  };

  const openEdit = (account: any) => {
    setEditId(account.id);
    setName(account.name);
    setType(account.account_type);
    setBalance(String(account.opening_balance));
    setDate(account.opening_date);
    setOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold">Contas</h2>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setName(''); setBalance('0'); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? 'Editar Conta' : 'Nova Conta'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                <div><Label>Tipo</Label><Input value={type} onChange={e => setType(e.target.value)} placeholder="corrente, poupança, carteira" /></div>
                <div><Label>Saldo Inicial</Label><Input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} /></div>
                <div><Label>Data de Abertura</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {accounts.map(a => (
            <Card key={a.id} className={!a.active ? 'opacity-50' : ''}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-sm text-muted-foreground">{a.account_type} · Abertura: {a.opening_date}</p>
                  <p className="text-sm font-medium mt-1">Saldo inicial: {formatCurrency(Number(a.opening_balance))}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Editar</Button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{a.active ? 'Ativa' : 'Inativa'}</span>
                    <Switch checked={a.active} onCheckedChange={() => toggleActive(a.id, a.active)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {accounts.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma conta cadastrada.</p>}
        </div>
      </div>
    </AppLayout>
  );
};

export default Contas;
