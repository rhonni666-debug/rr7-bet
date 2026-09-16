# RIPCOM Game Provider — Documentação Mestre

> **Fonte de verdade oficial da documentação RIPCOM**  
> Atualizado em: **16/09/2026**  
> Repositório: `rhonni666-debug/rr7-bet`  
> Status: **RIPCOM B2B v1 — SANDBOX / DEMO**

O arquivo `RIPCOM_MASTER_DOCUMENTATION.txt` permanece como backup simples. Este `.md` é o documento principal e deve ser atualizado junto de qualquer mudança estrutural.

---

## 1. O que é a RIPCOM

A **RIPCOM** é a provedora própria de jogos autorais do projeto.

- **RIPCOM** = provedora e infraestrutura dos jogos.
- **RR7** = primeiro operador sandbox.
- **Jogos RIPCOM** = produtos independentes distribuíveis para outras plataformas.

A RIPCOM não depende da interface do RR7 para existir como provider.

---

## 2. Desenvolvimento sem depender de créditos

- **GitHub** = fonte de verdade.
- **Supabase/PostgreSQL/Edge Functions** = backend.
- **GitHub Actions** = testes, typecheck e build.
- **Lovable** = opcional, nunca requisito.

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
        | RNG / round / ledger DEMO / bonus state
        v
RIPCOM STANDALONE PLAYER
        |
        v
JOGADOR
```

Fluxo externo:

```text
OPERADOR EXTERNO
 -> ripcom-b2b
 -> sessão
 -> launch_url
 -> ripcom-provider standalone
 -> ripcom-player-runtime
 -> Eclipse Serpent
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

Jogos oficiais RIPCOM não usam `MOCK`.

---

## 5. Eclipse Serpent

| Campo | Valor |
|---|---|
| Nome | `Eclipse Serpent` |
| Slug | `eclipse-serpent` |
| Game Code | `ripcom-slot:eclipse-serpent` |
| Launch Type | `PROVIDER_SESSION` |
| Modo | `DEMO` |
| Release atual | `1.1.0` |
| Status | `SANDBOX` |

Manifest:

```text
games/eclipse-serpent/manifest.json
```

Frontend atual:

```text
RIPCOM Provider Frontend = 1.0.0-sandbox.4
```

---

## 6. Eclipse Bonus — regra oficial

A release `1.1.0` adiciona um modo de bônus persistente real.

### Gatilho

`3 scatters`

### Prêmio

**8 rodadas grátis**.

### Regras

- retrigger durante free spins: `false`;
- usa a mesma aposta do giro pago que ativou o bônus;
- free spins não debitam nova aposta;
- ganhos são creditados normalmente no saldo DEMO;
- o estado do bônus é salvo no backend;
- recarregar a página não apaga rodadas restantes.

### Sequência visual

1. dois scatters geram tease;
2. rolo decisivo desacelera;
3. cenário escurece;
4. eclipse começa a se formar;
5. terceiro scatter confirma;
6. sol aparece;
7. lua fecha o eclipse;
8. serpente sobe;
9. olhos brilham;
10. aparece `ECLIPSE BONUS`;
11. aparece `8 RODADAS GRÁTIS`;
12. HUD mostra contador `8 → 0`;
13. free spins executam automaticamente;
14. tela final mostra `TOTAL GANHO`.

Especificação completa:

```text
docs/ECLIPSE_SERPENT_VFX.md
```

---

## 7. Versionamento de jogos

Tabela:

```text
public.ripcom_game_releases
```

Campos:

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

Release atual do Eclipse Serpent:

```text
1.1.0
```

Pin por operador:

```text
public.ripcom_operator_games.release_id
```

Pin por sessão:

```text
public.ripcom_b2b_sessions.game_release_id
```

Trigger de binding:

```text
public.ripcom_bind_session_release()
ripcom_b2b_sessions_bind_release
```

Painel:

```text
/admin/ripcom-releases
```

---

## 8. API B2B v1

Edge Function:

```text
ripcom-b2b
```

Base:

```text
https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b
```

Endpoints:

| Método | Rota | Função |
|---|---|---|
| `GET` | `/v1/health` | Saúde da API |
| `GET` | `/v1/games` | Catálogo permitido |
| `POST` | `/v1/sessions` | Criar sessão DEMO |
| `POST` | `/v1/games/launch` | Gerar launch URL |
| `POST` | `/v1/sessions/close` | Encerrar sessão |

