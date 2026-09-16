# RIPCOM Game Provider — Documentação Mestre

> **Documento oficial da RIPCOM**  
> Atualizado em: **16/09/2026**  
> Repositório: `rhonni666-debug/rr7-bet`  
> Status: **RIPCOM B2B v1 — SANDBOX / DEMO**

O arquivo `RIPCOM_MASTER_DOCUMENTATION.txt` é o backup simples. Este `.md` é a fonte principal e deve ser atualizado junto de qualquer mudança estrutural.

---

## 1. Identidade do projeto

- **RIPCOM** = provedora própria e infraestrutura dos jogos autorais.
- **RR7** = primeiro operador sandbox da RIPCOM.
- **GitHub** = fonte de verdade do código.
- **Supabase/PostgreSQL/Edge Functions** = backend.
- **Lovable** = opcional; o projeto não depende de créditos.
- Operação atual: **100% DEMO / fun-money**.

Arquitetura principal:

```text
PLATAFORMA PARCEIRA
 -> RIPCOM B2B API
 -> entitlement + release + sessão
 -> RIPCOM GAME RUNTIME
 -> RNG / round / ledger DEMO / bonus state
 -> RIPCOM STANDALONE PLAYER
 -> JOGADOR
```

---

## 2. Provider RIPCOM

Tabela: `public.providers`

| Campo | Valor |
|---|---|
| `name` | `RIPCOM` |
| `slug` | `ripcom` |
| `provider_type` | `REAL` |
| `status` | `ACTIVE` |

Jogos oficiais RIPCOM não usam `MOCK`.

---

## 3. Eclipse Serpent

| Campo | Valor |
|---|---|
| Nome | `Eclipse Serpent` |
| Slug | `eclipse-serpent` |
| Game Code | `ripcom-slot:eclipse-serpent` |
| Launch Type | `PROVIDER_SESSION` |
| Release matemática | `1.1.0` |
| Frontend RIPCOM | `1.0.0-sandbox.9` |
| Status | `SANDBOX` |
| Modo | `DEMO` |

Manifest do jogo:

```text
games/eclipse-serpent/manifest.json
```

Manifest do frontend:

```text
ripcom-provider/public/provider-manifest.json
```

Player canônico:

```text
ripcom-provider/src/game/EclipsePlayer.tsx
```

Launch:

```text
<provider-base>/?play=<session_token>
```

---

## 4. Sandbox.9 — apresentação dimensional

A `sandbox.9` remove a aparência de ícones/emoji chapados e adiciona uma camada visual própria, sem alterar matemática, RNG ou liquidação.

### Símbolos autorais dimensionais

Arquivo:

```text
ripcom-provider/src/game/SymbolArt.tsx
```

Os símbolos são desenhados em SVG original com gradientes, facetas, reflexos, sombra e profundidade:

- Runa;
- Fragmento;
- Núcleo;
- Eclipse Bonus;
- Wild;
- Serpente Eclipse;
- fallback de gema autoral.

O frontend não usa mais emoji como arte principal dos símbolos.

### Profundidade do tabuleiro

Arquivo:

```text
ripcom-provider/src/depth-stage9.css
```

Inclui:

- reels em perspectiva;
- superfícies com luz superior e sombra inferior;
- objetos com `translateZ` e movimento sutil;
- reflexo de vidro/metal;
- sombra projetada abaixo dos símbolos;
- plano de chão em perspectiva;
- moldura com profundidade;
- botão SPIN com relevo e deslocamento ao pressionar;
- inclinação suave de câmera pelo ponteiro no desktop;
- camera tilt desativado no mobile para estabilidade.

Essa camada é apresentação visual. O backend continua sendo a autoridade do resultado.

---

## 5. Mobile / portrait 9:16

Arquivo:

```text
ripcom-provider/src/mobile-stage8.css
```

O perfil mobile mantém:

