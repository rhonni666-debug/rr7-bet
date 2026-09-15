import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { WalletTransaction } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './auth';

type PlayResult = { ok: boolean; win: number; message: string; needsAuth?: boolean };

type DemoContextValue = {
  favorites: string[];
  recent: string[];
  transactions: WalletTransaction[];
  balance: number;
  loading: boolean;
  toggleFavorite: (slug: string) => Promise<boolean>;
  markRecent: (slug: string) => Promise<boolean>;
  playDemo: (slug: string, gameName: string, bet: number) => Promise<PlayResult>;
  refresh: () => Promise<void>;
};

const Context = createContext<DemoContextValue | null>(null);

function relationSlug(value: unknown): string | null {
  if (Array.isArray(value)) {
    const first = value[0] as { slug?: unknown } | undefined;
    return typeof first?.slug === 'string' ? first.slug : null;
  }
  if (value && typeof value === 'object' && 'slug' in value) {
    const slug = (value as { slug?: unknown }).slug;
    return typeof slug === 'string' ? slug : null;
  }
  return null;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setRecent([]);
      setTransactions([]);
      setBalance(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [favoriteResult, recentResult, transactionResult, balanceResult] = await Promise.all([
        supabase.from('favorites').select('game_id,games!inner(slug)').eq('user_id', user.id),
        supabase.from('recent_games').select('game_id,last_played_at,games!inner(slug)').eq('user_id', user.id).order('last_played_at', { ascending: false }).limit(12),
        supabase.from('wallet_transactions').select('id,type,amount,description,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.rpc('get_my_demo_balance'),
      ]);

      if (favoriteResult.error) throw favoriteResult.error;
      if (recentResult.error) throw recentResult.error;
      if (transactionResult.error) throw transactionResult.error;
      if (balanceResult.error) throw balanceResult.error;

      setFavorites((favoriteResult.data ?? []).map((row) => relationSlug(row.games)).filter((slug): slug is string => Boolean(slug)));
      setRecent((recentResult.data ?? []).map((row) => relationSlug(row.games)).filter((slug): slug is string => Boolean(slug)));
      setTransactions((transactionResult.data ?? []).map((row) => ({
        id: row.id,
        type: row.type as WalletTransaction['type'],
        amount: Number(row.amount),
        description: row.description,
        createdAt: row.created_at,
      })));
      setBalance(Number(balanceResult.data ?? 0));
    } catch (error) {
      console.error('Falha ao sincronizar dados DEMO:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) void refresh();
  }, [authLoading, refresh]);

  const resolveGameId = useCallback(async (slug: string) => {
    const { data, error } = await supabase.from('games').select('id').eq('slug', slug).single();
    if (error || !data) return null;
    return data.id as string;
  }, []);

  const toggleFavorite = async (slug: string) => {
    if (!user) return false;
    const gameId = await resolveGameId(slug);
    if (!gameId) return false;

    const isFavorite = favorites.includes(slug);
    const result = isFavorite
      ? await supabase.from('favorites').delete().eq('user_id', user.id).eq('game_id', gameId)
      : await supabase.from('favorites').insert({ user_id: user.id, game_id: gameId });

    if (result.error) return false;
    setFavorites((current) => isFavorite ? current.filter((item) => item !== slug) : [slug, ...current]);
    return true;
  };

  const markRecent = async (slug: string) => {
    if (!user) return false;
    const { error } = await supabase.rpc('mark_recent_game', { p_game_slug: slug });
    if (error) return false;
    setRecent((current) => [slug, ...current.filter((item) => item !== slug)].slice(0, 12));
    return true;
  };

  const playDemo = async (slug: string, gameName: string, bet: number): Promise<PlayResult> => {
    if (!user) return { ok: false, win: 0, message: 'Entre na sua conta para usar créditos DEMO.', needsAuth: true };
    if (bet <= 0 || !Number.isFinite(bet)) return { ok: false, win: 0, message: 'Rodada DEMO inválida.' };
    if (bet > balance) return { ok: false, win: 0, message: 'Créditos DEMO insuficientes.' };

    const gameId = await resolveGameId(slug);
    if (!gameId) return { ok: false, win: 0, message: 'Jogo DEMO indisponível.' };

    const { data, error } = await supabase.rpc('play_demo_round', {
      p_game_id: gameId,
      p_bet: bet,
      p_request_id: crypto.randomUUID(),
    });

    if (error) return { ok: false, win: 0, message: 'Não foi possível concluir a rodada DEMO.' };

    const row = Array.isArray(data) ? data[0] : data;
    const win = Number(row?.win_amount ?? 0);
    await refresh();
    return {
      ok: true,
      win,
      message: win > 0
        ? `${gameName}: você recebeu ${win.toLocaleString('pt-BR')} créditos DEMO.`
        : `${gameName}: rodada DEMO sem prêmio.`,
    };
  };

  return (
    <Context.Provider value={{ favorites, recent, transactions, balance, loading, toggleFavorite, markRecent, playDemo, refresh }}>
      {children}
    </Context.Provider>
  );
}

export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error('DemoProvider ausente.');
  return value;
}
