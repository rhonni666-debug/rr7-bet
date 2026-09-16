export type RipcomSymbol = {
  id: string;
  icon: string;
  label: string;
  pay: number;
  wild?: boolean;
  scatter?: boolean;
};

export type RipcomPlayerState = {
  session: {
    token: string;
    currency: string;
    balance: number;
    expiresAt: string;
  };
  game: {
    id: string;
    name: string;
    slug: string;
    external_game_id: string;
    description?: string | null;
    art?: string | null;
  };
  config: {
    game_id: string;
    layout: number[];
    symbols: RipcomSymbol[];
    feature: Record<string, unknown>;
    theme: Record<string, string>;
    version: number;
  };
};

export type RipcomSpin = {
  roundId: string;
  bet: number;
  win: number;
  multiplier: number;
  balance: number;
  grid: string[][];
  feature: Record<string, unknown>;
  wins: Array<{ symbolId: string; ways: number; multiplier: number }>;
  scatterCount: number;
  layout: number[];
};

const DEFAULT_API_BASE = 'https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b';

export const RIPCOM_API_BASE = (import.meta.env.VITE_RIPCOM_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, '');

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(RIPCOM_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok || payload.error) throw new Error(payload.error || `HTTP_${response.status}`);
  if (!payload.data) throw new Error('RIPCOM_EMPTY_RESPONSE');
  return payload.data;
}

export async function getHealth() {
  return call<{ provider: string; status: string; api: string; mode: string; timestamp: string }>({ action: 'health' });
}

export async function getPlayerState(sessionToken: string) {
  return call<RipcomPlayerState>({ action: 'player_state', sessionToken });
}

export async function spinPlayer(sessionToken: string, bet: number) {
  return call<RipcomSpin>({ action: 'player_spin', sessionToken, bet, requestId: crypto.randomUUID() });
}

export async function closePlayer(sessionToken: string) {
  return call<{ closed: boolean }>({ action: 'player_close', sessionToken });
}
