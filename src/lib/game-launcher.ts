import { supabase } from '../integrations/supabase/client';
import type { DemoGame, GameSession, Provider, RoundOutcome } from '../types';

export interface ProviderAdapter {
  createSession(game: DemoGame): Promise<GameSession>;
  playRound(sessionId: string, bet: number): Promise<RoundOutcome>;
  closeSession(sessionId: string): Promise<void>;
}

class MockProviderAdapter implements ProviderAdapter {
  async createSession(game: DemoGame): Promise<GameSession> {
    const { data, error } = await supabase.rpc('create_demo_game_session', { p_game_id: game.id });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.session_id) throw new Error('SESSION_CREATE_FAILED');
    return {
      id: String(row.session_id),
      token: String(row.session_token),
      status: String(row.status ?? 'ACTIVE'),
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      launchUrl: row.launch_url ? String(row.launch_url) : null,
    };
  }

  async playRound(sessionId: string, bet: number): Promise<RoundOutcome> {
    const { data, error } = await supabase.rpc('play_demo_round_v2', {
      p_session_id: sessionId,
      p_bet: bet,
      p_request_id: crypto.randomUUID(),
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.round_id) throw new Error('ROUND_FAILED');
    return {
      roundId: String(row.round_id),
      bet: Number(row.bet_amount ?? bet),
      win: Number(row.win_amount ?? 0),
      result: String(row.result ?? 'LOSS') as RoundOutcome['result'],
      multiplier: Number(row.multiplier ?? 0),
      newBalance: Number(row.new_balance ?? 0),
    };
  }

  async closeSession(sessionId: string) {
    const { error } = await supabase.rpc('close_demo_game_session', { p_session_id: sessionId });
    if (error) throw error;
  }
}

class UnsupportedProviderAdapter implements ProviderAdapter {
  private fail(): never {
    throw new Error('PROVIDER_NOT_AVAILABLE_IN_DEMO');
  }
  async createSession(): Promise<GameSession> { return this.fail(); }
  async playRound(): Promise<RoundOutcome> { return this.fail(); }
  async closeSession(): Promise<void> { this.fail(); }
}

const mockAdapter = new MockProviderAdapter();
const unsupportedAdapter = new UnsupportedProviderAdapter();

function adapterFor(provider: Provider): ProviderAdapter {
  return provider.providerType === 'MOCK' ? mockAdapter : unsupportedAdapter;
}

export const GameLauncher = {
  createSession(game: DemoGame, provider: Provider) {
    return adapterFor(provider).createSession(game);
  },
  playRound(provider: Provider, sessionId: string, bet: number) {
    return adapterFor(provider).playRound(sessionId, bet);
  },
  closeSession(provider: Provider, sessionId: string) {
    return adapterFor(provider).closeSession(sessionId);
  },
};
