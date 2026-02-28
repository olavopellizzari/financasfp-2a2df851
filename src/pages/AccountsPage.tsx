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
  ShieldAlert,
  Building2,
  LayoutGrid
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

const BANKS = [
  { id: 'nubank', name: 'NuBank', color: '#8a05be', logo: 'https://logodownload.org/wp-content/uploads/2019/08/nubank-logo-3.png' },
  { id: 'itau', name: 'Itaú', color: '#ec7000', logo: 'https://logodownload.org/wp-content/uploads/2014/05/itau-logo-7.png' },
  { id: 'bradesco', name: 'Bradesco', color: '#cc092f', logo: 'https://logodownload.org/wp-content/uploads/2014/05/bradesco-logo-9.png' },
  { id: 'santander', name: 'Santander', color: '#ec0000', logo: 'https://logodownload.org/wp-content/uploads/2014/05/santander-logo-7.png' },
  { id: 'bb', name: 'Banco do Brasil', color: '#fcf800', logo: 'https://logodownload.org/wp-content/uploads/2014/05/banco-do-brasil-logo-1.png' },
  { id: 'caixa', name: 'Caixa Econômica', color: '#005ca9', logo: 'https://logodownload.org/wp-content/uploads/2014/05/caixa-logo-7.png' },
  { id: 'inter', name: 'Banco Inter', color: '#ff7a00', logo: 'https://logodownload.org/wp-content/uploads/2018/03/banco-inter-logo-5.png' },
  { id: 'c6', name: 'C6 Bank', color: '#212121', logo: 'https://logodownload.org/wp-content/uploads/2019/09/c6-bank-logo-1.png' },
  { id: 'sicredi', name: 'Sicredi', color: '#3fb149', logo: 'https://logodownload.org/wp-content/uploads/2017/11/sicredi-logo-1.png' },
  { id: 'xp', name: 'XP Investimentos', color: '#000000', logo: 'https://logodownload.org/wp-content/uploads/2018/01/xp-investimentos-logo-1.png' },
  { id: 'btg', name: 'BTG Pactual', color: '#003399', logo: 'https://logodownload.org/wp-content/uploads/2019/09/btg-pactual-logo-1.png' },
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
  isShared: boolean;
}

export function AccountsPage() {
  const { currentUser, users } = useAuth();
  const { allAccounts, createAccount, updateAccount, deleteAccount, getAccountBalance } = useFinance();
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
    isShared: true,
  });

  const activeUsers = users.filter(u => u.is_active !== false);

  const filteredAccounts = useMemo(() => {
    if (selectedUserId === 'total' || selectedUserId === 'all') {
      return allAccounts.filter(a => a.is_shared);
    }
    return allAccounts.filter(a => a.user_id === selectedUserId);
  }, [allAccounts, selectedUserId]);

  const activeAccounts = filteredAccounts.filter(a => a.active !== false);

  const totalBalance = activeAccounts.reduce((sum, account) => {
    return sum + getAccountBalance(account.id);
  }, 0);

  const resetForm = () => {
    setFormData({
      name: '',
      bank: 'nubank',
      type: 'checking',
      balance: '0',
      userId: currentUser?.id || '',
      isShared: true,
    });
    setEditingAccount(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      bank: account.bank || 'outro',
      type: account.account_type === 'corrente' ? 'checking' : account.account_type as any,
      balance: account.opening_balance.toString(),
      userId: account.user_id || currentUser?.id || '',
      isShared: account.is_shared ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const accountData = {
        name: formData.name,
        bank: formData.bank,
        type: formData.type,
        balance: parseFloat(formData.balance) || 0,
        userId: formData.isShared ? null : formData.userId,
        isShared: formData.isShared,
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
    
    return (
      <Card key={account.id} className="finance-card group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden border">
                {bankInfo.logo ? (
                  <img src={bankInfo.logo} alt={bankInfo.name} className="w-8 h-8 object-contain" />
                ) : (
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{account.name}</p>
                  {account.is_shared ? (
                    <Badge variant="secondary" className="text-[10px] h-5 bg-primary/10 text-primary border-none">
                      <Users className="w-3 h-3 mr-1" /> Família
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-5">
                      <UserIcon className="w-3 h-3 mr-1" /> Exclusiva
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{bankInfo.name}</p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(account)}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleArchive(account)}>
                  <Archive className="w-4 h-4 mr-2" /> {account.active ? 'Arquivar' : 'Restaurar'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(account.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4">
            <p className={cn("text-2xl font-bold", balance < 0 && "text-expense")}>
              {formatCurrency(balance)}
            </p>
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

      <Card className="finance-card-gradient">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium">
                {selectedUserId === 'total' || selectedUserId === 'all' ? 'Saldo Total Consolidado' : 
                 `Saldo de ${users.find(u => u.id === selectedUserId)?.name}`}
              </p>
              <p className="text-4xl font-bold text-primary-foreground mt-1">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/20 shadow-inner">
              {selectedUserId === 'total' || selectedUserId === 'all' ? <LayoutGrid className="w-10 h-10 text-white" /> : <Wallet className="w-10 h-10 text-white" />}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-10">
        {activeAccounts.some(a => a.is_shared) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Contas da Família</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAccounts.filter(a => a.is_shared).map(account => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </div>
        )}

        {activeAccounts.some(a => !a.is_shared) && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <div className="p-1.5 bg-orange-100 rounded-lg">
                <UserIcon className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold">Contas Exclusivas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAccounts.filter(a => !a.is_shared).map(account => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Ajustar Conta' : 'Nova Conta'}</DialogTitle>
            <DialogDescription>Configure o banco e os detalhes da conta.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-dashed">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  {formData.isShared ? <ShieldCheck className="w-4 h-4 text-primary" /> : <ShieldAlert className="w-4 h-4 text-orange-500" />}
                  Conta da Família?
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  {formData.isShared ? 'Todos os membros podem ver e lançar nesta conta.' : 'Apenas o dono da conta terá acesso aos dados.'}
                </p>
              </div>
              <Switch checked={formData.isShared} onCheckedChange={v => setFormData({...formData, isShared: v})} />
            </div>

            {!formData.isShared && (
              <div className="space-y-2 animate-scale-in">
                <Label>Dono da Conta</Label>
                <Select value={formData.userId} onValueChange={v => setFormData({...formData, userId: v})}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Banco</Label>
              <Select value={formData.bank} onValueChange={v => setFormData({...formData, bank: v})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map(bank => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        {bank.logo ? (
                          <img src={bank.logo} alt="" className="w-4 h-4 object-contain" />
                        ) : (
                          <Building2 className="w-4 h-4" />
                        )}
                        {bank.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome da Conta (Apelido)</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Minha Conta Principal" className="rounded-xl h-11" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData({...formData, type: v})}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <Input type="number" step="0.01" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="rounded-xl h-11" />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-11 rounded-xl">Cancelar</Button>
              <Button type="submit" className="flex-1 h-11 rounded-xl gradient-primary" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingAccount ? 'Salvar Alterações' : 'Criar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}