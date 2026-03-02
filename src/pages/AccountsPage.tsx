import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, Account } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserFilter } from '@/components/UserFilter';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Wallet, 
  PiggyBank, 
  TrendingUp, 
  Banknote,
  MoreVertical,
  Pencil,
  Trash2,
  Archive,
  Users,
  User as UserIcon,
  Loader2,
  ShieldCheck,
  Building2,
  LayoutGrid,
  EyeOff,
  Lock,
  Eye,
  Info
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const BANKS = [
  { id: 'nubank', name: 'NuBank', color: '#8a05be', logo: 'https://unavatar.io/nubank.com.br' },
  { id: 'itau', name: 'Itaú', color: '#ec7000', logo: 'https://unavatar.io/itau.com.br' },
  { id: 'bradesco', name: 'Bradesco', color: '#cc092f', logo: 'https://unavatar.io/bradesco.com.br' },
  { id: 'santander', name: 'Santander', color: '#ec0000', logo: 'https://unavatar.io/santander.com.br' },
  { id: 'bb', name: 'Banco do Brasil', color: '#fcf800', logo: 'https://unavatar.io/bb.com.br' },
  { id: 'caixa', name: 'Caixa Econômica', color: '#005ca9', logo: 'https://unavatar.io/caixa.gov.br' },
  { id: 'inter', name: 'Banco Inter', color: '#ff7a00', logo: 'https://unavatar.io/inter.co' },
  { id: 'c6', name: 'C6 Bank', color: '#212121', logo: 'https://unavatar.io/c6bank.com.br' },
  { id: 'sicredi', name: 'Sicredi', color: '#3fb149', logo: 'https://unavatar.io/sicredi.com.br' },
  { id: 'xp', name: 'XP Investimentos', color: '#000000', logo: 'https://unavatar.io/xp.com.br' },
  { id: 'btg', name: 'BTG Pactual', color: '#003399', logo: 'https://unavatar.io/btgpactual.com' },
  { id: 'mercado-pago', name: 'Mercado Pago', color: '#00beef', logo: 'https://unavatar.io/mercadopago.com.br' },
  { id: 'outro', name: 'Outro Banco', color: '#64748b', logo: '' },
];

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente', icon: Wallet },
  { value: 'savings', label: 'Poupança', icon: PiggyBank },
  { value: 'investment', label: 'Investimentos', icon: TrendingUp },
  { value: 'wallet', label: 'Carteira', icon: Banknote },
];

interface AccountFormData {
  name: string;
  bank: string;
  type: string;
  balance: string;
  userId: string;
  privacyMode: 'shared' | 'exclusive' | 'private';
  excludeFromTotals: boolean;
}

