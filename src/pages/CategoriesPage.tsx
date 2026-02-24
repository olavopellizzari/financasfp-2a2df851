import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '📁',
    color: '#6366f1',
    type: 'expense' as any
  });

  const handleSaveCategory = async () => {
    try {
      const id = editingCategory?.id ?? crypto.randomUUID();
      const name = categoryForm.name.trim();

      if (!name) {
        toast({ title: 'Informe um nome para a categoria', variant: 'destructive' });
        return;
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name,
            icon: categoryForm.icon,
            color: categoryForm.color,
            type: categoryForm.type
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const userId = userRes.user?.id;
        if (!userId) throw new Error('Usuário não autenticado.');

        const { data: hm, error: hmErr } = await supabase
          .from('household_members')
          .select('household_id')
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (hmErr) throw hmErr;

        const { error } = await supabase.from('categories').insert({
          id,
          household_id: hm.household_id,
          user_id: userId,
          name,
          icon: categoryForm.icon,
          color: categoryForm.color,
          type: categoryForm.type,
          is_system: false
        });

        if (error) throw error;
      }

      setCategoryDialogOpen(false);
      await refresh();
      toast({ title: 'Categoria salva com sucesso!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar categoria',
        description: error?.message ?? 'Não foi possível salvar.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', editingCategory.id);
      if (error) throw error;

      setCategoryDialogOpen(false);
      await refresh();
      toast({ title: 'Categoria excluída com sucesso!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir categoria',
        description: error?.message ?? 'Não foi possível excluir.',
        variant: 'destructive'
      });
    }
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const filteredCategories = sortedCategories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const incomeCats = filteredCategories.filter((c) => c.type === 'income');
  const expenseCats = filteredCategories.filter((c) => c.type === 'expense' || c.type === 'both');

  const CategoryCard = ({ cat }: { cat: Category }) => (
    <Card className="group hover:border-primary/50 transition-colors overflow-hidden">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: `${cat.color}20` }}
          >
            {cat.icon}
          </div>

          <div className="min-w-0">
            <p className="font-semibold truncate">{cat.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {cat.type === 'income' ? 'Receita' : 'Despesa'}
            </p>
          </div>
        </div>

        {!cat.isSystem && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setEditingCategory(cat);
                setCategoryForm({ ...cat } as any);
                setCategoryDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

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
            setCategoryForm({ name: '', icon: '📁', color: '#6366f1', type: 'expense' } as any);
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
              <CategoryCard key={cat.id} cat={cat} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {incomeCats.map((cat) => (
              <CategoryCard key={cat.id} cat={cat} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Ex: iFood"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ícone (Emoji)</Label>
                <Input
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder="Emoji"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={categoryForm.type}
                  onValueChange={(v) => setCategoryForm({ ...categoryForm, type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            <div className="flex gap-2">
              {editingCategory && !editingCategory.isSystem && (
                <Button variant="destructive" onClick={handleDeleteCategory}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCategory}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
