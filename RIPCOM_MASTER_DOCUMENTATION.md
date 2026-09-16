# RIPCOM Game Provider — Documentação Mestre

> **Fonte de verdade oficial da documentação RIPCOM**  
> Atualizado em: **16/09/2026**  
> Repositório: `rhonni666-debug/rr7-bet`  
> Status: **RIPCOM B2B v1 — SANDBOX / DEMO**

O arquivo `RIPCOM_MASTER_DOCUMENTATION.txt` permanece como backup simples. Este `.md` é o documento principal e deve ser atualizado no mesmo ciclo de qualquer mudança estrutural.

---

## 1. O que é a RIPCOM

A **RIPCOM** é a provedora própria de jogos autorais do projeto.

Separação oficial:

- **RIPCOM** = provedora e dona da infraestrutura dos jogos.
- **RR7** = primeiro operador sandbox da RIPCOM.
- **Jogos RIPCOM** = produtos independentes que podem ser distribuídos para outros operadores.

A RIPCOM não deve depender da interface do RR7 para existir como provider.

---

## 2. Desenvolvimento sem depender de créditos

Modelo adotado:

- **GitHub** = fonte de verdade do código.
- **Supabase/PostgreSQL/Edge Functions** = backend.
- **GitHub Actions** = testes, typecheck e build.
- **Lovable** = opcional, nunca requisito para continuidade.

Esse é o mesmo princípio de desenvolvimento incremental usado no app do gêmeo digital: código versionado, backend separado e validação contínua.

---

## 3. Arquitetura

```text
PLATAFORMA PARCEIRA
        |
        | RSA-SHA256
        v
RIPCOM B2B API
        |
        | operador + entitlement + release + sessão
        v
RIPCOM GAME RUNTIME
        |
        | RNG / round / ledger DEMO
        v
RIPCOM STANDALONE PLAYER
        |
        v
JOGADOR
```

### Fluxo interno RR7

```text
RR7
 -> RipcomProviderAdapter
 -> ripcom-provider
 -> motor RIPCOM
 -> jogo
```

### Fluxo de plataforma externa

```text
OPERADOR EXTERNO
 -> ripcom-b2b
 -> sessão
 -> launch_url
 -> ripcom-provider frontend standalone
 -> player
```

---

## 4. Provider RIPCOM

Tabela: `public.providers`

| Campo | Valor |
|---|---|
| `name` | `RIPCOM` |
| `slug` | `ripcom` |
| `provider_type` | `REAL` |
| `status` | `ACTIVE` |

Jogos oficiais RIPCOM não devem usar `MOCK`.

---

## 5. Primeiro jogo — Eclipse Serpent

| Campo | Valor |
|---|---|
| Nome | `Eclipse Serpent` |
| Slug | `eclipse-serpent` |
| Game Code | `ripcom-slot:eclipse-serpent` |
| Launch Type | `PROVIDER_SESSION` |
| Modo | `DEMO` |
| Release | `1.0.0` |
| Release Status | `SANDBOX` |

Game Manifest:

```text
games/eclipse-serpent/manifest.json
```

---

## 6. Versionamento de jogos

Tabela:

```text
public.ripcom_game_releases
```

Campos principais:

- `game_id`
- `version`
- `status`
- `manifest`
- `notes`
- `released_at`

Status:

- `DRAFT`
- `SANDBOX`
- `RELEASED`
- `RETIRED`

### Pin de release por operador

```text
public.ripcom_operator_games.release_id
```

Um operador pode permanecer numa versão enquanto outro testa uma versão nova.

### Pin de release por sessão

```text
public.ripcom_b2b_sessions.game_release_id
```

Função/trigger:

```text
public.ripcom_bind_session_release()
ripcom_b2b_sessions_bind_release
```

Toda sessão nova herda automaticamente a release atribuída ao operador.

Painel:

```text
/admin/ripcom-releases
src/pages/AdminRipcomReleases.tsx
```

---

## 7. API B2B v1

Edge Function:

```text
ripcom-b2b
```

Base sandbox:

```text
https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b
```

`verify_jwt=false` é intencional: operadores externos usam autenticação RSA própria da RIPCOM.

Endpoints atuais:

| Método | Rota | Função |
|---|---|---|
| `GET` | `/v1/health` | Saúde pública da API |
| `GET` | `/v1/games` | Catálogo permitido |
| `POST` | `/v1/sessions` | Criar sessão DEMO |
| `POST` | `/v1/games/launch` | Gerar launch URL |
| `POST` | `/v1/sessions/close` | Encerrar sessão |

