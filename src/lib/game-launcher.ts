import { supabase } from '../integrations/supabase/client';
import type { DemoGame, GameSession, Provider, RoundOutcome, SlotSpinOutcome } from '../types';

export interface ProviderAdapter {
  createSession(game: DemoGame): Promise<GameSession>;
  playRound(sessionId: string, bet: number): Promise<RoundOutcome>;
  spinSlot(sessionId: string, bet: number): Promise<SlotSpinOutcome>;
  closeSession(sessionId: string): Promise<void>;
}

type GatewayResponse<T> = {
  data?: T;
  error?: string;
};

async function invokeGateway<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('provider-gateway', { body });
  if (error) throw error;

  const payload = data as GatewayResponse<T> | null;
  if (payload?.error) throw new Error(payload.error);
  if (!payload?.data) throw new Error('PROVIDER_GATEWAY_EMPTY_RESPONSE');
  return payload.data;
}

function mapRound(row: Record<string, unknown>, fallbackBet: number): RoundOutcome {
  if (!row.round_id) throw new Error('ROUND_FAILED');
  return {
    roundId: String(row.round_id),
    bet: Number(row.bet_amount ?? fallbackBet),
    win: Number(row.win_amount ?? 0),
    result: String(row.result ?? 'LOSS') as RoundOutcome['result'],
    multiplier: Number(row.multiplier ?? 0),
    newBalance: Number(row.new_balance ?? 0),
  };
}

class MockProviderAdapter implements ProviderAdapter {
  async createSession(game: DemoGame): Promise<GameSession> {
    const row = await invokeGateway<Record<string, unknown>>({
      action: 'create_session',
      gameId: game.id,
    });

    if (!row.session_id) throw new Error('SESSION_CREATE_FAILED');
    return {
      id: String(row.session_id),
      token: String(row.session_token),
      status: String(row.status ?? 'ACTIVE'),
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      launchUrl: row.launch_url ? String(row.launch_url) : null,
    };
  }

  async playRound(sessionId: string, bet: number): Promise<RoundOutcome> {
    const row = await invokeGateway<Record<string, unknown>>({
      action: 'play_round',
      sessionId,
      bet,
      requestId: crypto.randomUUID(),
    });
    return mapRound(row, bet);
  }

  async spinSlot(sessionId: string, bet: number): Promise<SlotSpinOutcome> {
    const row = await invokeGateway<Record<string, unknown>>({
      action: 'slot_spin',
      sessionId,
      bet,
      requestId: crypto.randomUUID(),
    });
    const round = mapRound(row, bet);
    return {
      ...round,
      grid: Array.isArray(row.grid) ? row.grid as string[][] : [],
      feature: row.feature && typeof row.feature === 'object' ? row.feature as Record<string, unknown> : {},
      wins: Array.isArray(row.wins) ? row.wins.map((win) => {
        const item = win as Record<string, unknown>;
        return { symbolId: String(item.symbolId ?? ''), ways: Number(item.ways ?? 0), multiplier: Number(item.multiplier ?? 0) };
      }) : [],
      scatterCount: Number(row.scatterCount ?? 0),
      layout: Array.isArray(row.layout) ? row.layout.map(Number) : [],
    };
  }

  async closeSession(sessionId: string) {
    await invokeGateway<{ closed: boolean }>({
      action: 'close_session',
      sessionId,
    });
  }
}

class UnsupportedProviderAdapter implements ProviderAdapter {
  private fail(): never {
    throw new Error('PROVIDER_NOT_AVAILABLE_IN_DEMO');
  }
  async createSession(): Promise<GameSession> { return this.fail(); }
  async playRound(): Promise<RoundOutcome> { return this.fail(); }
  async spinSlot(): Promise<SlotSpinOutcome> { return this.fail(); }
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
  spinSlot(provider: Provider, sessionId: string, bet: number) {
    return adapterFor(provider).spinSlot(sessionId, bet);
  },
  closeSession(provider: Provider, sessionId: string) {
    return adapterFor(provider).closeSession(sessionId);
  },
};
