# RIPCOM Node SDK — Sandbox

Este SDK é destinado ao backend da plataforma parceira. Nunca deve ser usado diretamente no navegador, porque a chave privada RSA do operador deve permanecer somente no servidor do parceiro.

## Arquivos

- `sdk/ripcom-node.mjs` — cliente Node.js reutilizável.
- `scripts/ripcom-generate-operator-keys.mjs` — gera o par RSA 2048 localmente.
- `scripts/ripcom-b2b-smoke.mjs` — smoke test completo da API sandbox.
- `scripts/ripcom-sdk-selftest.mjs` — teste offline de assinatura, headers e payloads do SDK.

## Gerar chaves

```bash
npm run ripcom:keys -- minha-plataforma
```

O comando cria os arquivos dentro de `.ripcom-keys/`:

- `minha-plataforma-private.pem` — fica somente com o operador.
- `minha-plataforma-public.pem` — deve ser cadastrada no painel RIPCOM.

A pasta `.ripcom-keys/` é ignorada pelo Git.

## Uso básico

```js
import { createRipcomClient } from './sdk/ripcom-node.mjs';

const ripcom = createRipcomClient({
  baseUrl: 'https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b',
  operatorCode: 'minha-plataforma',
  privateKeyPath: './.ripcom-keys/minha-plataforma-private.pem',
});

const games = await ripcom.games();
const session = await ripcom.createSession({
  gameCode: 'ripcom-slot:eclipse-serpent',
  playerId: 'player-123',
});
const launch = await ripcom.launch(session.data.session_token);
console.log(launch.data.launch_url);
```

## Validação local

```bash
npm run ripcom:sdk:test
```

Esse teste não acessa a internet. Ele gera uma chave temporária em memória, assina requests do SDK e valida as assinaturas com a chave pública correspondente.

## Smoke test contra o sandbox

Depois de cadastrar a chave pública do operador no painel RIPCOM:

```bash
RIPCOM_OPERATOR=minha-plataforma \
RIPCOM_PRIVATE_KEY_PATH=./.ripcom-keys/minha-plataforma-private.pem \
npm run ripcom:smoke
```

## Segurança

- A chave privada nunca entra no painel RIPCOM.
- A chave privada nunca deve ser colocada no frontend.
- Cada request usa timestamp, request ID e assinatura RSA-SHA256.
- Requisições são idempotentes por operador e request ID.
- O sandbox atual usa somente créditos DEMO.
