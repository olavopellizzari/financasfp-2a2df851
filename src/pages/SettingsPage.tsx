import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  User, Trash2, Loader2, Sparkles, Wrench, Calendar, Bell, BellRing, 
  Smartphone, CheckCircle2, AlertTriangle, Zap, Camera, Upload, X, 
  RefreshCw, Clock, Wallet, CreditCard, ShieldAlert, MessageSquare,
  HelpCircle, ListChecks
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addMonths, format, parseISO } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

const AVATAR_COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f97316', '#eab308', '#14b8a6', '#6366f1'
];

export function SettingsPage() {
  const { currentUser, refreshProfile, isCurrentUserAdmin, refreshUsers, users } = useAuth();
  const { allTransactions, allCards, calculateMesFatura, refresh } = useFinance();
  const { permission, isStandalone, requestPermission, sendTestNotification } = usePushNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isFixingDates, setIsFixingDates] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isFixingAccountMonths, setIsFixingAccountMonths] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', avatarColor: AVATAR_COLORS[0], avatarUrl: '', whatsapp: '' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    daily_spending_threshold: '0',
    invoice_reminder_days: '3',
    balance_report_frequency: 'off',
    balance_report_time: '08:00',
    low_balance_alert_value: '100',
    enable_spending_limit: false,
    enable_low_balance: false,
    invoice_reminder_alert: true
  });

  const isAdmin = isCurrentUserAdmin();

  useEffect(() => {
    if (currentUser) {
      setProfileForm({ 
        name: currentUser.name || '', 
        email: currentUser.email || '', 
        avatarColor: currentUser.avatar_color || AVATAR_COLORS[0],
        avatarUrl: currentUser.avatar_url || '',
        whatsapp: (currentUser as any).whatsapp_number || ''
      });
      if (currentUser.avatar_url) {
        setAvatarPreview(currentUser.avatar_url);
      }
      loadNotificationSettings();
    }
  }, [currentUser]);

  const loadNotificationSettings = async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (data) {
        setAlertSettings({
          daily_spending_threshold: data.daily_spending_threshold.toString(),
          invoice_reminder_days: data.invoice_reminder_days.toString(),
          balance_report_frequency: data.balance_report_frequency,
          balance_report_time: data.balance_report_time,
          low_balance_alert_value: data.low_balance_alert_value.toString(),
          enable_spending_limit: data.enable_spending_limit,
          enable_low_balance: data.enable_low_balance,
          invoice_reminder_alert: true
        });
      }
    } catch (e) {
      console.log("Configurações de alerta ainda não criadas.");
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveAlertSettings = async () => {
    if (!currentUser?.id) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: currentUser.id,
          daily_spending_threshold: parseFloat(alertSettings.daily_spending_threshold) || 0,
          invoice_reminder_days: parseInt(alertSettings.invoice_reminder_days) || 3,
          balance_report_frequency: alertSettings.balance_report_frequency,
          balance_report_time: alertSettings.balance_report_time,
          low_balance_alert_value: parseFloat(alertSettings.low_balance_alert_value) || 0,
          enable_spending_limit: alertSettings.enable_spending_limit,
          enable_low_balance: alertSettings.enable_low_balance,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast({ title: "Sucesso!", description: "Preferências de alerta salvas." });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
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
          whatsapp_number: profileForm.whatsapp.replace(/\D/g, ''),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      await refreshProfile();
      await refreshUsers();
      toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas.' });
      setEditProfileOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFixDescriptions = async () => {
    if (!currentUser?.family_id) return;
    const familyUserIds = users.map(u => u.id);
    if (!confirm('Isso removerá sufixos como "(1/12)" de todas as descrições de lançamentos da sua família. Deseja continuar?')) return;
    
    setIsCleaning(true);
    try {
      const regex = /\s*\(\d+\s*\/\s*\d+\)$/;
      const toUpdate = allTransactions.filter(t => regex.test(t.description));
      
      if (toUpdate.length === 0) {
        toast({ title: "Tudo limpo!", description: "Nenhum lançamento com sufixo de parcela foi encontrado." });
        return;
      }

      let count = 0;
      for (const tx of toUpdate) {
        const newDescription = tx.description.replace(regex, '').trim();
        const { error } = await supabase
          .from('transactions')
          .update({ description: newDescription })
          .eq('id', tx.id)
          .in('user_id', familyUserIds);
        
        if (!error) count++;
      }

      toast({ title: "Sucesso!", description: `${count} descrições foram corrigidas.` });
      await refresh();
    } catch (error: any) {
      toast({ title: "Erro na limpeza", description: error.message, variant: "destructive" });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleFixDates = async () => {
    if (!currentUser?.family_id) return;
    const familyUserIds = users.map(u => u.id);
    if (!confirm('Isso ajustará a data de cada parcela para o mês correspondente na sua família. Deseja continuar?')) return;
    
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
            const { error } = await supabase
              .from('transactions')
              .update({ purchase_date: correctDateStr, effective_date: correctDateStr })
              .eq('id', tx.id)
              .in('user_id', familyUserIds);
            
            if (!error) totalUpdated++;
          }
        }
      }

      if (totalUpdated > 0) {
        toast({ title: "Datas corrigidas!", description: `${totalUpdated} lançamentos foram ajustados.` });
        await refresh();
      } else {
        toast({ title: "Tudo em ordem", description: "Não foram encontrados lançamentos com das incorretas." });
      }
    } catch (error: any) {
      toast({ title: "Erro na correção", description: error.message, variant: "destructive" });
    } finally {
      setIsFixingDates(false);
    }
  };

  const handleRecalculateInvoices = async () => {
    if (!currentUser?.family_id) return;
    const familyUserIds = users.map(u => u.id);
    if (!confirm('Isso atualizará o mês da fatura de todos os lançamentos de cartão da sua família. Deseja continuar?')) return;
    
    setIsRecalculating(true);
    try {
      const creditTxs = allTransactions.filter(t => t.cardId && (t.type === 'CREDIT' || t.type === 'REFUND'));
      let updatedCount = 0;

      for (const tx of creditTxs) {
        const purchaseDate = parseISO(tx.purchaseDate);
        const newMesFatura = calculateMesFatura(purchaseDate, tx.cardId!);
        
        if (tx.mesFatura !== newMesFatura) {
          const { error } = await supabase
            .from('transactions')
            .update({ mes_fatura: newMesFatura, effective_month: newMesFatura })
            .eq('id', tx.id)
            .in('user_id', familyUserIds);
          
          if (!error) updatedCount++;
        }
      }

      toast({ title: "Recálculo concluído!", description: `${updatedCount} lançamentos foram movidos para os meses corretos.` });
      await refresh();
    } catch (error: any) {
      toast({ title: "Erro no recálculo", description: error.message, variant: "destructive" });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleFixAccountMonths = async () => {
    if (!currentUser?.family_id) return;
    const familyUserIds = users.map(u => u.id);
    if (!confirm('Isso garantirá que todos os lançamentos em CONTA fiquem no mês da própria data. Deseja continuar?')) return;
    
    setIsFixingAccountMonths(true);
    try {
      const accountTxs = allTransactions.filter(t => !t.cardId);
      let updatedCount = 0;

      for (const tx of accountTxs) {
        const correctMonth = tx.purchaseDate.substring(0, 7);
        
        if (tx.effectiveMonth !== correctMonth) {
          const { error } = await supabase
            .from('transactions')
            .update({ effective_month: correctMonth, mes_fatura: null })
            .eq('id', tx.id)
            .in('user_id', familyUserIds);
          
          if (!error) updatedCount++;
        }
      }

      toast({ title: "Competências corrigidas!", description: `${updatedCount} lançamentos em conta foram ajustados.` });
      await refresh();
    } catch (error: any) {
      toast({ title: "Erro na correção", description: error.message, variant: "destructive" });
    } finally {
      setIsFixingAccountMonths(false);
    }
  };

  const handleResetData = async (onlyTransactions = false) => {
    if (!currentUser?.family_id) return;
    
    const message = onlyTransactions 
      ? 'ATENÇÃO: Isso apagará TODOS os lançamentos da sua família na nuvem. Contas e cartões serão mantidos. Continuar?' 
      : 'ATENÇÃO CRÍTICA: Isso apagará TODOS os dados da sua família (contas, cartões, transações) na nuvem. Esta ação é irreversível. Continuar?';
    
    if (!confirm(message)) return;
    
    setIsDeleting(true);
    try {
      const familyId = currentUser.family_id;
      const familyUserIds = users.map(u => u.id);

      if (onlyTransactions) {
        await supabase.from('transactions').delete().in('user_id', familyUserIds);
      } else {
        await supabase.from('transactions').delete().in('user_id', familyUserIds);
        await supabase.from('cards').delete().eq('household_id', familyId);
        await supabase.from('accounts').delete().eq('household_id', familyId);
        
        const userTables = ['budgets', 'goals', 'debts', 'invoices'];
        for (const table of userTables) {
          await supabase.from(table).delete().in('user_id', familyUserIds);
        }
      }

      toast({ title: onlyTransactions ? 'Lançamentos removidos!' : 'Dados resetados!', description: 'O banco de dados da sua família foi limpo com sucesso.' });
      setTimeout(() => window.location.href = '/', 1000);
    } catch (error: any) {
      toast({ title: 'Erro ao resetar', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

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
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (dbError) throw dbError;

      setAvatarPreview(publicUrl);
      setProfileForm(prev => ({ ...prev, avatarUrl: publicUrl }));
      
      await refreshProfile();
      await refreshUsers();
      
      toast({ title: 'Sucesso!', description: 'Foto de perfil atualizada.' });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    if (!currentUser?.id) return;
    
    setUploadingAvatar(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setAvatarPreview(null);
      setProfileForm(prev => ({ ...prev, avatarUrl: '' }));
      await refreshProfile();
      await refreshUsers();
      
      toast({ title: 'Sucesso!', description: 'Foto de perfil removida.' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Personalize o aplicativo e gerencie seus dados na nuvem</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="whatsapp" className="border-none">
                <CardHeader className="bg-green-500/5 p-0">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">WhatsApp Bot 🚀</CardTitle>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs p-4 space-y-3">
                              <p className="font-bold text-xs uppercase text-primary">Como vincular seu WhatsApp:</p>
                              <div className="text-[10px] space-y-2">
                                <p>1. Cadastre seu número abaixo com <strong>DDI (55)</strong> e <strong>DDD</strong>. Ex: <code className="bg-muted px-1">5511999999999</code></p>
                                <p>2. Clique em <strong>Salvar Número</strong> para vincular sua conta.</p>
                                <p>3. Envie mensagens para o número oficial do robô no formato: <br/><strong className="text-foreground">"Valor Descrição"</strong></p>
                                <p className="italic text-muted-foreground">Exemplo: "50.00 Almoço" ou "2500.00 Salário"</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-6 space-y-4">
                    <div className="p-4 bg-muted/50 rounded-xl border border-dashed space-y-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Após vincular, envie mensagens como <strong className="text-foreground">"50.00 Almoço"</strong> para registrar gastos instantaneamente.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Seu Número (com DDI e DDD)</Label>
                          <Input 
                            placeholder="Ex: 5511999999999" 
                            value={profileForm.whatsapp}
                            onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})}
                            className="h-10"
                          />
                        </div>
                        <Button onClick={saveProfile} disabled={savingProfile} className="sm:mt-6 bg-green-600 hover:bg-green-700">
                          {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Número'}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <AlertTriangle className="w-3 h-3 text-warning" />
                      <span>O bot usará sua conta corrente principal por padrão.</span>
                    </div>
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          <Card className="border-none shadow-md overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="alerts" className="border-none">
                <CardHeader className="bg-primary/5 p-0">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <BellRing className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Alertas & Notificações</CardTitle>
                        <CardDescription>Configure como e quando você quer ser avisado.</CardDescription>
                      </div>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-6 space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                            <Zap className="h-5 w-5" />
                          </div>
                          <div>
                            <Label className="text-base font-bold">Limite de Gasto Diário</Label>
                            <p className="text-xs text-muted-foreground">Avisar quando os gastos do dia ultrapassarem um valor.</p>
                          </div>
                        </div>
                        <Switch 
                          checked={alertSettings.enable_spending_limit} 
                          onCheckedChange={(v) => setAlertSettings({...alertSettings, enable_spending_limit: v})} 
                        />
                      </div>
                      {alertSettings.enable_spending_limit && (
                        <div className="pl-12 animate-scale-in">
                          <div className="flex items-center gap-3 max-w-xs">
                            <span className="text-sm font-bold text-muted-foreground">R$</span>
                            <Input 
                              type="number" 
                              value={alertSettings.daily_spending_threshold} 
                              onChange={(e) => setAlertSettings({...alertSettings, daily_spending_threshold: e.target.value})}
                              placeholder="Ex: 200.00"
                              className="h-10 font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <Label className="text-base font-bold">Lembrete de Faturas</Label>
                            <p className="text-xs text-muted-foreground">Notificar antes do vencimento dos cartões.</p>
                          </div>
                        </div>
                        <Switch 
                          checked={alertSettings.invoice_reminder_alert} 
                          onCheckedChange={(v) => setAlertSettings({...alertSettings, invoice_reminder_alert: v})} 
                        />
                      </div>
                      {alertSettings.invoice_reminder_alert && (
                        <div className="pl-12 animate-scale-in">
                          <div className="flex items-center gap-3 max-w-xs">
                            <Select 
                              value={alertSettings.invoice_reminder_days} 
                              onValueChange={(v) => setAlertSettings({...alertSettings, invoice_reminder_days: v})}
                            >
                              <SelectTrigger className="h-10 font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 dia antes</SelectItem>
                                <SelectItem value="3">3 dias antes</SelectItem>
                                <SelectItem value="5">5 dias antes</SelectItem>
                                <SelectItem value="7">1 semana antes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <Label className="text-base font-bold">Resumo de Saldo</Label>
                          <p className="text-xs text-muted-foreground">Receber um relatório do seu saldo atual.</p>
                        </div>
                      </div>
                      <div className="pl-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Frequência</Label>
                          <Select 
                            value={alertSettings.balance_report_frequency} 
                            onValueChange={(v) => setAlertSettings({...alertSettings, balance_report_frequency: v})}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="off">Desativado</SelectItem>
                              <SelectItem value="daily">Diariamente</SelectItem>
                              <SelectItem value="weekly">Semanalmente (Segunda)</SelectItem>
                              <SelectItem value="monthly">Mensalmente (Dia 1)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {alertSettings.balance_report_frequency !== 'off' && (
                          <div className="space-y-1.5 animate-scale-in">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Horário</Label>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="time" 
                                value={alertSettings.balance_report_time} 
                                onChange={(e) => setAlertSettings({...alertSettings, balance_report_time: e.target.value})}
                                className="h-10"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                            <ShieldAlert className="h-5 w-5" />
                          </div>
                          <div>
                            <Label className="text-base font-bold">Alerta de Saldo Baixo</Label>
                            <p className="text-xs text-muted-foreground">Avisar quando o saldo total ficar abaixo de um valor.</p>
                          </div>
                        </div>
                        <Switch 
                          checked={alertSettings.enable_low_balance} 
                          onCheckedChange={(v) => setAlertSettings({...alertSettings, enable_low_balance: v})} 
                        />
                      </div>
                      {alertSettings.enable_low_balance && (
                        <div className="pl-12 animate-scale-in">
                          <div className="flex items-center gap-3 max-w-xs">
                            <span className="text-sm font-bold text-muted-foreground">R$</span>
                            <Input 
                              type="number" 
                              value={alertSettings.low_balance_alert_value} 
                              onChange={(e) => setAlertSettings({...alertSettings, low_balance_alert_value: e.target.value})}
                              placeholder="Ex: 100.00"
                              className="h-10 font-bold border-destructive/30"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-6">
                      <Button 
                        onClick={saveAlertSettings} 
                        disabled={savingSettings || loadingSettings}
                        className="gradient-primary w-full sm:w-auto"
                      >
                        {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Salvar Preferências
                      </Button>
                    </div>

                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          <Card className="border-none shadow-md">
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
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Smartphone className="h-4 w-4" /> Status do App</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!isStandalone ? (
                <div className="p-4 bg-warning/10 rounded-xl border border-warning/20 space-y-2">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-xs font-bold">Ação Necessária no iPhone</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Para receber notificações em tempo real, use <strong>"Adicionar à Tela de Início"</strong> no Safari.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-success/10 rounded-xl border border-success/20 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <p className="text-xs font-bold text-success">App Instalado & Pronto</p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Permissão:</span>
                <Badge variant={permission === 'granted' ? 'default' : 'outline'} className={cn(permission === 'granted' ? 'bg-success' : '')}>
                  {permission === 'granted' ? 'Ativada' : 'Pendente'}
                </Badge>
              </div>
              <Button variant="outline" className="w-full text-xs h-9" onClick={requestPermission} disabled={permission === 'granted'}>
                Solicitar Permissão
              </Button>
              <Button variant="ghost" className="w-full text-xs h-9" onClick={sendTestNotification}>
                Enviar Notificação de Teste
              </Button>
            </CardContent>
          </Card>

          {isAdmin && (
            <>
              <Card className="border-none shadow-md">
                <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Wrench className="h-4 w-4" /> Manutenção</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start text-xs h-9" onClick={handleFixDescriptions} disabled={isCleaning}>
                    {isCleaning ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />} 
                    Limpar Descrições (1/12)
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-xs h-9" onClick={handleFixAccountMonths} disabled={isFixingAccountMonths}>
                    {isFixingAccountMonths ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />} 
                    Corrigir Competência Contas
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-xs h-9" onClick={handleRecalculateInvoices} disabled={isRecalculating}>
                    {isRecalculating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />} 
                    Recalcular Faturas
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-xs h-9" onClick={handleFixDates} disabled={isFixingDates}>
                    {isFixingDates ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Calendar className="h-3 w-3 mr-2" />} 
                    Corrigir Datas Parcelas
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/20 shadow-md bg-destructive/5">
                <CardHeader><CardTitle className="text-sm font-bold text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Zona de Perigo</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start text-xs h-9 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleResetData(true)} disabled={isDeleting}>
                    Resetar Lançamentos
                  </Button>
                  <Button variant="destructive" className="w-full justify-start text-xs h-9" onClick={() => handleResetData(false)} disabled={isDeleting}>
                    Limpar Tudo na Nuvem
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

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