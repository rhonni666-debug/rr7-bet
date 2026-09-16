import { supabase } from '../integrations/supabase/client';

export type B2BEventType = 'BALANCE' | 'BET' | 'WIN' | 'REFUND';

export type B2BStatus = {
  integration: {
    slug: string;
    name: string;
    adapter: string;
    environment: string;
    status: string;
    keyId: string;
    capabilities: Record<string, unknown>;
    config: Record<string, unknown>;
  };
  callbackUrl: string;
  signature: string;
  headers: string[];
  sessionCount: number;
  eventCount: number;
};

export type B2BProviderSession = {
  id: string;
  gameSessionId: string;
  externalSessionId: string;
  externalPlayerId: string;
  expiresAt: string | null;
  status: string;
  callbackUrl: string;
};

export type B2BCallbackPayload = {
  eventId: string;
  eventType: B2BEventType;
  sessionId: string;
  playerId: string;
  amount: number;
  originalEventId?: string;
  currency: 'DEMO';
};

export type B2BCallbackResult = {
  ok?: boolean;
  data?: {
    eventId: string;
    externalEventId: string;
    eventType: B2BEventType;
    amount: number;
    balance: number;
    idempotent: boolean;
    status: 'APPLIED' | 'REJECTED';
  };
  error?: string | null;
};

export type B2BSelfTestResult = {
  request: B2BCallbackPayload;
  callbackStatus: number;
  response: B2BCallbackResult | unknown;
};

type GatewayEnvelope<T> = { data?: T; error?: string };

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('b2b-sandbox', { body });
  if (error) throw error;
  const payload = (data ?? {}) as GatewayEnvelope<T>;
  if (payload.error) throw new Error(payload.error);
  if (!payload.data) throw new Error('B2B_EMPTY_RESPONSE');
  return payload.data;
}

export const B2BSandbox = {
  status() {
    return invoke<B2BStatus>({ action: 'status', integration: 'rr7-sandbox' });
  },
  createSession(gameId: string) {
    return invoke<B2BProviderSession>({ action: 'create_session', integration: 'rr7-sandbox', gameId });
  },
  selfTestEvent(
    providerSessionId: string,
    eventType: B2BEventType,
    amount = 0,
    originalEventId?: string,
    eventId?: string,
  ) {
    return invoke<B2BSelfTestResult>({
      action: 'self_test_event',
      integration: 'rr7-sandbox',
      providerSessionId,
      eventType,
      amount,
      originalEventId,
      eventId,
    });
  },
  closeSession(providerSessionId: string) {
    return invoke<{ closed: boolean }>({
      action: 'close_session',
      integration: 'rr7-sandbox',
      providerSessionId,
    });
  },
};
