# Eclipse Serpent — Sandbox.19

Status: **SANDBOX / DEMO**  
Frontend: **1.0.0-sandbox.19**  
Math release: **1.3.0**  
Layout: **3x3 / 5 fixed paylines**

## Objetivo desta etapa

A sandbox.19 transforma o Eclipse Serpent em uma identidade celestial mais coesa, mantendo intacta a matemática 1.3.0, a escada de apostas, o auto-spin e as 8 free spins.

## WILD solar

O WILD anterior foi substituído por uma arte solar aprovada pelo projeto.

Características:

- sol flamejante com palavra `WILD` integrada na própria arte;
- corona animada;
- pulsação solar em repouso;
- brilho e escala reforçados quando participa de uma linha vencedora;
- asset dedicado em `ripcom-provider/public/assets/solar-wild-v19.svg`;
- animação GPU/CSS em `ripcom-provider/src/celestial-stage19.css`.

## Lua

O símbolo `moon` agora possui arte lunar própria e não recebe texto `WILD`.

Características:

- superfície craterada;
- material prata/cinza;
- aura dourada discreta;
- shimmer frio;
- movimento lento e separado do WILD.

A Lua continua com o mesmo pagamento matemático configurado na release 1.3.0.

## Scatter / BONUS

O scatter foi redesenhado como um mini eclipse vivo:

- sol laranja atrás;
- lua escura cruzando o disco;
- diamond ring / arco de luz;
- corona pulsante;
- aumento de intensidade no tease.

O scatter não recebe pagamento direto; continua responsável pelo trigger de 3 scatters para 8 free spins.

## Intro cinematográfica do Eclipse Bonus

A arte aprovada de eclipse foi adicionada como camada de profundidade cinematográfica em:

`ripcom-provider/public/assets/eclipse-bonus-v19.svg`

A intro combina esta arte com as camadas procedurais existentes:

1. fundo escurece;
2. arte eclipse entra com zoom/pan;
3. sol procedural pulsa;
4. lua procedural atravessa e fecha o eclipse;
5. corona cresce;
6. raios e partículas aumentam;
7. serpente sobe lentamente;
8. texto `ECLIPSE BONUS` aparece;
9. texto `8 RODADAS GRÁTIS` aparece;
10. jogo entra no modo de free spins.

A duração permanece aproximadamente 7 segundos.

## Free spins

Durante as 8 free spins:

- atmosfera de eclipse permanece ativa;
- reels recebem iluminação mais quente;
- HUD do bônus continua mostrando rodadas restantes e ganho acumulado;
- free spins não debitam saldo;
- aposta permanece travada no valor que acionou o bônus;
- auto-spin pago não perde contagem durante free spins e pode retomar depois.

## Fluidez

A sandbox.19 mantém todas as melhorias da sandbox.18:

- células 3x3 estritamente iguais;
- reel motion via transform GPU;
- settle físico ao parar;
- animações reduzidas em mobile;
- `prefers-reduced-motion` respeitado.

A sandbox.19 adiciona ainda:

- light sweep durante giro;
- pouso sequencial visual dos três rolos;
- orçamento menor de partículas no bônus em telas mobile.

## Arquivos principais

- `ripcom-provider/src/game/SymbolArt.tsx`
- `ripcom-provider/src/game/BonusIntroOverlay.tsx`
- `ripcom-provider/src/celestial-stage19.css`
- `ripcom-provider/public/assets/solar-wild-v19.svg`
- `ripcom-provider/public/assets/eclipse-bonus-v19.svg`
- `ripcom-provider/public/provider-manifest.json`

## Regras preservadas

- Release matemática: `1.3.0`
- 3 colunas x 3 linhas
- 5 paylines fixas
- WILD substitui pelo maior pagamento válido da linha
- 3 scatters acionam bônus
- 8 free spins
- sem retrigger
- DEMO / fun-money only
- bets 0,50 a 40,00
- auto-spin 10 / 20 / 30 / 50 / 100

## Política visual

A implementação usa arte original RIPCOM e princípios comuns de UX de slots mobile. Não copia assets, marcas, áudio, personagens ou trade dress proprietário de terceiros.
