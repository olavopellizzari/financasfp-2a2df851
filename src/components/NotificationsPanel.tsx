import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CreditCard, 
  AlertTriangle, 
  Calendar,
  Check,
  Trash2,
  Zap,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { db, Notification, Debt, formatCurrency, generateId } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { addDays, isBefore, differenceInDays, format, setDate, parse, addMonths, isSameDay, startOfDay, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

export function NotificationsPanel() {
  const { currentUser } = useAuth();
  const { cards, invoices, allTransactions, allAccounts, getAccountBalance } = useFinance();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      generateNotifications();
    }
  }, [currentUser?.id, cards, invoices, allTransactions]);

  const loadNotifications = async () => {
    if (!currentUser) return;
    const allNotifications = await db.getAll<Notification>('notifications');
    const userNotifications = allNotifications
      .filter(n => n.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setNotifications(userNotifications);
  };

  const generateNotifications = async () => {
    if (!currentUser) return;

    const today = startOfDay(new Date());
    const now = new Date();
    const existingNotifications = await db.getAll<Notification>('notifications');
    const newNotifications: Notification[] = [];

    // 1. Notificações de Vencimento de Cartão (3 dias antes)
    for (const card of cards) {
      const currentMonth = format(today, 'yyyy-MM');
      const monthDate = parse(currentMonth, 'yyyy-MM', new Date());
      
      let dueDate = setDate(monthDate, card.due_day);
      if (isBefore(dueDate, today)) {
        dueDate = addMonths(dueDate, 1);
      }

      const daysUntilDue = differenceInDays(dueDate, today);
      
      if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        const notificationId = `card_due_${card.id}_${format(dueDate, 'yyyy-MM-dd')}`;
        const exists = existingNotifications.some(n => n.id === notificationId);
        
        if (!exists) {
          const invoice = invoices.find(i => i.card_id === card.id && i.month === format(dueDate, 'yyyy-MM'));
          const amount = invoice?.total_amount || 0;

          newNotifications.push({
            id: notificationId,
            userId: currentUser.id,
            type: 'card_due',
            title: `Fatura ${card.name} vence em ${daysUntilDue === 0 ? 'hoje' : daysUntilDue + ' dias'}`,
            message: amount > 0 ? `Valor aproximado: ${formatCurrency(amount)}` : 'Verifique os lançamentos do mês.',
            entityType: 'card',
            entityId: card.id,
            dueDate,
            isRead: false,
            createdAt: new Date()
          });
        }
      }
    }

    // 2. Notificações de Dívidas
    const debts = await db.getAll<Debt>('debts');
    for (const debt of debts.filter(d => (d.user_id === currentUser.id || !d.user_id) && d.is_active)) {
      const debtDueDate = parse(debt.due_date, 'yyyy-MM-dd', new Date());
      const daysUntilDue = differenceInDays(debtDueDate, today);
      
      if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        const notificationId = `debt_due_${debt.id}_${debt.due_date}`;
        const exists = existingNotifications.some(n => n.id === notificationId);
        
        if (!exists) {
          newNotifications.push({
            id: notificationId,
            userId: currentUser.id,
            type: 'debt_due',
            title: `Dívida "${debt.name}" vence em ${daysUntilDue === 0 ? 'hoje' : daysUntilDue + ' dias'}`,
            message: `Valor da parcela: ${formatCurrency(debt.monthly_payment)}`,
            entityType: 'debt',
            entityId: debt.id,
            dueDate: debtDueDate,
            isRead: false,
            createdAt: new Date()
          });
        }
      }
    }

    // 3. Alerta de Limite de Gasto Diário e Resumo de Saldo
    try {
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (settings) {
        // Limite Diário
        if (settings.enable_spending_limit && settings.daily_spending_threshold > 0) {
          const todayTxs = allTransactions.filter(t => 
            t.userId === currentUser.id && 
            isSameDay(parse(t.purchaseDate, 'yyyy-MM-dd', new Date()), today) &&
            (t.type === 'EXPENSE' || t.type === 'CREDIT')
          );
          
          const totalToday = todayTxs.reduce((sum, t) => sum + t.amount, 0);
          
          if (totalToday > settings.daily_spending_threshold) {
            const notificationId = `limit_reached_${format(today, 'yyyy-MM-dd')}`;
            if (!existingNotifications.some(n => n.id === notificationId)) {
              newNotifications.push({
                id: notificationId,
                userId: currentUser.id,
                type: 'limit_reached',
                title: `Limite diário atingido! ⚠️`,
                message: `Você gastou ${formatCurrency(totalToday)} hoje. Seu limite é ${formatCurrency(settings.daily_spending_threshold)}.`,
                entityType: 'system',
                entityId: 'limit',
                isRead: false,
                createdAt: new Date()
              });
            }
          }
        }

        // Resumo de Saldo (Triggered on App Open if time passed)
        if (settings.balance_report_frequency !== 'off') {
          const [hour, minute] = settings.balance_report_time.split(':').map(Number);
          const reportTime = new Date();
          reportTime.setHours(hour, minute, 0, 0);

          if (isAfter(now, reportTime)) {
            const notificationId = `balance_summary_${format(today, 'yyyy-MM-dd')}`;
            if (!existingNotifications.some(n => n.id === notificationId)) {
              const totalBalance = allAccounts
                .filter(a => (a.user_id === currentUser.id || a.is_shared) && a.active !== false && !a.exclude_from_totals)
                .reduce((sum, a) => sum + getAccountBalance(a.id), 0);

              newNotifications.push({
                id: notificationId,
                userId: currentUser.id,
                type: 'balance_summary',
                title: `Resumo de Saldo do Dia 💰`,
                message: `Seu saldo total disponível hoje é ${formatCurrency(totalBalance)}.`,
                entityType: 'system',
                entityId: 'balance',
                isRead: false,
                createdAt: new Date()
              });
            }
          }
        }
      }
    } catch (e) {
      // Silencioso
    }

    // Salvar novas notificações
    for (const notification of newNotifications) {
      await db.add('notifications', notification);
      
      // Se estiver no PWA, tenta disparar o push nativo também
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(notification.title, {
          body: notification.message,
          icon: '/app-icon.svg',
          badge: '/app-icon.svg',
          tag: notification.id
        });
      }
    }

    if (newNotifications.length > 0) {
      await loadNotifications();
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const handleMarkAsRead = async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      await db.put('notifications', { ...notification, isRead: true });
      await loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    for (const notification of notifications.filter(n => !n.isRead)) {
      await db.put('notifications', { ...notification, isRead: true });
    }
    await loadNotifications();
  };

  const handleDelete = async (id: string) => {
    await db.delete('notifications', id);
    await loadNotifications();
  };

  const handleClearAll = async () => {
    for (const notification of notifications) {
      await db.delete('notifications', notification.id);
    }
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'card_due':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case 'debt_due':
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      case 'limit_reached':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'balance_summary':
        return <Wallet className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive border-2 border-background"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-sm">Notificações</h3>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-7 text-[10px] uppercase font-bold">
              Ler todas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors relative group",
                    !notification.isRead ? 'bg-primary/5' : ''
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-tight", !notification.isRead ? 'font-bold' : 'font-medium')}>
                        {notification.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 mt-2 uppercase font-bold">
                        {format(new Date(notification.createdAt), "dd/MM 'às' HH:mm")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.isRead && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full text-destructive"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Nenhum alerta no momento</p>
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t bg-muted/20">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-[10px] uppercase font-bold text-destructive hover:bg-destructive/10"
              onClick={handleClearAll}
            >
              Limpar Histórico
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}