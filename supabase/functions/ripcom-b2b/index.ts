import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-ripcom-operator, x-ripcom-timestamp, x-ripcom-request-id, x-ripcom-signature, x-client-info, apikey, authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}

function pemToSpkiBytes(pem: string) {
  const normalized = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!normalized) throw new Error('OPERATOR_PUBLIC_KEY_INVALID');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function verifySignature(publicKeyPem: string, canonical: string, signatureBase64: string) {
  const key = await crypto.subtle.importKey(
    'spki',
    pemToSpkiBytes(publicKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64ToBytes(signatureBase64),
    new TextEncoder().encode(canonical),
  );
}

type SlotSymbol = {
  id: string;
  icon: string;
  label: string;
  weight: number;
  pay: number;
  wild?: boolean;
  scatter?: boolean;
};

type SlotConfig = {
  game_id: string;
  layout: number[];
  symbols: SlotSymbol[];
  feature: Record<string, unknown>;
  theme: Record<string, unknown>;
};

type SlotGrid = string[][];
type GridWin = { symbolId: string; ways: number; multiplier: number };

type Operator = {
  id: string;
  code: string;
  name: string;
  environment: string;
  status: string;
  public_key_pem: string | null;
  allowed_origins: unknown;
};

function randomUnit() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 4294967296;
}

function randomChoice<T>(values: T[]): T {
  return values[Math.min(values.length - 1, Math.floor(randomUnit() * values.length))];
}

function weightedSymbol(symbols: SlotSymbol[]) {
  const total = symbols.reduce((sum, symbol) => sum + Math.max(0, Number(symbol.weight) || 0), 0);
  let cursor = randomUnit() * total;
  for (const symbol of symbols) {
    cursor -= Math.max(0, Number(symbol.weight) || 0);
    if (cursor <= 0) return symbol.id;
  }
  return symbols[symbols.length - 1]?.id ?? 'empty';
}

function generateGrid(config: SlotConfig): SlotGrid {
  return config.layout.map((rows) => Array.from({ length: rows }, () => weightedSymbol(config.symbols)));
}

function evaluateGrid(grid: SlotGrid, symbols: SlotSymbol[]) {
  const wild = symbols.find((symbol) => symbol.wild)?.id;
  const scatter = symbols.find((symbol) => symbol.scatter)?.id;
  let multiplier = 0;
  const wins: GridWin[] = [];

  for (const symbol of symbols) {
    if (symbol.wild || symbol.scatter) continue;
    const counts = grid.map((column) => column.filter((cell) => cell === symbol.id || Boolean(wild && cell === wild)).length);
    if (counts.length && counts.every((count) => count > 0)) {
      const ways = counts.reduce((value, count) => value * count, 1);
      const contribution = Number(symbol.pay) * Math.min(ways, 6);
      multiplier += contribution;
      wins.push({ symbolId: symbol.id, ways, multiplier: contribution });
    }
  }

  if (wild) {
    const wildSymbol = symbols.find((symbol) => symbol.id === wild);
    const counts = grid.map((column) => column.filter((cell) => cell === wild).length);
    if (wildSymbol && counts.length && counts.every((count) => count > 0)) {
      const ways = counts.reduce((value, count) => value * count, 1);
      const contribution = Number(wildSymbol.pay) * Math.min(ways, 4);
      multiplier += contribution;
      wins.push({ symbolId: wild, ways, multiplier: contribution });
    }
  }

  const scatterCount = scatter ? grid.flat().filter((cell) => cell === scatter).length : 0;
  if (scatterCount >= 3) multiplier += 0.4 * (scatterCount - 2);
  return { multiplier, scatterCount, wins };
}

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function runSlot(config: SlotConfig) {
  let grid = generateGrid(config);
  let evaluation = evaluateGrid(grid, config.symbols);
  let multiplier = evaluation.multiplier;
  const featureKind = String(config.feature.kind ?? 'BASE');
  const feature: Record<string, unknown> = { kind: featureKind, active: false };

  if (featureKind === 'SNAKE_WILD') {
    const wild = config.symbols.find((symbol) => symbol.wild)?.id;
    const normal = config.symbols.filter((symbol) => !symbol.wild && !symbol.scatter);
    const selected = randomChoice(normal);
    const center = grid[1] ?? [];
    const locked = new Set<number>();
    center.forEach((cell, index) => {
      if (cell === selected.id && wild) {
        center[index] = wild;
        locked.add(index);
      }
    });
    evaluation = evaluateGrid(grid, config.symbols);
    multiplier = evaluation.multiplier;

    let respins = 0;
    const maxRespins = asNumber(config.feature.maxRespins, 2);
    if (locked.size && randomUnit() < asNumber(config.feature.respinChance, 0.5)) {
      while (respins < maxRespins) {
        respins += 1;
        const nextGrid = generateGrid(config);
        const nextCenter = nextGrid[1] ?? [];
        for (const index of locked) if (wild && index < nextCenter.length) nextCenter[index] = wild;
        nextCenter.forEach((cell, index) => {
          if (cell === selected.id && wild) {
            nextCenter[index] = wild;
            locked.add(index);
          }
        });
        grid = nextGrid;
        evaluation = evaluateGrid(grid, config.symbols);
        multiplier = evaluation.multiplier;
      }
    }
    if (locked.size || respins) Object.assign(feature, {
      active: true,
      selectedSymbol: selected.id,
      selectedIcon: selected.icon,
      lockedWilds: locked.size,
      respins,
    });
  }

  const maxMultiplier = asNumber(config.feature.maxMultiplier, 120);
  multiplier = Math.max(0, Math.min(multiplier, maxMultiplier));
  return { grid, evaluation, multiplier, feature };
}

