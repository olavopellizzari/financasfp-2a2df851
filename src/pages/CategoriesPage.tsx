import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Category } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function CategoriesPage() {
  const { categories, refresh } = useFinance();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '📁',
    color: '#6366f1',
    kind: 'despesa' as 'receita' | 'despesa' | 'cartao'
  });

  const handleSaveCategory = async () => {
    try {
      const name = categoryForm.name.trim();
      if (!name) {
        toast({ title: 'Informe um nome para a categoria', variant: 'destructive' });
        return;
      }

      if (!currentUser?.family_id) {
        toast({ title: 'Erro de autenticação', description: 'Família não encontrada.', variant: 'destructive' });
        return;
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name,
            icon: categoryForm.icon,
            color: categoryForm.color,
            kind: categoryForm.kind
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert({
          household_id: currentUser.family_id,
          name,
          icon: categoryForm.icon,
          color: categoryForm.color,
          kind: categoryForm.kind,
          is_default: false
        });

        if (error) throw error;
      }

      setCategoryDialogOpen(false);
      await refresh();
      toast({ title: 'Categoria salva com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', editingCategory.id);
      if (error) throw error;
      setCategoryDialogOpen(false);
      await refresh();
      toast({ title: 'Categoria excluída!' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const incomeCats = filteredCategories.filter((c) => c.type === 'income');
  const expenseCats = filteredCategories.filter((c) => c.type === 'expense');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">Organize suas receitas e despesas</p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setCategoryForm({ name: '', icon: '📁', color: '#6366f1', kind: 'despesa' });
            setCategoryDialogOpen(true);
          }}
          className="gradient-primary shadow-primary"
        >
          <Plus className="h-4 w-4 mr-2" /> Nova Categoria
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar categorias..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="expenses">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="expenses">Despesas ({expenseCats.length})</TabsTrigger>
          <TabsTrigger value="income">Receitas ({incomeCats.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {expenseCats.map((cat) => (
              <Card key={cat.id} className="group hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${cat.color}20` }}>{cat.icon}</div>
                    <p className="font-semibold">{cat.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, icon: cat.icon, color: cat.color, kind: 'despesa' }); setCategoryDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {incomeCats.map((cat) => (
              <Card key={cat.id} className="group hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${cat.color}20` }}>{cat.icon}</div>
                    <p className="font-semibold">{cat.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, icon: cat.icon, color: cat.color, kind: 'receita' }); setCategoryDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Ícone (Emoji)</Label><Input value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })} /></div>
              <div className="space-y-2"><Label>Tipo</Label><Select value={categoryForm.kind} onValueChange={(v: any) => setCategoryForm({ ...categoryForm, kind: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="despesa">Despesa</SelectItem><SelectItem value="receita">Receita</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {editingCategory && <Button variant="destructive" onClick={handleDeleteCategory}><Trash2 className="h-4 w-4 mr-2" /> Excluir</Button>}
            <div className="flex gap-2"><Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button><Button onClick={handleSaveCategory}>Salvar</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}