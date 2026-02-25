import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Wallet, 
  Lock, 
  User as UserIcon, 
  Plus, 
  LogIn, 
  Eye, 
  EyeOff,
  Loader2,
  Check
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AVATAR_COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', 
  '#f97316', '#eab308', '#14b8a6', '#6366f1'
];

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
}

export function LoginPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatarColor: AVATAR_COLORS[0]
  });

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_color');
      
      if (!error && data) {
        setProfiles(data);
        if (data.length > 0) setSelectedProfile(data[0]);
      }
    }
    fetchProfiles();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (activeTab === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('As senhas não coincidem');
        }
        
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              avatar_color: formData.avatarColor
            }
          }
        });
        if (error) throw error;
        toast({ title: "Sucesso!", description: "Verifique seu e-mail para confirmar o cadastro." });
      } else {
        const email = selectedProfile?.email || formData.email;
        if (!email) throw new Error('Selecione um usuário ou digite seu e-mail');

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({ 
        title: "Erro", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Subtle glow effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="text-center mb-8 animate-fade-in relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[hsl(150,60%,45%)]/10 border border-[hsl(150,60%,45%)]/20 shadow-[0_0_30px_rgba(34,197,94,0.15)] mb-4">
          <Wallet className="w-8 h-8 text-[hsl(150,60%,45%)]" />
        </div>
        <h1 className="text-3xl font-bold text-[hsl(150,60%,45%)] font-[Outfit]">Finanças</h1>
        <p className="text-[hsl(150,60%,45%)]/70 mt-1">Controle total do seu dinheiro</p>
      </div>

      <Card className="w-full max-w-[440px] border border-border/50 shadow-2xl rounded-[24px] overflow-hidden bg-card relative z-10">
        <CardContent className="p-6">
          <div className="flex p-1 bg-muted/50 rounded-xl mb-8 border border-border/30">
            <button
              onClick={() => setActiveTab('login')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all",
                activeTab === 'login' 
                  ? "bg-primary/10 text-primary shadow-sm border border-primary/20" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LogIn className="w-4 h-4" /> Entrar
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all",
                activeTab === 'signup' 
                  ? "bg-primary/10 text-primary shadow-sm border border-primary/20" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="w-4 h-4" /> Criar Conta
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {activeTab === 'signup' ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Nome</Label>
                  <Input
                    name="name"
                    autoComplete="name"
                    placeholder="Seu nome"
                    className="h-11 rounded-xl bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Email</Label>
                  <Input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="h-11 rounded-xl bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Cor do Avatar</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatarColor: color })}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                          formData.avatarColor === color ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "opacity-70 hover:opacity-100"
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {formData.avatarColor === color && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Label className="text-muted-foreground">Selecione o usuário</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {profiles.map(profile => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setSelectedProfile(profile)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        selectedProfile?.id === profile.id 
                          ? "border-primary/50 bg-primary/5" 
                          : "border-border/30 hover:border-border/60 bg-muted/20"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: profile.avatar_color }}>
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{profile.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      </div>
                    </button>
                  ))}
                  {profiles.length === 0 && (
                    <Input
                      name="email"
                      type="email"
                      autoComplete="username"
                      placeholder="seu@email.com"
                      className="h-11 rounded-xl bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Senha</Label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={activeTab === 'login' ? "current-password" : "new-password"}
                  placeholder="Digite sua senha"
                  className="h-11 rounded-xl pr-10 bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {activeTab === 'signup' && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Confirmar Senha</Label>
                <Input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  className="h-11 rounded-xl bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_35px_rgba(59,130,246,0.4),0_0_60px_rgba(59,130,246,0.15)] transition-all duration-300" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (activeTab === 'login' ? 'Entrar' : 'Criar Conta')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
