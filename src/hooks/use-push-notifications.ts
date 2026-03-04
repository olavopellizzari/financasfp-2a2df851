import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function usePushNotifications() {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({ 
        title: "Não suportado", 
        description: "Este navegador não suporta notificações nativas.", 
        variant: "destructive" 
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeUser();
        toast({ title: "Notificações Ativadas!", description: "Você receberá alertas de vencimento." });
        return true;
      } else {
        toast({ title: "Permissão Negada", description: "Ative as notificações nas configurações do seu navegador.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Erro ao pedir permissão:", error);
    }
    return false;
  };

  const subscribeUser = async () => {
    if (!currentUser || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Salva o interesse do usuário no banco para futuras notificações via Edge Functions
      await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: currentUser.id,
          subscription: { status: 'granted', timestamp: new Date().toISOString(), platform: isStandalone ? 'pwa' : 'browser' },
          device_info: navigator.userAgent,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Erro ao salvar subscrição:', error);
    }
  };

  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Disparo local via Service Worker (funciona mesmo com a aba em background)
        // Usamos 'any' para evitar erro de compilação com a propriedade 'vibrate' que é válida no SW mas pode não estar no tipo base
        const options: any = {
          body: 'Teste de notificação concluído com sucesso! Seus alertas estão ativos.',
          icon: '/app-icon.svg',
          badge: '/app-icon.svg',
          tag: 'test-notification',
          vibrate: [200, 100, 200],
          data: { url: '/' }
        };

        registration.showNotification('Finanças 🚀', options);
        
        toast({ title: "Comando enviado!", description: "Verifique sua central de notificações." });
      } catch (error) {
        // Fallback para notificação simples se o SW falhar
        new Notification('Finanças 🚀', { body: 'As notificações estão funcionando!' });
      }
    }
  };

  return { permission, isStandalone, requestPermission, sendTestNotification };
}