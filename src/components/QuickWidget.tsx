import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Calendar } from 'lucide-react';
import { useMemo } from 'react';
import { format, addMonths, differenceInDays, setDate, startOfDay, isSameMonth, isValid } from 'date-fns';

interface QuickWidgetProps {
  selectedUserId: string;
  date: Date;
}

export function QuickWidget({ selectedUserId, date }: QuickWidgetProps) {
  const { allTransactions, allBudgets, getAccountBalance, allAccounts } = useFinance();
  const { users } = useAuth();

  // Helper para formatar data com segurança
  const safeFormat = (d: Date | number, fmt: string) => {
    if (!d || !isValid(d)) return "";
    return format(d, fmt);
  };

  const calculateUserStats = (userId: string) => {
    if (!date || !isValid(date)) return null;

    const today = startOfDay(new Date());
    const isCurrentMonth = isSameMonth(date, today);
    const referenceDate = isCurrentMonth ? today : startOfDay(date);
    const monthStr = safeFormat(date, 'yyyy-MM');
    const nextMonthStr = safeFormat(addMonths(date, 1), 'yyyy-MM');

    if (!monthStr || !nextMonthStr) return null;

    const targetBudgets = allBudgets.filter(b => b.user_id === userId && b.month === monthStr);
    if (targetBudgets.length === 0) return null;

    const salary = targetBudgets.reduce((sum, b) => sum + b.income, 0);
    const savingsGoal = targetBudgets.reduce((sum, b) => sum + b.savings_goal, 0);
    const cycleEndDay = targetBudgets[0]?.cycle_end_day || 28;

    const spent = allTransactions
      .filter(t => t.userId === userId && t.effectiveMonth === nextMonthStr && t.status !== 'cancelled' && !t.description.includes('Pagamento de Fatura'))
      .reduce((sum, t) => {
        const amount = Number(t.amount) || 0;
        if (t.type === 'REFUND') return sum - amount;
        if (t.type === 'EXPENSE' || t.type === 'CREDIT') return sum + amount;
        return sum;
      }, 0);
    
    const endDate = setDate(date, cycleEndDay);
    const daysRemaining = Math.max(1, differenceInDays(startOfDay(endDate), referenceDate));
    
    const available = (salary - savingsGoal) - spent;
    const dailyLimit = available / daysRemaining;

    return { dailyLimit, available, daysRemaining, isCurrentMonth };
  };

  const familyStats = useMemo(() => {
    if (!date || !isValid(date)) return [];

    if (selectedUserId !== 'all') {
      const stats = calculateUserStats(selectedUserId);
      return stats ? [{ userId: selectedUserId, ...stats }] : [];
    }

    return users
      .filter(u => u.is_active !== false)
      .map(u => {
        const stats = calculateUserStats(u.id);
        return stats ? { userId: u.id, name: u.name, color: u.avatar_color, ...stats } : null;
      })
      .filter((s): s is any => s !== null);
  }, [selectedUserId, date, allBudgets, allTransactions, users]);

  if (familyStats.length === 0) return null;

  return (
    <Card className="bg-primary text-primary-foreground shadow-lg border-none overflow-hidden mb-6 animate-scale-in">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">
              {selectedUserId === 'all' ? 'Limites Diários da Família' : 'Meu Limite Diário'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-medium bg-white/10 px-2 py-0.5 rounded-full">
            <Calendar className="w-3 h-3" />
            {familyStats[0].daysRemaining} dias {familyStats[0].isCurrentMonth ? 'restantes' : 'no ciclo'}
          </div>
        </div>

        <div className="space-y-4">
          {familyStats.map((stat: any) => (
            <div key={stat.userId} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                {selectedUserId === 'all' && (
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white/20"
                    style={{ backgroundColor: stat.color }}
                  >
                    {stat.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  {selectedUserId === 'all' && <p className="text-[10px] font-bold opacity-60 uppercase leading-none mb-1">{stat.name}</p>}
                  <div className="flex items-baseline gap-1">
                    <h2 className={selectedUserId === 'all' ? "text-xl font-black" : "text-3xl font-black"}>
                      {formatCurrency(stat.dailyLimit)}
                    </h2>
                    <span className="text-[10px] opacity-60">/ dia</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase opacity-60 font-bold">Disponível</p>
                <p className="text-sm font-bold">{formatCurrency(stat.available)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}