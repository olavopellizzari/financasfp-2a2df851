import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { UserFilter } from '@/components/UserFilter';
import { Plus, Target, Pencil, Trash2, Trophy, TrendingUp, CalendarIcon, CheckCircle, Sparkles, Wallet } from 'lucide-react';
import { db, Goal, formatCurrency, generateId } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, differenceInDays, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function GoalsPage() {
  const { currentUser, isCurrentUserAdmin, users } = useAuth();
  const { accounts, allAccounts, getAccountBalance } = useFinance();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'all');
  
  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    deadline: null as Date | null,
    icon: '🎯',
    color: '#6366f1',
    userId: currentUser?.id || ''
  });

  const isAdmin = isCurrentUserAdmin();

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const data = await db.getAll<Goal>('goals');
    setGoals(data);
  };

  // Filtra as metas pelo usuário selecionado
  const filteredGoals = useMemo(() => {
    if (selectedUserId === 'all') return goals;
    return goals.filter(g => g.userId === selectedUserId);
  }, [goals, selectedUserId]);

  // Calcula o saldo real disponível para o usuário/família selecionado
  const currentBalance = useMemo(() => {
    const sourceAccounts = selectedUserId === 'all' ? allAccounts : allAccounts.filter(a => a.userId === selectedUserId);
    return sourceAccounts.filter(a => !a.isArchived).reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  }, [allAccounts, selectedUserId, getAccountBalance]);

  const totalTarget = useMemo(() => {
    return filteredGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  }, [filteredGoals]);

  const overallPercentage = totalTarget > 0 ? (currentBalance / totalTarget) * 100 : 0;

  const handleSaveGoal = async () => {
    if (!goalForm.name || !goalForm.targetAmount) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      const goal: Goal = {
        id: editingGoal?.id || generateId(),
        userId: isAdmin ? goalForm.userId : (currentUser?.id || ''),
        name: goalForm.name,
        targetAmount: parseFloat(goalForm.targetAmount),
        currentAmount: 0, // Agora o saldo é dinâmico, mas mantemos o campo por compatibilidade
        deadline: goalForm.deadline,
        icon: goalForm.icon,
        color: goalForm.color,
        isCompleted: false,
        createdAt: editingGoal?.createdAt || new Date(),
        updatedAt: new Date()
      };

      if (editingGoal) {
        await db.put('goals', goal);
        toast({ title: 'Meta atualizada!' });
      } else {
        await db.add('goals', goal);
        toast({ title: 'Meta criada!' });
      }

      setDialogOpen(false);
      resetForm();
      await loadGoals();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar meta', variant: 'destructive' });
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline ? new Date(goal.deadline) : null,
      icon: goal.icon,
      color: goal.color,
      userId: goal.userId
    });
    setDialogOpen(true);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;
    try {
      await db.delete('goals', id);
      toast({ title: 'Meta excluída!' });
      await loadGoals();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir meta', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingGoal(null);
    setGoalForm({
      name: '',
      targetAmount: '',
      deadline: null,
      icon: '🎯',
      color: '#6366f1',
      userId: currentUser?.id || ''
    });
  };

  const safeFormatDate = (date: Date | string, formatStr: string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(d)) return '';
    return format(d, formatStr, { locale: ptBR });
  };

  const icons = ['🎯', '🏠', '🚗', '✈️', '📱', '💻', '🎓', '💍', '👶', '🏖️', '🎮', '📸', '🎸', '💪', '🏆'];
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Metas & Sonhos</h1>
          <p className="text-muted-foreground">Acompanhe o progresso baseado no seu saldo real</p>
        </div>
        <div className="flex items-center gap-3">
          <UserFilter 
            value={selectedUserId} 
            onChange={setSelectedUserId} 
            className="w-[200px]"
          />
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gradient-primary shadow-primary">
            <Plus className="h-4 w-4 mr-2" />
            Nova Meta
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="gradient-primary text-primary-foreground shadow-primary border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm opacity-80">Saldo Real Disponível</p>
              <Wallet className="h-5 w-5 opacity-60" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(currentBalance)}</p>
            <p className="text-xs mt-2 opacity-70">
              {selectedUserId === 'all' ? 'Total da Família' : 'Saldo do Usuário'}
            </p>
          </CardContent>
        </Card>

        <Card className="finance-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Alvo</p>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalTarget)}</p>
            <p className="text-xs mt-2 text-muted-foreground">Soma de todas as metas</p>
          </CardContent>
        </Card>

        <Card className="finance-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Cobertura Total</p>
              <Trophy className="h-5 w-5 text-warning" />
            </div>
            <p className="text-3xl font-bold">{overallPercentage.toFixed(1)}%</p>
            <Progress value={Math.min(overallPercentage, 100)} className="h-2 mt-3" />
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredGoals.map(goal => {
          // Para metas individuais, mostramos quanto do saldo total "cobre" essa meta específica
          const percentage = goal.targetAmount > 0 ? (currentBalance / goal.targetAmount) * 100 : 0;
          const isCompleted = currentBalance >= goal.targetAmount;
          const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;

          return (
            <Card key={goal.id} className={cn("overflow-hidden group transition-all hover:shadow-md", isCompleted && "border-income/50 bg-income/5")}>
              <div className="flex items-stretch h-full">
                <div className="w-1.5" style={{ backgroundColor: goal.color }} />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${goal.color}20` }}
                      >
                        {goal.icon}
                      </div>
                      <div>
                        <h3 className="font-bold flex items-center gap-2">
                          {goal.name}
                          {isCompleted && <CheckCircle className="h-4 w-4 text-income" />}
                        </h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {goal.deadline ? `Prazo: ${safeFormatDate(goal.deadline, 'dd/MM/yy')}` : 'Sem prazo'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditGoal(goal)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteGoal(goal.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{formatCurrency(currentBalance)}</span>
                      <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className="h-2"
                      style={{ '--progress-background': goal.color } as any}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {isCompleted ? 'Meta alcançada!' : `Faltam ${formatCurrency(Math.max(0, goal.targetAmount - currentBalance))}`}
                      </span>
                      <span className="text-sm font-bold" style={{ color: goal.color }}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {filteredGoals.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma meta encontrada</h3>
              <p className="text-muted-foreground mb-4">Comece definindo seus sonhos e objetivos financeiros</p>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} variant="outline">
                Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={goalForm.userId} onValueChange={v => setGoalForm(prev => ({ ...prev, userId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome da Meta *</Label>
              <Input
                value={goalForm.name}
                onChange={(e) => setGoalForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Viagem para Europa"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Alvo *</Label>
              <Input
                type="number"
                step="0.01"
                value={goalForm.targetAmount}
                onChange={(e) => setGoalForm(prev => ({ ...prev, targetAmount: e.target.value }))}
                placeholder="10000.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Prazo (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !goalForm.deadline && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {goalForm.deadline ? format(goalForm.deadline, "dd/MM/yyyy") : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={goalForm.deadline || undefined}
                    onSelect={(date) => setGoalForm(prev => ({ ...prev, deadline: date || null }))}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {icons.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                      goalForm.icon === icon ? 'ring-2 ring-primary bg-primary/10' : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => setGoalForm(prev => ({ ...prev, icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      goalForm.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setGoalForm(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveGoal} className="gradient-primary">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}