- layout portrait 9:16;
- safe areas/notch;
- reels ocupando maior área útil;
- controles compactos e touch-friendly;
- botão SPIN de fácil toque;
- HUD das free spins compacto;
- redução seletiva de partículas/blur;
- símbolos, scatter, wild e bônus ainda animados;
- `prefers-reduced-motion` respeitado.

Checklist:

```text
docs/ECLIPSE_SERPENT_MOBILE_QA.md
```

---

## 6. Eclipse Bonus — regra oficial

Release: `Eclipse Serpent 1.1.0`.

- Gatilho: **3 scatters**.
- Prêmio: **8 rodadas grátis**.
- Retrigger: desabilitado nesta release.
- Aposta das free spins: mesma aposta do giro que ativou o bônus.
- Débito durante free spins: **nenhum**.
- Ganhos: creditados no saldo DEMO.
- Estado: persistido no backend.

Fluxo:

```text
2 scatters
 -> tease
 -> rolo decisivo
 -> 3º scatter
 -> eclipse sol/lua
 -> serpente sobe
 -> ECLIPSE BONUS
 -> 8 FREE SPINS
 -> contador 8 -> 0
 -> TOTAL GANHO
```

Campos persistidos da sessão:

```text
free_spins_remaining
free_spins_total
bonus_bet
bonus_total_win
bonus_rounds_played
bonus_triggered_at
```

Campos de round:

```text
is_free_spin
free_spins_remaining_after
bonus_awarded
bonus_bet
bonus_total_win_after
bonus_rounds_played_after
```

---

## 7. Áudio e feedback visual

Motor:

```text
ripcom-provider/src/game/audio.ts
```

Web Audio procedural autoral. Sem música/sample copiado de terceiros.

Eventos principais:

- `spin()`;
- `reelStop(index)`;
- `scatterLand(count)`;
- `wildReveal()`;
- `freeSpin()`;
- `tease()`;
- `bonusHit()`;
- `win(multiplier)`;
- `bonusComplete()`.

Arquivos visuais principais:

```text
ripcom-provider/src/game/AnimatedBackground.tsx
ripcom-provider/src/game/BonusIntroOverlay.tsx
ripcom-provider/src/game/BonusTeaseOverlay.tsx
ripcom-provider/src/game/SerpentRise.tsx
ripcom-provider/src/game/WinCelebration.tsx
ripcom-provider/src/game/AnimatedAmount.tsx
ripcom-provider/src/symbol-vfx.css
ripcom-provider/src/juice.css
ripcom-provider/src/cinematic-vfx.css
ripcom-provider/src/bonus-mode.css
```

---

## 8. GREAT / BIG / MEGA WIN

Classificação somente audiovisual:

- `GREAT WIN`: `>= 5x` e `< 10x`;
- `BIG WIN`: `>= 10x` e `< 25x`;
- `MEGA WIN`: `>= 25x`.

Inclui partículas, energia, texto animado, símbolos vencedores, som por faixa e contador progressivo de prêmio.

Arquivo do contador:

```text
ripcom-provider/src/game/AnimatedAmount.tsx
```

O valor mostrado sobe até o prêmio real já liquidado no backend.

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

- `player_state`;
- `player_spin`;
- `player_close`.

O browser usa token temporário de sessão. Nunca recebe private key RSA ou `service_role`.

Liquidação:

```text
public.ripcom_settle_demo_spin_v2
```

Responsabilidades: sessão, expiração, idempotência, aposta, free spin, saldo DEMO, prêmio, contador e persistência do round.

---

## 10. API B2B v1

Edge Function:

```text
ripcom-b2b
```

Base sandbox:

```text
https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b
```

Endpoints:

| Método | Rota | Uso |
|---|---|---|
| `GET` | `/v1/health` | Saúde |
| `GET` | `/v1/games` | Catálogo autorizado |
| `POST` | `/v1/sessions` | Criar sessão DEMO |
| `POST` | `/v1/games/launch` | Gerar launch URL |
| `POST` | `/v1/sessions/close` | Encerrar sessão |

