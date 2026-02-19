import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/hooks/useHousehold';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

const KINDS = [
  { value: 'despesa', label: 'Despesa' },
  { value: 'receita', label: 'Receita' },
  { value: 'cartao', label: 'Cartão' },
] as const;

const Categorias = () => {
  const { householdId } = useHousehold();
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<string>('despesa');
  const [tab, setTab] = useState('despesa');
  const { toast } = useToast();

  const load = () => {
    if (!householdId) return;
    supabase.from('categories').select('*').eq('household_id', householdId).order('name')
      .then(({ data }) => { if (data) setCategories(data); });
  };

  useEffect(load, [householdId]);

  const handleSave = async () => {
    if (!householdId || !name.trim()) return;
    const { error } = await supabase.from('categories').insert({ household_id: householdId, name: name.trim(), kind: kind as any });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Categoria criada' });
      setOpen(false);
      setName('');
      load();
    }
  };

  const filtered = categories.filter(c => c.kind === tab);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold">Categorias</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={kind} onValueChange={setKind}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KINDS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="despesa">Despesa</TabsTrigger>
            <TabsTrigger value="receita">Receita</TabsTrigger>
            <TabsTrigger value="cartao">Cartão</TabsTrigger>
          </TabsList>
          {KINDS.map(k => (
            <TabsContent key={k.value} value={k.value}>
              <div className="grid gap-2">
                {filtered.map(c => (
                  <Card key={c.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <span>{c.name}</span>
                      {c.is_default && <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Padrão</span>}
                    </CardContent>
                  </Card>
                ))}
                {filtered.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma categoria.</p>}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Categorias;