function safeBody(rawBody: string) {
  if (!rawBody) return {} as Record<string, unknown>;
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function apiPath(url: URL) {
  const marker = '/ripcom-b2b';
  const position = url.pathname.indexOf(marker);
  if (position === -1) return '/';
  return url.pathname.slice(position + marker.length) || '/';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(req.method)) return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'RIPCOM_NOT_CONFIGURED' }, 500);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const url = new URL(req.url);
  const path = apiPath(url);
  const rawBody = req.method === 'POST' ? await req.text() : '';
  const body = safeBody(rawBody);

  if (path === '/v1/health' || (path === '/' && body.action === 'health')) {
    return json({ data: { provider: 'RIPCOM', status: 'ok', api: 'v1', mode: 'DEMO', timestamp: new Date().toISOString() } });
  }

  if (path === '/player/state' || (path === '/' && body.action === 'player_state')) {
    const sessionToken = String(body.sessionToken ?? '').trim();
    if (!sessionToken) return json({ error: 'SESSION_TOKEN_REQUIRED' }, 400);
    const { data: session, error } = await admin
      .from('ripcom_b2b_sessions')
      .select('id,game_id,status,currency,demo_balance,expires_at')
      .eq('session_token', sessionToken)
      .maybeSingle();
    if (error || !session) return json({ error: 'SESSION_NOT_FOUND' }, 404);
    if (session.status !== 'ACTIVE') return json({ error: 'SESSION_NOT_ACTIVE' }, 409);
    if (new Date(session.expires_at).getTime() <= Date.now()) return json({ error: 'SESSION_EXPIRED' }, 410);

    const [{ data: game }, { data: config }] = await Promise.all([
      admin.from('games').select('id,name,slug,external_game_id,description,art').eq('id', session.game_id).maybeSingle(),
      admin.from('slot_game_configs').select('game_id,layout,symbols,feature,theme,version').eq('game_id', session.game_id).eq('active', true).maybeSingle(),
    ]);
    if (!game || !config) return json({ error: 'GAME_NOT_CONFIGURED' }, 404);

    const symbols = Array.isArray(config.symbols)
      ? (config.symbols as SlotSymbol[]).map(({ weight: _weight, ...symbol }) => symbol)
      : [];
    return json({ data: { session: { token: sessionToken, currency: session.currency, balance: Number(session.demo_balance), expiresAt: session.expires_at }, game, config: { ...config, symbols } } });
  }

  if (path === '/player/spin' || (path === '/' && body.action === 'player_spin')) {
    const sessionToken = String(body.sessionToken ?? '').trim();
    const requestId = String(body.requestId ?? '').trim();
    const bet = Number(body.bet);
    if (!sessionToken || !requestId || !Number.isFinite(bet)) return json({ error: 'INVALID_SPIN_REQUEST' }, 400);

    const { data: session, error: sessionError } = await admin
      .from('ripcom_b2b_sessions')
      .select('id,game_id,status,expires_at')
      .eq('session_token', sessionToken)
      .maybeSingle();
    if (sessionError || !session) return json({ error: 'SESSION_NOT_FOUND' }, 404);

    const { data: configData, error: configError } = await admin
      .from('slot_game_configs')
      .select('game_id,layout,symbols,feature,theme')
      .eq('game_id', session.game_id)
      .eq('active', true)
      .maybeSingle();
    if (configError || !configData) return json({ error: 'GAME_NOT_CONFIGURED' }, 404);

    const config = configData as unknown as SlotConfig;
    const outcome = runSlot(config);
    const win = Math.round(bet * outcome.multiplier * 100) / 100;
    const { data: settlement, error: settleError } = await admin.rpc('ripcom_settle_demo_spin', {
      p_session_token: sessionToken,
      p_request_id: requestId,
      p_bet: bet,
      p_win: win,
      p_multiplier: outcome.multiplier,
      p_grid: outcome.grid,
      p_feature: outcome.feature,
    });
    if (settleError) {
      const code = ['SESSION_NOT_FOUND','SESSION_NOT_ACTIVE','SESSION_EXPIRED','INSUFFICIENT_DEMO_CREDITS','INVALID_BET','INVALID_MULTIPLIER','INVALID_WIN','INVALID_GRID','INVALID_REQUEST_ID'].find((item) => settleError.message.includes(item)) ?? 'SPIN_SETTLEMENT_FAILED';
      return json({ error: code }, code === 'INSUFFICIENT_DEMO_CREDITS' ? 409 : 400);
    }
    const row = Array.isArray(settlement) ? settlement[0] : settlement;
    return json({
      data: {
        roundId: row.round_id,
        bet: Number(row.bet_amount),
        win: Number(row.win_amount),
        multiplier: Number(row.multiplier),
        balance: Number(row.balance),
        grid: outcome.grid,
        feature: outcome.feature,
        wins: outcome.evaluation.wins,
        scatterCount: outcome.evaluation.scatterCount,
        layout: config.layout,
      },
    });
  }

  if (path === '/player/close' || (path === '/' && body.action === 'player_close')) {
    const sessionToken = String(body.sessionToken ?? '').trim();
    if (!sessionToken) return json({ error: 'SESSION_TOKEN_REQUIRED' }, 400);
    await admin.from('ripcom_b2b_sessions').update({ status: 'CLOSED', updated_at: new Date().toISOString() }).eq('session_token', sessionToken).eq('status', 'ACTIVE');
    return json({ data: { closed: true } });
  }

  const operatorCode = req.headers.get('X-Ripcom-Operator')?.trim() ?? '';
  const timestamp = req.headers.get('X-Ripcom-Timestamp')?.trim() ?? '';
  const requestId = req.headers.get('X-Ripcom-Request-Id')?.trim() ?? '';
  const signature = req.headers.get('X-Ripcom-Signature')?.trim() ?? '';
  if (!operatorCode || !timestamp || !requestId || !signature) return json({ error: 'B2B_AUTH_HEADERS_REQUIRED' }, 401);

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > 300) return json({ error: 'B2B_TIMESTAMP_INVALID' }, 401);

  const { data: operatorData, error: operatorError } = await admin
    .from('ripcom_operators')
    .select('id,code,name,environment,status,public_key_pem,allowed_origins')
    .eq('code', operatorCode)
    .maybeSingle();
  if (operatorError || !operatorData) return json({ error: 'OPERATOR_NOT_FOUND' }, 401);
  const operator = operatorData as Operator;
  if (operator.status !== 'ACTIVE') return json({ error: 'OPERATOR_INACTIVE' }, 403);
  if (!operator.public_key_pem) return json({ error: 'OPERATOR_PUBLIC_KEY_NOT_CONFIGURED' }, 503);

  const origin = req.headers.get('Origin');
  const allowedOrigins = Array.isArray(operator.allowed_origins) ? operator.allowed_origins.map(String) : [];
  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);

  const bodyHash = await sha256(rawBody);
  const canonical = `${req.method}\n${path}\n${timestamp}\n${requestId}\n${bodyHash}`;
  let signatureOk = false;
  try {
    signatureOk = await verifySignature(operator.public_key_pem, canonical, signature);
  } catch {
    return json({ error: 'B2B_SIGNATURE_INVALID' }, 401);
  }
  if (!signatureOk) return json({ error: 'B2B_SIGNATURE_INVALID' }, 401);

  const { data: existing } = await admin
    .from('ripcom_api_requests')
    .select('method,path,body_sha256,response_status,response_body')
    .eq('operator_id', operator.id)
    .eq('request_id', requestId)
    .maybeSingle();
  if (existing) {
    if (existing.method !== req.method || existing.path !== path || existing.body_sha256 !== bodyHash) return json({ error: 'IDEMPOTENCY_CONFLICT' }, 409);
    if (existing.response_body && existing.response_status) return json(existing.response_body, Number(existing.response_status));
    return json({ error: 'REQUEST_IN_PROGRESS' }, 409);
  }

  const { error: requestInsertError } = await admin.from('ripcom_api_requests').insert({
    operator_id: operator.id,
    request_id: requestId,
    method: req.method,
    path,
    body_sha256: bodyHash,
  });
  if (requestInsertError) return json({ error: 'REQUEST_REGISTRATION_FAILED' }, 409);

  async function finish(payload: unknown, status = 200) {
    await admin.from('ripcom_api_requests').update({ response_status: status, response_body: payload }).eq('operator_id', operator.id).eq('request_id', requestId);
    return json(payload, status);
  }

  try {
    if (path === '/v1/games' && req.method === 'GET') {
      const { data, error } = await admin
        .from('ripcom_operator_games')
        .select('game_id,enabled,games!inner(id,name,slug,description,art,external_game_id,launch_type,status,is_demo,providers!inner(slug,provider_type,status))')
        .eq('operator_id', operator.id)
        .eq('enabled', true);
      if (error) return finish({ error: 'CATALOG_LOOKUP_FAILED' }, 500);
      const games = (data ?? []).map((row: Record<string, unknown>) => row.games as Record<string, unknown>).filter((game) => {
        const provider = game.providers as Record<string, unknown> | undefined;
        return game.status === 'ACTIVE' && game.is_demo === true && provider?.slug === 'ripcom' && provider?.provider_type === 'REAL' && provider?.status === 'ACTIVE';
      }).map((game) => ({
        game_code: game.external_game_id,
        name: game.name,
        slug: game.slug,
        description: game.description,
        art: game.art,
        mode: 'DEMO',
      }));
      return finish({ data: games, meta: { count: games.length, operator: operator.code, environment: operator.environment } });
    }

    if (path === '/v1/sessions' && req.method === 'POST') {
      const gameCode = String(body.game_code ?? body.gameCode ?? '').trim();
      const playerId = String(body.player_id ?? body.playerId ?? '').trim();
      const startingBalance = Math.min(100000, Math.max(100, Number(body.starting_balance ?? 10000) || 10000));
      if (!gameCode || !playerId) return finish({ error: 'GAME_CODE_AND_PLAYER_ID_REQUIRED' }, 400);

      const { data: game, error: gameError } = await admin
        .from('games')
        .select('id,name,slug,external_game_id,status,is_demo,provider_id,providers!inner(slug,provider_type,status)')
        .or(`external_game_id.eq.${gameCode},slug.eq.${gameCode}`)
        .maybeSingle();
      if (gameError || !game) return finish({ error: 'GAME_NOT_FOUND' }, 404);
      const provider = game.providers as unknown as Record<string, unknown>;
      if (game.status !== 'ACTIVE' || game.is_demo !== true || provider.slug !== 'ripcom' || provider.provider_type !== 'REAL' || provider.status !== 'ACTIVE') return finish({ error: 'GAME_NOT_AVAILABLE' }, 403);

      const { data: entitlement } = await admin.from('ripcom_operator_games').select('enabled').eq('operator_id', operator.id).eq('game_id', game.id).maybeSingle();
      if (!entitlement?.enabled) return finish({ error: 'GAME_NOT_ENABLED_FOR_OPERATOR' }, 403);

      const { data: session, error: sessionError } = await admin.from('ripcom_b2b_sessions').insert({
        operator_id: operator.id,
        game_id: game.id,
        external_player_id: playerId,
        demo_balance: startingBalance,
        metadata: { integration: 'ripcom-b2b-v1' },
      }).select('id,session_token,status,currency,demo_balance,expires_at').single();
      if (sessionError) return finish({ error: 'SESSION_CREATE_FAILED' }, 500);
      return finish({ data: { session_id: session.id, session_token: session.session_token, status: session.status, currency: session.currency, balance: Number(session.demo_balance), expires_at: session.expires_at } }, 201);
    }

    if (path === '/v1/games/launch' && req.method === 'POST') {
      const token = String(body.session_token ?? body.sessionToken ?? '').trim();
      if (!token) return finish({ error: 'SESSION_TOKEN_REQUIRED' }, 400);
      const { data: session, error } = await admin
        .from('ripcom_b2b_sessions')
        .select('id,status,expires_at,operator_id,game_id')
        .eq('session_token', token)
        .eq('operator_id', operator.id)
        .maybeSingle();
      if (error || !session) return finish({ error: 'SESSION_NOT_FOUND' }, 404);
      if (session.status !== 'ACTIVE') return finish({ error: 'SESSION_NOT_ACTIVE' }, 409);
      if (new Date(session.expires_at).getTime() <= Date.now()) return finish({ error: 'SESSION_EXPIRED' }, 410);
      const publicBase = (Deno.env.get('RIPCOM_PUBLIC_BASE_URL') ?? 'https://rhonni666-debug.github.io/rr7-bet').replace(/\/$/, '');
      return finish({ data: { launch_url: `${publicBase}/ripcom/play/${token}`, mode: 'DEMO', session_token: token } });
    }

    if (path === '/v1/sessions/close' && req.method === 'POST') {
      const token = String(body.session_token ?? body.sessionToken ?? '').trim();
      if (!token) return finish({ error: 'SESSION_TOKEN_REQUIRED' }, 400);
      await admin.from('ripcom_b2b_sessions').update({ status: 'CLOSED', updated_at: new Date().toISOString() }).eq('session_token', token).eq('operator_id', operator.id).eq('status', 'ACTIVE');
      return finish({ data: { closed: true } });
    }

    if (path.startsWith('/v1/wallet/')) {
      return finish({ error: 'DEMO_ONLY_INTERNAL_WALLET', message: 'RIPCOM B2B v1 sandbox usa saldo DEMO interno por sessão. Callbacks de dinheiro real não estão habilitados.' }, 501);
    }

    return finish({ error: 'ROUTE_NOT_FOUND' }, 404);
  } catch (error) {
    console.error('ripcom_b2b_error', { path, operator: operator.code, error });
    return finish({ error: 'RIPCOM_B2B_INTERNAL_ERROR' }, 500);
  }
});
