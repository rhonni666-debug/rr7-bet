import { supabase } from '../integrations/supabase/client';
import type { RipcomVisualConfig } from '../components/RipcomSlotPresentation';

export type RipcomPlayerState = {
  session: { token: string; currency: 'DEMO'; balance: number; expiresAt: string };
  game: { id: string; name: string; slug: string; external_game_id: string; description: string | null; art: string };
  config: RipcomVisualConfig & { feature?: Record<string, unknown>; version?: number };
};

export type RipcomPlayerSpin = {
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

type Envelope<T> = { data?: T; error?: string };

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ripcom-b2b', { body });
  if (error) throw error;
  const payload = (data ?? {}) as Envelope<T>;
  if (payload.error) throw new Error(payload.error);
  if (!payload.data) throw new Error('RIPCOM_EMPTY_RESPONSE');
  return payload.data;
}

export const RipcomPublicPlayer = {
  state(sessionToken: string) {
    return invoke<RipcomPlayerState>({ action: 'player_state', sessionToken });
  },
  spin(sessionToken: string, bet: number) {
    return invoke<RipcomPlayerSpin>({ action: 'player_spin', sessionToken, bet, requestId: crypto.randomUUID() });
  },
  close(sessionToken: string) {
    return invoke<{ closed: boolean }>({ action: 'player_close', sessionToken });
  },
};
