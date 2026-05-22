import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import { auth as apiAuth, setToken, clearToken, type ApiUser } from '../lib/api';

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, name: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
  setUser: (user: ApiUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Exchange Firebase ID token for our backend JWT + user record.
  // If the backend is unreachable, fall back to the stored token or Firebase identity
  // so the user doesn't get bounced back to the login page on every page load.
  const syncWithBackend = async () => {
    const fbUser = firebaseAuth.currentUser;
    if (!fbUser) { setUser(null); return; }
    try {
      const idToken = await fbUser.getIdToken();
      const { token, user: me } = await apiAuth.firebaseSync(idToken);
      setToken(token);
      setUser(me);
    } catch {
      // Backend unreachable — try the stored JWT first
      const storedToken = localStorage.getItem('cactus_token');
      if (storedToken) {
        try {
          const { user: me } = await apiAuth.me();
          setUser(me);
          return;
        } catch {
          // stored token also stale; fall through
        }
      }
      // Last resort: construct a minimal user from Firebase so ProtectedRoute passes.
      // Preserve role from stale token if available so admins don't lose access.
      let preservedRole: import('../lib/api').UserRole = 'analyst';
      try {
        const stale = localStorage.getItem('cactus_token');
        if (stale) {
          const payload = JSON.parse(atob(stale.split('.')[1]));
          if (payload?.role) preservedRole = payload.role;
        }
      } catch { /* ignore decode errors */ }
      setUser({
        id: fbUser.uid,
        email: fbUser.email ?? '',
        name: fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'User',
        role: preservedRole,
      });
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        await syncWithBackend();
      } else {
        clearToken();
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Proactively refresh the backend JWT every 20 minutes so it never silently expires mid-session
  useEffect(() => {
    const interval = setInterval(async () => {
      if (firebaseAuth.currentUser) await syncWithBackend();
    }, 20 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      await syncWithBackend();
      return { error: null };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const msg =
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Invalid email or password'
          : code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again later.'
          : 'Sign in failed';
      return { error: msg };
    }
  };

  const signUp = async (email: string, name: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await syncWithBackend();
      return { error: null };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const msg =
        code === 'auth/email-already-in-use'
          ? 'An account with this email already exists'
          : code === 'auth/invalid-email'
          ? 'Invalid email address'
          : code === 'auth/weak-password'
          ? 'Password must be at least 6 characters'
          : (err as Error).message ?? 'Registration failed';
      return { error: msg };
    }
  };

  const signOut = () => {
    fbSignOut(firebaseAuth);
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
