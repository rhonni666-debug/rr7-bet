import http from 'node:http';
import { createRipcomClient } from '../../sdk/ripcom-node.mjs';

const port = Number(process.env.PORT || 8787);
const baseUrl = process.env.RIPCOM_BASE_URL || 'https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b';
const operatorCode = process.env.RIPCOM_OPERATOR;
const privateKeyPath = process.env.RIPCOM_PRIVATE_KEY_PATH;

if (!operatorCode || !privateKeyPath) {
  console.error('Defina RIPCOM_OPERATOR e RIPCOM_PRIVATE_KEY_PATH antes de iniciar.');
  process.exit(1);
}

const ripcom = createRipcomClient({ baseUrl, operatorCode, privateKeyPath });

function send(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, await ripcom.health());
    }

    if (req.method === 'GET' && url.pathname === '/games') {
      return send(res, 200, await ripcom.games());
    }

    if (req.method === 'POST' && url.pathname === '/session') {
      const body = await readJson(req);
      const payload = await ripcom.createSession({
        gameCode: String(body.gameCode || 'ripcom-slot:eclipse-serpent'),
        playerId: String(body.playerId || ''),
        startingBalance: Number(body.startingBalance || 10000),
      });
      return send(res, 201, payload);
    }

    if (req.method === 'POST' && url.pathname === '/launch') {
      const body = await readJson(req);
      return send(res, 200, await ripcom.launch(String(body.sessionToken || '')));
    }

    if (req.method === 'POST' && url.pathname === '/close') {
      const body = await readJson(req);
      return send(res, 200, await ripcom.closeSession(String(body.sessionToken || '')));
    }

    return send(res, 404, { error: 'NOT_FOUND' });
  } catch (error) {
    console.error('operator_example_error', error);
    return send(res, 500, { error: error instanceof Error ? error.message : 'INTERNAL_ERROR' });
  }
});

server.listen(port, () => {
  console.log(`RIPCOM sandbox operator example: http://localhost:${port}`);
  console.log('A private key permanece somente neste backend.');
});
