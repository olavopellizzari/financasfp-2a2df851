import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { FinanceProvider } from './contexts/FinanceContext'
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'

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

// Registro automático do Service Worker via vite-plugin-pwa
// Isso garante que o app se atualize sozinho sem precisar reinstalar
registerSW({ immediate: true })

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