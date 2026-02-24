import React, { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, Account, User } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserFilter } from '@/components/UserFilter';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

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
  type: Account['type'];
  balance: string;
  color: string;
  userId: string;
  isShared: boolean;
}

export function AccountsPage() {
  const { currentUser, users, isCurrentUserAdmin } = useAuth();
  const { accounts, allAccounts, createAccount, updateAccount, deleteAccount, getAccountBalance } = useFinance();
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
    isShared: false,
  });

  const isAdmin = isCurrentUserAdmin();
  const activeUsers = users.filter(u => u.is_active !== false);

  const filteredAccounts = useMemo(() => {
    const sourceAccounts = isAdmin ? allAccounts : accounts;
    
    if (selectedUserId === 'all') {
      return sourceAccounts;
    }
    
    return sourceAccounts.filter(a => 
      a.userId === selectedUserId || a.isShared
    );
  }, [accounts, allAccounts, selectedUserId, isAdmin]);

  const activeAccounts = filteredAccounts.filter(a => !a.isArchived);
  const archivedAccounts = filteredAccounts.filter(a => a.isArchived);

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
      isShared: false,
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
      type: account.type,
      balance: account.opening_balance.toString(),
      color: account.color || ACCOUNT_COLORS[0],
      userId: account.user_id || currentUser?.id || '',
      isShared: account.is_shared || false,
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
        userId: formData.userId,
        isShared: formData.isShared,
      };

      if (editingAccount) {
        await updateAccount(editingAccount.id, accountData);
        toast({ title: "Sucesso", description: "Conta atualizada com sucesso!" });
      } else {
        await createAccount(accountData);
        toast({ title: "Sucesso", description: "Conta criada com sucesso!" });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      toast({ 
        title: "Erro ao salvar", 
        description: error.message || "Ocorreu um erro inesperado.", 
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
      await updateAccount(account.id, { isArchived: !account.active });
      toast({ title: account.active ? "Conta arquivada" : "Conta restaurada" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const getAccountIcon = (type: Account['account_type']) => {
    const accountType = ACCOUNT_TYPES.find(t => t.value === (type === 'corrente' ? 'checking' : type));
    return accountType?.icon || Wallet;
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'Família';
    const user = users.find(u => u.id === userId);
    return user?.name || 'Desconhecido';
  };

  const AccountCard = ({ account }: { account: Account }) => {
    const Icon = getAccountIcon(account.account_type);
    const balance = getAccountBalance(account.id);
    
    return (
      <Card key={account.id} className="finance-card group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${account.color || '#3b82f6'}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: account.color || '#3b82f6' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{account.name}</p>
                  {account.is_shared && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      <Users className="w-3 h-3 mr-1" />
                      Compartilhada
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{ACCOUNT_TYPES.find(t => t.value === (account.account_type === 'corrente' ? 'checking' : account.account_type))?.label}</span>
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(account)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleArchive(account)}>
                  <Archive className="w-4 h-4 mr-2" />
                  {account.active ? 'Arquivar' : 'Restaurar'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDelete(account.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4">
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-foreground' : 'text-expense'}`}>
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
          <h1 className="text-2xl font-bold text-foreground">Contas</h1>
          <p className="text-muted-foreground">Gerencie suas contas bancárias e carteiras</p>
        </div>
        <div className="flex items-center gap-3">
          <UserFilter
            value={selectedUserId}
            onChange={setSelectedUserId}
            className="w-[180px]"
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="gradient-primary shadow-primary">
                <Plus className="w-4 h-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
                <DialogDescription>
                  {editingAccount ? 'Atualize os dados da conta' : 'Adicione uma nova conta para controlar'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Conta</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Nubank, Itaú, Carteira"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Conta</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: Account['account_type']) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" style={{ color: type.color }} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="balance">Saldo Inicial</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {ACCOUNT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingAccount ? 'Salvar' : 'Criar Conta'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="finance-card-gradient">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium">
                Saldo Total {selectedUserId !== 'all' && `(${getUserName(selectedUserId)})`}
              </p>
              <p className="text-3xl font-bold text-primary-foreground mt-1">
                {formatCurrency(totalBalance)}
              </p>
              <p className="text-primary-foreground/60 text-sm mt-1">
                {activeAccounts.length} conta{activeAccounts.length !== 1 ? 's' : ''} ativa{activeAccounts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-primary-foreground/20">
              <Wallet className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {selectedUserId === 'all' ? (
          <>
            {activeAccounts.some(a => a.is_shared) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">Contas Compartilhadas</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeAccounts.filter(a => a.is_shared).map(account => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </div>
              </div>
            )}

            {activeUsers.map(user => {
              const userAccounts = activeAccounts.filter(a => a.user_id === user.id && !a.is_shared);
              if (userAccounts.length === 0) return null;

              return (
                <div key={user.id} className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: user.avatar_color }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-lg font-bold">Contas de {user.name}</h2>
                    <Badge variant="outline" className="ml-2 font-normal">
                      {formatCurrency(userAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0))}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userAccounts.map(account => (
                      <AccountCard key={account.id} account={account} />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}

        {activeAccounts.length === 0 && (
          <Card className="finance-card">
            <CardContent className="p-8 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhuma conta cadastrada</p>
              <p className="text-sm text-muted-foreground">Clique em "Nova Conta" para adicionar</p>
            </CardContent>
          </Card>
        )}
      </div>

      {archivedAccounts.length > 0 && (
        <div className="space-y-4 pt-8 border-t">
          <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Contas Arquivadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedAccounts.map((account) => {
              const Icon = getAccountIcon(account.account_type);
              const balance = getAccountBalance(account.id);
              
              return (
                <Card key={account.id} className="finance-card opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-muted">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">{account.name}</p>
                          <p className="text-sm text-muted-foreground/80">
                            De {getUserName(account.user_id)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleArchive(account)}
                      >
                        Restaurar
                      </Button>
                    </div>
                    <p className="mt-4 text-xl font-bold text-muted-foreground">
                      {formatCurrency(balance)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}