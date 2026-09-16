import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const knownErrors = [
  'AUTH_REQUIRED',
  'GAME_UNAVAILABLE',
  'SESSION_NOT_FOUND',
  'SESSION_NOT_ACTIVE',
  'SESSION_EXPIRED',
  'INSUFFICIENT_DEMO_CREDITS',
  'INVALID_BET',
  'RATE_LIMIT',
  'WALLET_NOT_FOUND',
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeError(message: string) {
  return knownErrors.find((code) => message.includes(code)) ?? 'PROVIDER_GATEWAY_ERROR';
}

function publishableKey() {
  const modern = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall through to the legacy public key while it remains available.
    }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'AUTH_REQUIRED' }, 401);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = publishableKey();
  if (!url || !key) return json({ error: 'GATEWAY_NOT_CONFIGURED' }, 500);

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: 'AUTH_REQUIRED' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'INVALID_JSON' }, 400);
  }

  const action = String(body.action ?? '');

  try {
    if (action === 'create_session') {
      const gameId = String(body.gameId ?? '');
      if (!gameId) return json({ error: 'GAME_ID_REQUIRED' }, 400);
      const { data, error } = await supabase.rpc('create_demo_game_session', { p_game_id: gameId });
      if (error) return json({ error: safeError(error.message) }, 400);
      const row = Array.isArray(data) ? data[0] : data;
      return json({ data: row });
    }

    if (action === 'play_round') {
      const sessionId = String(body.sessionId ?? '');
      const requestId = String(body.requestId ?? '');
      const bet = Number(body.bet);
      if (!sessionId || !requestId || !Number.isFinite(bet)) return json({ error: 'INVALID_ROUND_REQUEST' }, 400);
      const { data, error } = await supabase.rpc('play_demo_round_v2', {
        p_session_id: sessionId,
        p_bet: bet,
        p_request_id: requestId,
      });
      if (error) return json({ error: safeError(error.message) }, 400);
      const row = Array.isArray(data) ? data[0] : data;
      return json({ data: row });
    }

    if (action === 'close_session') {
      const sessionId = String(body.sessionId ?? '');
      if (!sessionId) return json({ error: 'SESSION_ID_REQUIRED' }, 400);
      const { data, error } = await supabase.rpc('close_demo_game_session', { p_session_id: sessionId });
      if (error) return json({ error: safeError(error.message) }, 400);
      return json({ data: { closed: Boolean(data) } });
    }

    return json({ error: 'UNKNOWN_ACTION' }, 400);
  } catch {
    return json({ error: 'PROVIDER_GATEWAY_ERROR' }, 500);
  }
});
