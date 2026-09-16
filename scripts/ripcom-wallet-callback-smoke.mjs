import { createHash, randomUUID, createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const url = process.env.RIPCOM_WALLET_CALLBACK_URL || 'https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-wallet-callback';
const operator = process.env.RIPCOM_OPERATOR_CODE || 'rr7';
const keyFile = process.env.RIPCOM_PRIVATE_KEY_FILE;
if (!keyFile) {
  console.error('Set RIPCOM_PRIVATE_KEY_FILE to the operator sandbox private PEM path.');
  process.exit(2);
}

const privateKey = readFileSync(keyFile, 'utf8');
const requestId = randomUUID();
const timestamp = Math.floor(Date.now() / 1000).toString();
const body = JSON.stringify({
  event_type: process.env.RIPCOM_EVENT_TYPE || 'PING',
  player_id: 'sandbox-smoke-player',
  amount: Number(process.env.RIPCOM_EVENT_AMOUNT || 0),
  challenge: `smoke-${requestId}`,
});
const bodyHash = createHash('sha256').update(body).digest('hex');
const canonical = `POST\n/v1/wallet/callback-test\n${timestamp}\n${requestId}\n${bodyHash}`;
const signer = createSign('RSA-SHA256');
signer.update(canonical);
signer.end();
const signature = signer.sign(privateKey).toString('base64');

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Ripcom-Operator': operator,
    'X-Ripcom-Timestamp': timestamp,
    'X-Ripcom-Request-Id': requestId,
    'X-Ripcom-Signature': signature,
  },
  body,
});

const text = await response.text();
console.log(JSON.stringify({ httpStatus: response.status, response: text }, null, 2));
if (!response.ok) process.exit(1);
