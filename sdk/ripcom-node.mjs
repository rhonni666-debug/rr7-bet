import crypto from 'node:crypto';
import fs from 'node:fs';

export class RipcomClient {
  constructor({ baseUrl, operatorCode, privateKeyPem, privateKeyPath }) {
    if (!baseUrl || !operatorCode) throw new Error('RIPCOM_CONFIG_REQUIRED');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.operatorCode = operatorCode;
    this.privateKey = privateKeyPem || (privateKeyPath ? fs.readFileSync(privateKeyPath, 'utf8') : '');
    if (!this.privateKey) throw new Error('RIPCOM_PRIVATE_KEY_REQUIRED');
  }

  sign(method, path, bodyText, requestId, timestamp) {
    const bodyHash = crypto.createHash('sha256').update(bodyText).digest('hex');
    const canonical = `${method}\n${path}\n${timestamp}\n${requestId}\n${bodyHash}`;
    return crypto.sign('RSA-SHA256', Buffer.from(canonical), this.privateKey).toString('base64');
  }

  async request(method, path, payload) {
    const bodyText = payload === undefined ? '' : JSON.stringify(payload);
    const requestId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.sign(method, path, bodyText, requestId, timestamp);

    const response = await fetch(this.baseUrl + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
        'X-Ripcom-Operator': this.operatorCode,
        'X-Ripcom-Timestamp': timestamp,
        'X-Ripcom-Request-Id': requestId,
        'X-Ripcom-Signature': signature,
      },
      ...(payload === undefined ? {} : { body: bodyText }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error || `RIPCOM_HTTP_${response.status}`);
      error.status = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  }

  health() {
    return fetch(`${this.baseUrl}/v1/health`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `RIPCOM_HTTP_${response.status}`);
      return data;
    });
  }

  games() {
    return this.request('GET', '/v1/games');
  }

  createSession({ gameCode, playerId, startingBalance = 10000 }) {
    return this.request('POST', '/v1/sessions', {
      game_code: gameCode,
      player_id: playerId,
      starting_balance: startingBalance,
    });
  }

  launch(sessionToken) {
    return this.request('POST', '/v1/games/launch', { session_token: sessionToken });
  }

  closeSession(sessionToken) {
    return this.request('POST', '/v1/sessions/close', { session_token: sessionToken });
  }
}

export function createRipcomClient(options) {
  return new RipcomClient(options);
}
