import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthRedirectHandler } from "@/components/AuthRedirectHandler";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Relatorio from "./pages/Relatorio";
import Contas from "./pages/Contas";
import Categorias from "./pages/Categorias";
import Receitas from "./pages/Receitas";
import DespesasFixas from "./pages/DespesasFixas";
import DespesasVariaveis from "./pages/DespesasVariaveis";
import Cartoes from "./pages/Cartoes";
import Membros from "./pages/Membros";
import AceitarConvite from "./pages/AceitarConvite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthRedirectHandler />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/aceitar" element={<AceitarConvite />} />
            <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/relatorio" element={<ProtectedRoute><Relatorio /></ProtectedRoute>} />
            <Route path="/contas" element={<ProtectedRoute><Contas /></ProtectedRoute>} />
            <Route path="/categorias" element={<ProtectedRoute><Categorias /></ProtectedRoute>} />
            <Route path="/receitas" element={<ProtectedRoute><Receitas /></ProtectedRoute>} />
            <Route path="/despesas/fixas" element={<ProtectedRoute><DespesasFixas /></ProtectedRoute>} />
            <Route path="/despesas/variaveis" element={<ProtectedRoute><DespesasVariaveis /></ProtectedRoute>} />
            <Route path="/cartoes" element={<ProtectedRoute><Cartoes /></ProtectedRoute>} />
            <Route path="/membros" element={<ProtectedRoute><Membros /></ProtectedRoute>} />
            <Route path="/" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;