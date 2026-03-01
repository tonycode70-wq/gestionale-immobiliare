import React, { useState, useEffect, createContext, useContext } from 'react';

// 1. Definiamo i tipi manualmente per non dipendere da Supabase
type User = {
  id: string;
  email?: string;
  user_metadata?: {
    nome?: string;
    cognome?: string;
  };
};

type Session = {
  user: User;
  access_token: string;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome?: string, cognome?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Importante: Iniziamo con loading true, ma lo sblocchiamo subito
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuliamo un login automatico immediato come "Amministratore Locale"
    const guestUser: User = { 
      id: 'local-admin', 
      email: 'admin@locale.it',
      user_metadata: { nome: 'Admin', cognome: 'Locale' }
    };
    
    setUser(guestUser);
    setSession({ user: guestUser, access_token: 'fake-token' });
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("Login simulato con:", email);
    const guestUser: User = { id: 'local-admin', email };
    setUser(guestUser);
    return { error: null };
  };

  const signUp = async (email: string, password: string, nome?: string, cognome?: string) => {
    const guestUser: User = { id: 'local-admin', email, user_metadata: { nome, cognome } };
    setUser(guestUser);
    return { error: null };
  };

  const signOut = async () => {
    setUser(null);
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