Wallet real permanece desabilitada.

---

## 9. Runtime do player

Edge Function:

```text
ripcom-player-runtime
```

Base:

```text
https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-player-runtime
```

Ações:

- `player_state` — estado da sessão, saldo, config e bônus;
- `player_spin` — resultado server-side + liquidação + bônus;
- `player_close` — encerra sessão.

O player usa somente token temporário de sessão.

Nunca recebe:

- private key RSA;
- `service_role`;
- credenciais B2B do operador.

---

## 10. Autenticação B2B

Cada operador possui par RSA próprio.

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

## 11. Operadores B2B

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

RR7 está ativo em SANDBOX e usa Eclipse Serpent `1.1.0`.

---

## 12. Perfil empresarial privado / CNPJ

Tabela:

```text
public.ripcom_company_profile
```

Campos:

- `legal_name`
- `trade_name`
- `tax_id` = CNPJ
- `country_code`
- `business_email`
- `business_phone`
- `website_url`
- `contract_contact_name`
- `contract_contact_email`
- `notes`

Painel:

```text
/admin/ripcom-empresa
```

Os dados empresariais ficam privados por padrão e não entram automaticamente no player/manifests.

---

## 13. Catálogo por operador

Tabela:

```text
public.ripcom_operator_games
```

Campos:

- `operator_id`
- `game_id`
- `enabled`
- `release_id`

Define jogo + versão por parceiro.

---

## 14. Idempotência e telemetria

Tabela:

```text
public.ripcom_api_requests
```

Campos:

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

Mesmo request ID com conteúdo diferente gera `IDEMPOTENCY_CONFLICT`.

---

## 15. Sessões B2B

Tabela:

```text
public.ripcom_b2b_sessions
```

Campos base:

- `operator_id`
- `game_id`
- `game_release_id`
- `external_player_id`
- `session_token`
- `status`
- `currency`
- `demo_balance`
- `expires_at`

Campos do bônus:

- `free_spins_remaining` — free spins restantes;
- `free_spins_total` — total concedido;
- `bonus_bet` — aposta usada no bônus;
- `bonus_total_win` — ganho acumulado;
- `bonus_rounds_played` — rodadas grátis executadas;
- `bonus_triggered_at` — momento de ativação.

Currency atual: `DEMO`.

---

## 16. Rounds B2B

Tabela:

```text
public.ripcom_b2b_rounds
```

Campos base:

- `session_id`
- `request_id`
- `bet`
- `win`
- `multiplier`
- `grid`
- `feature`
- `balance_after`

Campos do bônus:

- `is_free_spin`
- `free_spins_remaining_after`
- `bonus_awarded`
- `bonus_bet`
- `bonus_total_win_after`
- `bonus_rounds_played_after`

---

## 17. Liquidação DEMO

Função compatível anterior:

```text
public.ripcom_settle_demo_spin
```

Função atual do bônus:

```text
public.ripcom_settle_demo_spin_v2
```

A v2:

- valida sessão e expiração;
- valida aposta;
- garante idempotência;
- identifica se existe free spin pendente;
- não debita saldo em free spin;
- usa `bonus_bet` como base;
- credita prêmio;
- reduz contador;
- atualiza ganho acumulado;
- persiste round;
- devolve estado do bônus.

Executável somente pelo `service_role`.

---

## 18. Edge Functions

| Função | Uso |
|---|---|
| `ripcom-provider` | Runtime interno RR7 → RIPCOM |
| `ripcom-b2b` | API externa B2B |
| `ripcom-player-runtime` | Player standalone + Eclipse Bonus |

---

## 19. Frontend standalone RIPCOM

Diretório:

```text
ripcom-provider/
```

Versão atual:

```text
1.0.0-sandbox.4
```

Inclui:

- portal público;
- API Docs;
- Sandbox;
- Operator overview;
- player independente;
- fundo vivo;
- parallax;
- névoa/partículas;
- tease de scatter;
- eclipse sol/lua;
- serpente subindo;
- HUD 8 → 0;
- resumo final do bônus.

Manifest:

```text
ripcom-provider/public/provider-manifest.json
```

---

## 20. Player Eclipse Serpent

Arquivo canônico:

