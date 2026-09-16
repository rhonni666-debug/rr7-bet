import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import type { UserProfile } from '../types';
import { validatePassword } from './password';

type ActionResult = { ok: boolean; message: string };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<ActionResult>;
  signUp: (displayName: string, email: string, password: string) => Promise<ActionResult>;
  signOut: () => Promise<ActionResult>;
  resetPassword: (email: string) => Promise<ActionResult>;
  updatePassword: (password: string) => Promise<ActionResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeLoginIdentifier(identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (value === 'rhonni') return 'rhonni@rr7.bet';
  return value;
}

function recoveryRedirectUrl() {
  if (import.meta.env.BASE_URL === './') return 'https://rhonni666-debug.github.io/rr7-bet/redefinir-senha';
  return `${window.location.origin}${import.meta.env.BASE_URL}redefinir-senha`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

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

  const user = session?.user ?? null;

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id,display_name,avatar_url,role,created_at,updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Falha ao carregar perfil:', error);
      setProfile(null);
    } else if (data) {
      setProfile({
        id: data.id,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        role: data.role,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    } else {
      setProfile(null);
    }
    setProfileLoading(false);
  }, [user]);

  useEffect(() => {
    if (!loading) void refreshProfile();
  }, [loading, refreshProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    profile,
    isAdmin: profile?.role === 'ADMIN',
    loading,
    profileLoading,
    refreshProfile,
    signIn: async (identifier, password) => {
      const email = normalizeLoginIdentifier(identifier);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error
        ? { ok: false, message: 'Não foi possível entrar. Confira usuário/e-mail e senha.' }
        : { ok: true, message: 'Login realizado.' };
    },
    signUp: async (displayName, email, password) => {
      const passwordError = validatePassword(password);
      if (passwordError) return { ok: false, message: passwordError };
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
        redirectTo: recoveryRedirectUrl(),
      });
      return error
        ? { ok: false, message: error.message }
        : { ok: true, message: 'Se o e-mail existir, enviaremos as instruções de recuperação.' };
    },
    updatePassword: async (password) => {
      const passwordError = validatePassword(password);
      if (passwordError) return { ok: false, message: passwordError };
      const { error } = await supabase.auth.updateUser({ password });
      return error ? { ok: false, message: error.message } : { ok: true, message: 'Senha atualizada.' };
    },
  }), [loading, profile, profileLoading, refreshProfile, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider ausente.');
  return value;
}
