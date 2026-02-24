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
  Trash2
} from 'lucide-react';
import { db, Notification, Debt, Card as CardType, formatCurrency, generateId } from '@/lib/db';
import { addDays, isBefore, isAfter, differenceInDays, format, setDate, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NotificationsPanel() {
  const { currentUser } = useAuth();
  const { cards, invoices } = useFinance();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      generateNotifications();
    }
  }, [currentUser?.id, cards, invoices]);

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

    const today = new Date();
    const in3Days = addDays(today, 3);
    const existingNotifications = await db.getAll<Notification>('notifications');
    const newNotifications: Notification[] = [];

    // Card due date notifications (3 days before)
    for (const card of cards) {
      const currentMonth = format(today, 'yyyy-MM');
      const monthDate = parse(currentMonth, 'yyyy-MM', new Date());
      
      let dueDate = setDate(monthDate, card.dueDay);
      if (isBefore(dueDate, today)) {
        dueDate = addDays(dueDate, 30); // Next month
      }

      const daysUntilDue = differenceInDays(dueDate, today);
      
      if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        const notificationId = `card_due_${card.id}_${format(dueDate, 'yyyy-MM-dd')}`;
        const exists = existingNotifications.some(n => n.id === notificationId);
        
        if (!exists) {
          const invoice = invoices.find(i => i.cardId === card.id && i.month === currentMonth);
          const amount = invoice?.totalAmount || 0;

          newNotifications.push({
            id: notificationId,
            userId: currentUser.id,
            type: 'card_due',
            title: `Fatura ${card.name} vence em ${daysUntilDue} dias`,
            message: amount > 0 ? `Valor: ${formatCurrency(amount)}` : 'Sem fatura registrada',
            entityType: 'card',
            entityId: card.id,
            dueDate,
            isRead: false,
            createdAt: new Date()
          });
        }
      }
    }

    // Debt due notifications
    const debts = await db.getAll<Debt>('debts');
    for (const debt of debts.filter(d => d.userId === currentUser.id && d.isActive)) {
      const daysUntilDue = differenceInDays(new Date(debt.dueDate), today);
      
      if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        const notificationId = `debt_due_${debt.id}_${format(new Date(debt.dueDate), 'yyyy-MM-dd')}`;
        const exists = existingNotifications.some(n => n.id === notificationId);
        
        if (!exists) {
          newNotifications.push({
            id: notificationId,
            userId: currentUser.id,
            type: 'debt_due',
            title: `Dívida "${debt.name}" vence em ${daysUntilDue} dias`,
            message: `Parcela: ${formatCurrency(debt.monthlyPayment)}`,
            entityType: 'debt',
            entityId: debt.id,
            dueDate: new Date(debt.dueDate),
            isRead: false,
            createdAt: new Date()
          });
        }
      }
    }

    // Save new notifications
    for (const notification of newNotifications) {
      await db.add('notifications', notification);
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
        return <CreditCard className="h-4 w-4 text-credit" />;
      case 'debt_due':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'recurring':
        return <Calendar className="h-4 w-4 text-primary" />;
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
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Ler todas
              </Button>
            </div>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${!notification.isRead ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.createdAt), "dd/MM 'às' HH:mm")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.isRead && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
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
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-destructive hover:text-destructive"
              onClick={handleClearAll}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar todas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