Rotas `/v1/wallet/*` não habilitam dinheiro real nesta fase.

---

## 8. Autenticação B2B

Cada operador possui seu próprio par RSA.

- parceiro guarda **PRIVATE KEY**;
- RIPCOM guarda somente **PUBLIC KEY**.

Headers:

```text
X-Ripcom-Operator
X-Ripcom-Timestamp
X-Ripcom-Request-Id
X-Ripcom-Signature
```

Algoritmo:

```text
RSA-SHA256 / RSASSA-PKCS1-v1_5
```

Canonical string:

```text
METHOD\nPATH\nTIMESTAMP\nREQUEST_ID\nSHA256_HEX(BODY_EXATO)
```

---

## 9. Operadores B2B

Tabela:

```text
public.ripcom_operators
```

Campos principais:

- `code`
- `name`
- `environment`
- `status`
- `public_key_pem`
- `allowed_origins`
- `api_version`
- `wallet_mode`
- `callback_url`
- `max_requests_per_minute`
- `max_sessions_per_minute`
- `revoked_at`
- `last_key_rotation_at`
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
operator_code = rr7
environment = SANDBOX
status = ACTIVE
Eclipse Serpent = 1.0.0
```

### QA

```text
operator_code = ripcom-qa
environment = SANDBOX
status atual = SUSPENDED
Eclipse Serpent = 1.0.0
```

O operador QA foi suspenso após uso de uma chave efêmera. Deve receber chave nova antes do próximo smoke HTTP.

---

## 10. Perfil empresarial privado da RIPCOM

A RIPCOM agora possui estrutura separada para identidade empresarial/contratual.

Tabela:

```text
public.ripcom_company_profile
```

Finalidade:

- razão social;
- nome fantasia;
- CNPJ;
- país;
- e-mail comercial;
- telefone comercial;
- site;
- contato contratual;
- e-mail contratual;
- notas internas.

O CNPJ **não é colocado no código-fonte, manifests públicos ou player**. Ele fica no backend privado e somente administradores podem ler/alterar por RLS.

Painel:

```text
/admin/ripcom-empresa
src/pages/AdminRipcomCompany.tsx
```

O perfil foi criado inicialmente com `trade_name = RIPCOM` e `country_code = BR`, sem inventar razão social, CNPJ ou contatos.

Ter um CNPJ permite preencher a identidade empresarial real quando desejado, mas os requisitos de eventual operação regulada/produção continuam sendo uma etapa separada.

---

## 11. Catálogo por operador

Tabela:

```text
public.ripcom_operator_games
```

Campos:

- `operator_id`
- `game_id`
- `enabled`
- `release_id`

A tabela define **qual jogo** e **qual release** o parceiro pode consumir.

---

## 12. Idempotência e telemetria

Tabela:

```text
public.ripcom_api_requests
```

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

O mesmo `request_id` com conteúdo diferente gera `IDEMPOTENCY_CONFLICT`.

---

## 13. Sessões e rounds

### Sessões

Tabela:

```text
public.ripcom_b2b_sessions
```

Campos importantes:

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

### Rounds

Tabela:

```text
public.ripcom_b2b_rounds
```

Registra:

- `session_id`
- `request_id`
- `bet`
- `win`
- `multiplier`
- `grid`
- `feature`
- `balance_after`

---

## 14. Liquidação DEMO

Função:

```text
public.ripcom_settle_demo_spin
```

Responsabilidades:

- validar sessão;
- validar expiração;
- validar aposta;
- checar saldo;
- garantir idempotência;
- debitar aposta;
- creditar prêmio;
- persistir round;
- devolver saldo atualizado.

Execução sensível restrita ao `service_role`.

---

## 15. Edge Functions

### `ripcom-provider`

Runtime interno usado pelo RR7.

### `ripcom-b2b`

API externa para operadores.

Diferença:

```text
ripcom-provider = RR7 -> RIPCOM
ripcom-b2b      = parceiro -> RIPCOM
```

---

## 16. Frontend oficial standalone RIPCOM

Diretório:

```text
ripcom-provider/
```

Este é o **frontend canônico da provedora**.

Versão atual:

```text
1.0.0-sandbox.1
```

Componentes:

- portal público;
- API Docs;
- tela Sandbox;
- visão Operator;
- player independente;
- branding RIPCOM.

Manifest do frontend:

```text
ripcom-provider/public/provider-manifest.json
```

Documentação:

```text
ripcom-provider/README.md
```

Configuração pública de exemplo:

```text
ripcom-provider/.env.example
```

O versionamento desse frontend é independente do versionamento dos jogos.

```text
RIPCOM Provider Frontend = 1.0.0-sandbox.1
Eclipse Serpent          = 1.0.0
```

---

## 17. Launch URL oficial

O `ripcom-b2b` usa como base padrão de launch o frontend standalone:

```text
https://rhonni666-debug.github.io/rr7-bet/ripcom-provider
```

Formato:

```text
<provider-base>/?play=<session_token>
```

No futuro, `RIPCOM_PUBLIC_BASE_URL` poderá apontar para domínio próprio sem alterar o contrato B2B.

A rota `/ripcom/play/:sessionToken` dentro do RR7 fica como compatibilidade/transição, não como frontend canônico.

---

## 18. Player standalone

Arquivo principal:

```text
ripcom-provider/src/App.tsx
```

O app detecta:

```text
?play=<session_token>
```

O player usa:

- `player_state`
- `player_spin`
- `player_close`

A chave RSA do operador nunca é enviada ao browser.

---

## 19. Painéis administrativos

### Operadores

```text
/admin/ripcom
```

Gerencia operadores, public keys, ambiente, status, limites e jogos.

### Empresa

```text
/admin/ripcom-empresa
```

Gerencia dados empresariais privados da RIPCOM, incluindo CNPJ quando preenchido.

### Releases

```text
/admin/ripcom-releases
```

Mostra releases, manifest e operadores fixados.

### Métricas

```text
/admin/ripcom-metricas
```

Acompanha requests, latência, status HTTP, sessões e rounds.

---

## 20. SDK Node.js

Arquivo:

```text
sdk/ripcom-node.mjs
```

Métodos:

- `health()`
- `games()`
- `createSession()`
- `launch()`
- `closeSession()`

Documentação:

```text
sdk/README.md
```

---

## 21. Backend exemplo de operador

Arquivos:

```text
examples/ripcom-node-operator/server.mjs
examples/ripcom-node-operator/README.md
```

Objetivo: mostrar como um parceiro mantém a private key somente no servidor e utiliza o SDK RIPCOM.

Rotas locais:

- `GET /health`
- `GET /games`
- `POST /session`
- `POST /launch`
- `POST /close`

Esse exemplo é para homologação DEMO, não para ser publicado sem controles adicionais do próprio operador.

---

## 22. Ferramentas de integração

### Gerar chaves

```bash
npm run ripcom:keys -- operator-code
```

Script:

```text
scripts/ripcom-generate-operator-keys.mjs
```

### Smoke test

```bash
npm run ripcom:smoke
```

Script:

```text
scripts/ripcom-b2b-smoke.mjs
```

### Selftest offline

```bash
npm run ripcom:sdk:test
```

Script:

```text
scripts/ripcom-sdk-selftest.mjs
```

O selftest gera RSA em memória e valida assinatura sem internet.

---

## 23. OpenAPI

Arquivo:

```text
docs/ripcom-b2b-openapi.yaml
```

Uso:

- Swagger;
- Postman;
- geração de clientes;
- documentação de parceiros.

---

## 24. Homologação core concluída

Relatório:

```text
docs/RIPCOM_QA_REPORT_2026-09-16.md
```

Resultado: **PASSOU — CORE DB FLOW**.

Foi validado:

- sessão com release automática `1.0.0`;
- saldo inicial `1000`;
- aposta `5`;
- prêmio `10`;
- saldo final `1005`;
- mesmo `request_id` executado duas vezes criou somente `1` round;
- sessão `CLOSED` recusou nova rodada com `SESSION_NOT_ACTIVE`.

O smoke HTTP externo ainda deve ser executado de um ambiente com conectividade ao host Supabase.

---

## 25. CI

Workflow:

```text
.github/workflows/ci.yml
```

Valida:

- testes RR7;
- selftest SDK RIPCOM;
- sintaxe do backend exemplo;
- JSON do provider manifest;
- typecheck RR7;
- build RR7;
- typecheck do frontend standalone RIPCOM;
- build do frontend standalone RIPCOM.

---

## 26. Deploy

Workflow:

```text
.github/workflows/deploy-pages.yml
```

Publica:

```text
RR7                 -> raiz do Pages
RIPCOM standalone   -> /ripcom-provider/
```

O frontend standalone é compilado separadamente antes de ser copiado para o artefato do Pages.

---

## 27. Documentação complementar

- `docs/RIPCOM_PROVIDER_ARCHITECTURE.md`
- `docs/RIPCOM_B2B_V1.md`
- `docs/RIPCOM_PARTNER_ONBOARDING.md`
- `docs/RIPCOM_QA_REPORT_2026-09-16.md`
- `docs/ripcom-b2b-openapi.yaml`
- `sdk/README.md`
- `ripcom-provider/README.md`
- `examples/ripcom-node-operator/README.md`
- `RIPCOM_MASTER_DOCUMENTATION.md` ← mestre
- `RIPCOM_MASTER_DOCUMENTATION.txt` ← backup

---

## 28. Segurança obrigatória

1. private key nunca no frontend;
2. private key nunca no banco RIPCOM;
3. uma chave por operador;
4. timestamp contra replay;
5. request ID para idempotência;
6. player recebe somente token temporário;
7. RLS nas tabelas administrativas;
8. liquidação sensível somente via backend;
9. sessão vinculada à release;
10. chave efêmera de QA deve ser suspensa/rotacionada;
11. provider frontend nunca recebe `service_role`;
12. dados empresariais/CNPJ ficam privados por padrão;
13. dinheiro real não é habilitado por simples flag.

---

## 29. Sandbox x produção

### SANDBOX

Estado atual:

- DEMO;
- saldo fictício;
- homologação;
- integração técnica.

### PRODUCTION

É um ambiente previsto na modelagem, mas não significa automaticamente operação com dinheiro real. Requer fase própria de engenharia, segurança, compliance e requisitos aplicáveis.

---

## 30. Próximos passos

1. Preencher o perfil empresarial privado com os dados reais quando desejado.
2. Fazer `/v1/games` retornar explicitamente a release autorizada.
3. Fazer `/v1/sessions` retornar a release fixada na sessão.
4. Rotacionar a chave do `ripcom-qa` antes do smoke HTTP.
5. Executar smoke HTTP externo completo.
6. Validar player standalone desktop e mobile via launch real.
7. Criar segundo jogo autoral RIPCOM.
8. Criar staging RIPCOM totalmente separado do RR7.
9. Migrar `RIPCOM_PUBLIC_BASE_URL` para domínio próprio quando disponível.
10. Preparar pacote comercial/técnico para o primeiro parceiro externo real.

---

## 31. Mapa rápido

| Componente | Função |
|---|---|
| `RIPCOM` | Provedora |
| `RR7` | Primeiro operador sandbox |
| `Eclipse Serpent` | Primeiro jogo |
| `ripcom_game_releases` | Releases dos jogos |
| `manifest.json` do jogo | Snapshot técnico da release |
| `ripcom_operators` | Parceiros B2B |
| `ripcom_company_profile` | Identidade empresarial privada/CNPJ |
| `ripcom_operator_games` | Jogo + release por operador |
| `ripcom_api_requests` | Idempotência + telemetria |
| `ripcom_b2b_sessions` | Sessões externas versionadas |
| `ripcom_b2b_rounds` | Rounds DEMO |
| `ripcom_settle_demo_spin` | Liquidação atômica |
| `ripcom-provider` Edge Function | Runtime interno RR7 |
| `ripcom-b2b` | API externa |
| `ripcom-provider/` | Frontend canônico independente |
| `provider-manifest.json` | Manifest do frontend provider |
| `/admin/ripcom` | Operadores |
| `/admin/ripcom-empresa` | Perfil empresarial privado |
| `/admin/ripcom-releases` | Releases |
| `/admin/ripcom-metricas` | Observabilidade |
| `sdk/ripcom-node.mjs` | SDK Node |
| `examples/ripcom-node-operator/` | Integração de referência |
| `RIPCOM_MASTER_DOCUMENTATION.md` | Documento mestre |

---

## Regra de manutenção

Toda mudança importante deve atualizar este documento no mesmo ciclo, principalmente:

- tabela;
- Edge Function;
- endpoint;
- jogo;
- release;
- frontend provider;
- identidade empresarial;
- autenticação;
- SDK;
- infraestrutura;
- segurança;
- onboarding de parceiro.