Wallet real permanece desabilitada.

---

## 11. Autenticação B2B

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

Tabela de requests/idempotência:

```text
public.ripcom_api_requests
```

Mesmo request ID com conteúdo diferente gera `IDEMPOTENCY_CONFLICT`.

---

## 12. Operadores, catálogo e releases

Tabelas:

```text
public.ripcom_operators
public.ripcom_operator_games
public.ripcom_game_releases
public.ripcom_b2b_sessions
public.ripcom_b2b_rounds
```

Release atual: `Eclipse Serpent 1.1.0`.

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

RR7 permanece como operador ativo de SANDBOX.

---

## 13. Perfil empresarial privado

Tabela:

```text
public.ripcom_company_profile
```

Painel:

```text
/admin/ripcom-empresa
```

Dados empresariais/CNPJ ficam privados por padrão e não entram automaticamente no player ou manifests.

---

## 14. SDK e integração

SDK:

```text
sdk/ripcom-node.mjs
```

Métodos:

```text
health()
games()
createSession()
launch()
closeSession()
```

OpenAPI:

```text
docs/ripcom-b2b-openapi.yaml
```

---

## 15. Homologação matemática do bônus

Teste já executado:

| Item | Resultado |
|---|---:|
| Saldo inicial | `1000` |
| Aposta trigger | `5` |
| Saldo após trigger | `995` |
| Free spins | `8` |
| Prêmio de teste por free spin | `1` |
| Ganho total do bônus | `8` |
| Saldo final | `1003` |
| Rounds | `1 pago + 8 grátis` |
| Free spins restantes | `0` |

**PASSOU:** as 8 free spins não debitaram nova aposta.

---

## 16. CI e deploy

CI:

```text
.github/workflows/ci.yml
```

Valida RR7, SDK RIPCOM, assets, TypeScript e builds.

Deploy:

```text
.github/workflows/deploy-pages.yml
```

```text
RR7               -> raiz do Pages
RIPCOM standalone -> /ripcom-provider/
```

---

## 17. Segurança obrigatória

1. private key nunca no frontend;
2. private key nunca no banco RIPCOM;
3. uma chave por operador;
4. timestamp contra replay;
5. request ID para idempotência;
6. player usa token temporário;
7. RLS protege tabelas administrativas;
8. liquidação sensível fica no backend;
9. frontend não recebe `service_role`;
10. dados empresariais ficam privados;
11. backend decide se o giro é grátis;
12. áudio/VFX/SVG/contadores não alteram RNG ou saldo;
13. dinheiro real não é habilitado por simples flag.

---

## 18. Documentos importantes

- `RIPCOM_MASTER_DOCUMENTATION.md` — fonte principal;
- `RIPCOM_MASTER_DOCUMENTATION.txt` — backup;
- `docs/ECLIPSE_SERPENT_VFX.md`;
- `docs/ECLIPSE_SERPENT_MOBILE_QA.md`;
- `games/eclipse-serpent/manifest.json`;
- `ripcom-provider/public/provider-manifest.json`;
- `docs/RIPCOM_PROVIDER_ARCHITECTURE.md`;
- `docs/RIPCOM_B2B_V1.md`;
- `docs/RIPCOM_PARTNER_ONBOARDING.md`;
- `docs/RIPCOM_QA_REPORT_2026-09-16.md`;
- `docs/ripcom-b2b-openapi.yaml`;
- `sdk/README.md`.

---

## 19. Próximos passos

1. validar visualmente a `sandbox.9` em desktop e celular;
2. decidir se a profundidade 2.5D atende ou se o próximo salto deve usar WebGL/canvas;
3. calibrar volume/timing em aparelho real;
4. medir FPS em celular real;
5. smoke HTTP externo completo;
6. criar segundo jogo RIPCOM;
7. separar staging;
8. migrar para domínio próprio quando disponível.

---

## Regra de manutenção

Toda mudança importante deve atualizar este documento e o TXT de backup no mesmo ciclo.
