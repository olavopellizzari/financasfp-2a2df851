import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  avatar_url?: string;
  is_admin: boolean;
  is_active?: boolean;
  family_id?: string;
  is_approved?: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  currentUser: UserProfile | null;
  familyName: string | null;
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
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_family_members');
      if (!error && data) {
        setUsers(data.map((u: any) => ({
          id: u.f_id || u.id,
          name: u.f_name || u.name,
          email: u.f_email || u.email,
          avatar_color: u.f_avatar_color || u.avatar_color,
          avatar_url: u.f_avatar_url || u.avatar_url,
          is_admin: u.f_is_admin || u.is_admin,
          is_active: u.f_is_active ?? u.is_active ?? true
        })));
      }
    } catch (err) {
      console.error('[AuthContext] Erro ao buscar usuários:', err);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setCurrentUser(data);
        if (data.family_id) {
          const { data: familyData } = await supabase
            .from('households')
            .select('name')
            .eq('id', data.family_id)
            .single();
          
          if (familyData) {
            setFamilyName(familyData.name);
          }
        }
      }
    } catch (err) {
      console.error('[AuthContext] Erro ao buscar perfil:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
      await fetchUsers();
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUsers();
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUsers();
      } else {
        setCurrentUser(null);
        setFamilyName(null);
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
      familyName,
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