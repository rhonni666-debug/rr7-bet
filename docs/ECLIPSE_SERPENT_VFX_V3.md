# Eclipse Serpent — Cinematic VFX v3

Atualizado em: 16/09/2026  
Provider frontend: `1.0.0-sandbox.3`  
Game release: `Eclipse Serpent 1.0.0`  
Modo: `SANDBOX / DEMO`

## Objetivo

Dar vida ao Eclipse Serpent sem alterar a matemática do jogo. Esta revisão é exclusivamente de apresentação/experiência visual.

## Componentes novos

### `ripcom-provider/src/game/AnimatedBackground.tsx`

Responsável pelo fundo vivo do jogo:

- cenário em camadas;
- parallax usando `--mx` e `--my` do player;
- névoa;
- partículas/embers;
- luz ambiente pulsante;
- reação visual aos estados `idle`, `spinning`, `tease` e `bonus`.

### `ripcom-provider/src/game/EclipseScene.tsx`

Cena do eclipse Sol/Lua.

Modos:

- `ambient`: eclipse presente no cenário como identidade visual;
- `tease`: Lua se aproxima do Sol durante ameaça de bônus;
- `bonus`: Lua fecha o eclipse de forma cinematográfica e ativa a corona solar.

### `ripcom-provider/src/game/SerpentRise.tsx`

Serpente vetorial autoral em SVG.

Animações:

- sobe de baixo para cima;
- corpo faz movimento de balanço;
- cabeça respira/move suavemente;
- olhos brilham;
- língua aparece em ciclos curtos;
- corpo usa gradiente verde/esmeralda/dourado.

A serpente é desenhada no próprio código, sem copiar asset de outro slot.

### `ripcom-provider/src/game/BonusTeaseOverlay.tsx`

Overlay exibido quando o jogo entra em `phase-tease`.

Comportamento:

- vignette escura;
- eclipse parcial;
- pulsos de energia;
- mensagem de suspense;
- mantém foco no rolo decisivo.

### `ripcom-provider/src/game/BonusIntroOverlay.tsx`

Cena principal quando o bônus é confirmado.

Timeline visual:

1. tela escurece;
2. Sol aparece;
3. Lua cruza e fecha o eclipse;
4. corona solar explode em brilho;
5. serpente sobe;
6. olhos da serpente acendem;
7. partículas são lançadas;
8. flash de impacto;
9. entra o texto `ECLIPSE BONUS`;
10. aparece a mensagem de que a serpente despertou.

O overlay permanece visualmente ativo por aproximadamente 4,3 segundos.

### `ripcom-provider/src/game/GameVfxMount.tsx`

Camada que conecta os novos efeitos ao player existente sem duplicar lógica de spin.

Responsabilidades:

- detecta `.game-player`;
- observa as classes de fase do player;
- monta `AnimatedBackground` via React Portal;
- mostra tease durante `phase-tease`;
- mantém a intro cinematográfica durante a janela de bônus;
- não altera o resultado do motor/RNG.

## CSS

Arquivo:

`ripcom-provider/src/cinematic-vfx.css`

Inclui:

- parallax;
- eclipse;
- corona solar;
- Lua animada;
- serpent rise;
- eye glow;
- tongue flick;
- névoa;
- partículas;
- flashes;
- pulsos;
- responsividade mobile;
- fallback para `prefers-reduced-motion`.

## Integração

`ripcom-provider/src/main.tsx` monta:

- `App`
- `GameVfxMount`

E importa:

- `styles.css`
- `game-vfx.css`
- `cinematic-vfx.css`

## Estados utilizados

A implementação reage aos estados já existentes no player:

- `idle`
- `spinning`
- `tease`
- `bonus`
- `reveal`

Nenhum desses estados decide o resultado da rodada. Eles apenas controlam apresentação.

## Regras importantes

- O tease visual só responde ao resultado já calculado pelo backend.
- O frontend não decide se existe bônus.
- A animação não modifica aposta, prêmio, multiplicador ou grid.
- Private keys e service role continuam fora do frontend.
- A implementação permanece DEMO/fun-money.

## Versionamento

Provider manifest:

`ripcom-provider/public/provider-manifest.json`

Versão da apresentação:

`1.0.0-sandbox.3`

Capability adicionadas/atualizadas:

- `living-background-vfx`
- `parallax-background`
- `scatter-bonus-tease`
- `solar-lunar-eclipse-animation`
- `rising-serpent-animation`
- `cinematic-bonus-intro-v3`

O jogo continua `Eclipse Serpent 1.0.0` porque a matemática não foi alterada.

## Próximas evoluções visuais

- áudio original por evento;
- transição de trilha no tease;
- impacto sonoro do eclipse;
- som próprio da serpente;
- HUD específico para um futuro modo bônus real;
- tela de Big Win autoral;
- animações de vitória por símbolo;
- otimização de partículas por device performance.
