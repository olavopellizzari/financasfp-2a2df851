import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { User, Trash2, Loader2, Sparkles, Wrench, Calendar, Bell, BellRing, Smartphone, CheckCircle2, AlertTriangle, Zap, Camera, Upload, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { addMonths, format } from 'date-fns';

const AVATAR_COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f97316', '#eab308', '#14b8a6', '#6366f1'
];

export function SettingsPage() {
  const { currentUser, refreshProfile, isCurrentUserAdmin } = useAuth();
  const { allTransactions, refresh } = useFinance();
  const { permission, isStandalone, requestPermission, sendTestNotification } = usePushNotifications();
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isFixingDates, setIsFixingDates] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', avatarColor: AVATAR_COLORS[0], avatarUrl: '' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dailyAlerts, setDailyAlerts] = useState(false);

  const isAdmin = isCurrentUserAdmin();

  useEffect(() => {
    if (currentUser) {
      setProfileForm({ 
        name: currentUser.name || '', 
        email: currentUser.email || '', 
        avatarColor: currentUser.avatar_color || AVATAR_COLORS[0],
        avatarUrl: currentUser.avatar_url || ''
      });
      if (currentUser.avatar_url) {
        setAvatarPreview(currentUser.avatar_url);
      }
    }
  }, [currentUser]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Selecione apenas arquivos de imagem.', variant: 'destructive' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 2MB.', variant: 'destructive' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarPreview(publicUrl);
      setProfileForm(prev => ({ ...prev, avatarUrl: publicUrl }));
      toast({ title: 'Sucesso!', description: 'Foto de perfil enviada.' });
    } catch (error: any) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setProfileForm(prev => ({ ...prev, avatarUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFixDescriptions = async () => {
    if (!confirm('Isso removerá sufixos como "(1/12)" de todas as descrições de lançamentos antigos. Deseja continuar?')) return;
    setIsCleaning(true);
    try {
      const regex = /\s*\(\d+\s*\/\s*\d+\)$/;
      const toUpdate = allTransactions.filter(t => regex.test(t.description));
      if (toUpdate.length === 0) {
        toast({ title: "Tudo limpo!", description: "Nenhum lançamento com sufixo de parcela foi encontrado." });
        return;
      }
      for (const tx of toUpdate) {
        const newDescription = tx.description.replace(regex, '').trim();
        await supabase.from('transactions').update({ description: newDescription }).eq('id', tx.id);
      }
      toast({ title: "Sucesso!", description: `${toUpdate.length} descrições foram corrigidas.` });
      await refresh();
    } catch (error: any) {
      toast({ title: "Erro na limpeza", description: error.message, variant: "destructive" });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleFixDates = async () => {
    if (!confirm('Isso ajustará a data de cada parcela para o mês correspondente, mantendo o dia original. Deseja continuar?')) return;
    setIsFixingDates(true);
    try {
      const groups = new Map<string, any[]>();
      allTransactions.forEach(tx => {
        if (tx.installmentGroupId) {
          const group = groups.get(tx.installmentGroupId) || [];
          group.push(tx);
          groups.set(tx.installmentGroupId, group);
        }
      });
      let totalUpdated = 0;
      for (const [groupId, txs] of groups.entries()) {
        const sortedTxs = [...txs].sort((a, b) => a.installmentNumber - b.installmentNumber);
        const baseTx = sortedTxs[0];
        const [year, month, day] = baseTx.purchaseDate.split('-').map(Number);
        const baseDate = new Date(year, month - 1, day, 12, 0, 0);
        const baseInstallmentNum = baseTx.installmentNumber;
        for (const tx of sortedTxs) {
          const monthsToAdd = tx.installmentNumber - baseInstallmentNum;
          const correctDate = addMonths(baseDate, monthsToAdd);
          const correctDateStr = format(correctDate, 'yyyy-MM-dd');
          if (tx.purchaseDate !== correctDateStr) {
            const { error } = await supabase.from('transactions').update({ purchase_date: correctDateStr, effective_date: correctDateStr }).eq('id', tx.id);
            if (!error) totalUpdated++;
          }
        }
      }
      if (totalUpdated > 0) {
        toast({ title: "Datas corrigidas!", description: `${totalUpdated} lançamentos foram ajustados.` });
        await refresh();
      } else {
        toast({ title: "Tudo em ordem", description: "Não foram encontrados lançamentos com datas incorretas." });
      }
    } catch (error: any) {
      toast({ title: "Erro na correção", description: error.message, variant: "destructive" });
    } finally {
      setIsFixingDates(false);
    }
  };

  const handleResetData = async (onlyTransactions = false) => {
    const message = onlyTransactions ? 'ATENÇÃO: Isso apagará TODOS os seus lançamentos na nuvem. Contas e cartões serão mantidos. Continuar?' : 'ATENÇÃO CRÍTICA: Isso apagará TODOS os seus dados (contas, cartões, transações) na nuvem. Esta ação é irreversível. Continuar?';
    if (!confirm(message)) return;
    setIsDeleting(true);
    try {
      const tables = onlyTransactions ? ['transactions'] : ['transactions', 'cards', 'accounts', 'budgets', 'goals', 'debts'];
      for (const table of tables) {
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      toast({ title: onlyTransactions ? 'Lançamentos removidos!' : 'Dados resetados!', description: 'O banco de dados na nuvem foi limpo com sucesso.' });
      setTimeout(() => window.location.href = '/', 1000);
    } catch (error: any) {
      toast({ title: 'Erro ao resetar', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const saveProfile = async () => {
    if (!currentUser?.id) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profileForm.name,
          avatar_color: profileForm.avatarColor,
          avatar_url: profileForm.avatarUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: 'Perfil updated', description: 'Nome, avatar e cor foram salvos.' });
      setEditProfileOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveEmail = async () => {
    if (!currentUser?.id) return;

    const emailTrim = profileForm.email.trim().toLowerCase();
    if (!emailTrim) {
      toast({ title: 'Erro', description: 'Informe um e-mail válido.', variant: 'destructive' });
      return;
    }

    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: emailTrim });
      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ email: emailTrim, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);

      await refreshProfile();
      toast({
        title: 'E-mail atualizado',
        description: 'Se necessário, confirme no e-mail para finalizar a mudança.'
      });
      setEditProfileOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Personalize o aplicativo e gerencie seus dados na nuvem</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" /> Notificações & Widget</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {!isStandalone ? (
            <div className="flex items-start gap-4 p-4 bg-warning/10 rounded-xl border border-warning/20">
              <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-warning">Ação Necessária no iPhone:</p>
                <p className="text-xs text-muted-foreground">Para ver o limite na tela de bloqueio, você deve:</p>
                <ol className="text-xs text-muted-foreground list-decimal ml-4 mt-2 space-y-1">
                  <li>Clicar no botão de <strong>Compartilhar</strong> no Safari</li>
                  <li>Selecionar <strong>"Adicionar à Tela de Início"</strong></li>
                  <li>Abrir o app pelo novo ícone</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 p-4 bg-success/10 rounded-xl border border-success/20">
              <CheckCircle2 className="h-6 w-6 text-success shrink-0 mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-success">App Instalado!</p>
                <p className="text-xs text-muted-foreground">As notificações de limite diário aparecerão na sua tela de bloqueio.</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Status das Notificações</Label>
              <p className="text-xs text-muted-foreground">
                {permission === 'granted' ? '✅ Ativadas neste dispositivo' : permission === 'denied' ? '❌ Bloqueadas (verifique ajustes do iOS)' : '⚪ Aguardando permissão'}
              </p>
            </div>
            <Button 
              variant={permission === 'granted' ? 'outline' : 'default'} 
              onClick={requestPermission} 
              disabled={permission === 'granted' || !isStandalone}
            >
              {permission === 'granted' ? 'Já Ativado' : 'Ativar Notificações'}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Alerta de Limite Diário</Label>
              <p className="text-xs text-muted-foreground">Receber uma notificação toda manhã com seu saldo disponível.</p>
            </div>
            <Switch 
              checked={dailyAlerts} 
              onCheckedChange={(v) => {
                setDailyAlerts(v);
                if (v) toast({ title: "Ativado!", description: "Você receberá o resumo diário às 08:00." });
              }} 
              disabled={permission !== 'granted'}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Teste de Notificação</Label>
              <p className="text-xs text-muted-foreground">Envia um alerta imediato para testar o som e vibração.</p>
            </div>
            <Button variant="outline" onClick={sendTestNotification} disabled={!isStandalone}>
              <Bell className="h-4 w-4 mr-2" /> Testar Agora
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {currentUser && (
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden" style={{ backgroundColor: currentUser.avatar_color }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name?.charAt(0).toUpperCase() || '?'
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </Button>
                {avatarPreview && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                    onClick={removeAvatar}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{currentUser.name}</h3>
                <p className="text-muted-foreground">{currentUser.email}</p>
              </div>
              <Button variant="outline" onClick={() => setEditProfileOpen(true)}>Editar Perfil</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Manutenção</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5"><Label>Limpar Descrições</Label><p className="text-sm text-muted-foreground">Remove o sufixo "(1/10)" das descrições.</p></div>
                <Button variant="outline" onClick={handleFixDescriptions} disabled={isCleaning}>{isCleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Corrigir Descrições</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5"><Label>Corrigir Datas de Parcelas</Label><p className="text-sm text-muted-foreground">Ajusta a data de cada parcela para o mês correto.</p></div>
                <Button variant="outline" onClick={handleFixDates} disabled={isFixingDates}>{isFixingDates ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />} Corrigir Datas</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Zona de Perigo (Nuvem)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5"><Label>Resetar Lançamentos</Label><p className="text-sm text-muted-foreground">Apaga apenas o histórico de transações.</p></div>
                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => handleResetData(true)} disabled={isDeleting}>{isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resetar Lançamentos'}</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5"><Label>Limpar Todos os Dados</Label><p className="text-sm text-muted-foreground">Remove permanentemente tudo da nuvem.</p></div>
                <Button variant="destructive" onClick={() => handleResetData(false)} disabled={isDeleting}>{isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Limpar Tudo na Nuvem'}</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input 
                value={profileForm.name} 
                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Avatar (cor de fallback)</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setProfileForm(prev => ({ ...prev, avatarColor: c }))}
                    className="w-8 h-8 rounded-full border"
                    style={{
                      backgroundColor: c,
                      outline: c === profileForm.avatarColor ? '2px solid #22c55e' : 'none',
                      outlineOffset: 2
                    }}
                    aria-label={`Selecionar cor ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input 
                type="email" 
                value={profileForm.email} 
                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))} 
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditProfileOpen(false)}>Cancelar</Button>
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Perfil
            </Button>
            <Button variant="outline" onClick={saveEmail} disabled={savingEmail}>
              {savingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Atualizar E-mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}