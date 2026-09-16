import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRipcomClient } from '../sdk/ripcom-node.mjs';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const calls = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });

  if (String(url).endsWith('/v1/health')) {
    return new Response(JSON.stringify({ data: { provider: 'RIPCOM', status: 'ok', api: 'v1', mode: 'DEMO' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ data: { ok: true } }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

try {
  const client = createRipcomClient({
    baseUrl: 'https://sandbox.example.test/ripcom-b2b',
    operatorCode: 'sdk-selftest',
    privateKeyPem: privateKey,
  });

  const health = await client.health();
  assert.equal(health.data.provider, 'RIPCOM');
  assert.equal(health.data.status, 'ok');

  await client.games();
  const gamesCall = calls.at(-1);
  assert.equal(gamesCall.url, 'https://sandbox.example.test/ripcom-b2b/v1/games');
  assert.equal(gamesCall.init.method, 'GET');

  const gamesHeaders = gamesCall.init.headers;
  assert.equal(gamesHeaders['X-Ripcom-Operator'], 'sdk-selftest');
  assert.ok(gamesHeaders['X-Ripcom-Timestamp']);
  assert.ok(gamesHeaders['X-Ripcom-Request-Id']);
  assert.ok(gamesHeaders['X-Ripcom-Signature']);

  const emptyHash = crypto.createHash('sha256').update('').digest('hex');
  const canonicalGames = `GET\n/v1/games\n${gamesHeaders['X-Ripcom-Timestamp']}\n${gamesHeaders['X-Ripcom-Request-Id']}\n${emptyHash}`;
  const gamesSignatureValid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(canonicalGames),
    publicKey,
    Buffer.from(gamesHeaders['X-Ripcom-Signature'], 'base64'),
  );
  assert.equal(gamesSignatureValid, true);

  await client.createSession({
    gameCode: 'ripcom-slot:eclipse-serpent',
    playerId: 'player-selftest',
    startingBalance: 10000,
  });

  const sessionCall = calls.at(-1);
  assert.equal(sessionCall.init.method, 'POST');
  const sessionBody = String(sessionCall.init.body);
  const sessionHeaders = sessionCall.init.headers;
  const sessionHash = crypto.createHash('sha256').update(sessionBody).digest('hex');
  const canonicalSession = `POST\n/v1/sessions\n${sessionHeaders['X-Ripcom-Timestamp']}\n${sessionHeaders['X-Ripcom-Request-Id']}\n${sessionHash}`;
  assert.equal(
    crypto.verify('RSA-SHA256', Buffer.from(canonicalSession), publicKey, Buffer.from(sessionHeaders['X-Ripcom-Signature'], 'base64')),
    true,
  );

  const parsedBody = JSON.parse(sessionBody);
  assert.equal(parsedBody.game_code, 'ripcom-slot:eclipse-serpent');
  assert.equal(parsedBody.player_id, 'player-selftest');
  assert.equal(parsedBody.starting_balance, 10000);

  console.log('RIPCOM SDK selftest: OK');
} finally {
  globalThis.fetch = originalFetch;
}
