# RIPCOM B2B API v1 — Sandbox

A RIPCOM B2B v1 é uma API de integração para jogos próprios em modo exclusivamente DEMO/fun-money.

## Base URL

`https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b`

## Endpoints

### Público

- `GET /v1/health` — saúde da API.

### Assinados por operador

- `GET /v1/games` — catálogo liberado para o operador.
- `POST /v1/sessions` — cria uma sessão DEMO.
- `POST /v1/games/launch` — gera a URL do player independente RIPCOM.
- `POST /v1/sessions/close` — encerra a sessão.

### Player

O launch URL aponta para o player independente em `/ripcom/play/:sessionToken`. O player consome internamente:

- `player_state`
- `player_spin`
- `player_close`

Essas operações usam apenas o token temporário da sessão DEMO e não expõem credenciais do operador.

## Autenticação B2B

Cada operador possui um par RSA 2048. A plataforma cliente guarda a chave privada; a RIPCOM armazena somente a chave pública.

Headers obrigatórios:

- `X-Ripcom-Operator`
- `X-Ripcom-Timestamp` — Unix timestamp em segundos, tolerância de 5 minutos.
- `X-Ripcom-Request-Id` — UUID/id único por requisição.
- `X-Ripcom-Signature` — assinatura RSA-SHA256 em Base64.

### Payload canônico

```text
METHOD\nPATH\nTIMESTAMP\nREQUEST_ID\nSHA256_HEX(BODY_EXATO)
```

Para GET sem body, o hash utilizado é SHA-256 da string vazia.

A assinatura usa `RSASSA-PKCS1-v1_5` com SHA-256.

## Exemplo Node.js

```js
import crypto from 'node:crypto';
import fs from 'node:fs';

const base = 'https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b';
const path = '/v1/games';
const method = 'GET';
const body = '';
const timestamp = Math.floor(Date.now() / 1000).toString();
const requestId = crypto.randomUUID();
const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
const canonical = `${method}\n${path}\n${timestamp}\n${requestId}\n${bodyHash}`;
const privateKey = fs.readFileSync('./rr7-ripcom-sandbox-private.pem', 'utf8');
const signature = crypto.sign('RSA-SHA256', Buffer.from(canonical), privateKey).toString('base64');

const response = await fetch(base + path, {
  method,
  headers: {
    'X-Ripcom-Operator': 'rr7',
    'X-Ripcom-Timestamp': timestamp,
    'X-Ripcom-Request-Id': requestId,
    'X-Ripcom-Signature': signature,
  },
});

console.log(await response.json());
```

## Criar sessão

`POST /v1/sessions`

```json
{
  "game_code": "ripcom-slot:eclipse-serpent",
  "player_id": "cliente-demo-001",
  "starting_balance": 10000
}
```

Resposta esperada:

```json
{
  "data": {
    "session_id": "uuid",
    "session_token": "uuid",
    "status": "ACTIVE",
    "currency": "DEMO",
    "balance": 10000,
    "expires_at": "ISO-8601"
  }
}
```

## Gerar launch URL

`POST /v1/games/launch`

```json
{
  "session_token": "uuid"
}
```

A resposta contém `launch_url`. Esse URL pode ser aberto diretamente ou incorporado em iframe pelo operador.

## Idempotência

`X-Ripcom-Request-Id` é persistido por operador. Repetir exatamente a mesma requisição retorna a resposta já armazenada. Reutilizar o mesmo ID com método, path ou body diferente gera `IDEMPOTENCY_CONFLICT`.

## Segurança

- A chave privada nunca deve ser enviada à RIPCOM.
- A chave privada nunca deve ser colocada no frontend/browser.
- A assinatura deve ser gerada no backend do operador.
- Cada operador recebe seu próprio par de chaves.
- `allowed_origins` pode restringir origens quando houver chamadas originadas por navegador.
- Sessões e rounds B2B são separados dos usuários finais do RR7.

## Escopo atual

A API v1 atual é somente sandbox DEMO. Os endpoints `/v1/wallet/*` retornam `DEMO_ONLY_INTERNAL_WALLET`; dinheiro real e callbacks financeiros não estão habilitados.