```text
ripcom-provider/src/game/EclipsePlayer.tsx
```

Arquivos visuais:

```text
ripcom-provider/src/game/AnimatedBackground.tsx
ripcom-provider/src/game/BonusIntroOverlay.tsx
ripcom-provider/src/game/BonusTeaseOverlay.tsx
ripcom-provider/src/game/EclipseScene.tsx
ripcom-provider/src/game/SerpentRise.tsx
ripcom-provider/src/bonus-mode.css
ripcom-provider/src/cinematic-vfx.css
```

Launch:

```text
<provider-base>/?play=<session_token>
```

---

## 21. Painéis administrativos

- `/admin/ripcom` — operadores;
- `/admin/ripcom-empresa` — identidade empresarial/CNPJ;
- `/admin/ripcom-releases` — releases;
- `/admin/ripcom-metricas` — observabilidade.

---

## 22. SDK Node.js

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

---

## 23. Homologação do Eclipse Bonus 1.1.0

Teste executado diretamente no backend:

| Item | Resultado |
|---|---:|
| Saldo inicial | `1000` |
| Aposta do trigger | `5` |
| Prêmio trigger | `0` |
| Saldo após trigger | `995` |
| Free spins | `8` |
| Prêmio de teste por free spin | `1` |
| Free spins executadas | `8` |
| Ganho total bônus | `8` |
| Saldo final esperado | `1003` |
| Saldo final obtido | `1003` |
| Rounds | `1 pago + 8 grátis` |
| Free spins restantes | `0` |

**Resultado: PASSOU.** Nenhuma das 8 free spins debitou nova aposta do saldo.

---

## 24. CI

Workflow:

```text
.github/workflows/ci.yml
```

Valida:

- testes RR7;
- SDK RIPCOM;
- assets de integração;
- TypeScript RR7;
- build RR7;
- TypeScript provider standalone;
- build provider standalone.

A versão com Eclipse Bonus `1.1.0` passou o CI completo.

---

## 25. Deploy

GitHub Pages publica:

```text
RR7               -> raiz
RIPCOM standalone -> /ripcom-provider/
```

Edge Function do bônus:

```text
ripcom-player-runtime = ACTIVE
```

---

## 26. Segurança obrigatória

1. private key nunca no frontend;
2. private key nunca no banco RIPCOM;
3. uma chave por operador;
4. timestamp contra replay;
5. request ID para idempotência;
6. player usa token temporário;
7. RLS protege tabelas administrativas;
8. liquidação sensível fica no backend;
9. frontend não recebe `service_role`;
10. CNPJ/dados empresariais ficam privados;
11. o backend decide se o giro é grátis;
12. dinheiro real não é habilitado por simples flag.

---

## 27. Sandbox x produção

### SANDBOX atual

- DEMO;
- saldo fictício;
- homologação;
- integração técnica.

### PRODUCTION

É uma fase futura separada e exige engenharia, segurança, compliance e requisitos aplicáveis.

---

## 28. Documentos importantes

- `RIPCOM_MASTER_DOCUMENTATION.md` — mestre;
- `RIPCOM_MASTER_DOCUMENTATION.txt` — backup simples;
- `docs/ECLIPSE_SERPENT_VFX.md` — bônus/animações;
- `games/eclipse-serpent/manifest.json` — release 1.1.0;
- `ripcom-provider/public/provider-manifest.json` — frontend provider;
- `docs/RIPCOM_PROVIDER_ARCHITECTURE.md`;
- `docs/RIPCOM_B2B_V1.md`;
- `docs/RIPCOM_PARTNER_ONBOARDING.md`;
- `docs/RIPCOM_QA_REPORT_2026-09-16.md`;
- `docs/ripcom-b2b-openapi.yaml`;
- `sdk/README.md`.

---

## 29. Próximos passos

1. validar visualmente o Eclipse Bonus em desktop;
2. validar visualmente em celular;
3. adicionar áudio autoral para tease/eclipses/serpente/free spins;
4. criar Big Win / Mega Win autoral;
5. adicionar animações extras dos símbolos;
6. executar smoke HTTP externo completo;
7. criar segundo jogo RIPCOM;
8. separar staging da RIPCOM;
9. migrar para domínio próprio quando disponível.

---

## Regra de manutenção

Toda mudança importante deve atualizar este documento e o TXT de backup no mesmo ciclo.
