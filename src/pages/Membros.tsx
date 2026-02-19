import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/hooks/useHousehold';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Copy, Users } from 'lucide-react';

const Membros = () => {
  const { householdId } = useHousehold();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const load = () => {
    if (!householdId) return;
    supabase.from('household_members').select('*').eq('household_id', householdId)
      .then(({ data }) => { if (data) setMembers(data); });
    supabase.from('household_invites').select('*').eq('household_id', householdId).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setInvites(data); });
  };

  useEffect(load, [householdId]);

  const createInvite = async () => {
    if (!householdId || !user) return;
    const { error } = await supabase.from('household_invites').insert({
      household_id: householdId,
      invited_email: email.toLowerCase(),
      invited_role: 'member',
      created_by: user.id,
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Convite criado' });
    setOpen(false);
    setEmail('');
    load();
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/aceitar?token=${token}`);
    toast({ title: 'Link copiado!' });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold">Membros</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Convidar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Convidar Membro</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>E-mail do convidado</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="marina@email.com" /></div>
                <Button onClick={createInvite} className="w-full">Criar Convite</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Membros Atuais</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm">{m.user_id === user?.id ? 'Você' : m.user_id}</span>
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">{m.role}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Convites</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{inv.invited_email}</p>
                  <p className="text-xs text-muted-foreground">Status: {inv.status} · Expira: {new Date(inv.expires_at).toLocaleDateString('pt-BR')}</p>
                </div>
                {inv.status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={() => copyLink(inv.token)} className="gap-1">
                    <Copy className="h-3 w-3" /> Copiar Link
                  </Button>
                )}
              </div>
            ))}
            {invites.length === 0 && <p className="text-muted-foreground text-sm">Nenhum convite.</p>}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Membros;
