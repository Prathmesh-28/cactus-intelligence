import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, setToken, clearToken, type ApiUser, type ApiError } from '../lib/api';

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: string | null }>;
  signOut: () => void;
  setUser: (user: ApiUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('cactus_token');
    if (!token) { setLoading(false); return; }
    try {
      const { user: me } = await auth.me();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      const { token, user: me } = await auth.login(email, password, rememberMe);
      setToken(token);
      setUser(me);
      return { error: null };
    } catch (err) {
      return { error: (err as ApiError).message ?? 'Login failed' };
    }
  };

  const signOut = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
