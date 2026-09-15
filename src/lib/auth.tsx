import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';

type ActionResult = { ok: boolean; message: string };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signUp: (displayName: string, email: string, password: string) => Promise<ActionResult>;
  signOut: () => Promise<ActionResult>;
  resetPassword: (email: string) => Promise<ActionResult>;
  updatePassword: (password: string) => Promise<ActionResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error
        ? { ok: false, message: 'Não foi possível entrar. Confira e-mail e senha.' }
        : { ok: true, message: 'Login realizado.' };
    },
    signUp: async (displayName, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) return { ok: false, message: error.message };
      return data.session
        ? { ok: true, message: 'Conta criada e conectada.' }
        : { ok: true, message: 'Conta criada. Confirme o e-mail antes de entrar.' };
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      return error ? { ok: false, message: error.message } : { ok: true, message: 'Sessão encerrada.' };
    },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      return error
        ? { ok: false, message: error.message }
        : { ok: true, message: 'Se o e-mail existir, enviaremos as instruções de recuperação.' };
    },
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      return error ? { ok: false, message: error.message } : { ok: true, message: 'Senha atualizada.' };
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider ausente.');
  return value;
}
