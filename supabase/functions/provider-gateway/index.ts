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
  'INVALID_WIN',
  'INVALID_MULTIPLIER',
  'RATE_LIMIT',
  'WALLET_NOT_FOUND',
  'SLOT_NOT_CONFIGURED',
];

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
type GridEvaluation = { multiplier: number; scatterCount: number; wins: GridWin[] };

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
      // Use the legacy public key while available.
    }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? '';
}

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

function evaluateGrid(grid: SlotGrid, symbols: SlotSymbol[]): GridEvaluation {
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

function asNumberArray(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) return fallback;
  const parsed = value.map(Number).filter(Number.isFinite);
  return parsed.length ? parsed : fallback;
}

function isFullScreen(grid: SlotGrid, symbols: SlotSymbol[]) {
  const wild = symbols.find((symbol) => symbol.wild)?.id;
  const normal = symbols.filter((symbol) => !symbol.wild && !symbol.scatter).map((symbol) => symbol.id);
  return normal.some((symbolId) => grid.flat().every((cell) => cell === symbolId || Boolean(wild && cell === wild)));
}

function simulateBonus(config: SlotConfig, spins: number, factor: number) {
  let multiplier = 0;
  const sequence: Array<{ grid: SlotGrid; multiplier: number }> = [];
  for (let index = 0; index < spins; index += 1) {
    const grid = generateGrid(config);
    const evaluation = evaluateGrid(grid, config.symbols);
    const contribution = evaluation.multiplier * factor;
    multiplier += contribution;
    if (index < 3) sequence.push({ grid, multiplier: contribution });
  }
  return { multiplier, sequence };
}

