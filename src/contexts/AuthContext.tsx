import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthUser, LoginDto } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_CREDENTIALS = [
  { email: 'admin@galpaocopycentro.com', password: 'admin123', id: 'u1', name: 'Admin Galpão', role: 'ADMIN' as const },
  { email: 'joao@galpaocopycentro.com', password: 'op123', id: 'u2', name: 'João Operador', role: 'OPERATOR' as const },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('gcp_auth');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('gcp_auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (dto: LoginDto): Promise<void> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    const found = MOCK_CREDENTIALS.find(
      c => c.email === dto.email && c.password === dto.password
    );

    if (!found) {
      setIsLoading(false);
      throw new Error('Credenciais inválidas. Verifique email e senha.');
    }

    const authUser: AuthUser = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      createdAt: new Date().toISOString(),
      token: `mock-jwt-token-${found.id}-${Date.now()}`,
    };

    setUser(authUser);
    localStorage.setItem('gcp_auth', JSON.stringify(authUser));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('gcp_auth');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
