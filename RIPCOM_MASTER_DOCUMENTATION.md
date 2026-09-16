# RIPCOM Game Provider — Documentação Mestre

> **Documento oficial e fonte de verdade da documentação RIPCOM.**  
> Atualizado em: **16/09/2026**  
> Repositório: `rhonni666-debug/rr7-bet`  
> Status atual: **RIPCOM B2B v1 — SANDBOX / DEMO**

O arquivo `RIPCOM_MASTER_DOCUMENTATION.txt` continua no repositório como cópia simples/backup. Este arquivo `.md` é o documento principal e deve ser atualizado sempre que a arquitetura evoluir.

---

## Índice

1. [O que é a RIPCOM](#1-o-que-é-a-ripcom)
2. [Modelo de desenvolvimento sem créditos](#2-modelo-de-desenvolvimento-sem-créditos)
3. [Arquitetura geral](#3-arquitetura-geral)
4. [Provider RIPCOM](#4-provider-ripcom)
5. [Eclipse Serpent](#5-eclipse-serpent)
6. [Versionamento e Game Manifest](#6-versionamento-e-game-manifest)
7. [API B2B v1](#7-api-b2b-v1)
8. [Autenticação RSA](#8-autenticação-rsa)
9. [Idempotência e telemetria](#9-idempotência-e-telemetria)
10. [Operadores B2B](#10-operadores-b2b)
11. [Catálogo e release por operador](#11-catálogo-e-release-por-operador)
12. [Sessões B2B](#12-sessões-b2b)
13. [Rounds B2B](#13-rounds-b2b)
14. [Liquidação DEMO](#14-liquidação-demo)
15. [Runtime interno RIPCOM](#15-runtime-interno-ripcom)
16. [Player independente](#16-player-independente)
17. [Portal público](#17-portal-público)
18. [Painéis administrativos](#18-painéis-administrativos)
19. [SDK Node.js](#19-sdk-nodejs)
20. [Geração de chaves](#20-geração-de-chaves)
21. [Smoke test](#21-smoke-test)
22. [Selftest offline](#22-selftest-offline)
23. [OpenAPI](#23-openapi)
24. [Homologação core realizada](#24-homologação-core-realizada)
25. [CI e deploy](#25-ci-e-deploy)
26. [Segurança](#26-segurança)
27. [Sandbox x produção](#27-sandbox-x-produção)
28. [O que ainda não é produção comercial](#28-o-que-ainda-não-é-produção-comercial)
29. [Próximos passos](#29-próximos-passos)
30. [Mapa rápido dos componentes](#30-mapa-rápido-dos-componentes)

---

## 1. O que é a RIPCOM

A **RIPCOM** é a provedora própria de jogos autorais criada para permitir que os jogos desenvolvidos no projeto sejam distribuídos sem depender de provedores externos.

A separação conceitual é:

- **RIPCOM** = provedora dos jogos.
- **RR7** = primeiro operador/plataforma que consome a RIPCOM.
- **Jogos RIPCOM** = produtos independentes que futuramente podem ser oferecidos a outras plataformas.

A RIPCOM não deve ser tratada como “um conjunto de jogos internos do RR7”. Ela possui arquitetura própria de provider, API B2B, catálogo por parceiro, sessões externas, autenticação, versionamento e player independente.

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

O princípio é o mesmo usado no app do gêmeo digital: desenvolvimento incremental, backend separado, checkpoints e CI a cada bloco importante.

---

## 3. Arquitetura geral

```text
PLATAFORMA PARCEIRA
        |
        | API B2B assinada RSA
        v
RIPCOM B2B API
        |
        | valida operador / entitlement / release / sessão
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

O banco diferencia **tipo técnico** (`REAL`) de **marca** (`ripcom`). Jogos oficiais RIPCOM não devem utilizar `provider_type = MOCK`.

---

## 5. Eclipse Serpent

| Campo | Valor |
|---|---|
| Nome | `Eclipse Serpent` |
| Slug | `eclipse-serpent` |
| Game Code | `ripcom-slot:eclipse-serpent` |
| Launch Type | `PROVIDER_SESSION` |
| Provedor | `RIPCOM` |
| Modo atual | `DEMO` |
| Release atual | `1.0.0` |
| Release status | `SANDBOX` |

O Eclipse Serpent é o primeiro jogo usado para validar a arquitetura completa da provedora e serve como referência estrutural para os próximos jogos.

---

## 6. Versionamento e Game Manifest

### Tabela de releases

`public.ripcom_game_releases`

Função: registrar versões formais dos jogos RIPCOM.

Campos principais:

- `game_id`
- `version`
- `status`
- `manifest`
- `notes`
- `released_at`
- `created_at`
- `updated_at`

Status possíveis:

- `DRAFT`
- `SANDBOX`
- `RELEASED`
- `RETIRED`

### Release atual do Eclipse Serpent

```text
version = 1.0.0
status = SANDBOX
```

### Game Manifest no repositório

```text
games/eclipse-serpent/manifest.json
```

O manifest registra:

- provider;
- game code;
- versão;
- modo;
- launch type;
- runtime;
- player route;
- capabilities;
- segurança;
- canal de release.

### Fixação de versão por operador

`public.ripcom_operator_games.release_id`

Cada operador pode ser fixado numa release específica. Isso permite que um parceiro permaneça em `1.0.0` enquanto outro homologa uma versão nova.

### Fixação de versão por sessão

`public.ripcom_b2b_sessions.game_release_id`

Trigger:

```text
ripcom_b2b_sessions_bind_release
```

Função:

```text
public.ripcom_bind_session_release()
```

Toda nova sessão B2B recebe automaticamente a release atribuída ao operador. Isso preserva auditoria histórica mesmo depois de uma atualização do jogo.

### Painel de releases

Rota:

```text
/admin/ripcom-releases
```

Arquivo:

```text
src/pages/AdminRipcomReleases.tsx
```

Permite visualizar release, status, operadores fixados e Game Manifest.

---

## 7. API B2B v1

Edge Function pública: `ripcom-b2b`

### Base URL atual do sandbox

```text
https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b
```

A função usa `verify_jwt=false` intencionalmente porque operadores externos não autenticam pela conta do RR7. A autenticação B2B é feita pela própria RIPCOM usando assinatura RSA.

### Endpoints

| Método | Rota | Função |
|---|---|---|
| `GET` | `/v1/health` | Saúde da API |
| `GET` | `/v1/games` | Catálogo permitido ao operador |
| `POST` | `/v1/sessions` | Criar sessão DEMO |
| `POST` | `/v1/games/launch` | Gerar launch URL |
| `POST` | `/v1/sessions/close` | Encerrar sessão |

### Criar sessão

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

### Wallet real

Rotas `/v1/wallet/*` ainda **não estão habilitadas para dinheiro real**. O sandbox utiliza saldo DEMO interno por sessão.

---

## 8. Autenticação RSA

Cada operador possui seu próprio par RSA 2048.

### O parceiro mantém

`PRIVATE KEY`

### A RIPCOM armazena

`PUBLIC KEY`

Headers obrigatórios:

```text
X-Ripcom-Operator
X-Ripcom-Timestamp
X-Ripcom-Request-Id
X-Ripcom-Signature
```

Algoritmo:

`RSA-SHA256 / RSASSA-PKCS1-v1_5`

Payload canônico:

```text
METHOD\nPATH\nTIMESTAMP\nREQUEST_ID\nSHA256_HEX(BODY_EXATO)
```

O timestamp reduz replay e o request ID participa da idempotência.

---

## 9. Idempotência e telemetria

Tabela: `public.ripcom_api_requests`

Funções:

1. impedir processamento duplicado;
2. armazenar resposta B2B;
3. registrar status HTTP;
4. medir duração.

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

Reutilizar o mesmo `request_id` com conteúdo diferente gera `IDEMPOTENCY_CONFLICT`.

---

## 10. Operadores B2B

Tabela: `public.ripcom_operators`

Campos principais:

- `id`
- `code`
- `name`
- `environment`
- `status`
- `public_key_pem`
- `allowed_origins`
- `metadata`

Ambientes:

- `SANDBOX`
- `PRODUCTION`

Status:

- `ACTIVE`
- `SUSPENDED`
- `PENDING`

### RR7

```text
code = rr7
status = ACTIVE
environment = SANDBOX
release Eclipse Serpent = 1.0.0
```

### Operador de homologação

```text
code = ripcom-qa
name = RIPCOM QA Sandbox
environment = SANDBOX
status atual = SUSPENDED
release Eclipse Serpent = 1.0.0
```

`ripcom-qa` foi usado para homologação do núcleo. A chave usada era efêmera, portanto o operador foi suspenso após o teste. Deve receber nova chave antes do smoke test HTTP externo.

---

## 11. Catálogo e release por operador

Tabela: `public.ripcom_operator_games`

Campos:

- `operator_id`
- `game_id`
- `enabled`
- `release_id`

Essa tabela controla simultaneamente:

- se o operador pode usar o jogo;
- qual versão do jogo está liberada para ele.

---

## 12. Sessões B2B

Tabela: `public.ripcom_b2b_sessions`

Campos principais:

- `operator_id`
- `game_id`
- `game_release_id`
- `external_player_id`
- `session_token`
- `status`
- `currency`
- `demo_balance`
- `expires_at`

Currency atual: `DEMO`.

As sessões externas são separadas das sessões normais dos usuários RR7.

---

## 13. Rounds B2B

Tabela: `public.ripcom_b2b_rounds`

Campos:

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

## 14. Liquidação DEMO

Função:

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

Execução restrita ao `service_role`.

---

## 15. Runtime interno RIPCOM

Edge Function:

```text
ripcom-provider
```

Usada pelo RR7 para jogos RIPCOM pelo fluxo interno.

```text
ripcom-provider = integração interna RR7 -> RIPCOM
ripcom-b2b      = integração externa plataforma -> RIPCOM
```

---

## 16. Player independente

Rota:

```text
/ripcom/play/:sessionToken
```

Arquivo:

```text
src/pages/RipcomPlayer.tsx
```

Operações internas:

- `player_state`
- `player_spin`
- `player_close`

O browser recebe somente o token temporário da sessão, nunca a private key RSA do operador.

---

## 17. Portal público

Rota:

```text
/ripcom/provider
```

Arquivo:

```text
src/pages/RipcomProvider.tsx
```

Apresenta a RIPCOM como provedora separada do visual RR7, incluindo produto, API, arquitetura B2B e onboarding.

---

## 18. Painéis administrativos

### Operadores e distribuição

```text
/admin/ripcom
src/pages/AdminRipcom.tsx
```

Permite cadastrar operador, ambiente, status, public key RSA, allowed origins e jogos liberados.

### Releases

```text
/admin/ripcom-releases
src/pages/AdminRipcomReleases.tsx
```

Permite acompanhar versões, status de release, operadores fixados e manifest técnico.

### Métricas

```text
/admin/ripcom-metricas
src/pages/AdminRipcomTelemetry.tsx
```

Acompanha requests, HTTP status, latência, P95, taxa de erro, sessões, rounds, apostas DEMO e prêmios DEMO.

---

## 19. SDK Node.js

Arquivo:

```text
sdk/ripcom-node.mjs
```

Classe principal: `RipcomClient`.

Métodos:

- `health()`
- `games()`
- `createSession()`
- `launch()`
- `closeSession()`

O SDK monta automaticamente timestamp, request ID, SHA-256, assinatura RSA e headers RIPCOM.

Documentação: `sdk/README.md`.

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

`.ripcom-keys/` é ignorada pelo Git.

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

O smoke HTTP externo ainda precisa ser executado de um ambiente com resolução de rede para o domínio Supabase.

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

Não depende de internet. Gera RSA temporário, cria requests pelo SDK, valida headers, reconstrói payload canônico e verifica assinatura com a public key.

Esse teste faz parte do CI.

---

## 23. OpenAPI

Arquivo:

```text
docs/ripcom-b2b-openapi.yaml
```

Uso previsto:

- Swagger UI;
- Postman;
- geração de clientes;
- documentação técnica para parceiros.

Documentação complementar:

- `docs/RIPCOM_PROVIDER_ARCHITECTURE.md`
- `docs/RIPCOM_B2B_V1.md`
- `docs/RIPCOM_QA_REPORT_2026-09-16.md`
- `docs/ripcom-b2b-openapi.yaml`
- `sdk/README.md`
- `RIPCOM_MASTER_DOCUMENTATION.md`
- `RIPCOM_MASTER_DOCUMENTATION.txt`

---

## 24. Homologação core realizada

Data: **16/09/2026**.

Operador: `ripcom-qa`.

Resultado geral: **PASSOU — CORE DB FLOW**.

### Release binding

Sessão criada com:

- saldo inicial `1000 DEMO`;
- release automática `Eclipse Serpent 1.0.0`;
- status inicial `ACTIVE`.

Resultado: **PASSOU**.

### Liquidação

Rodada de QA:

- aposta `5`;
- prêmio `10`;
- multiplicador `2x`;
- saldo esperado `1005`;
- saldo observado `1005`.

Resultado: **PASSOU**.

### Idempotência

O mesmo `request_id = qa-idempotency-001` foi liquidado duas vezes.

Resultado:

- apenas `1` round persistido;
- saldo permaneceu `1005`;
- não houve débito/crédito duplicado.

Resultado: **PASSOU**.

### Sessão encerrada

Após alterar a sessão para `CLOSED`, uma nova tentativa de rodada retornou:

```text
SESSION_NOT_ACTIVE
```

Resultado: **PASSOU**.

Relatório detalhado:

```text
docs/RIPCOM_QA_REPORT_2026-09-16.md
```

### Limitação do teste HTTP

O terminal disponível nesta execução não conseguiu resolver o host do Supabase. Portanto, o teste HTTP assinado de ponta a ponta não foi marcado como aprovado nem reprovado. O núcleo transacional foi validado diretamente no backend.

---

## 25. CI e deploy

Workflow:

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

---

## 26. Segurança

Regras obrigatórias:

1. nunca colocar private key RSA no frontend;
2. nunca salvar private key do parceiro no banco RIPCOM;
3. armazenar somente public keys;
4. cada operador deve ter chave própria;
5. requests assinados devem ter timestamp;
6. cada request deve ter ID único;
7. idempotência deve impedir duplicação;
8. player recebe somente token temporário;
9. RLS protege tabelas administrativas;
10. liquidação DEMO roda somente com `service_role`;
11. sessões ficam vinculadas à release utilizada;
12. chaves efêmeras de QA devem ser suspensas/rotacionadas após o teste;
13. dinheiro real não deve ser ativado apenas alterando configuração.

---

## 27. Sandbox x produção

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

## 28. O que ainda não é produção comercial

Ainda não considerar pronto para dinheiro real:

- wallet real;
- callbacks financeiros reais;
- certificação independente do RNG;
- certificação matemática dos jogos;
- compliance por jurisdição;
- SLA comercial;
- infraestrutura dedicada de domínio;
- WAF/rate limiting de produção;
- rotação automatizada de chaves;
- staging totalmente separado do RR7.

O versionamento formal dos jogos **já foi iniciado** e não pertence mais a esta lista de pendências.

---

## 29. Próximos passos

1. Gerar/rotacionar uma nova RSA para `ripcom-qa`.
2. Reativar `ripcom-qa` temporariamente.
3. Executar smoke HTTP assinado de ponta a ponta em ambiente com rede.
4. Confirmar catálogo → sessão → launch → player → spin → close.
5. Fazer a API `/v1/games` expor explicitamente a versão/release autorizada ao operador.
6. Fazer a resposta de sessão incluir a release vinculada.
7. Criar segundo jogo autoral RIPCOM usando o mesmo contrato B2B.
8. Separar ambiente staging dedicado do RR7.
9. Definir domínio próprio RIPCOM quando disponível.
10. Preparar pacote formal de onboarding para o primeiro parceiro externo real.

---

## 30. Mapa rápido dos componentes

| Componente | O que é |
|---|---|
| `RIPCOM` | Provedora de jogos |
| `RR7` | Primeiro operador sandbox |
| `Eclipse Serpent` | Primeiro jogo oficial |
| `1.0.0` | Primeira release formal do Eclipse Serpent |
| `games/eclipse-serpent/manifest.json` | Game Manifest da release |
| `ripcom_game_releases` | Registro de versões dos jogos |
| `ripcom_bind_session_release()` | Liga nova sessão à release do operador |
| `ripcom-provider` | Runtime interno RR7 → RIPCOM |
| `ripcom-b2b` | API externa B2B |
| `ripcom_operators` | Plataformas parceiras |
| `ripcom_operator_games` | Jogo + release autorizada por operador |
| `ripcom_api_requests` | Idempotência + telemetria |
| `ripcom_b2b_sessions` | Sessões externas com release fixa |
| `ripcom_b2b_rounds` | Rodadas externas |
| `ripcom_settle_demo_spin` | Liquidação atômica DEMO |
| `/ripcom/play/:sessionToken` | Player independente |
| `/ripcom/provider` | Portal público RIPCOM |
| `/admin/ripcom` | Gestão de operadores |
| `/admin/ripcom-releases` | Gestão/visualização das releases |
| `/admin/ripcom-metricas` | Métricas e auditoria técnica |
| `sdk/ripcom-node.mjs` | SDK Node.js |
| `npm run ripcom:keys` | Gerar RSA do parceiro |
| `npm run ripcom:smoke` | Smoke ponta a ponta |
| `npm run ripcom:sdk:test` | Teste RSA offline |
| `docs/RIPCOM_QA_REPORT_2026-09-16.md` | Relatório da homologação core |
| `RIPCOM_MASTER_DOCUMENTATION.md` | Documento mestre oficial |
| `RIPCOM_MASTER_DOCUMENTATION.txt` | Backup simples |

---

## Regra para futuras alterações

Toda mudança estrutural importante da RIPCOM deve atualizar este documento no mesmo ciclo de desenvolvimento, especialmente quando envolver:

- nova tabela;
- nova Edge Function;
- novo endpoint;
- novo jogo;
- nova release;
- mudança de autenticação;
- novo SDK;
- mudança de infraestrutura;
- requisito de produção;
- mudança de segurança;
- onboarding de parceiro.
