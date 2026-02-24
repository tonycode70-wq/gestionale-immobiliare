import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome?: string, cognome?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const guest = { id: 'local-guest' } as unknown as User;
    setUser(guest);
    setSession(null);
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    setUser({ id: 'local-guest' } as unknown as User);
    setSession(null);
    return { error: null };
  };

  const signUp = async (email: string, password: string, nome?: string, cognome?: string) => {
    setUser({ id: 'local-guest' } as unknown as User);
    setSession(null);
    return { error: null };
  };

  const signOut = async () => {
    setUser({ id: 'local-guest' } as unknown as User);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
