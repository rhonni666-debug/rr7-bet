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
    freeSpinsRemaining: number;
    freeSpinsTotal: number;
    bonusBet: number | null;
    bonusTotalWin: number;
    bonusRoundsPlayed: number;
    bonusTriggeredAt?: string | null;
    bonusActive: boolean;
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
  isFreeSpin: boolean;
  freeSpinsRemaining: number;
  bonusAwarded: number;
  bonusTotalWin: number;
  bonusRoundsPlayed: number;
  bonusBet: number | null;
};

const DEFAULT_API_BASE = 'https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b';
const DEFAULT_PLAYER_RUNTIME_BASE = 'https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-player-runtime';

export const RIPCOM_API_BASE = (import.meta.env.VITE_RIPCOM_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, '');
export const RIPCOM_PLAYER_RUNTIME_BASE = (import.meta.env.VITE_RIPCOM_PLAYER_RUNTIME_BASE_URL || DEFAULT_PLAYER_RUNTIME_BASE).replace(/\/$/, '');

async function callAt<T>(baseUrl: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(baseUrl, {
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
  return callAt<{ provider: string; status: string; api: string; mode: string; timestamp: string }>(RIPCOM_API_BASE, { action: 'health' });
}

export async function getPlayerState(sessionToken: string) {
  return callAt<RipcomPlayerState>(RIPCOM_PLAYER_RUNTIME_BASE, { action: 'player_state', sessionToken });
}

export async function spinPlayer(sessionToken: string, bet: number) {
  return callAt<RipcomSpin>(RIPCOM_PLAYER_RUNTIME_BASE, { action: 'player_spin', sessionToken, bet, requestId: crypto.randomUUID() });
}

export async function closePlayer(sessionToken: string) {
  return callAt<{ closed: boolean }>(RIPCOM_PLAYER_RUNTIME_BASE, { action: 'player_close', sessionToken });
}
