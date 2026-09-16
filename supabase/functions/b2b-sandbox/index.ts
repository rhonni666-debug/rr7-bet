import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-rr7-integration, x-rr7-key-id, x-rr7-timestamp, x-rr7-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const knownErrors = [
  'B2B_INTEGRATION_REQUIRED',
  'B2B_EVENT_ID_INVALID',
  'B2B_EVENT_TYPE_INVALID',
  'B2B_SESSION_ID_INVALID',
  'B2B_PLAYER_ID_INVALID',
  'B2B_REQUEST_HASH_INVALID',
  'B2B_AMOUNT_INVALID',
  'B2B_IDEMPOTENCY_CONFLICT',
  'B2B_INTEGRATION_UNAVAILABLE',
  'B2B_SANDBOX_ONLY',
  'B2B_SESSION_NOT_FOUND',
  'B2B_PLAYER_MISMATCH',
  'B2B_SESSION_NOT_ACTIVE',
  'B2B_SESSION_EXPIRED',
  'B2B_GAME_SESSION_INVALID',
  'B2B_GAME_SESSION_NOT_ACTIVE',
  'B2B_GAME_SESSION_EXPIRED',
  'B2B_ORIGINAL_EVENT_REQUIRED',
  'B2B_ORIGINAL_BET_NOT_FOUND',
  'B2B_REFUND_EXCEEDS_BET',
  'INSUFFICIENT_DEMO_CREDITS',
  'WALLET_NOT_FOUND',
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function publishableKey() {
  const modern = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall through to the legacy public key while available.
    }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? '';
}

function safeError(message: string) {
  return knownErrors.find((code) => message.includes(code)) ?? 'B2B_GATEWAY_ERROR';
}

function bytesToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

async function deriveSandboxSecret(rootSecret: string, integrationId: string) {
  return hmacHex(rootSecret, `rr7-b2b-sandbox:${integrationId}`);
}

function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

function parseObject(rawBody: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(rawBody);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

type IntegrationRow = {
  id: string;
  slug: string;
  name: string;
  adapter: string;
  environment: string;
  status: string;
  key_id: string;
  capabilities: Record<string, unknown>;
  config_public: Record<string, unknown>;
};

type ProviderSessionRow = {
  id: string;
  integration_id: string;
  game_session_id: string;
  user_id: string;
  external_session_id: string;
  external_player_id: string;
  status: string;
  expires_at: string | null;
};

async function loadIntegration(service: ReturnType<typeof createClient>, slug = 'rr7-sandbox') {
  const { data, error } = await service
    .from('b2b_integrations')
    .select('id,slug,name,adapter,environment,status,key_id,capabilities,config_public')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error('B2B_INTEGRATION_LOOKUP_FAILED');
  if (!data) throw new Error('B2B_INTEGRATION_UNAVAILABLE');
  return data as IntegrationRow;
}

async function requireAdmin(authorization: string, supabaseUrl: string, publicKey: string) {
  const userClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) throw new Error('AUTH_REQUIRED');
  const { data: profile, error: profileError } = await userClient.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
  if (profileError) throw new Error('ADMIN_CHECK_FAILED');
  if (profile?.role !== 'ADMIN') throw new Error('ADMIN_REQUIRED');
  return { user: authData.user, client: userClient };
}