function runSlot(config: SlotConfig) {
  let grid = generateGrid(config);
  let evaluation = evaluateGrid(grid, config.symbols);
  let multiplier = evaluation.multiplier;
  const featureKind = String(config.feature.kind ?? 'BASE');
  const feature: Record<string, unknown> = { kind: featureKind, active: false };

  if (featureKind === 'TIGER_RESPIN') {
    const chance = asNumber(config.feature.triggerChance, 0.25);
    if (randomUnit() < chance) {
      grid = generateGrid(config);
      evaluation = evaluateGrid(grid, config.symbols);
      const featureMultiplier = randomChoice(asNumberArray(config.feature.multipliers, [2, 2, 3, 5]));
      multiplier = evaluation.multiplier * featureMultiplier;
      Object.assign(feature, { active: true, respins: 1, multiplier: featureMultiplier });
    }
  }

  if (featureKind === 'DRAGON_MULTIPLIER') {
    let dragonMultiplier = 1;
    if (multiplier > 0 && randomUnit() < asNumber(config.feature.triggerChance, 0.22)) {
      dragonMultiplier = randomChoice(asNumberArray(config.feature.multipliers, [2, 3, 5, 10]));
      multiplier *= dragonMultiplier;
      Object.assign(feature, { active: true, multiplier: dragonMultiplier });
    }
    if (evaluation.scatterCount >= asNumber(config.feature.bonusScatter, 3)) {
      const spins = asNumber(config.feature.bonusSpins, 8);
      const bonus = simulateBonus(config, spins, 0.35);
      multiplier += bonus.multiplier;
      Object.assign(feature, { active: true, bonusSpins: spins, bonusMultiplier: bonus.multiplier, bonusPreview: bonus.sequence, multiplier: dragonMultiplier });
    }
  }

  if (featureKind === 'RABBIT_BONUS') {
    const scatterTrigger = evaluation.scatterCount >= asNumber(config.feature.bonusScatter, 3);
    const surpriseTrigger = randomUnit() < asNumber(config.feature.triggerChance, 0.08);
    if (scatterTrigger || surpriseTrigger) {
      const spins = asNumber(config.feature.bonusSpins, 8);
      const bonus = simulateBonus(config, spins, 0.4);
      multiplier += bonus.multiplier;
      Object.assign(feature, { active: true, bonusSpins: spins, bonusMultiplier: bonus.multiplier, bonusPreview: bonus.sequence, trigger: scatterTrigger ? 'SCATTER' : 'SURPRISE' });
    }
  }

  if (featureKind === 'OX_RESPIN') {
    const maxRespins = asNumber(config.feature.maxRespins, 3);
    let respins = 0;
    while (multiplier === 0 && respins < maxRespins) {
      respins += 1;
      grid = generateGrid(config);
      evaluation = evaluateGrid(grid, config.symbols);
      multiplier = evaluation.multiplier;
    }
    const fullScreen = isFullScreen(grid, config.symbols);
    if (fullScreen) multiplier *= asNumber(config.feature.fullScreenMultiplier, 10);
    if (respins || fullScreen) Object.assign(feature, { active: true, respins, fullScreen, multiplier: fullScreen ? asNumber(config.feature.fullScreenMultiplier, 10) : 1 });
  }

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
    if (locked.size || respins) Object.assign(feature, { active: true, selectedSymbol: selected.id, selectedIcon: selected.icon, lockedWilds: locked.size, respins });
  }

  const maxMultiplier = asNumber(config.feature.maxMultiplier, 100);
  multiplier = Math.max(0, Math.min(multiplier, maxMultiplier));
  return { grid, evaluation, multiplier, feature };
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
      if (error) return json({ error: safeError(error.message) });
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
      if (error) return json({ error: safeError(error.message) });
      const row = Array.isArray(data) ? data[0] : data;
      return json({ data: row });
    }

    if (action === 'slot_spin') {
      const sessionId = String(body.sessionId ?? '');
      const requestId = String(body.requestId ?? '');
      const bet = Number(body.bet);
      if (!sessionId || !requestId || !Number.isFinite(bet)) return json({ error: 'INVALID_ROUND_REQUEST' }, 400);

      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      if (!serviceKey) return json({ error: 'GATEWAY_NOT_CONFIGURED' }, 500);
      const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

      const { data: session, error: sessionError } = await admin
        .from('game_sessions')
        .select('id,user_id,game_id,status,expires_at')
        .eq('id', sessionId)
        .maybeSingle();
      if (sessionError || !session || session.user_id !== authData.user.id) return json({ error: 'SESSION_NOT_FOUND' });

      const { data: configData, error: configError } = await admin
        .from('slot_game_configs')
        .select('game_id,layout,symbols,feature,theme')
        .eq('game_id', session.game_id)
        .eq('active', true)
        .maybeSingle();
      if (configError || !configData) return json({ error: 'SLOT_NOT_CONFIGURED' });

      const config = configData as unknown as SlotConfig;
      const outcome = runSlot(config);
      const win = Math.round(bet * outcome.multiplier * 100) / 100;

      const { data: settlement, error: settlementError } = await admin.rpc('settle_slot_round', {
        p_user_id: authData.user.id,
        p_session_id: sessionId,
        p_bet: bet,
        p_win: win,
        p_request_id: requestId,
        p_multiplier: outcome.multiplier,
        p_grid: outcome.grid,
        p_feature: outcome.feature,
      });
      if (settlementError) return json({ error: safeError(settlementError.message) });
      const settled = Array.isArray(settlement) ? settlement[0] : settlement;

      return json({
        data: {
          ...settled,
          grid: outcome.grid,
          feature: outcome.feature,
          wins: outcome.evaluation.wins,
          scatterCount: outcome.evaluation.scatterCount,
          layout: config.layout,
        },
      });
    }

    if (action === 'close_session') {
      const sessionId = String(body.sessionId ?? '');
      if (!sessionId) return json({ error: 'SESSION_ID_REQUIRED' }, 400);
      const { data, error } = await supabase.rpc('close_demo_game_session', { p_session_id: sessionId });
      if (error) return json({ error: safeError(error.message) });
      return json({ data: { closed: Boolean(data) } });
    }

    return json({ error: 'UNKNOWN_ACTION' }, 400);
  } catch {
    return json({ error: 'PROVIDER_GATEWAY_ERROR' }, 500);
  }
});
