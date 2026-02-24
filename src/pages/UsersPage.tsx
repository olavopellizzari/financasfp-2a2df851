import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Users as UsersIcon, 
  UserCheck, 
  UserX, 
  Pencil, 
  Crown,
  Loader2,
  Mail,
  Check,
  Search,
  UserPlus,
  UserMinus,
  Bell,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

export function UsersPage() {
  const { currentUser, refreshUsers, refreshProfile } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    avatar_color: '#22c55e',
    is_admin: false,
    is_active: true
  });

  const loadData = async () => {
    setIsLoadingMembers(true);
    try {
      const { data: members, error: membersError } = await supabase.rpc('get_family_members');
      if (!membersError && members) {
        setFamilyMembers(members.map((m: any) => ({
          id: m.f_id || m.id,
          name: m.f_name || m.name,
          email: m.f_email || m.email,
          avatar_color: m.f_avatar_color || m.avatar_color,
          is_admin: m.f_is_admin || m.is_admin,
          is_active: m.f_is_active ?? m.is_active ?? true
        })));
      }
      
      const { data: invites, error: invitesError } = await supabase.rpc('get_pending_invites');
      if (!invitesError && invites) {
        setPendingInvites(invites.map((i: any) => ({
          id: i.invite_id || i.id,
          family_id: i.invite_family_id || i.family_id,
          inviter_name: i.inviter_name
        })));
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchUser = async () => {
    if (!searchEmail || !searchEmail.includes('@')) {
      toast({ title: "Erro", description: "Digite um e-mail válido", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', searchEmail.toLowerCase().trim())
        .limit(1);

      setIsSearching(false);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ 
          title: 'Usuário não encontrado', 
          description: 'Este e-mail não está cadastrado.', 
          variant: "destructive"
        });
        return;
      }

      const foundUser = data[0];
      if (familyMembers.some(m => m.id === foundUser.id)) {
        toast({ title: 'Já é membro', description: 'Este usuário já faz parte da família.' });
        return;
      }
      
      if (foundUser.id === currentUser?.id) {
        toast({ title: 'Info', description: 'Este é você!' });
        return;
      }

      setSearchResults([foundUser]);
    } catch (error: any) {
      setIsSearching(false);
      toast({ title: 'Erro na busca', description: error.message, variant: "destructive" });
    }
  };

  const handleSendInvite = async (user: any) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('send_family_invite', {
        invitee_email: user.email
      });

      if (error) throw error;
      const result = data as any;
      
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: 'Convite enviado!', description: result.message });
      setSearchResults([]);
      setSearchEmail('');
      await loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
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
      await loadData();
      await refreshUsers();
      await refreshProfile();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectInvite = async (familyId: string) => {
    setIsLoading(true);
    try {
      await supabase.rpc('reject_family_invite', {
        invite_family_id: familyId
      });

      toast({ title: 'Convite rejeitado' });
      await loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Remover ${userName} da família?`)) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('remove_family_member', {
        member_id: userId
      });

      if (error) throw error;
      toast({ title: 'Membro removido' });
      await loadData();
      await refreshUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      email: user.email,
      avatar_color: user.avatar_color || '#22c55e',
      is_admin: user.is_admin || false,
      is_active: user.is_active ?? true
    });
    setDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: userForm.name,
          avatar_color: userForm.avatar_color,
          is_admin: userForm.is_admin,
          is_active: userForm.is_active
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      toast({ title: 'Atualizado!' });
      setDialogOpen(false);
      await loadData();
      await refreshUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingMembers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Família</h1>
          <p className="text-muted-foreground">Gerencie os membros da família</p>
        </div>
        {pendingInvites.length > 0 && (
          <Badge className="bg-yellow-500 text-white animate-pulse">
            <Bell className="h-3 w-3 mr-1" /> {pendingInvites.length} convite(s)
          </Badge>
        )}
      </div>

      {pendingInvites.length > 0 && (
        <Card className="finance-card border-2 border-yellow-500/50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <Bell className="h-5 w-5" />
                <p className="font-bold">Você tem convites pendentes!</p>
              </div>
              {pendingInvites.map((invite: any) => (
                <div key={invite.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                  <div>
                    <p className="font-bold">{invite.inviter_name}</p>
                    <p className="text-sm text-muted-foreground">quer que você faça parte da família</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => handleAcceptInvite(invite.family_id)} 
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Aceitar
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectInvite(invite.family_id)} 
                      disabled={isLoading}
                      className="border-red-500 text-red-500"
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="finance-card">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <UsersIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{familyMembers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="finance-card">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold">{familyMembers.filter(u => u.is_active !== false).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="finance-card">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inativos</p>
              <p className="text-2xl font-bold">{familyMembers.filter(u => u.is_active === false).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="finance-card border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <Label className="text-sm font-bold">Convidar Membro</Label>
            </div>
            <div className="flex gap-2">
              <Input
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
                className="rounded-xl h-11 flex-1"
              />
              <Button onClick={handleSearchUser} disabled={isSearching} className="h-11 px-6">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <Card className="finance-card border-2 border-green-500/30">
          <CardContent className="p-6">
            {searchResults.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: user.avatar_color }}>
                    {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold">{user.name || 'Sem nome'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Button onClick={() => handleSendInvite(user)} disabled={isLoading} className="gradient-primary">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Enviar Convite
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {familyMembers.map(user => (
          <Card key={user.id} className={cn("finance-card transition-all hover:shadow-md", user.is_active === false && 'opacity-60')}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: user.avatar_color }}>
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{user.name || 'Sem nome'}</h3>
                      {user.is_admin && <Badge className="bg-yellow-100 text-yellow-700 border-none h-5 text-[10px] uppercase font-bold"><Crown className="h-3 w-3 mr-1" /> Admin</Badge>}
                      {user.id === currentUser?.id && <Badge variant="outline" className="h-5 text-[10px] uppercase font-bold">Você</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {currentUser?.is_admin && user.id !== currentUser?.id && (
                    <>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleEditUser(user)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10" onClick={() => handleRemoveMember(user.id, user.name)}><UserMinus className="h-4 w-4" /></Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[24px] max-w-md">
          <DialogHeader><DialogTitle>Editar: {userForm.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="rounded-xl h-11" /></div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-dashed">
              <div className="space-y-0.5"><Label className="font-bold">Administrador</Label><p className="text-[10px] text-muted-foreground">Pode gerenciar membros</p></div>
              <Switch checked={userForm.is_admin} onCheckedChange={v => setUserForm({...userForm, is_admin: v})} />
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-dashed">
              <div className="space-y-0.5"><Label className="font-bold">Ativo</Label><p className="text-[10px] text-muted-foreground">Pode acessar o sistema</p></div>
              <Switch checked={userForm.is_active} onCheckedChange={v => setUserForm({...userForm, is_active: v})} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 h-11 rounded-xl">Cancelar</Button>
            <Button onClick={handleSaveUser} disabled={isLoading} className="flex-1 h-11 rounded-xl gradient-primary">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}