# Eclipse Serpent — Living Scene & Eclipse Bonus

Atualizado em: 16/09/2026  
Frontend RIPCOM: `1.0.0-sandbox.7`  
Game release/math: `Eclipse Serpent 1.1.0`  
Modo: `SANDBOX / DEMO`

## Objetivo

Dar ao Eclipse Serpent uma experiência de slot viva e cinematográfica, mantendo identidade visual própria da RIPCOM. A referência de ritmo é a categoria de slots mobile de alto impacto, sem copiar imagens, áudio, marca ou assets de terceiros.

## Regra oficial do bônus

- Gatilho: `3 scatters`.
- Prêmio: **8 rodadas grátis**.
- Retrigger durante free spins: `desabilitado` nesta release.
- Aposta das free spins: a mesma aposta do giro pago que ativou o bônus.
- Débito durante free spins: **nenhum**.
- Ganhos: creditados normalmente no saldo DEMO.
- Estado: persistido no backend; recarregar a página não apaga o bônus.

## Arquivos principais

- `ripcom-provider/src/game/EclipsePlayer.tsx` — player canônico, tease, intro, sequência automática 8→0, áudio e encerramento.
- `ripcom-provider/src/game/AnimatedAmount.tsx` — contador progressivo dos valores de prêmio.
- `ripcom-provider/src/game/BonusIntroOverlay.tsx` — eclipse do sol/lua + serpente subindo + anúncio das 8 rodadas.
- `ripcom-provider/src/game/SerpentRise.tsx` — serpente vetorial autoral animada.
- `ripcom-provider/src/game/AnimatedBackground.tsx` — cenário vivo, parallax, névoa, partículas e eclipse.
- `ripcom-provider/src/game/audio.ts` — motor de áudio procedural Web Audio, sem assets de terceiros.
- `ripcom-provider/src/game/WinCelebration.tsx` — overlay autoral GREAT WIN / BIG WIN / MEGA WIN.
- `ripcom-provider/src/symbol-vfx.css` — personalidade visual de scatter/wild e otimização mobile.
- `ripcom-provider/src/juice.css` — partículas, símbolos vencedores, celebrações e botão de som.
- `ripcom-provider/src/bonus-mode.css` — HUD do bônus, free spins, resumo final e estados visuais.
- `ripcom-provider/src/cinematic-vfx.css` — animação cinematográfica sol/lua/serpente.
- `supabase/functions/ripcom-player-runtime/index.ts` — runtime público do player por token de sessão.
- `public.ripcom_settle_demo_spin_v2` — liquidação atômica de giro pago/free spin.

## Estados visuais

- `idle` — cenário vivo.
- `spinning` — giro pago.
- `tease` — dois scatters visíveis e rolo decisivo em suspense.
- `bonus` — intro cinematográfica.
- `free-spins` — intervalo entre rodadas grátis.
- `free-spinning` — rodada grátis em execução.
- `bonus-outro` — resumo final do bônus.
- `reveal` — revelação de resultado normal.

## Scatter e Wild

### Scatter

O scatter possui vida própria mesmo fora do bônus:

- aura dourada/esverdeada respirando;
- ícone com microescala e rotação suave;
- glow mais forte quando entra no tease;
- pulso acelerado quando dois scatters já estão visíveis;
- cue sonoro procedural ao ser revelado.

### Wild

O wild possui:

- aura circular/energia em rotação;
- movimento vertical sutil;
- glow próprio;
- explosão visual maior quando participa de combinação vencedora;
- cue sonoro procedural separado do scatter.

Esses efeitos não alteram RNG ou matemática.

## Ameaça de bônus

O tease só ocorre quando o resultado real possui pelo menos 2 scatters.

Fluxo:

1. dois scatters ficam visíveis;
2. o rolo decisivo continua em movimento;
3. cenário escurece;
4. eclipse começa a fechar;
5. partículas e halo aceleram;
6. rolo decisivo recebe glow;
7. entra áudio procedural crescente de suspense;
8. aparece `O ECLIPSE ESTÁ ABRINDO`;
9. o resultado real é revelado.

## Entrada do Eclipse Bonus

Quando o terceiro scatter confirma o bônus:

1. os reels congelam;
2. cada rolo recebe um cue curto de parada;
3. o fundo escurece;
4. o sol aparece;
5. a lua atravessa o sol e fecha o eclipse;
6. a corona solar aumenta;
7. a serpente sobe da parte inferior da tela;
8. os olhos da serpente brilham;
9. entra impacto sonoro procedural grave + harmônicos;
10. entra `ECLIPSE BONUS`;
11. entra `8 RODADAS GRÁTIS`;
12. o HUD do bônus aparece;
13. as oito rodadas começam automaticamente.

## Durante as 8 rodadas grátis

O player mostra:

