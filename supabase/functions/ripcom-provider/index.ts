import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
      // Fall back to the legacy anon key.
    }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? '';
}

type GameRow = {
  id: string;
  provider_id: string;
  status: string;
  is_demo: boolean;
};

type ProviderRow = {
  id: string;
  slug: string;
  provider_type: string;
  status: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'AUTH_REQUIRED' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const publicKey = publishableKey();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !publicKey || !serviceRoleKey) return json({ error: 'RIPCOM_NOT_CONFIGURED' }, 500);

  const userClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: 'AUTH_REQUIRED' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'INVALID_JSON' }, 400);
  }

  const action = String(body.action ?? '');
  if (!['status', 'create_session', 'play_round', 'slot_spin', 'close_session'].includes(action)) {
    return json({ error: 'UNKNOWN_ACTION' }, 400);
  }

  async function assertRipcomProvider(providerId: string) {
    const { data, error } = await admin
      .from('providers')
      .select('id,slug,provider_type,status')
      .eq('id', providerId)
      .maybeSingle();
    if (error) throw new Error('RIPCOM_PROVIDER_LOOKUP_FAILED');
    const provider = data as ProviderRow | null;
    if (!provider || provider.slug !== 'ripcom' || provider.provider_type !== 'REAL' || provider.status !== 'ACTIVE') {
      throw new Error('RIPCOM_PROVIDER_REQUIRED');
    }
    return provider;
  }

  try {
    if (action === 'status') {
      const { data, error } = await admin
        .from('providers')
        .select('id,slug,name,short_name,provider_type,status')
        .eq('slug', 'ripcom')
        .maybeSingle();
      if (error || !data) return json({ error: 'RIPCOM_PROVIDER_NOT_FOUND' }, 404);
      return json({ data: { ...data, runtime: 'ripcom-provider', mode: 'DEMO', version: 'v1' } });
    }

    if (action === 'create_session') {
      const gameId = String(body.gameId ?? '').trim();
      if (!gameId) return json({ error: 'GAME_ID_REQUIRED' }, 400);
      const { data, error } = await admin
        .from('games')
        .select('id,provider_id,status,is_demo')
        .eq('id', gameId)
        .maybeSingle();
      if (error) throw new Error('RIPCOM_GAME_LOOKUP_FAILED');
      const game = data as GameRow | null;
      if (!game || game.status !== 'ACTIVE' || game.is_demo !== true) throw new Error('RIPCOM_GAME_UNAVAILABLE');
      await assertRipcomProvider(game.provider_id);
    } else {
      const sessionId = String(body.sessionId ?? '').trim();
      if (!sessionId) return json({ error: 'SESSION_ID_REQUIRED' }, 400);
      const { data, error } = await admin
        .from('game_sessions')
        .select('id,user_id,game_id,provider_id,status')
        .eq('id', sessionId)
        .maybeSingle();
      if (error) throw new Error('RIPCOM_SESSION_LOOKUP_FAILED');
      if (!data || data.user_id !== authData.user.id) throw new Error('RIPCOM_SESSION_NOT_FOUND');
      await assertRipcomProvider(String(data.provider_id));
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/provider-gateway`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        apikey: publicKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { error: 'RIPCOM_RUNTIME_INVALID_RESPONSE' };
    }

    if (!response.ok) {
      console.error('ripcom_runtime_failed', { action, status: response.status, userId: authData.user.id });
      return json(payload, response.status);
    }

    console.log('ripcom_runtime_ok', { action, userId: authData.user.id });
    return json(payload);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'RIPCOM_PROVIDER_ERROR';
    console.error('ripcom_provider_error', { action, code, userId: authData.user.id });
    const status = code.endsWith('_REQUIRED') ? 403 : code.endsWith('_NOT_FOUND') ? 404 : 500;
    return json({ error: code }, status);
  }
});
