import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  is_admin: boolean;
  is_active?: boolean;
  family_id?: string;
  is_approved?: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  currentUser: UserProfile | null;
  users: UserProfile[];
  isLoading: boolean;
  signOut: () => Promise<void>;
  isCurrentUserAdmin: () => boolean;
  refreshUsers: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_family_members');
      if (!error && data) {
        // Mapeia os nomes das colunas retornadas pela RPC corrigida
        setUsers(data.map((u: any) => ({
          id: u.f_id || u.id,
          name: u.f_name || u.name,
          email: u.f_email || u.email,
          avatar_color: u.f_avatar_color || u.avatar_color,
          is_admin: u.f_is_admin || u.is_admin,
          is_active: u.f_is_active ?? u.is_active ?? true
        })));
      } else if (error) {
        console.error('[AuthContext] Erro ao buscar usuários:', error);
      }
    } catch (err) {
      console.error('[AuthContext] Erro inesperado ao buscar usuários:', err);
    }
  };

  const fetchProfile = async (userId: string, currentSession: Session | null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setCurrentUser(data);
      } else if (error) {
        console.error('[AuthContext] Erro ao buscar perfil:', error);
        
        if (currentSession?.user) {
          setCurrentUser({
            id: currentSession.user.id,
            name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0] || 'Usuário',
            email: currentSession.user.email || '',
            avatar_color: currentSession.user.user_metadata?.avatar_color || '#22c55e',
            is_admin: false,
            is_active: true
          });
        }
      }
    } catch (err) {
      console.error('[AuthContext] Erro inesperado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id, session);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session);
        fetchUsers();
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session);
        fetchUsers();
      } else {
        setCurrentUser(null);
        setUsers([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isCurrentUserAdmin = () => currentUser?.is_admin === true;

  return (
    <AuthContext.Provider value={{
      session,
      user,
      currentUser,
      users,
      isLoading,
      signOut,
      isCurrentUserAdmin,
      refreshUsers: fetchUsers,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};