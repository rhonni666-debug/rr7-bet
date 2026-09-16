# RIPCOM Game Provider — Documentação Mestre

> **Fonte de verdade oficial da documentação RIPCOM**  
> Atualizado em: **16/09/2026**  
> Repositório: `rhonni666-debug/rr7-bet`  
> Status: **RIPCOM B2B v1 — SANDBOX / DEMO**

O arquivo `RIPCOM_MASTER_DOCUMENTATION.txt` é o backup simples. Este `.md` é o documento principal e deve ser atualizado junto de qualquer mudança estrutural.

---

## 1. O que é a RIPCOM

- **RIPCOM** = provedora própria e infraestrutura dos jogos autorais.
- **RR7** = primeiro operador sandbox.
- **Jogos RIPCOM** = produtos independentes distribuíveis para outras plataformas.
- **GitHub** = fonte de verdade do código.
- **Supabase/PostgreSQL/Edge Functions** = backend.
- **Lovable** = opcional; o projeto não depende de créditos.

---

## 2. Arquitetura

```text
PLATAFORMA PARCEIRA
 -> RIPCOM B2B API (RSA-SHA256)
 -> entitlement + release + sessão
 -> RIPCOM GAME RUNTIME
 -> RNG / round / ledger DEMO / bonus state
 -> RIPCOM STANDALONE PLAYER
 -> JOGADOR
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

## 3. Provider RIPCOM

Tabela: `public.providers`

| Campo | Valor |
|---|---|
| `name` | `RIPCOM` |
| `slug` | `ripcom` |
| `provider_type` | `REAL` |
| `status` | `ACTIVE` |

Jogos oficiais RIPCOM não usam `MOCK`.

---

## 4. Eclipse Serpent

| Campo | Valor |
|---|---|
| Nome | `Eclipse Serpent` |
| Slug | `eclipse-serpent` |
| Game Code | `ripcom-slot:eclipse-serpent` |
| Launch Type | `PROVIDER_SESSION` |
| Modo | `DEMO` |
| Release atual | `1.1.0` |
| Status | `SANDBOX` |

Manifest da release:

```text
games/eclipse-serpent/manifest.json
```

Frontend atual:

```text
RIPCOM Provider Frontend = 1.0.0-sandbox.5
```

---

## 5. Eclipse Bonus — regra oficial

A release `1.1.0` possui bônus persistente real.

- **Gatilho:** 3 scatters.
- **Prêmio:** 8 rodadas grátis.
- **Retrigger:** desabilitado nesta release.
- **Aposta das free spins:** mesma aposta do giro que ativou o bônus.
- **Débito nas free spins:** nenhum.
- **Ganhos:** creditados normalmente no saldo DEMO.
- **Persistência:** recarregar a página não apaga as rodadas restantes.

Sequência:

1. dois scatters ativam o tease;
2. rolo decisivo desacelera;
3. cenário escurece;
4. sol aparece;
5. lua fecha o eclipse;
6. serpente sobe;
7. olhos brilham;
8. aparece `ECLIPSE BONUS`;
9. aparece `8 RODADAS GRÁTIS`;
10. HUD mostra `8 → 0`;
11. as free spins executam automaticamente;
12. Big/Mega Wins pausam a sequência para celebração;
13. a tela final mostra `TOTAL GANHO`.

Especificação completa:

```text
docs/ECLIPSE_SERPENT_VFX.md
```

---

## 6. Áudio e “juice” visual

Frontend: `1.0.0-sandbox.5`.

### Motor de áudio procedural

Arquivo:

```text
ripcom-provider/src/game/audio.ts
```

O áudio é sintetizado no navegador com Web Audio API. Não usa músicas, efeitos ou samples de terceiros.

Eventos:

- `spin()` — giro pago;
- `freeSpin()` — rodada grátis;
- `tease()` — suspense de quase bônus;
- `bonusHit()` — confirmação do Eclipse Bonus;
- `win(multiplier)` — vitória e celebrações;
- `bonusComplete()` — encerramento do bônus.

O player possui botão de som. O navegador libera áudio após a primeira interação do usuário.

### Big Win / Mega Win

Arquivos:

```text
ripcom-provider/src/game/WinCelebration.tsx
ripcom-provider/src/juice.css
```

Classificação somente visual, sem alterar a matemática:

- `BIG WIN`: multiplicador `>= 8x`;
- `MEGA WIN`: multiplicador `>= 25x`.

A apresentação inclui partículas, anéis de energia, pulso de símbolos vencedores, texto animado, som procedural e pausa temporária das free spins.

---

## 7. Versionamento de jogos

Tabela:

```text
public.ripcom_game_releases
```

Campos: `game_id`, `version`, `status`, `manifest`, `notes`, `released_at`.

Status: `DRAFT`, `SANDBOX`, `RELEASED`, `RETIRED`.

Release atual do Eclipse Serpent: `1.1.0`.

Pin por operador:

```text
public.ripcom_operator_games.release_id
```

Pin por sessão:

```text
public.ripcom_b2b_sessions.game_release_id
```

Trigger:

```text
public.ripcom_bind_session_release()
ripcom_b2b_sessions_bind_release
```

Painel: `/admin/ripcom-releases`.

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

O browser recebe somente token temporário de sessão, nunca private key RSA ou `service_role`.

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

Algoritmo: `RSA-SHA256 / RSASSA-PKCS1-v1_5`.

Canonical string:

```text
METHOD\nPATH\nTIMESTAMP\nREQUEST_ID\nSHA256_HEX(BODY_EXATO)
```

---

## 11. Operadores B2B

Tabela: `public.ripcom_operators`.

Campos principais:

- `code`, `name`, `environment`, `status`;
- `public_key_pem`, `allowed_origins`;
- `api_version`, `wallet_mode`, `callback_url`;
- `max_requests_per_minute`, `max_sessions_per_minute`;
- `revoked_at`, `last_key_rotation_at`, `metadata`.

Ambientes: `SANDBOX`, `PRODUCTION`.

Status: `ACTIVE`, `SUSPENDED`, `PENDING`.

RR7 está ativo em SANDBOX e usa Eclipse Serpent `1.1.0`.

---

## 12. Perfil empresarial privado / CNPJ

Tabela:

```text
public.ripcom_company_profile
```

Campos: `legal_name`, `trade_name`, `tax_id`, `country_code`, `business_email`, `business_phone`, `website_url`, `contract_contact_name`, `contract_contact_email`, `notes`.

Painel:

```text
/admin/ripcom-empresa
```

Os dados empresariais são privados por padrão e não entram automaticamente no player/manifests.

---

## 13. Catálogo, idempotência e telemetria

### Jogos por operador

Tabela: `public.ripcom_operator_games`.

Campos: `operator_id`, `game_id`, `enabled`, `release_id`.

### Requests B2B

Tabela: `public.ripcom_api_requests`.

Campos principais: `operator_id`, `request_id`, `method`, `path`, `body_sha256`, `response_status`, `response_body`, `created_at`, `completed_at`, `duration_ms`.

Mesmo request ID com conteúdo diferente gera `IDEMPOTENCY_CONFLICT`.

---

## 14. Sessões B2B

Tabela: `public.ripcom_b2b_sessions`.

Campos base:

- `operator_id`, `game_id`, `game_release_id`;
- `external_player_id`, `session_token`, `status`;
- `currency`, `demo_balance`, `expires_at`.

Campos de bônus:

- `free_spins_remaining`;
- `free_spins_total`;
- `bonus_bet`;
- `bonus_total_win`;
- `bonus_rounds_played`;
- `bonus_triggered_at`.

Currency atual: `DEMO`.

---

## 15. Rounds B2B

Tabela: `public.ripcom_b2b_rounds`.

Campos base: `session_id`, `request_id`, `bet`, `win`, `multiplier`, `grid`, `feature`, `balance_after`.

Campos do bônus:

- `is_free_spin`;
- `free_spins_remaining_after`;
- `bonus_awarded`;
- `bonus_bet`;
- `bonus_total_win_after`;
- `bonus_rounds_played_after`.

---

## 16. Liquidação DEMO

Função atual:

```text
public.ripcom_settle_demo_spin_v2
```

Responsabilidades:

- validar sessão/expiração/aposta;
- garantir idempotência;
- identificar free spin pendente;
- não debitar saldo em free spin;
- usar `bonus_bet`;
- creditar prêmio;
- reduzir contador;
- atualizar total do bônus;
- persistir round;
- devolver estado do bônus.

Executável somente pelo `service_role`.

---

## 17. Edge Functions

| Função | Uso |
|---|---|
| `ripcom-provider` | Runtime interno RR7 → RIPCOM |
| `ripcom-b2b` | API externa B2B |
| `ripcom-player-runtime` | Player standalone + Eclipse Bonus |

---

## 18. Frontend standalone RIPCOM

Diretório: `ripcom-provider/`.

Versão: `1.0.0-sandbox.5`.

Inclui:

- portal e API Docs;
- player independente;
- fundo vivo/parallax/névoa/partículas;
- tease de scatter;
- eclipse sol/lua;
- serpente subindo;
- HUD 8→0;
- resumo do bônus;
- áudio procedural;
- botão mute/unmute;
- Big Win / Mega Win;
- animação de símbolos vencedores.

Manifest:

```text
ripcom-provider/public/provider-manifest.json
```

---

## 19. Player Eclipse Serpent

Arquivo canônico:

```text
ripcom-provider/src/game/EclipsePlayer.tsx
```

Arquivos principais:

```text
ripcom-provider/src/game/AnimatedBackground.tsx
ripcom-provider/src/game/BonusIntroOverlay.tsx
ripcom-provider/src/game/BonusTeaseOverlay.tsx
ripcom-provider/src/game/EclipseScene.tsx
ripcom-provider/src/game/SerpentRise.tsx
ripcom-provider/src/game/audio.ts
ripcom-provider/src/game/WinCelebration.tsx
ripcom-provider/src/bonus-mode.css
ripcom-provider/src/cinematic-vfx.css
ripcom-provider/src/juice.css
```

Launch:

```text
<provider-base>/?play=<session_token>
```

---

## 20. Painéis administrativos

- `/admin/ripcom` — operadores;
- `/admin/ripcom-empresa` — identidade empresarial/CNPJ;
- `/admin/ripcom-releases` — releases;
- `/admin/ripcom-metricas` — observabilidade.

---

## 21. SDK Node.js

Arquivo: `sdk/ripcom-node.mjs`.

Métodos: `health()`, `games()`, `createSession()`, `launch()`, `closeSession()`.

---

## 22. Homologação do Eclipse Bonus 1.1.0

Teste backend:

| Item | Resultado |
|---|---:|
| Saldo inicial | `1000` |
| Aposta trigger | `5` |
| Saldo após trigger | `995` |
| Free spins | `8` |
| Prêmio teste por free spin | `1` |
| Ganho total bônus | `8` |
| Saldo final esperado | `1003` |
| Saldo final obtido | `1003` |
| Rounds | `1 pago + 8 grátis` |
| Free spins restantes | `0` |

**Resultado: PASSOU.** Nenhuma das 8 free spins debitou nova aposta.

---

## 23. CI e deploy

Workflow CI: `.github/workflows/ci.yml`.

Valida testes RR7, SDK RIPCOM, assets, TypeScript e builds RR7/provider.

Deploy: `.github/workflows/deploy-pages.yml`.

```text
RR7               -> raiz do Pages
RIPCOM standalone -> /ripcom-provider/
```

---

## 24. Segurança obrigatória

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
11. backend decide se o giro é grátis;
12. áudio/VFX não alteram RNG ou saldo;
13. dinheiro real não é habilitado por simples flag.

---

## 25. Sandbox x produção

### SANDBOX atual

- DEMO;
- saldo fictício;
- homologação;
- integração técnica.

### PRODUCTION

Fase futura separada. Exige engenharia, segurança, compliance e requisitos aplicáveis.

---

## 26. Documentos importantes

- `RIPCOM_MASTER_DOCUMENTATION.md` — mestre;
- `RIPCOM_MASTER_DOCUMENTATION.txt` — backup;
- `docs/ECLIPSE_SERPENT_VFX.md` — bônus, áudio e animações;
- `games/eclipse-serpent/manifest.json` — release 1.1.0;
- `ripcom-provider/public/provider-manifest.json` — capacidades do frontend;
- `docs/RIPCOM_PROVIDER_ARCHITECTURE.md`;
- `docs/RIPCOM_B2B_V1.md`;
- `docs/RIPCOM_PARTNER_ONBOARDING.md`;
- `docs/RIPCOM_QA_REPORT_2026-09-16.md`;
- `docs/ripcom-b2b-openapi.yaml`;
- `sdk/README.md`.

---

## 27. Próximos passos

1. validar visualmente o pacote audiovisual em desktop;
2. validar em celular real;
3. calibrar volume/timing do áudio por dispositivo;
4. adicionar animações individuais mais ricas para scatter/wild;
5. criar contagem animada progressiva do valor de prêmio;
6. executar smoke HTTP externo completo;
7. criar segundo jogo RIPCOM;
8. separar staging da RIPCOM;
9. migrar para domínio próprio quando disponível.

---

## Regra de manutenção

Toda mudança importante deve atualizar este documento e o TXT de backup no mesmo ciclo.
