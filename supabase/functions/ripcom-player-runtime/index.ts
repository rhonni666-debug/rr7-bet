import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-client-info, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
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
  version?: number;
};

type SlotGrid = string[][];
type GridWin = {
  symbolId: string;
  ways: number;
  payPerWay: number;
  multiplier: number;
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

/**
 * Three-reel ways model.
 * One position from each reel forms one possible way. For each way, Wild may
 * substitute a normal symbol, but the way is paid once using the highest valid
 * symbol value. This prevents the same all-Wild way from being counted against
 * multiple symbols.
 */
function evaluateGrid(grid: SlotGrid, symbols: SlotSymbol[]) {
  const wildSymbol = symbols.find((symbol) => symbol.wild);
  const wildId = wildSymbol?.id;
  const scatterId = symbols.find((symbol) => symbol.scatter)?.id;
  const normals = symbols.filter((symbol) => !symbol.scatter && !symbol.wild);
  const winsBySymbol = new Map<string, GridWin>();

  const reels = [grid[0] ?? [], grid[1] ?? [], grid[2] ?? []];
  let multiplier = 0;

  for (let left = 0; left < reels[0].length; left += 1) {
    for (let middle = 0; middle < reels[1].length; middle += 1) {
      for (let right = 0; right < reels[2].length; right += 1) {
        const cells = [reels[0][left], reels[1][middle], reels[2][right]];
        if (scatterId && cells.includes(scatterId)) continue;

        const candidates = normals.filter((symbol) =>
          cells.every((cell) => cell === symbol.id || Boolean(wildId && cell === wildId)),
        );

        if (wildSymbol && cells.every((cell) => cell === wildId)) candidates.push(wildSymbol);
        if (!candidates.length) continue;

        const winner = candidates.reduce((best, candidate) =>
          Number(candidate.pay) > Number(best.pay) ? candidate : best,
        );
        const payPerWay = Math.max(0, Number(winner.pay) || 0);
        if (payPerWay <= 0) continue;

        multiplier += payPerWay;
        const current = winsBySymbol.get(winner.id);
        if (current) {
          current.ways += 1;
          current.multiplier = Math.round((current.multiplier + payPerWay) * 10000) / 10000;
        } else {
          winsBySymbol.set(winner.id, {
            symbolId: winner.id,
            ways: 1,
            payPerWay,
            multiplier: payPerWay,
          });
        }
      }
    }
  }

  const scatterCount = scatterId ? grid.flat().filter((cell) => cell === scatterId).length : 0;
  return {
    multiplier: Math.round(multiplier * 10000) / 10000,
    scatterCount,
    wins: Array.from(winsBySymbol.values()),
  };
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
  const feature: Record<string, unknown> = {
    kind: featureKind,
    active: false,
    payoutMode: 'THREE_REEL_WAYS',
    aggregateWays: true,
  };

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

  const maxMultiplier = asNumber(config.feature.maxMultiplier, 140);
  multiplier = Math.max(0, Math.min(multiplier, maxMultiplier));
  return { grid, evaluation, multiplier, feature };
}

function safeBody(raw: string) {
  try { return raw ? JSON.parse(raw) as Record<string, unknown> : {}; }
  catch { return {} as Record<string, unknown>; }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'RIPCOM_NOT_CONFIGURED' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const raw = await req.text();
  const body = safeBody(raw);
  const action = String(body.action ?? '').trim();
  const sessionToken = String(body.sessionToken ?? '').trim();

  if (!sessionToken) return json({ error: 'SESSION_TOKEN_REQUIRED' }, 400);

  if (action === 'player_state') {
    const { data: session, error } = await admin
      .from('ripcom_b2b_sessions')
      .select('id,game_id,status,currency,demo_balance,expires_at,free_spins_remaining,free_spins_total,bonus_bet,bonus_total_win,bonus_rounds_played,bonus_triggered_at')
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

    return json({ data: {
      session: {
        token: sessionToken,
        currency: session.currency,
        balance: Number(session.demo_balance),
        expiresAt: session.expires_at,
        freeSpinsRemaining: Number(session.free_spins_remaining ?? 0),
        freeSpinsTotal: Number(session.free_spins_total ?? 0),
        bonusBet: session.bonus_bet == null ? null : Number(session.bonus_bet),
        bonusTotalWin: Number(session.bonus_total_win ?? 0),
        bonusRoundsPlayed: Number(session.bonus_rounds_played ?? 0),
        bonusTriggeredAt: session.bonus_triggered_at,
        bonusActive: Number(session.free_spins_remaining ?? 0) > 0,
      },
      game,
      config: { ...config, symbols },
    } });
  }

  if (action === 'player_spin') {
    const requestId = String(body.requestId ?? '').trim();
    const requestedBet = Number(body.bet);
    if (!requestId || !Number.isFinite(requestedBet)) return json({ error: 'INVALID_SPIN_REQUEST' }, 400);

    const { data: session, error: sessionError } = await admin
      .from('ripcom_b2b_sessions')
      .select('id,game_id,status,expires_at,free_spins_remaining,bonus_bet')
      .eq('session_token', sessionToken)
      .maybeSingle();
    if (sessionError || !session) return json({ error: 'SESSION_NOT_FOUND' }, 404);
    if (session.status !== 'ACTIVE') return json({ error: 'SESSION_NOT_ACTIVE' }, 409);
    if (new Date(session.expires_at).getTime() <= Date.now()) return json({ error: 'SESSION_EXPIRED' }, 410);

    const isFreeSpin = Number(session.free_spins_remaining ?? 0) > 0;
    const effectiveBet = isFreeSpin ? Number(session.bonus_bet ?? requestedBet) : requestedBet;

    const { data: configData, error: configError } = await admin
      .from('slot_game_configs')
      .select('game_id,layout,symbols,feature,theme,version')
      .eq('game_id', session.game_id)
      .eq('active', true)
      .maybeSingle();
    if (configError || !configData) return json({ error: 'GAME_NOT_CONFIGURED' }, 404);

    const config = configData as unknown as SlotConfig;
    const outcome = runSlot(config);
    const win = Math.round(effectiveBet * outcome.multiplier * 100) / 100;
    const triggerScatters = asNumber(config.feature.triggerScatters, 3);
    const configuredFreeSpins = asNumber(config.feature.freeSpins, 8);
    const bonusAward = !isFreeSpin && outcome.evaluation.scatterCount >= triggerScatters ? configuredFreeSpins : 0;

    const roundFeature = {
      ...outcome.feature,
      bonusKind: 'ECLIPSE_FREE_SPINS',
      scatterCount: outcome.evaluation.scatterCount,
      bonusAward,
      isFreeSpin,
    };

    const { data: settlement, error: settleError } = await admin.rpc('ripcom_settle_demo_spin_v2', {
      p_session_token: sessionToken,
      p_request_id: requestId,
      p_bet: effectiveBet,
      p_win: win,
      p_multiplier: outcome.multiplier,
      p_grid: outcome.grid,
      p_feature: roundFeature,
      p_bonus_award: bonusAward,
    });

    if (settleError) {
      const known = [
        'SESSION_NOT_FOUND','SESSION_NOT_ACTIVE','SESSION_EXPIRED','INSUFFICIENT_DEMO_CREDITS',
        'INVALID_BET','INVALID_MULTIPLIER','INVALID_WIN','INVALID_GRID','INVALID_REQUEST_ID',
        'INVALID_BONUS_AWARD','BONUS_BET_MISMATCH',
      ];
      const code = known.find((item) => settleError.message.includes(item)) ?? 'SPIN_SETTLEMENT_FAILED';
      return json({ error: code }, code === 'INSUFFICIENT_DEMO_CREDITS' ? 409 : 400);
    }

    const row = Array.isArray(settlement) ? settlement[0] : settlement;
    return json({ data: {
      roundId: row.round_id,
      bet: Number(row.bet_amount),
      win: Number(row.win_amount),
      multiplier: Number(row.multiplier),
      balance: Number(row.balance),
      grid: outcome.grid,
      feature: roundFeature,
      wins: outcome.evaluation.wins,
      scatterCount: outcome.evaluation.scatterCount,
      layout: config.layout,
      isFreeSpin: Boolean(row.is_free_spin),
      freeSpinsRemaining: Number(row.free_spins_remaining ?? 0),
      bonusAwarded: Number(row.bonus_awarded ?? 0),
      bonusTotalWin: Number(row.bonus_total_win ?? 0),
      bonusRoundsPlayed: Number(row.bonus_rounds_played ?? 0),
      bonusBet: row.bonus_bet == null ? null : Number(row.bonus_bet),
    } });
  }

  if (action === 'player_close') {
    await admin.from('ripcom_b2b_sessions')
      .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
      .eq('session_token', sessionToken)
      .eq('status', 'ACTIVE');
    return json({ data: { closed: true } });
  }

  return json({ error: 'ACTION_NOT_FOUND' }, 404);
});