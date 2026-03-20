import React, { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { LevelProgress } from '@/components/LevelProgress';
import { 
  Wallet, 
  LayoutDashboard, 
  CreditCard, 
  ArrowLeftRight, 
  PieChart,
  Target,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Tags,
  History,
  Download,
  Menu,
  Upload,
  Calculator,
  Users,
  TrendingDown,
  LineChart,
  User,
  UserCircle,
  Medal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/cards', icon: CreditCard, label: 'Cartões' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Lançamentos' },
  { to: '/invoices', icon: Receipt, label: 'Faturas' },
  { to: '/categories', icon: Tags, label: 'Categorias' },
  { to: '/import', icon: Upload, label: 'Importar' },
  { to: '/budget', icon: Calculator, label: 'Orçamento' },
  { to: '/debts', icon: TrendingDown, label: 'Dívidas' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/evolution', icon: LineChart, label: 'Evolução' },
  { to: '/reports', icon: PieChart, label: 'Relatórios' },
  { to: '/audit', icon: History, label: 'Auditoria' },
  { to: '/backup', icon: Download, label: 'Backup' },
  { to: '/users', icon: Users, label: 'Usuários' },
];

function hexToHslComponents(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { currentUser, familyName, signOut, isCurrentUserAdmin } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAdmin = isCurrentUserAdmin();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
  };

  const userColorHex = currentUser?.avatar_color || '#22c55e';
  const userHsl = hexToHslComponents(userColorHex);

  return (
    <div 
      className="min-h-screen flex w-full bg-background overflow-x-hidden max-w-full"
      style={{ 
        '--primary': userHsl,
        '--sidebar-primary': userHsl,
        '--ring': userHsl,
      } as React.CSSProperties}
    >
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className={`flex items-center gap-3 p-4 border-b border-sidebar-border ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 bg-primary">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-sidebar-foreground truncate">{familyName || 'Finanças'}</h1>
              <p className="text-xs text-sidebar-foreground/60">Controle pessoal</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                  activeClassName="bg-primary text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-4">
          {/* User info and level moved to dropdown */}
          
          <div className={`flex gap-2 mt-4 ${isCollapsed ? 'flex-col' : ''}`}>
            <NavLink
              to="/settings"
              className={`flex items-center justify-center text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg px-3 py-2 flex-1 ${isCollapsed ? 'p-2' : ''}`}
              activeClassName="bg-primary text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Settings className="w-4 h-4" />
              {!isCollapsed && <span className="ml-2">Ajustes</span>}
            </NavLink>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full text-white items-center justify-center shadow-md hover:opacity-90 transition-colors bg-primary"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen min-w-0 w-full max-w-full overflow-x-hidden">
        <header className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="lg:hidden flex-shrink-0" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 truncate">
              <Wallet className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="font-bold text-lg truncate">{familyName || 'Finanças'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationsPanel />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-primary overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all outline-none">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 bg-primary overflow-hidden">
                      {currentUser?.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{currentUser?.name || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="p-0">
                  <div className="w-full px-2 py-1.5">
                    <LevelProgress />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings?mode=profile')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Editar Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6 overflow-x-hidden overflow-y-auto w-full max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}