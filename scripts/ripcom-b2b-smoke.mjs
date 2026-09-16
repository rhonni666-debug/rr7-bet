import crypto from 'node:crypto';
import fs from 'node:fs';

const baseUrl = (process.env.RIPCOM_B2B_BASE_URL ?? 'https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b').replace(/\/$/, '');
const operator = process.env.RIPCOM_OPERATOR ?? '';
const privateKeyFile = process.env.RIPCOM_PRIVATE_KEY_FILE ?? '';
const gameCode = process.env.RIPCOM_GAME_CODE ?? 'ripcom-slot:eclipse-serpent';
const playerId = process.env.RIPCOM_PLAYER_ID ?? `smoke-${Date.now()}`;

if (!operator) throw new Error('RIPCOM_OPERATOR is required');
if (!privateKeyFile) throw new Error('RIPCOM_PRIVATE_KEY_FILE is required');

const privateKey = fs.readFileSync(privateKeyFile, 'utf8');

function canonical(method, path, timestamp, requestId, body) {
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  return `${method}\n${path}\n${timestamp}\n${requestId}\n${bodyHash}`;
}

async function signedRequest(path, options = {}) {
  const method = options.method ?? 'GET';
  const body = options.body ? JSON.stringify(options.body) : '';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestId = crypto.randomUUID();
  const payload = canonical(method, path, timestamp, requestId, body);
  const signature = crypto.sign('RSA-SHA256', Buffer.from(payload), privateKey).toString('base64');

  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Ripcom-Operator': operator,
      'X-Ripcom-Timestamp': timestamp,
      'X-Ripcom-Request-Id': requestId,
      'X-Ripcom-Signature': signature,
    },
    body: body || undefined,
  });

  const text = await response.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!response.ok) {
    throw new Error(`${method} ${path} -> HTTP ${response.status}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

async function main() {
  console.log('RIPCOM B2B smoke test');
  console.log(`base: ${baseUrl}`);
  console.log(`operator: ${operator}`);

  const healthResponse = await fetch(baseUrl + '/v1/health');
  if (!healthResponse.ok) throw new Error(`health failed: HTTP ${healthResponse.status}`);
  console.log('✓ health');

  const catalog = await signedRequest('/v1/games');
  const games = catalog?.data ?? [];
  if (!Array.isArray(games) || games.length === 0) throw new Error('catalog returned no games');
  if (!games.some((game) => game.game_code === gameCode || game.slug === gameCode)) {
    throw new Error(`game not enabled for operator: ${gameCode}`);
  }
  console.log(`✓ catalog (${games.length} game(s))`);

  const session = await signedRequest('/v1/sessions', {
    method: 'POST',
    body: {
      game_code: gameCode,
      player_id: playerId,
      starting_balance: 10000,
    },
  });
  const token = session?.data?.session_token;
  if (!token) throw new Error('session_token missing');
  console.log('✓ session created');

  const launch = await signedRequest('/v1/games/launch', {
    method: 'POST',
    body: { session_token: token },
  });
  if (!launch?.data?.launch_url) throw new Error('launch_url missing');
  console.log(`✓ launch: ${launch.data.launch_url}`);

  const playerStateResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'player_state', sessionToken: token }),
  });
  const playerState = await playerStateResponse.json();
  if (!playerStateResponse.ok || !playerState?.data?.session) {
    throw new Error(`player_state failed: ${JSON.stringify(playerState)}`);
  }
  console.log(`✓ player state (balance ${playerState.data.session.balance})`);

  const spinResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'player_spin', sessionToken: token, requestId: crypto.randomUUID(), bet: 1 }),
  });
  const spin = await spinResponse.json();
  if (!spinResponse.ok || !spin?.data?.roundId) throw new Error(`player_spin failed: ${JSON.stringify(spin)}`);
  console.log(`✓ spin (win ${spin.data.win}, balance ${spin.data.balance})`);

  await signedRequest('/v1/sessions/close', {
    method: 'POST',
    body: { session_token: token },
  });
  console.log('✓ session closed');
  console.log('RIPCOM B2B smoke test passed');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
