# Exemplo de backend de operador — RIPCOM Sandbox

Este exemplo mostra uma integração mínima com a RIPCOM usando apenas Node.js e o SDK do repositório.

A finalidade é demonstrar a arquitetura correta:

```text
FRONTEND DO OPERADOR
        |
        v
BACKEND DO OPERADOR
        |
        | assinatura RSA
        v
RIPCOM B2B API
```

A private key fica somente no backend do operador.

## 1. Gerar chaves locais

```bash
npm run ripcom:keys -- parceiro-demo
```

Cadastre o conteúdo de `parceiro-demo-public.pem` no painel RIPCOM e mantenha `parceiro-demo-private.pem` somente no servidor do parceiro.

## 2. Configurar variáveis

```bash
export RIPCOM_OPERATOR=parceiro-demo
export RIPCOM_PRIVATE_KEY_PATH=.ripcom-keys/parceiro-demo-private.pem
```

Opcionalmente:

```bash
export RIPCOM_BASE_URL=https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b
export PORT=8787
```

## 3. Iniciar

```bash
node examples/ripcom-node-operator/server.mjs
```

## Rotas locais do exemplo

### Health

```http
GET /health
```

### Catálogo

```http
GET /games
```

### Criar sessão

```http
POST /session
Content-Type: application/json

{
  "gameCode": "ripcom-slot:eclipse-serpent",
  "playerId": "player-001",
  "startingBalance": 10000
}
```

### Gerar launch

```http
POST /launch
Content-Type: application/json

{
  "sessionToken": "<token>"
}
```

### Encerrar sessão

```http
POST /close
Content-Type: application/json

{
  "sessionToken": "<token>"
}
```

## Segurança

Este servidor é propositalmente pequeno para fins de homologação e estudo do contrato B2B.

Antes de expor algo semelhante publicamente, um operador deve acrescentar sua própria autenticação de usuário, autorização, validação de input, CORS, rate limiting e controles de infraestrutura.

O escopo atual da RIPCOM permanece exclusivamente DEMO/fun-money.
