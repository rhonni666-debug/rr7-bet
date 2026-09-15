import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { WalletTransaction } from '../types';

type DemoContextValue = {
  favorites: string[];
  recent: string[];
  transactions: WalletTransaction[];
  balance: number;
  toggleFavorite: (slug: string) => void;
  markRecent: (slug: string) => void;
  playDemo: (slug: string, gameName: string, bet: number) => { ok: boolean; win: number; message: string };
};

const Context = createContext<DemoContextValue | null>(null);
const INITIAL = 10_000;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function tx(type: WalletTransaction['type'], amount: number, description: string): WalletTransaction {
  return {
    id: crypto.randomUUID(),
    type,
    amount,
    description,
    createdAt: new Date().toISOString(),
  };
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => read('rr7:favorites', []));
  const [recent, setRecent] = useState<string[]>(() => read('rr7:recent', []));
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() =>
    read('rr7:wallet', [tx('INITIAL_BONUS', INITIAL, 'Créditos iniciais DEMO')]),
  );

  const balance = useMemo(() => transactions.reduce((sum, item) => sum + item.amount, 0), [transactions]);

  const toggleFavorite = (slug: string) => {
    setFavorites((current) => {
      const next = current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current];
      save('rr7:favorites', next);
      return next;
    });
  };

  const markRecent = (slug: string) => {
    setRecent((current) => {
      const next = [slug, ...current.filter((item) => item !== slug)].slice(0, 12);
      save('rr7:recent', next);
      return next;
    });
  };

  const playDemo = (slug: string, gameName: string, bet: number) => {
    if (bet <= 0 || !Number.isFinite(bet)) return { ok: false, win: 0, message: 'Aposta DEMO inválida.' };
    if (bet > balance) return { ok: false, win: 0, message: 'Créditos DEMO insuficientes.' };

    const random = crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff;
    const multiplier = random > 0.94 ? 5 : random > 0.78 ? 2 : random > 0.62 ? 1 : 0;
    const win = bet * multiplier;
    const next = [
      ...transactions,
      tx('BET', -bet, `Aposta DEMO — ${gameName}`),
      ...(win > 0 ? [tx('WIN', win, `Resultado DEMO — ${gameName}`)] : []),
    ];
    setTransactions(next);
    save('rr7:wallet', next);
    markRecent(slug);
    return {
      ok: true,
      win,
      message: win > 0 ? `Você recebeu ${win.toLocaleString('pt-BR')} créditos DEMO.` : 'Rodada DEMO sem prêmio.',
    };
  };

  return (
    <Context.Provider value={{ favorites, recent, transactions, balance, toggleFavorite, markRecent, playDemo }}>
      {children}
    </Context.Provider>
  );
}

export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error('DemoProvider ausente.');
  return value;
}
