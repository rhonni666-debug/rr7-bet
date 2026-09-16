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
  const operatorId = Number(Deno.env.get('HUB88_OPERATOR_ID') ?? '');
  const config: Hub88Config = {
    enabled: (Deno.env.get('HUB88_ENABLED') ?? 'false').toLowerCase() === 'true',
    operatorId,
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
  const started = performance.now();

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub88-Signature': signature,
    },
    body: rawBody,
  });

  const latencyMs = Math.round((performance.now() - started) * 100) / 100;
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    console.error('hub88_request_failed', {
      path,
      status: response.status,
      latencyMs,
      response: typeof parsed === 'string' ? parsed.slice(0, 300) : parsed,
    });
    throw new Error(`HUB88_HTTP_${response.status}`);
  }

  return { data: parsed as T, latencyMs };
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.items)) return record.items as T[];
  }
  return [];
}

type Hub88Game = Record<string, unknown> & {
  game_code?: string;
  demo_game_support?: boolean;
  enabled?: boolean;
  blocked_countries?: string[];
  restricted_countries?: string[];
};

function availableForPocCountry(game: Hub88Game, country: string) {
  const blocked = Array.isArray(game.blocked_countries) ? game.blocked_countries : [];
  const restricted = Array.isArray(game.restricted_countries) ? game.restricted_countries : [];
  return !blocked.includes(country) && !restricted.includes(country);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'AUTH_REQUIRED' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const key = publishableKey();
  if (!supabaseUrl || !key) return json({ error: 'GATEWAY_NOT_CONFIGURED' }, 500);

  const supabase = createClient(supabaseUrl, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: 'AUTH_REQUIRED' }, 401);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error('hub88_admin_check_failed', { userId: authData.user.id, error: profileError.message });
    return json({ error: 'ADMIN_CHECK_FAILED' }, 500);
  }
  if (profile?.role !== 'ADMIN') return json({ error: 'ADMIN_REQUIRED' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'INVALID_JSON' }, 400);
  }

  const action = String(body.action ?? '');
  let config: Hub88Config;
  try {
    config = readConfig();
  } catch (error) {
    console.error('hub88_config_error', error);
    return json({ error: error instanceof Error ? error.message : 'HUB88_CONFIG_INVALID' }, 503);
  }

  if (action === 'status') {
    return json({
      data: {
        enabled: config.enabled,
        operatorConfigured: Number.isInteger(config.operatorId) && config.operatorId > 0,
        privateKeyConfigured: config.privateKey.includes('PRIVATE KEY'),
        baseUrl: config.baseUrl,
        lobbyConfigured: config.lobbyUrl.startsWith('https://'),
        country: config.country,
        language: config.language,
      },
    });
  }

  if (!config.enabled) return json({ error: 'HUB88_DISABLED' }, 503);

  try {
    if (action === 'list_products') {
      const result = await postHub88<unknown>(config, '/operator/generic/v2/products/list', {
        operator_id: config.operatorId,
      });
      const products = asArray<Record<string, unknown>>(result.data);
      console.log('hub88_poc_metric', { action, success: true, latencyMs: result.latencyMs, count: products.length });
      return json({ data: products, meta: { latencyMs: result.latencyMs, count: products.length } });
    }

    if (action === 'list_games') {
      const payload: Record<string, unknown> = { operator_id: config.operatorId };
      const productCode = String(body.productCode ?? '').trim();
      if (productCode) payload.product_code = productCode;

      const result = await postHub88<unknown>(config, '/operator/generic/v2/game/list', payload);
      const games = asArray<Hub88Game>(result.data).filter(
        (game) => game.demo_game_support === true && game.enabled === true && availableForPocCountry(game, config.country),
      );
      console.log('hub88_poc_metric', { action, success: true, latencyMs: result.latencyMs, count: games.length, productCode, country: config.country });
      return json({ data: games, meta: { latencyMs: result.latencyMs, count: games.length, productCode, country: config.country } });
    }

    if (action === 'launch_demo') {
      const gameCode = String(body.gameCode ?? '').trim();
      if (!gameCode) return json({ error: 'GAME_CODE_REQUIRED' }, 400);

      const deviceType = body.deviceType === 'mobile' ? 'mobile' : 'desktop';
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

      const launchUrl = typeof result.data?.url === 'string' ? result.data.url : '';
      if (!launchUrl) throw new Error('HUB88_NO_GAME_URL');

      console.log('hub88_poc_metric', { action, success: true, latencyMs: result.latencyMs, gameCode, deviceType, country: config.country });
      return json({
        data: { url: launchUrl, gameCode, currency: 'XXX', mode: 'demo' },
        meta: { latencyMs: result.latencyMs },
      });
    }

    return json({ error: 'UNKNOWN_ACTION' }, 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'HUB88_GATEWAY_ERROR';
    console.error('hub88_poc_metric', { action, success: false, error: code });
    return json({ error: code }, code.startsWith('HUB88_HTTP_') ? 502 : 500);
  }
});
