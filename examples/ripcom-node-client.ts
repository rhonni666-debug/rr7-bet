import { createHash, createSign, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const baseUrl = process.env.RIPCOM_API_URL ?? 'https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b';
const operator = process.env.RIPCOM_OPERATOR ?? 'rr7';
const privateKeyPath = process.env.RIPCOM_PRIVATE_KEY_PATH;

if (!privateKeyPath) throw new Error('Set RIPCOM_PRIVATE_KEY_PATH to the operator private PEM file.');
const privateKey = await readFile(privateKeyPath, 'utf8');

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

async function ripcom<T>(path: string, method: 'GET' | 'POST', payload?: Record<string, unknown>): Promise<T> {
  const body = method === 'POST' ? JSON.stringify(payload ?? {}) : '';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestId = randomUUID();
  const canonical = `${method}\n${path}\n${timestamp}\n${requestId}\n${sha256(body)}`;
  const signature = createSign('RSA-SHA256').update(canonical).end().sign(privateKey, 'base64');

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Ripcom-Operator': operator,
      'X-Ripcom-Timestamp': timestamp,
      'X-Ripcom-Request-Id': requestId,
      'X-Ripcom-Signature': signature,
    },
    body: method === 'POST' ? body : undefined,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`RIPCOM ${response.status}: ${JSON.stringify(data)}`);
  return data as T;
}

type GameList = { data: Array<{ game_code: string; name: string; slug: string; mode: 'DEMO' }> };
type SessionResponse = { data: { session_id: string; session_token: string; balance: number; currency: 'DEMO'; expires_at: string } };
type LaunchResponse = { data: { launch_url: string; mode: 'DEMO'; session_token: string } };

const games = await ripcom<GameList>('/v1/games', 'GET');
console.log('games', games.data);

const game = games.data[0];
if (!game) throw new Error('No RIPCOM game is enabled for this operator.');

const session = await ripcom<SessionResponse>('/v1/sessions', 'POST', {
  game_code: game.game_code,
  player_id: `integration-test-${Date.now()}`,
  starting_balance: 10000,
});
console.log('session', session.data);

const launch = await ripcom<LaunchResponse>('/v1/games/launch', 'POST', {
  session_token: session.data.session_token,
});
console.log('launch_url', launch.data.launch_url);

// Close the session when your integration test is finished:
// await ripcom('/v1/sessions/close', 'POST', { session_token: session.data.session_token });
