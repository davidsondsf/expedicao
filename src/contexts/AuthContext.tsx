import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { AuthUser, UserRole } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.role as UserRole) ?? 'OPERATOR';
}

async function fetchUserProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('name, email, active')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

async function buildAuthUser(supabaseUser: SupabaseUser, session: Session): Promise<AuthUser> {
  const [profile, role] = await Promise.all([
    fetchUserProfile(supabaseUser.id),
    fetchUserRole(supabaseUser.id),
  ]);

  return {
    id: supabaseUser.id,
    name: profile?.name ?? supabaseUser.user_metadata?.name ?? supabaseUser.email?.split('@')[0] ?? 'Usuário',
    email: profile?.email ?? supabaseUser.email ?? '',
    role,
    active: profile?.active ?? true,
    createdAt: supabaseUser.created_at,
    token: session.access_token,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes — do NOT await inside the callback (deadlock risk with Supabase lock)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setTimeout(async () => {
          try {
            const authUser = await buildAuthUser(session.user, session);
            setUser(authUser);
            // Log login event
            if (event === 'SIGNED_IN') {
              await supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                user_email: session.user.email,
                user_name: authUser.name,
                action: 'LOGIN',
                entity: 'auth',
                entity_id: session.user.id,
              }]).then(() => {});
            }
          } catch {
            setUser(null);
          }
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Then get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        buildAuthUser(session.user, session)
          .then(authUser => setUser(authUser))
          .catch(() => setUser(null))
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials'
      ? 'Credenciais inválidas. Verifique email e senha.'
      : error.message);
  };

  const signup = async (name: string, email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(error.message);
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      signup,
      logout,
      isAdmin: user?.role === 'ADMIN',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