- contador `8 → 0`;
- `ECLIPSE BONUS` sempre visível;
- aposta usada no bônus;
- ganho acumulado do bônus com contagem progressiva;
- cenário em modo eclipse ativo;
- reels com iluminação exclusiva;
- destaque de vitória por free spin;
- som curto exclusivo em cada free spin.

O botão de aposta fica bloqueado enquanto o bônus está ativo.

## Contagem progressiva do prêmio

Arquivo: `ripcom-provider/src/game/AnimatedAmount.tsx`.

Os valores não aparecem de forma seca. O player anima de `0` até o valor final usando easing, aplicado em:

- WIN comum;
- GREAT WIN;
- BIG WIN;
- MEGA WIN;
- ganho acumulado do bônus;
- total final do Eclipse Bonus.

A duração cresce nas celebrações maiores para aumentar impacto sem alterar o valor real liquidado no backend.

## Áudio procedural autoral

Arquivo: `ripcom-provider/src/game/audio.ts`.

O áudio é sintetizado no navegador com Web Audio API; não usa samples, músicas ou efeitos copiados de outros jogos.

Eventos sonoros atuais:

- `spin()` — início de giro pago;
- `reelStop(index)` — parada individual dos rolos;
- `scatterLand(count)` — chegada de scatter;
- `wildReveal()` — revelação de wild;
- `freeSpin()` — início de rodada grátis;
- `tease()` — suspense crescente do quase bônus;
- `bonusHit()` — confirmação do Eclipse Bonus;
- `win(multiplier)` — vitória normal, Great Win, Big Win ou Mega Win;
- `bonusComplete()` — encerramento das 8 rodadas.

Há botão de som no cabeçalho do player. Navegadores exigem uma interação do usuário antes de liberar áudio; por isso o motor é desbloqueado no primeiro toque/clique.

## GREAT WIN / BIG WIN / MEGA WIN

Essa classificação é somente de apresentação audiovisual; ela não muda RNG, saldo ou matemática.

- `GREAT WIN`: multiplicador da rodada `>= 5x` e `< 10x`.
- `BIG WIN`: multiplicador da rodada `>= 10x` e `< 25x`.
- `MEGA WIN`: multiplicador da rodada `>= 25x`.

Quando ocorre uma celebração:

- a sequência automática de free spins pausa temporariamente;
- entra overlay de celebração;
- partículas explodem radialmente;
- anéis de energia se expandem;
- texto, valor e multiplicador ganham destaque;
- o valor sobe progressivamente até o total real;
- símbolos vencedores pulsam;
- cada faixa possui sequência sonora própria;
- após a animação, o fluxo normal continua.

## Mobile tuning

A versão `sandbox.7` reduz custo visual em telas pequenas sem deixar o jogo estático:

- reduz quantidade de partículas de celebração;
- remove anel secundário do eclipse em telas muito estreitas;
- reduz blur/glow pesados;
- mantém névoa, eclipse, scatter e wild animados;
- mantém `prefers-reduced-motion` para acessibilidade;
- usa `touch-action: manipulation` no player.

## Encerramento

Depois da oitava rodada:

- aparece a tela `ECLIPSE BONUS CONCLUÍDO`;
- mostra `8 RODADAS GRÁTIS`;
- mostra o total acumulado no bônus com contagem progressiva;
- toca a sequência de encerramento;
- o jogo retorna ao estado normal.

## Persistência no backend

Campos de sessão:

- `free_spins_remaining`
- `free_spins_total`
- `bonus_bet`
- `bonus_total_win`
- `bonus_rounds_played`
- `bonus_triggered_at`

Campos de round:

- `is_free_spin`
- `free_spins_remaining_after`
- `bonus_awarded`
- `bonus_bet`
- `bonus_total_win_after`
- `bonus_rounds_played_after`

## Validação matemática DEMO

Teste de homologação da release 1.1.0:

- saldo inicial: `1000`;
- giro pago: aposta `5`;
- bônus ativado: `8` free spins;
- saldo após giro pago sem prêmio: `995`;
- 8 free spins executadas sem novo débito de aposta;
- prêmio de teste: `1` crédito em cada free spin;
- ganho total do bônus: `8`;
- saldo final esperado e obtido: `1003`;
- rounds registrados: `1 pago + 8 grátis`;
- `free_spins_remaining` final: `0`.

## Versionamento

- `Eclipse Serpent = 1.1.0`
- `RIPCOM Provider Frontend = 1.0.0-sandbox.7`
- `ripcom-player-runtime = v1`

## Segurança

- continua 100% DEMO/fun-money;
- private keys B2B não entram no player;
- service role fica apenas no Edge Runtime;
- o browser recebe somente token temporário de sessão;
- o frontend não decide se um giro é grátis: o backend verifica o estado da sessão;
- áudio, contadores e VFX não alteram resultado, RNG, saldo ou liquidação.
