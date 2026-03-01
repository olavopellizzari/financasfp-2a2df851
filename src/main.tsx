import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { FinanceProvider } from './contexts/FinanceContext'
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Configuração do cliente de cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Dados são considerados "frescos" por 5 minutos
      gcTime: 1000 * 60 * 30,    // Mantém no cache por 30 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Registro do Service Worker para PWA e Notificações
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registrado com sucesso:', registration.scope);
      })
      .catch(err => {
        console.log('Falha ao registrar SW:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FinanceProvider>
          <App />
          <Toaster />
        </FinanceProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)