export function AccountsPage() {
  const { currentUser, users } = useAuth();
  const { accounts, createAccount, updateAccount, deleteAccount, getAccountBalance } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'total');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (currentUser?.id && selectedUserId === 'total') {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser?.id]);

  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    bank: 'nubank',
    type: 'checking',
    balance: '0',
    userId: currentUser?.id || '',
    privacyMode: 'shared',
    excludeFromTotals: false,
  });

  const activeUsers = users.filter(u => u.is_active !== false);

  const filteredAccounts = useMemo(() => {
    if (selectedUserId === 'total') return accounts;
    if (selectedUserId === 'all') return accounts.filter(a => a.is_shared && !a.user_id);
    return accounts.filter(a => a.user_id === selectedUserId);
  }, [accounts, selectedUserId]);

  const activeAccounts = filteredAccounts.filter(a => a.active !== false);

  const totalBalance = activeAccounts.reduce((sum, account) => {
    if (account.exclude_from_totals) return sum;
    return sum + getAccountBalance(account.id);
  }, 0);

  const resetForm = () => {
    setFormData({
      name: '',
      bank: 'nubank',
      type: 'checking',
      balance: '0',
      userId: currentUser?.id || '',
      privacyMode: 'shared',
      excludeFromTotals: false,
    });
    setEditingAccount(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    
    let privacyMode: 'shared' | 'exclusive' | 'private' = 'shared';
    if (!account.is_shared) privacyMode = 'private';
    else if (account.user_id) privacyMode = 'exclusive';

    setFormData({
      name: account.name,
      bank: account.bank || 'outro',
      type: account.account_type === 'corrente' ? 'checking' : account.account_type as any,
      balance: account.opening_balance.toString(),
      userId: account.user_id || currentUser?.id || '',
      privacyMode,
      excludeFromTotals: account.exclude_from_totals || false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const finalUserId = formData.privacyMode === 'shared' ? null : (formData.userId || currentUser?.id);
      const isShared = formData.privacyMode !== 'private';

      const accountData = {
        name: formData.name,
        bank: formData.bank,
        type: formData.type,
        balance: parseFloat(formData.balance) || 0,
        userId: finalUserId,
        isShared: isShared,
        excludeFromTotals: formData.excludeFromTotals,
      };

      if (editingAccount) {
        await updateAccount(editingAccount.id, accountData);
        toast({ title: "Sucesso", description: "Conta atualizada!" });
      } else {
        await createAccount(accountData);
        toast({ title: "Sucesso", description: "Conta criada!" });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      try {
        await deleteAccount(id);
        toast({ title: "Sucesso", description: "Conta excluída!" });
      } catch (error: any) {
        toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      }
    }
  };

  const handleArchive = async (account: Account) => {
    try {
      await updateAccount(account.id, { isArchived: account.active });
      toast({ title: account.active ? "Conta arquivada" : "Conta restaurada" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const AccountCard = ({ account }: { account: Account }) => {
    const balance = getAccountBalance(account.id);
    const bankInfo = BANKS.find(b => b.id === account.bank) || BANKS.find(b => b.id === 'outro')!;
    const [imgError, setImgError] = useState(false);
    
    return (
      <Card key={account.id} className={cn("finance-card group relative overflow-hidden", account.exclude_from_totals && "border-dashed opacity-80")}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Logo Container - Agora sem fundo branco e com filtro de brilho/inversão */}
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                {bankInfo.logo && !imgError ? (
                  <img 
                    src={bankInfo.logo} 
                    alt={bankInfo.name} 
                    className="w-10 h-10 object-contain transition-all duration-300 filter brightness-0 invert opacity-70 group-hover:opacity-100" 
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground truncate">{account.name}</p>
                  {account.exclude_from_totals && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-dashed uppercase font-black">
                      Oculto
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium">{bankInfo.name}</p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => openEditDialog(account)}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleArchive(account)}>
                  <Archive className="w-4 h-4 mr-2" /> {account.active ? 'Arquivar' : 'Restaurar'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(account.id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saldo Disponível</p>
              <p className={cn("text-2xl font-black tracking-tight", balance < 0 ? "text-expense" : "text-foreground")}>
                {formatCurrency(balance)}
              </p>
            </div>
            <div className="flex items-center gap-2 pb-1">
              {!account.is_shared ? (
                <div className="p-1.5 rounded-lg bg-destructive/10" title="Privada">
                  <Lock className="w-3.5 h-3.5 text-destructive" />
                </div>
              ) : account.user_id ? (
                <div className="p-1.5 rounded-lg bg-orange-500/10" title="Exclusiva">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-primary/10" title="Compartilhada">
                  <Users className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contas</h1>
          <p className="text-muted-foreground">Gestão de saldos da família e individuais</p>
        </div>
        <div className="flex items-center gap-3">
          <UserFilter 
            value={selectedUserId} 
            onChange={setSelectedUserId} 
            showTotalOption={true}
            className="w-[200px]" 
          />
          <Button onClick={openCreateDialog} className="gradient-primary shadow-primary">
            <Plus className="w-4 h-4 mr-2" /> Nova Conta
          </Button>
        </div>
      </div>

      <Card className="finance-card-gradient relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest">
                {selectedUserId === 'total' ? 'Saldo Total Consolidado' : 
                 selectedUserId === 'all' ? 'Saldo das Contas da Família' :
                 `Saldo de ${users.find(u => u.id === selectedUserId)?.name}`}
              </p>
              <p className="text-5xl font-black text-primary-foreground mt-2 tracking-tighter">{formatCurrency(totalBalance)}</p>
              {activeAccounts.some(a => a.exclude_from_totals) && (
                <p className="text-[10px] text-primary-foreground/60 mt-4 flex items-center gap-1 font-medium">
                  <Info className="w-3 h-3" /> Algumas contas estão excluídas deste total.
                </p>
              )}
            </div>
            <div className="hidden sm:flex p-5 rounded-[24px] bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
              {selectedUserId === 'total' || selectedUserId === 'all' ? <LayoutGrid className="w-12 h-12 text-white" /> : <Wallet className="w-12 h-12 text-white" />}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-12">
        {activeAccounts.some(a => a.is_shared && !a.user_id) && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Contas da Família</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeAccounts.filter(a => a.is_shared && !a.user_id).map(account => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </div>
        )}

        {activeAccounts.some(a => a.user_id) && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 bg-orange-500/10 rounded-xl">
                <UserIcon className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Contas Individuais</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeAccounts.filter(a => a.user_id).map(account => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">{editingAccount ? 'Ajustar Conta' : 'Nova Conta'}</DialogTitle>
              <DialogDescription className="text-white/70">Configure o banco e os detalhes da conta.</DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-card">
            
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Privacidade e Acesso</Label>
              <RadioGroup 
                value={formData.privacyMode} 
                onValueChange={(v: any) => setFormData({...formData, privacyMode: v})}
                className="grid grid-cols-1 gap-2"
              >
                <Label 
                  htmlFor="shared"
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                    formData.privacyMode === 'shared' ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                  )}
                >
                  <RadioGroupItem value="shared" id="shared" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-bold flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-primary" /> Compartilhada
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Todos os membros da família podem ver e realizar lançamentos.</p>
                  </div>
                </Label>

                <Label 
                  htmlFor="exclusive"
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                    formData.privacyMode === 'exclusive' ? "border-orange-500 bg-orange-50" : "border-border hover:border-border/80"
                  )}
                >
                  <RadioGroupItem value="exclusive" id="exclusive" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-bold flex items-center gap-2 text-sm">
                      <ShieldCheck className="w-4 h-4 text-orange-500" /> Exclusiva
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Todos podem ver o saldo, mas apenas o dono pode realizar lançamentos.</p>
                  </div>
                </Label>

                <Label 
                  htmlFor="private"
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                    formData.privacyMode === 'private' ? "border-destructive bg-destructive/5" : "border-border hover:border-border/80"
                  )}
                >
                  <RadioGroupItem value="private" id="private" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-bold flex items-center gap-2 text-sm">
                      <EyeOff className="w-4 h-4 text-destructive" /> Privada
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Totalmente invisível para os outros membros da família.</p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            {formData.privacyMode !== 'shared' && (
              <div className="space-y-2 animate-scale-in">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dono da Conta</Label>
                <Select value={formData.userId} onValueChange={v => setFormData({...formData, userId: v})}>
                  <SelectTrigger className="rounded-xl h-12 border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border-2 border-dashed">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-muted-foreground" /> Excluir dos Totais
                </Label>
                <p className="text-[10px] text-muted-foreground">O saldo desta conta não será somado ao saldo geral.</p>
              </div>
              <Switch 
                checked={formData.excludeFromTotals} 
                onCheckedChange={(v) => setFormData({...formData, excludeFromTotals: v})} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Banco</Label>
              <Select value={formData.bank} onValueChange={v => setFormData({...formData, bank: v})}>
                <SelectTrigger className="rounded-xl h-12 border-2">
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map(bank => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center overflow-hidden shrink-0">
                          {bank.logo ? (
                            <img src={bank.logo} alt="" className="w-5 h-5 object-contain filter brightness-0 invert opacity-70" />
                          ) : (
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium">{bank.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome da Conta</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Minha Conta Principal" className="rounded-xl h-12 border-2 font-medium" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData({...formData, type: v})}>
                  <SelectTrigger className="rounded-xl h-12 border-2 font-medium"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Saldo Inicial</Label>
                <Input type="number" step="0.01" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="rounded-xl h-12 border-2 font-bold" />
              </div>
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-12 rounded-xl font-bold">Cancelar</Button>
              <Button type="submit" className="flex-1 h-12 rounded-xl gradient-primary font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingAccount ? 'Salvar' : 'Criar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}