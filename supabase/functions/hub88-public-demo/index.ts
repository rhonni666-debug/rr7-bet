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
      // Fall through to the legacy public key.
    }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? '';
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n').trim();
}

function pemToPkcs8Bytes(pem: string): Uint8Array {
  const normalized = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  if (!normalized) throw new Error('HUB88_PRIVATE_KEY_INVALID');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function signBody(rawBody: string, privateKey: string) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8Bytes(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(rawBody),
  );

  return bytesToBase64(new Uint8Array(signature));
}

type Hub88Config = {
  enabled: boolean;
  operatorId: number;
  privateKey: string;
  baseUrl: string;
  lobbyUrl: string;
  country: string;
  language: string;
};

function readConfig(): Hub88Config {
  const config: Hub88Config = {
    enabled: (Deno.env.get('HUB88_ENABLED') ?? 'false').toLowerCase() === 'true',
    operatorId: Number(Deno.env.get('HUB88_OPERATOR_ID') ?? ''),
    privateKey: normalizePrivateKey(Deno.env.get('HUB88_PRIVATE_KEY') ?? ''),
    baseUrl: (Deno.env.get('HUB88_BASE_URL') ?? 'https://api.server1.ih.testenv.io').replace(/\/$/, ''),
    lobbyUrl: Deno.env.get('HUB88_LOBBY_URL') ?? '',
    country: (Deno.env.get('HUB88_COUNTRY') ?? 'BR').toUpperCase(),
    language: (Deno.env.get('HUB88_LANGUAGE') ?? 'pt-br').toLowerCase(),
  };

  if (!config.enabled) return config;
  if (!Number.isInteger(config.operatorId) || config.operatorId <= 0) throw new Error('HUB88_OPERATOR_ID_INVALID');
  if (!config.privateKey.includes('PRIVATE KEY')) throw new Error('HUB88_PRIVATE_KEY_INVALID');
  if (!config.baseUrl.startsWith('https://')) throw new Error('HUB88_BASE_URL_INVALID');
  if (!config.lobbyUrl.startsWith('https://')) throw new Error('HUB88_LOBBY_URL_INVALID');
  return config;
}

async function postHub88<T>(config: Hub88Config, path: string, payload: Record<string, unknown>) {
  if (!config.enabled) throw new Error('HUB88_DISABLED');

  const rawBody = JSON.stringify(payload);
  const signature = await signBody(rawBody, config.privateKey);
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub88-Signature': signature,
    },
    body: rawBody,
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    console.error('hub88_public_demo_request_failed', {
      path,
      status: response.status,
      response: typeof parsed === 'string' ? parsed.slice(0, 300) : parsed,
    });
    throw new Error(`HUB88_HTTP_${response.status}`);
  }

  return parsed as T;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'AUTH_REQUIRED' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const publicKey = publishableKey();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !publicKey || !serviceRoleKey) return json({ error: 'GATEWAY_NOT_CONFIGURED' }, 500);

  const userClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: 'AUTH_REQUIRED' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'INVALID_JSON' }, 400);
  }

  const gameId = String(body.gameId ?? '').trim();
  const deviceType = body.deviceType === 'mobile' ? 'mobile' : 'desktop';
  if (!gameId) return json({ error: 'GAME_ID_REQUIRED' }, 400);

  const { data: game, error: gameError } = await adminClient
    .from('games')
    .select('id, provider_id, external_game_id, launch_type, is_demo, status')
    .eq('id', gameId)
    .maybeSingle();

  if (gameError) {
    console.error('hub88_public_demo_game_lookup_failed', { gameId, error: gameError.message });
    return json({ error: 'GAME_LOOKUP_FAILED' }, 500);
  }
  if (!game) return json({ error: 'GAME_NOT_FOUND' }, 404);
  if (game.status !== 'ACTIVE' || game.is_demo !== true || game.launch_type !== 'HUB88_DEMO') {
    return json({ error: 'GAME_NOT_AUTHORIZED_FOR_HUB88_DEMO' }, 403);
  }

  const { data: provider, error: providerError } = await adminClient
    .from('providers')
    .select('id, provider_type, status, slug')
    .eq('id', game.provider_id)
    .maybeSingle();

  if (providerError) {
    console.error('hub88_public_demo_provider_lookup_failed', { gameId, error: providerError.message });
    return json({ error: 'PROVIDER_LOOKUP_FAILED' }, 500);
  }
  if (!provider || provider.status !== 'ACTIVE' || provider.provider_type !== 'HUB88') {
    return json({ error: 'PROVIDER_NOT_AUTHORIZED_FOR_HUB88_DEMO' }, 403);
  }

  const externalGameId = String(game.external_game_id ?? '').trim();
  if (!externalGameId) return json({ error: 'HUB88_GAME_CODE_MISSING' }, 409);
  const gameCode = externalGameId.startsWith('hub88:') ? externalGameId.slice('hub88:'.length) : externalGameId;

  let config: Hub88Config;
  try {
    config = readConfig();
  } catch (error) {
    console.error('hub88_public_demo_config_error', error);
    return json({ error: error instanceof Error ? error.message : 'HUB88_CONFIG_INVALID' }, 503);
  }
  if (!config.enabled) return json({ error: 'HUB88_DISABLED' }, 503);

  try {
    const result = await postHub88<Record<string, unknown>>(config, '/operator/generic/v2/game/url', {
      game_code: gameCode,
      platform: deviceType === 'mobile' ? 'GPL_MOBILE' : 'GPL_DESKTOP',
      lobby_url: config.lobbyUrl,
      lang: config.language,
      operator_id: config.operatorId,
      game_currency: 'XXX',
      currency: 'XXX',
      country: config.country,
    });

    const launchUrl = typeof result?.url === 'string' ? result.url : '';
    if (!launchUrl) throw new Error('HUB88_NO_GAME_URL');

    console.log('hub88_public_demo_launch', {
      userId: authData.user.id,
      gameId,
      provider: provider.slug,
      gameCode,
      deviceType,
      mode: 'demo',
    });

    return json({
      data: {
        url: launchUrl,
        gameCode,
        currency: 'XXX',
        mode: 'demo',
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'HUB88_GATEWAY_ERROR';
    console.error('hub88_public_demo_launch_failed', { userId: authData.user.id, gameId, code });
    return json({ error: code }, code.startsWith('HUB88_HTTP_') ? 502 : 500);
  }
});
