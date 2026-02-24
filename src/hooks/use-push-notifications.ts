import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function usePushNotifications() {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Verifica se o app está rodando em modo "Standalone" (instalado na tela de início)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({ 
        title: "Não suportado", 
        description: "Este navegador não suporta notificações. No iPhone, use 'Adicionar à Tela de Início'.", 
        variant: "destructive" 
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeUser();
        toast({ title: "Permissão concedida!", description: "Agora você pode receber alertas." });
        return true;
      } else {
        toast({ title: "Permissão negada", description: "Você precisa permitir as notificações nos ajustes do iOS.", variant: "destructive" });
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
      
      // No futuro, aqui seria gerado o token VAPID para notificações via servidor (Push API)
      // Por enquanto, registramos o interesse do usuário no banco
      await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: currentUser.id,
          subscription: { status: 'granted', timestamp: new Date().toISOString(), platform: 'ios' },
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

    if (!isStandalone && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      toast({ 
        title: "App não instalado", 
        description: "No iPhone, as notificações só funcionam se você 'Adicionar à Tela de Início'.", 
        variant: "destructive" 
      });
      return;
    }

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Pequeno delay para garantir que o usuário veja a notificação fora do app se ele fechar rápido
        setTimeout(() => {
          registration.showNotification('Teste de Finanças 🚀', {
            body: 'As notificações estão funcionando! Você será avisado 3 dias antes dos vencimentos.',
            icon: '/app-icon.svg',
            badge: '/app-icon.svg',
            tag: 'test-notification',
            data: { url: '/' }
          });
        }, 1000);
        
        toast({ title: "Comando enviado!", description: "Aguarde alguns segundos pela notificação." });
      } catch (error) {
        toast({ title: "Erro no teste", description: "Não foi possível disparar a notificação local.", variant: "destructive" });
      }
    }
  };

  return { permission, isStandalone, requestPermission, sendTestNotification };
}