async function processSignedCallback(
  req: Request,
  rawBody: string,
  service: ReturnType<typeof createClient>,
  rootSecret: string,
) {
  const integrationSlug = (req.headers.get('X-RR7-Integration') ?? '').trim();
  const keyId = (req.headers.get('X-RR7-Key-Id') ?? '').trim();
  const timestamp = (req.headers.get('X-RR7-Timestamp') ?? '').trim();
  const signature = (req.headers.get('X-RR7-Signature') ?? '').trim().toLowerCase();
  if (!integrationSlug || !keyId || !timestamp || !signature) return json({ error: 'B2B_SIGNATURE_REQUIRED' }, 401);

  let integration: IntegrationRow;
  try {
    integration = await loadIntegration(service, integrationSlug);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'B2B_INTEGRATION_UNAVAILABLE' }, 401);
  }
  if (integration.status !== 'ACTIVE' || integration.environment !== 'sandbox') return json({ error: 'B2B_INTEGRATION_UNAVAILABLE' }, 403);
  if (integration.key_id !== keyId) return json({ error: 'B2B_KEY_ID_INVALID' }, 401);

  const rawTimestamp = Number(timestamp);
  const timestampMs = rawTimestamp < 1_000_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
  const maxSkewSeconds = Number(integration.config_public?.maxClockSkewSeconds ?? 300);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > maxSkewSeconds * 1000) {
    return json({ error: 'B2B_TIMESTAMP_INVALID' }, 401);
  }

  const secret = await deriveSandboxSecret(rootSecret, integration.id);
  const expectedSignature = await hmacHex(secret, `${timestamp}.${rawBody}`);
  if (!secureEqual(expectedSignature, signature)) return json({ error: 'B2B_SIGNATURE_INVALID' }, 401);

  const payload = parseObject(rawBody);
  if (!payload) return json({ error: 'INVALID_JSON' }, 400);
  const eventId = String(payload.eventId ?? '').trim();
  const eventType = String(payload.eventType ?? '').trim().toUpperCase();
  const sessionId = String(payload.sessionId ?? '').trim();
  const playerId = String(payload.playerId ?? '').trim();
  const originalEventId = String(payload.originalEventId ?? '').trim();
  const amount = Number(payload.amount ?? 0);
  if (!Number.isFinite(amount)) return json({ error: 'B2B_AMOUNT_INVALID' }, 400);

  const requestHash = await sha256Hex(rawBody);
  const { data, error } = await service.rpc('process_b2b_wallet_event', {
    p_integration_id: integration.id,
    p_external_event_id: eventId,
    p_event_type: eventType,
    p_external_session_id: sessionId,
    p_external_player_id: playerId,
    p_amount: amount,
    p_original_event_id: originalEventId || null,
    p_request_hash: requestHash,
    p_metadata: {
      key_id: keyId,
      callback_version: 'v1',
      currency: String(payload.currency ?? 'DEMO'),
    },
  });

  if (error) return json({ error: safeError(error.message) }, 400);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return json({ error: 'B2B_EMPTY_SETTLEMENT' }, 500);

  return json({
    ok: row.event_status === 'APPLIED',
    data: {
      eventId: row.b2b_event_id,
      externalEventId: eventId,
      eventType: row.event_type,
      amount: Number(row.applied_amount ?? 0),
      balance: Number(row.new_balance ?? 0),
      idempotent: Boolean(row.idempotent),
      status: row.event_status,
    },
    error: row.error_code ?? null,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const publicKey = publishableKey();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !publicKey || !serviceRoleKey) return json({ error: 'GATEWAY_NOT_CONFIGURED' }, 500);

  const rawBody = await req.text();
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const hasCallbackSignature = Boolean(req.headers.get('X-RR7-Signature'));
  if (hasCallbackSignature) return processSignedCallback(req, rawBody, service, serviceRoleKey);

  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization) return json({ error: 'AUTH_REQUIRED' }, 401);
  const body = parseObject(rawBody);
  if (!body) return json({ error: 'INVALID_JSON' }, 400);

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin(authorization, supabaseUrl, publicKey);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'AUTH_REQUIRED';
    return json({ error: code }, code === 'ADMIN_REQUIRED' ? 403 : 401);
  }

  let integration: IntegrationRow;
  try {
    integration = await loadIntegration(service, String(body.integration ?? 'rr7-sandbox'));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'B2B_INTEGRATION_UNAVAILABLE' }, 503);
  }

  const action = String(body.action ?? '').trim();
  const callbackUrl = `${supabaseUrl}/functions/v1/b2b-sandbox`;

  try {
    if (action === 'status') {
      const [{ count: sessionCount }, { count: eventCount }] = await Promise.all([
        service.from('b2b_provider_sessions').select('id', { head: true, count: 'exact' }).eq('integration_id', integration.id),
        service.from('b2b_events').select('id', { head: true, count: 'exact' }).eq('integration_id', integration.id),
      ]);
      return json({
        data: {
          integration: {
            slug: integration.slug,
            name: integration.name,
            adapter: integration.adapter,
            environment: integration.environment,
            status: integration.status,
            keyId: integration.key_id,
            capabilities: integration.capabilities,
            config: integration.config_public,
          },
          callbackUrl,
          signature: 'HMAC-SHA256(secret, `${timestamp}.${rawBody}`)',
          headers: ['X-RR7-Integration', 'X-RR7-Key-Id', 'X-RR7-Timestamp', 'X-RR7-Signature'],
          sessionCount: sessionCount ?? 0,
          eventCount: eventCount ?? 0,
        },
      });
    }

    if (action === 'create_session') {
      const gameId = String(body.gameId ?? '').trim();
      if (!gameId) return json({ error: 'GAME_ID_REQUIRED' }, 400);
      const { data: sessionData, error: sessionError } = await admin.client.rpc('create_demo_game_session', { p_game_id: gameId });
      if (sessionError) return json({ error: safeError(sessionError.message) });
      const gameSession = Array.isArray(sessionData) ? sessionData[0] : sessionData;
      if (!gameSession?.session_id) return json({ error: 'SESSION_CREATE_FAILED' }, 500);

      const { data: existing, error: existingError } = await service
        .from('b2b_provider_sessions')
        .select('id,integration_id,game_session_id,user_id,external_session_id,external_player_id,status,expires_at')
        .eq('integration_id', integration.id)
        .eq('game_session_id', String(gameSession.session_id))
        .maybeSingle();
      if (existingError) return json({ error: 'B2B_SESSION_LOOKUP_FAILED' }, 500);

      let providerSession = existing as ProviderSessionRow | null;
      if (!providerSession) {
        const externalSessionId = `sbx_${crypto.randomUUID().replaceAll('-', '')}`;
        const externalPlayerId = `rr7_${admin.user.id.replaceAll('-', '')}`;
        const { data: inserted, error: insertError } = await service
          .from('b2b_provider_sessions')
          .insert({
            integration_id: integration.id,
            game_session_id: String(gameSession.session_id),
            user_id: admin.user.id,
            external_session_id: externalSessionId,
            external_player_id: externalPlayerId,
            status: 'ACTIVE',
            expires_at: gameSession.expires_at ?? null,
            metadata: { source: 'b2b-sandbox', callback_version: 'v1' },
          })
          .select('id,integration_id,game_session_id,user_id,external_session_id,external_player_id,status,expires_at')
          .single();
        if (insertError || !inserted) return json({ error: 'B2B_SESSION_CREATE_FAILED' }, 500);
        providerSession = inserted as ProviderSessionRow;
      } else if (providerSession.status !== 'ACTIVE') {
        const { data: updated, error: updateError } = await service
          .from('b2b_provider_sessions')
          .update({ status: 'ACTIVE', expires_at: gameSession.expires_at ?? null })
          .eq('id', providerSession.id)
          .select('id,integration_id,game_session_id,user_id,external_session_id,external_player_id,status,expires_at')
          .single();
        if (updateError || !updated) return json({ error: 'B2B_SESSION_CREATE_FAILED' }, 500);
        providerSession = updated as ProviderSessionRow;
      }

      return json({
        data: {
          id: providerSession.id,
          gameSessionId: providerSession.game_session_id,
          externalSessionId: providerSession.external_session_id,
          externalPlayerId: providerSession.external_player_id,
          expiresAt: providerSession.expires_at,
          status: providerSession.status,
          callbackUrl,
        },
      });
    }

    if (action === 'self_test_event') {
      const providerSessionId = String(body.providerSessionId ?? '').trim();
      const eventType = String(body.eventType ?? '').trim().toUpperCase();
      if (!providerSessionId) return json({ error: 'B2B_PROVIDER_SESSION_REQUIRED' }, 400);
      if (!['BALANCE', 'BET', 'WIN', 'REFUND'].includes(eventType)) return json({ error: 'B2B_EVENT_TYPE_INVALID' }, 400);

      const { data: providerSession, error: providerSessionError } = await service
        .from('b2b_provider_sessions')
        .select('id,integration_id,game_session_id,user_id,external_session_id,external_player_id,status,expires_at')
        .eq('id', providerSessionId)
        .eq('integration_id', integration.id)
        .eq('user_id', admin.user.id)
        .maybeSingle();
      if (providerSessionError || !providerSession) return json({ error: 'B2B_SESSION_NOT_FOUND' }, 404);

      const eventId = String(body.eventId ?? `evt_${crypto.randomUUID().replaceAll('-', '')}`).trim();
      const amount = eventType === 'BALANCE' ? 0 : Number(body.amount ?? 0);
      const originalEventId = String(body.originalEventId ?? '').trim();
      const eventPayload = {
        eventId,
        eventType,
        sessionId: String(providerSession.external_session_id),
        playerId: String(providerSession.external_player_id),
        amount,
        originalEventId: originalEventId || undefined,
        currency: 'DEMO',
      };
      const signedBody = JSON.stringify(eventPayload);
      const timestamp = String(Date.now());
      const secret = await deriveSandboxSecret(serviceRoleKey, integration.id);
      const signature = await hmacHex(secret, `${timestamp}.${signedBody}`);

      const callbackResponse = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RR7-Integration': integration.slug,
          'X-RR7-Key-Id': integration.key_id,
          'X-RR7-Timestamp': timestamp,
          'X-RR7-Signature': signature,
        },
        body: signedBody,
      });
      const callbackText = await callbackResponse.text();
      let callbackBody: unknown = callbackText;
      try { callbackBody = callbackText ? JSON.parse(callbackText) : null; } catch { /* keep text */ }

      return json({
        data: {
          request: eventPayload,
          callbackStatus: callbackResponse.status,
          response: callbackBody,
        },
      }, callbackResponse.ok ? 200 : 502);
    }

    if (action === 'close_session') {
      const providerSessionId = String(body.providerSessionId ?? '').trim();
      const { data: providerSession, error: lookupError } = await service
        .from('b2b_provider_sessions')
        .select('id,game_session_id,user_id')
        .eq('id', providerSessionId)
        .eq('integration_id', integration.id)
        .eq('user_id', admin.user.id)
        .maybeSingle();
      if (lookupError || !providerSession) return json({ error: 'B2B_SESSION_NOT_FOUND' }, 404);

      const { error: closeError } = await admin.client.rpc('close_demo_game_session', { p_session_id: providerSession.game_session_id });
      if (closeError) return json({ error: safeError(closeError.message) });
      await service.from('b2b_provider_sessions').update({ status: 'FINISHED' }).eq('id', providerSession.id);
      return json({ data: { closed: true } });
    }

    return json({ error: 'UNKNOWN_ACTION' }, 400);
  } catch (error) {
    console.error('b2b_sandbox_admin_error', {
      action,
      code: error instanceof Error ? error.message : 'B2B_GATEWAY_ERROR',
    });
    return json({ error: error instanceof Error ? safeError(error.message) : 'B2B_GATEWAY_ERROR' }, 500);
  }
});
