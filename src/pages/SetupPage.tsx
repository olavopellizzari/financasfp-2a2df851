import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowRight, Loader2, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function SetupPage() {
  const { currentUser, refreshProfile, refreshUsers } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingInvites, setIsCheckingInvites] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [familyName, setFamilyName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');

  useEffect(() => {
    if (currentUser) {
      checkInvites();
    }
  }, [currentUser]);

  const checkInvites = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_invites');
      if (!error && data) {
        setPendingInvites(data);
      }
    } catch (err) {
      console.error('Erro ao buscar convites:', err);
    } finally {
      setIsCheckingInvites(false);
    }
  };

  const handleAcceptInvite = async (familyId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('accept_family_invite', {
        invite_family_id: familyId
      });

      if (error) throw error;
      const result = data as any;
      
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: 'Bem-vindo à família!', description: result.message });
      await refreshProfile();
      await refreshUsers();
      navigate('/');
    } catch (error: any) {
      toast({ title: "Erro ao aceitar convite", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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

      // 4. Criar a primeira conta bancária
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

      // 5. Criar categorias essenciais
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

  if (isCheckingInvites) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {pendingInvites.length > 0 && (
          <Card className="border-2 border-primary/50 shadow-xl rounded-[24px] overflow-hidden animate-scale-in">
            <CardHeader className="bg-primary/5 pb-4">
              <div className="flex items-center gap-3 text-primary">
                <UserPlus className="w-6 h-6" />
                <CardTitle className="text-xl">Você foi convidado!</CardTitle>
              </div>
              <CardDescription>Alguém já te convidou para uma família existente.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {pendingInvites.map((invite: any) => (
                <div key={invite.invite_id} className="flex items-center justify-between p-4 bg-muted rounded-xl border">
                  <div>
                    <p className="font-bold text-sm">{invite.inviter_name}</p>
                    <p className="text-xs text-muted-foreground">Convidou você para o grupo</p>
                  </div>
                  <Button 
                    onClick={() => handleAcceptInvite(invite.invite_family_id)} 
                    disabled={isLoading}
                    className="gradient-primary h-9 px-4 rounded-lg"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Aceitar</>}
                  </Button>
                </div>
              ))}
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Ou se preferir, crie a sua própria abaixo</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="w-full shadow-xl border-none rounded-[24px]">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Criar Nova Família</CardTitle>
            <CardDescription>Configure seu próprio espaço financeiro.</CardDescription>
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
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Criar Minha Família <ArrowRight className="ml-2 w-4 h-4" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}