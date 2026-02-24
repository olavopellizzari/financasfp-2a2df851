import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function SetupPage() {
  const { currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);

    try {
      // 1. Criar a Família (Household)
      const { data: household, error: hhError } = await supabase
        .from('households')
        .insert({ name: familyName || 'Minha Família' })
        .select()
        .single();

      if (hhError) throw hhError;

      // 2. Adicionar o usuário como membro ADMIN
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: currentUser.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      // 3. Vincular o perfil à família
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          family_id: household.id, 
          is_admin: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      // 4. Criar a primeira conta bancária (Ajustado para o Schema real)
      const { error: accError } = await supabase
        .from('accounts')
        .insert({
          household_id: household.id,
          name: 'Conta Corrente',
          account_type: 'corrente',
          opening_balance: parseFloat(initialBalance) || 0,
          opening_date: new Date().toISOString().split('T')[0],
          active: true
        });

      if (accError) throw accError;

      // 5. Criar categorias essenciais (Ajustado para o Schema real)
      const defaultCategories = [
        { name: 'Salário', kind: 'receita' },
        { name: 'Alimentação', kind: 'despesa' },
        { name: 'Moradia', kind: 'despesa' },
        { name: 'Lazer', kind: 'despesa' },
        { name: 'Transporte', kind: 'despesa' }
      ];

      const { error: catError } = await supabase.from('categories').insert(
        defaultCategories.map(cat => ({ 
          ...cat, 
          household_id: household.id, 
          is_default: true 
        }))
      );

      if (catError) throw catError;

      toast({ title: "Configuração concluída!", description: "Bem-vindo ao seu novo controle financeiro." });
      
      await refreshProfile();
      setTimeout(() => navigate('/'), 500);
      
    } catch (error: any) {
      console.error('Erro no setup:', error);
      toast({ 
        title: "Erro no setup", 
        description: error.message || "Verifique os campos e tente novamente.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-none rounded-[24px]">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Bem-vindo!</CardTitle>
          <CardDescription>Vamos configurar seu espaço financeiro em segundos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-6">
            <div className="space-y-2">
              <Label>Nome da sua Família / Grupo</Label>
              <Input 
                placeholder="Ex: Família Silva" 
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo Inicial da Conta Corrente</Label>
              <Input 
                type="number" 
                step="0.01"
                placeholder="0,00" 
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl gradient-primary font-bold" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Começar Agora <ArrowRight className="ml-2 w-4 h-4" /></>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}