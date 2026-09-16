# RIPCOM Game Provider — Documentação Mestre

> **Documento oficial e fonte de verdade da documentação RIPCOM.**  
> Atualizado em: **16/09/2026**  
> Repositório: `rhonni666-debug/rr7-bet`  
> Status atual: **RIPCOM B2B v1 — SANDBOX / DEMO**

O arquivo `RIPCOM_MASTER_DOCUMENTATION.txt` continua no repositório como cópia simples/backup. A partir desta versão, este arquivo `.md` é o documento principal que deve ser atualizado quando a arquitetura evoluir.

---

## Índice

1. [O que é a RIPCOM](#1-o-que-é-a-ripcom)
2. [Modelo de desenvolvimento sem créditos](#2-modelo-de-desenvolvimento-sem-créditos)
3. [Arquitetura geral](#3-arquitetura-geral)
4. [Provider RIPCOM](#4-provider-ripcom)
5. [Primeiro jogo oficial](#5-primeiro-jogo-oficial)
6. [API B2B v1](#6-api-b2b-v1)
7. [Autenticação RSA](#7-autenticação-rsa)
8. [Idempotência e telemetria](#8-idempotência-e-telemetria)
9. [Operadores B2B](#9-operadores-b2b)
10. [Catálogo por operador](#10-catálogo-por-operador)
11. [Sessões B2B](#11-sessões-b2b)
12. [Rounds B2B](#12-rounds-b2b)
13. [Liquidação DEMO](#13-liquidação-demo)
14. [Runtime interno RIPCOM](#14-runtime-interno-ripcom)
15. [Player independente](#15-player-independente)
16. [Portal público](#16-portal-público)
17. [Painel administrativo](#17-painel-administrativo)
18. [Painel de métricas](#18-painel-de-métricas)
19. [SDK Node.js](#19-sdk-nodejs)
20. [Geração de chaves](#20-geração-de-chaves)
21. [Smoke test](#21-smoke-test)
22. [Selftest offline](#22-selftest-offline)
23. [OpenAPI](#23-openapi)
24. [CI e deploy](#24-ci-e-deploy)
25. [Segurança](#25-segurança)
26. [Sandbox x produção](#26-sandbox-x-produção)
27. [O que ainda não é produção comercial](#27-o-que-ainda-não-é-produção-comercial)
28. [Próximos passos](#28-próximos-passos)
29. [Mapa rápido dos componentes](#29-mapa-rápido-dos-componentes)

---

## 1. O que é a RIPCOM

A **RIPCOM** é a provedora própria de jogos autorais criada para permitir que os jogos desenvolvidos no projeto sejam distribuídos sem depender de provedores externos.

A separação conceitual é:

- **RIPCOM** = provedora dos jogos.
- **RR7** = primeiro operador/plataforma que consome a RIPCOM.
- **Jogos RIPCOM** = produtos independentes que futuramente podem ser oferecidos a outras plataformas.

A RIPCOM não deve ser tratada como “um conjunto de jogos internos do RR7”. Ela possui arquitetura própria de provider, API B2B, catálogo por parceiro, sessões externas, autenticação e player independente.

---

## 2. Modelo de desenvolvimento sem créditos

O projeto continua sendo desenvolvido sem depender de créditos do Lovable.

### Fonte de verdade

`GitHub`

### Backend

- Supabase
- PostgreSQL
- Edge Functions

### Validação

- GitHub Actions
- testes automatizados
- TypeScript
- build Vite

### Lovable

É **opcional**. Pode ser usado futuramente para acelerar interface/prototipação, mas não é requisito para continuar o produto.

Esse modelo segue o mesmo princípio de desenvolvimento incremental usado em projetos anteriores: código versionado, backend separado, checkpoints e CI a cada bloco importante.

---

## 3. Arquitetura geral

```text
PLATAFORMA PARCEIRA
        |
        | API B2B assinada RSA
        v
RIPCOM B2B API
        |
        | valida operador / jogo / sessão
        v
RIPCOM GAME RUNTIME
        |
        | motor / RNG / rodada
        v
PLAYER RIPCOM
        |
        v
JOGADOR
```

### Fluxo interno atual

```text
RR7
  -> RipcomProviderAdapter
  -> ripcom-provider
  -> motor RIPCOM
  -> Eclipse Serpent
```

### Fluxo futuro para terceiros

```text
PLATAFORMA EXTERNA
  -> ripcom-b2b
  -> sessão RIPCOM
  -> launch URL
  -> /ripcom/play/:sessionToken
```

A plataforma parceira não precisa receber o código-fonte do motor nem acesso direto ao banco da RIPCOM.

---

## 4. Provider RIPCOM

Tabela: `public.providers`

| Campo | Valor |
|---|---|
| `name` | `RIPCOM` |
| `slug` | `ripcom` |
| `provider_type` | `REAL` |
| `status` | `ACTIVE` |

O banco diferencia **tipo técnico** (`REAL`) de **marca** (`ripcom`).

Jogos oficiais RIPCOM não devem utilizar `provider_type = MOCK`.

---

## 5. Primeiro jogo oficial

### Eclipse Serpent

| Campo | Valor |
|---|---|
| Nome | `Eclipse Serpent` |
| Slug | `eclipse-serpent` |
| Game Code | `ripcom-slot:eclipse-serpent` |
| Launch Type | `PROVIDER_SESSION` |
| Provedor | `RIPCOM` |
| Modo atual | `DEMO` |

O Eclipse Serpent é o primeiro jogo usado para validar a arquitetura completa da provedora e deve servir de referência estrutural para os próximos jogos.

---

## 6. API B2B v1

Edge Function pública: `ripcom-b2b`

### Base URL atual do sandbox

```text
https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b
```

A função usa `verify_jwt=false` intencionalmente porque operadores externos não autenticam pela conta do RR7. A autenticação B2B é feita pela própria RIPCOM usando assinatura RSA.

### Endpoints

| Método | Rota | Função |
|---|---|---|
| `GET` | `/v1/health` | Verificar saúde da API |
| `GET` | `/v1/games` | Retornar catálogo permitido ao operador |
| `POST` | `/v1/sessions` | Criar sessão DEMO |
| `POST` | `/v1/games/launch` | Gerar launch URL |
| `POST` | `/v1/sessions/close` | Encerrar sessão |

### Health

```http
GET /v1/health
```

Não exige assinatura do operador.

### Catálogo

```http
GET /v1/games
```

Retorna somente jogos liberados em `ripcom_operator_games`.

### Criar sessão

```http
POST /v1/sessions
```

Exemplo:

```json
{
  "game_code": "ripcom-slot:eclipse-serpent",
  "player_id": "cliente-demo-001",
  "starting_balance": 10000
}
```

Resposta principal:

- `session_id`
- `session_token`
- `status`
- `currency`
- `balance`
- `expires_at`

### Launch

```http
POST /v1/games/launch
```

Recebe `session_token` e devolve `launch_url`.

A URL pode ser usada em:

- iframe
- redirect
- webview compatível

### Encerrar sessão

```http
POST /v1/sessions/close
```

### Wallet real

Rotas `/v1/wallet/*` ainda **não estão habilitadas para dinheiro real**.

O sandbox usa saldo DEMO interno por sessão. Chamadas para wallet real retornam `DEMO_ONLY_INTERNAL_WALLET`.

---

## 7. Autenticação RSA

Cada operador possui seu próprio par RSA 2048.

### O parceiro mantém

`PRIVATE KEY`

### A RIPCOM armazena

`PUBLIC KEY`

A private key nunca deve ser enviada à RIPCOM.

### Headers obrigatórios

```text
X-Ripcom-Operator
X-Ripcom-Timestamp
X-Ripcom-Request-Id
X-Ripcom-Signature
```

### Algoritmo

`RSA-SHA256 / RSASSA-PKCS1-v1_5`

### Payload canônico

```text
METHOD
PATH
TIMESTAMP
REQUEST_ID
SHA256_HEX(BODY_EXATO)
```

Representado em uma única string:

```text
METHOD\nPATH\nTIMESTAMP\nREQUEST_ID\nSHA256_HEX(BODY_EXATO)
```

O timestamp reduz risco de replay e o request ID participa do sistema de idempotência.

---

## 8. Idempotência e telemetria

Tabela: `public.ripcom_api_requests`

Funções principais:

1. impedir processamento duplicado;
2. armazenar resposta de requests B2B;
3. registrar status HTTP;
4. medir duração da requisição.

Campos principais:

- `operator_id`
- `request_id`
- `method`
- `path`
- `body_sha256`
- `response_status`
- `response_body`
- `created_at`
- `completed_at`
- `duration_ms`

Chave lógica:

```text
operator_id + request_id
```

Repetir a mesma requisição pode retornar a resposta persistida. Reutilizar o mesmo `request_id` com conteúdo diferente gera `IDEMPOTENCY_CONFLICT`.

---

## 9. Operadores B2B

Tabela: `public.ripcom_operators`

Representa cada plataforma cliente da RIPCOM.

Campos importantes:

- `id`
- `code`
- `name`
- `environment`
- `status`
- `public_key_pem`
- `allowed_origins`
- `metadata`

### Ambientes

- `SANDBOX`
- `PRODUCTION`

### Status

- `ACTIVE`
- `SUSPENDED`
- `PENDING`

### Primeiro operador

```text
code = rr7
name = RR7
environment = SANDBOX
```

---

## 10. Catálogo por operador

Tabela: `public.ripcom_operator_games`

Define quais jogos cada plataforma pode consumir.

Campos:

- `operator_id`
- `game_id`
- `enabled`

Isso permite licenciamento seletivo do catálogo sem alterar o jogo.

---

## 11. Sessões B2B

Tabela: `public.ripcom_b2b_sessions`

Essas sessões são separadas das sessões normais dos usuários RR7.

Campos principais:

- `operator_id`
- `game_id`
- `external_player_id`
- `session_token`
- `status`
- `currency`
- `demo_balance`
- `expires_at`

Currency atual:

```text
DEMO
```

---

## 12. Rounds B2B

Tabela: `public.ripcom_b2b_rounds`

Registra cada rodada executada numa sessão B2B.

Campos principais:

- `session_id`
- `request_id`
- `bet`
- `win`
- `multiplier`
- `grid`
- `feature`
- `balance_after`

Os rounds persistem para histórico, auditoria e análise técnica.

---

## 13. Liquidação DEMO

Função PostgreSQL:

```text
public.ripcom_settle_demo_spin
```

Responsabilidades:

- localizar sessão;
- validar status;
- validar expiração;
- validar aposta;
- impedir round duplicado;
- verificar saldo DEMO;
- debitar aposta;
- adicionar prêmio;
- salvar round;
- devolver novo saldo.

A execução é restrita ao `service_role`.

---

## 14. Runtime interno RIPCOM

Edge Function:

```text
ripcom-provider
```

É usada pelo RR7 quando um jogo RIPCOM roda pelo fluxo interno.

Valida:

- se o jogo pertence à RIPCOM;
- se o provider está ativo;
- se a sessão é válida.

### Diferença

```text
ripcom-provider = integração interna RR7 -> RIPCOM
ripcom-b2b      = integração externa plataforma -> RIPCOM
```

---

## 15. Player independente

Rota:

```text
/ripcom/play/:sessionToken
```

Arquivo:

```text
src/pages/RipcomPlayer.tsx
```

O player permite abrir uma sessão criada pela API B2B sem exigir login RR7.

Operações utilizadas:

- `player_state`
- `player_spin`
- `player_close`

A credencial RSA do operador nunca é enviada ao browser.

---

## 16. Portal público

Rota:

```text
/ripcom/provider
```

Arquivo:

```text
src/pages/RipcomProvider.tsx
```

Apresenta a RIPCOM como provedora separada do visual RR7.

Conteúdo:

- status da API;
- produto RIPCOM;
- Eclipse Serpent;
- arquitetura B2B;
- endpoints;
- onboarding;
- status SANDBOX / DEMO.

---

## 17. Painel administrativo

Rota:

```text
/admin/ripcom
```

Arquivo:

```text
src/pages/AdminRipcom.tsx
```

Permite:

- cadastrar plataforma;
- definir operator code;
- selecionar SANDBOX/PRODUCTION;
- ativar/suspender;
- cadastrar public key RSA;
- configurar allowed origins;
- liberar ou bloquear jogos individualmente.

As operações administrativas são protegidas por RLS.

---

## 18. Painel de métricas

Rota:

```text
/admin/ripcom-metricas
```

Arquivo:

```text
src/pages/AdminRipcomTelemetry.tsx
```

Acompanha:

- requests recentes;
- operador;
- rota;
- status HTTP;
- duração;
- sessões ativas;
- rounds;
- apostas DEMO;
- prêmios DEMO;
- taxa de erro;
- latência média;
- P95.

---

## 19. SDK Node.js

Arquivo:

```text
sdk/ripcom-node.mjs
```

Classe principal:

```text
RipcomClient
```

Métodos:

- `health()`
- `games()`
- `createSession()`
- `launch()`
- `closeSession()`

O SDK monta automaticamente:

- timestamp;
- request ID;
- hash SHA-256;
- payload canônico;
- assinatura RSA-SHA256;
- headers RIPCOM.

Documentação:

```text
sdk/README.md
```

---

## 20. Geração de chaves

Comando:

```bash
npm run ripcom:keys -- codigo-do-operador
```

Script:

```text
scripts/ripcom-generate-operator-keys.mjs
```

Arquivos locais:

```text
.ripcom-keys/<operador>-private.pem
.ripcom-keys/<operador>-public.pem
```

A pasta `.ripcom-keys/` é ignorada pelo Git.

---

## 21. Smoke test

Comando:

```bash
npm run ripcom:smoke
```

Script:

```text
scripts/ripcom-b2b-smoke.mjs
```

Fluxo esperado:

1. catálogo;
2. sessão;
3. launch;
4. player;
5. spin DEMO;
6. close.

---

## 22. Selftest offline

Comando:

```bash
npm run ripcom:sdk:test
```

Script:

```text
scripts/ripcom-sdk-selftest.mjs
```

Esse teste **não depende de internet**.

Ele:

- gera RSA temporário em memória;
- cria requests pelo SDK;
- valida headers;
- reconstrói o payload canônico;
- verifica a assinatura com a public key;
- valida o payload da criação de sessão.

Esse selftest faz parte do CI.

---

## 23. OpenAPI

Arquivo:

```text
docs/ripcom-b2b-openapi.yaml
```

Pode ser utilizado em:

- Swagger UI;
- Postman;
- geração automática de clientes;
- documentação técnica para parceiros.

### Documentação complementar

- `docs/RIPCOM_PROVIDER_ARCHITECTURE.md`
- `docs/RIPCOM_B2B_V1.md`
- `docs/ripcom-b2b-openapi.yaml`
- `sdk/README.md`
- `RIPCOM_MASTER_DOCUMENTATION.md` ← documento mestre
- `RIPCOM_MASTER_DOCUMENTATION.txt` ← backup simples

---

## 24. CI e deploy

Workflow de CI:

```text
.github/workflows/ci.yml
```

Executa:

```text
npm install
npm run test
npm run ripcom:sdk:test
npm run typecheck
npm run build
```

Deploy web:

```text
.github/workflows/deploy-pages.yml
```

Publica o frontend e o portal RIPCOM no GitHub Pages.

---

## 25. Segurança

Regras obrigatórias:

1. nunca colocar private key RSA no frontend;
2. nunca salvar private key do parceiro no banco RIPCOM;
3. RIPCOM armazena somente public keys;
4. cada operador deve ter chave própria;
5. requests assinados devem ter timestamp;
6. cada request deve possuir ID único;
7. idempotência deve impedir duplicação;
8. o player recebe somente token temporário;
9. RLS protege tabelas administrativas;
10. liquidação DEMO roda apenas com `service_role`;
11. dinheiro real não deve ser ativado apenas alterando configuração.

---

## 26. Sandbox x produção

### SANDBOX

- modo atual;
- saldo fictício;
- integração técnica;
- homologação de parceiros;
- DEMO/fun-money.

### PRODUCTION

É um ambiente previsto na arquitetura, mas **não significa automaticamente operação autorizada com dinheiro real**.

Produção real exigirá camada específica de engenharia, compliance, segurança e requisitos regulatórios aplicáveis.

---

## 27. O que ainda não é produção comercial

Ainda não considerar pronto para dinheiro real:

- wallet real;
- callbacks financeiros reais;
- certificação independente do RNG;
- certificação matemática dos jogos;
- compliance por jurisdição;
- gestão formal de releases de jogos;
- SLA comercial;
- infraestrutura dedicada de domínio;
- WAF/rate limiting de produção;
- rotação automatizada de chaves;
- staging totalmente separado do RR7.

---

## 28. Próximos passos

1. Criar segundo operador sandbox usando o painel RIPCOM.
2. Gerar RSA próprio para esse operador.
3. Rodar smoke test ponta a ponta.
4. Validar Eclipse Serpent fora do fluxo normal RR7.
5. Criar **Game Manifest** versionado por jogo.
6. Criar versionamento formal de releases.
7. Criar segundo jogo autoral RIPCOM.
8. Separar ambiente staging dedicado.
9. Definir domínio próprio quando houver domínio disponível.
10. Preparar pacote de onboarding para primeiro parceiro externo real.

---

## 29. Mapa rápido dos componentes

| Componente | O que é |
|---|---|
| `RIPCOM` | Provedora de jogos |
| `RR7` | Primeiro operador sandbox |
| `Eclipse Serpent` | Primeiro jogo oficial |
| `ripcom-provider` | Runtime interno RR7 → RIPCOM |
| `ripcom-b2b` | API externa B2B |
| `ripcom_operators` | Cadastro de plataformas parceiras |
| `ripcom_operator_games` | Catálogo permitido por operador |
| `ripcom_api_requests` | Idempotência + telemetria |
| `ripcom_b2b_sessions` | Sessões externas |
| `ripcom_b2b_rounds` | Rodadas externas |
| `ripcom_settle_demo_spin` | Liquidação atômica DEMO |
| `/ripcom/play/:sessionToken` | Player independente |
| `/ripcom/provider` | Portal público RIPCOM |
| `/admin/ripcom` | Gestão dos operadores |
| `/admin/ripcom-metricas` | Métricas e auditoria técnica |
| `sdk/ripcom-node.mjs` | SDK Node.js |
| `npm run ripcom:keys` | Gerar RSA do parceiro |
| `npm run ripcom:smoke` | Teste ponta a ponta |
| `npm run ripcom:sdk:test` | Teste RSA offline |
| `RIPCOM_MASTER_DOCUMENTATION.md` | Documento mestre oficial |
| `RIPCOM_MASTER_DOCUMENTATION.txt` | Backup simples |

---

## Regra para futuras alterações

Toda mudança estrutural importante da RIPCOM deve atualizar este documento no mesmo ciclo de desenvolvimento, especialmente quando envolver:

- nova tabela;
- nova Edge Function;
- novo endpoint;
- novo jogo;
- mudança de autenticação;
- novo SDK;
- mudança de infraestrutura;
- requisito de produção;
- mudança de segurança;
- onboarding de parceiro.
