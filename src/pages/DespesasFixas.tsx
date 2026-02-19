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
import { Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const DespesasFixas = () => {
  const { householdId } = useHousehold();
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [openExpense, setOpenExpense] = useState(false);
  const [openTemplate, setOpenTemplate] = useState(false);
  const { toast } = useToast();

  // Expense form
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueAt, setDueAt] = useState('');

  // Template form
  const [tDesc, setTDesc] = useState('');
  const [tAmount, setTAmount] = useState('');
  const [tDay, setTDay] = useState('1');
  const [tStart, setTStart] = useState(currentMonth());
  const [tEnd, setTEnd] = useState('');
  const [tCategoryId, setTCategoryId] = useState('');

  const load = () => {
    if (!householdId) return;
    supabase.from('despesas_fixas').select('*, accounts(name), categories(name)').eq('household_id', householdId).eq('due_month', month).order('due_at')
      .then(({ data }) => { if (data) setItems(data); });
    supabase.from('fixed_expense_templates').select('*, categories(name)').eq('household_id', householdId).eq('active', true).order('description')
      .then(({ data }) => { if (data) setTemplates(data); });
    supabase.from('accounts').select('id, name').eq('household_id', householdId).eq('active', true).then(({ data }) => { if (data) setAccounts(data); });
    supabase.from('categories').select('id, name').eq('household_id', householdId).eq('kind', 'despesa').then(({ data }) => { if (data) setCategories(data); });
  };

  useEffect(load, [householdId, month]);

  // Sync on month change
  useEffect(() => {
    if (!householdId || accounts.length === 0) return;
    supabase.rpc('sync_fixed_expenses', { _household_id: householdId, _month: month, _default_account_id: accounts[0].id })
      .then(() => load());
  }, [householdId, month, accounts.length]);

  const markPaid = async (id: string) => {
    await supabase.from('despesas_fixas').update({ status: 'Pago', paid_at: new Date().toISOString().split('T')[0] }).eq('id', id);
    toast({ title: 'Marcada como paga' });
    load();
  };

  const saveExpense = async () => {
    if (!householdId || !accountId) return;
    await supabase.from('despesas_fixas').insert({
      household_id: householdId, account_id: accountId, due_at: dueAt,
      due_month: dueAt.substring(0, 7), description, category_id: categoryId || null,
      amount: parseFloat(amount), status: 'Pendente',
    });
    toast({ title: 'Despesa fixa adicionada' });
    setOpenExpense(false);
    load();
  };

  const saveTemplate = async () => {
    if (!householdId) return;
    await supabase.from('fixed_expense_templates').insert({
      household_id: householdId, description: tDesc, category_id: tCategoryId || null,
      amount: parseFloat(tAmount), due_day: parseInt(tDay),
      start_month: tStart, end_month: tEnd || null,
    });
    toast({ title: 'Template criado' });
    setOpenTemplate(false);
    load();
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-heading font-bold">Despesas Fixas</h2>

        <Tabs defaultValue="month">
          <TabsList>
            <TabsTrigger value="month">Do Mês</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-semibold">{monthLabel(month)}</span>
                <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <Dialog open={openExpense} onOpenChange={setOpenExpense}>
                <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Avulsa</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Despesa Fixa Avulsa</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Descrição</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
                    <div><Label>Valor</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                    <div><Label>Vencimento</Label><Input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} /></div>
                    <div><Label>Conta</Label><Select value={accountId} onValueChange={setAccountId}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Categoria</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={saveExpense} className="w-full">Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {items.map(d => (
              <Card key={d.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{d.description}</p>
                    <p className="text-sm text-muted-foreground">Venc: {d.due_at} · {(d.accounts as any)?.name} · {(d.categories as any)?.name || '-'}</p>
                    <p className="text-xs mt-1">{d.status === 'Pago' ? `✓ Pago em ${d.paid_at}` : '⏳ Pendente'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold currency-negative">{formatCurrency(Number(d.amount))}</p>
                    {d.status === 'Pendente' && (
                      <Button size="sm" variant="outline" onClick={() => markPaid(d.id)} className="gap-1"><Check className="h-3 w-3" /> Pagar</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma despesa fixa neste mês.</p>}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={openTemplate} onOpenChange={setOpenTemplate}>
                <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo Template</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Template Recorrente</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Descrição</Label><Input value={tDesc} onChange={e => setTDesc(e.target.value)} /></div>
                    <div><Label>Valor</Label><Input type="number" step="0.01" value={tAmount} onChange={e => setTAmount(e.target.value)} /></div>
                    <div><Label>Dia do Vencimento (1-31)</Label><Input type="number" min="1" max="31" value={tDay} onChange={e => setTDay(e.target.value)} /></div>
                    <div><Label>Mês Início (YYYY-MM)</Label><Input value={tStart} onChange={e => setTStart(e.target.value)} placeholder="2025-01" /></div>
                    <div><Label>Mês Fim (vazio = indefinido)</Label><Input value={tEnd} onChange={e => setTEnd(e.target.value)} placeholder="2025-12" /></div>
                    <div><Label>Categoria</Label><Select value={tCategoryId} onValueChange={setTCategoryId}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={saveTemplate} className="w-full">Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {templates.map(t => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{t.description}</p>
                    <p className="text-sm text-muted-foreground">Dia {t.due_day} · {(t.categories as any)?.name || '-'} · {t.start_month} até {t.end_month || '∞'}</p>
                  </div>
                  <p className="font-bold">{formatCurrency(Number(t.amount))}</p>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum template.</p>}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default DespesasFixas;
