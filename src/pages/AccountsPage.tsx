import React, { useState, useMemo } from 'react';
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
  ShieldAlert
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

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente', icon: Wallet, color: '#3b82f6' },
  { value: 'savings', label: 'Poupança', icon: PiggyBank, color: '#22c55e' },
  { value: 'investment', label: 'Investimentos', icon: TrendingUp, color: '#8b5cf6' },
  { value: 'wallet', label: 'Carteira', icon: Banknote, color: '#f97316' },
];

const ACCOUNT_COLORS = [
  '#3b82f6', '#22c55e', '#8b5cf6', '#f97316', 
  '#ec4899', '#14b8a6', '#eab308', '#6366f1'
];

interface AccountFormData {
  name: string;
  type: Account['account_type'];
  balance: string;
  color: string;
  userId: string;
  isShared: boolean;
}

export function AccountsPage() {
  const { currentUser, users, isCurrentUserAdmin } = useAuth();
  const { allAccounts, createAccount, updateAccount, deleteAccount, getAccountBalance } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: 'checking',
    balance: '0',
    color: ACCOUNT_COLORS[0],
    userId: currentUser?.id || '',
    isShared: true,
  });

  const activeUsers = users.filter(u => u.is_active !== false);

  // Filtro principal das contas ajustado para exclusividade
  const filteredAccounts = useMemo(() => {
    if (selectedUserId === 'all') {
      // Se "Família" estiver selecionado, mostra APENAS as contas compartilhadas
      return allAccounts.filter(a => a.is_shared === true);
    }
    
    // Se um usuário específico for selecionado, mostra APENAS as contas exclusivas dele
    return allAccounts.filter(a => 
      a.user_id === selectedUserId && a.is_shared !== true
    );
  }, [allAccounts, selectedUserId]);

  const activeAccounts = filteredAccounts.filter(a => a.active !== false);
  const archivedAccounts = filteredAccounts.filter(a => a.active === false);

  const totalBalance = activeAccounts.reduce((sum, account) => {
    return sum + getAccountBalance(account.id);
  }, 0);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'checking',
      balance: '0',
      color: ACCOUNT_COLORS[0],
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
      type: account.account_type === 'corrente' ? 'checking' : account.account_type as any,
      balance: account.opening_balance.toString(),
      color: (account as any).color || ACCOUNT_COLORS[0],
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
        type: formData.type,
        balance: parseFloat(formData.balance) || 0,
        color: formData.color,
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
      toast({ 
        title: "Erro ao salvar", 
        description: error.message || "Ocorreu um erro ao salvar a conta.", 
        variant: "destructive" 
      });
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

  const getAccountIcon = (type: Account['account_type']) => {
    const accountType = ACCOUNT_TYPES.find(t => t.value === (type === 'corrente' ? 'checking' : type));
    return accountType?.icon || Wallet;
  };

  const AccountCard = ({ account }: { account: Account }) => {
    const Icon = getAccountIcon(account.account_type);
    const balance = getAccountBalance(account.id);
    const accountColor = (account as any).color || '#3b82f6';
    
    return (
      <Card key={account.id} className="finance-card group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${accountColor}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: accountColor }} />
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
                <p className="text-xs text-muted-foreground">
                  {ACCOUNT_TYPES.find(t => t.value === (account.account_type === 'corrente' ? 'checking' : account.account_type))?.label}
                </p>
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
          <UserFilter value={selectedUserId} onChange={setSelectedUserId} className="w-[180px]" />
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
                {selectedUserId === 'all' ? 'Saldo Consolidado (Família)' : `Saldo de ${users.find(u => u.id === selectedUserId)?.name}`}
              </p>
              <p className="text-4xl font-bold text-primary-foreground mt-1">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/20 shadow-inner">
              <Wallet className="w-10 h-10 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-10">
        {/* SEÇÃO: CONTAS DA FAMÍLIA */}
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

        {/* SEÇÃO: CONTAS EXCLUSIVAS */}
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

        {activeAccounts.length === 0 && (
          <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground">Nenhuma conta encontrada para este filtro.</p>
          </div>
        )}
      </div>

      {/* DIÁLOGO DE CRIAÇÃO/EDIÇÃO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Ajustar Conta' : 'Nova Conta'}</DialogTitle>
            <DialogDescription>Configure a visibilidade e os detalhes da conta.</DialogDescription>
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
              <Label>Nome da Conta</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Nubank, Itaú..." className="rounded-xl h-11" required />
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

            <div className="space-y-2">
              <Label>Cor de Identificação</Label>
              <div className="flex gap-2 flex-wrap">
                {ACCOUNT_COLORS.map(color => (
                  <button key={color} type="button" onClick={() => setFormData({...formData, color})} className={cn("w-8 h-8 rounded-full transition-all", formData.color === color ? "ring-2 ring-offset-2 ring-primary scale-110" : "")} style={{ backgroundColor: color }} />
                ))}
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