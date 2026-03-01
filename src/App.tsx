import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./components/AppLayout";

// Carregamento preguiçoso das páginas para diminuir o bundle inicial
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const AccountsPage = lazy(() => import("./pages/AccountsPage").then(m => ({ default: m.AccountsPage })));
const CardsPage = lazy(() => import("./pages/CardsPage").then(m => ({ default: m.CardsPage })));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage").then(m => ({ default: m.TransactionsPage })));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage").then(m => ({ default: m.InvoicesPage })));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage").then(m => ({ default: m.CategoriesPage })));
const ImportPage = lazy(() => import("./pages/ImportPage").then(m => ({ default: m.ImportPage })));
const BudgetPage = lazy(() => import("./pages/BudgetPage").then(m => ({ default: m.BudgetPage })));
const DebtsPage = lazy(() => import("./pages/DebtsPage").then(m => ({ default: m.DebtsPage })));
const GoalsPage = lazy(() => import("./pages/GoalsPage").then(m => ({ default: m.GoalsPage })));
const EvolutionPage = lazy(() => import("./pages/EvolutionPage").then(m => ({ default: m.EvolutionPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const AuditPage = lazy(() => import("./pages/AuditPage").then(m => ({ default: m.AuditPage })));
const BackupPage = lazy(() => import("./pages/BackupPage").then(m => ({ default: m.BackupPage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then(m => ({ default: m.UsersPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const SetupPage = lazy(() => import("./pages/SetupPage").then(m => ({ default: m.SetupPage })));
const NotFound = lazy(() => import("./pages/NotFound"));

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, currentUser, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser && !currentUser.family_id && window.location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
          <Route path="/cards" element={<ProtectedRoute><CardsPage /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
          <Route path="/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
          <Route path="/debts" element={<ProtectedRoute><DebtsPage /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
          <Route path="/evolution" element={<ProtectedRoute><EvolutionPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
          <Route path="/backup" element={<ProtectedRoute><BackupPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;