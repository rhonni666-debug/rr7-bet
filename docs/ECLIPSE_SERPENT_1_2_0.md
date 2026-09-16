# Eclipse Serpent 1.2.0 — Paytable por Ways

Status: **SANDBOX / DEMO**  
Frontend de referência: **RIPCOM 1.0.0-sandbox.13**

## Regra de pagamento

A release 1.2.0 usa `THREE_REEL_WAYS`.

Uma combinação vencedora é formada escolhendo uma posição em cada um dos três rolos. Cada combinação é avaliada uma única vez. O Wild pode substituir um símbolo normal e, quando mais de um símbolo seria válido, aquela combinação paga somente o símbolo válido de maior valor.

Não existe mais o limite artificial de 4 ou 6 ways da versão anterior. Todas as combinações vencedoras são somadas.

### Valores base por combinação

| Símbolo | Valor base por way |
|---|---:|
| Fragmento roxo (`shard`) | 0,20× |
| Lua / gema vermelha (`moon`) | 0,30× |
| Runa / safira (`rune`) | 0,45× |
| Núcleo / esmeralda (`core`) | 0,70× |
| Serpente Eclipse (`serpent`) | 1,25× |
| Wild | 2,50× |
| Scatter / Portal | BONUS |

Exemplo: 1 way de Fragmento roxo = `0,20×`. Quatro ways do mesmo símbolo = `0,20× × 4 = 0,80×`. Com aposta DEMO de 10 CR, isso resulta em `8,00 CR`.

O Scatter não possui pagamento direto nesta release; 3 ou mais Scatters ativam o Eclipse Bonus com 8 rodadas grátis.

## Ritmo do jogo

A sandbox.13 remove a sensação de turbo:

- giro normal: aproximadamente 1,2 s antes das paradas;
- rolos param em sequência;
- intervalo normal entre paradas: aproximadamente 220 ms;
- free spin: ritmo um pouco mais rápido, mas ainda cadenciado;
- tease com dois Scatters dura mais de 2 s;
- entrada do Eclipse Bonus dura aproximadamente 6,5 s;
- subida da serpente é desacelerada e dividida em fases de profundidade.

## Apresentação do ganho

Quando houver vitória, o player mostra o detalhamento, por exemplo:

`0,20× × 4 LINHAS = 0,80×`

O valor em CR é calculado a partir da aposta da rodada. Os valores mostrados nas pedras são carregados de `slot_game_configs.symbols[].pay`; não são valores duplicados ou fixos apenas no frontend.

## Bônus

- gatilho: 3 Scatters;
- 8 free spins;
- sem retrigger em 1.2.0;
- mesma aposta do giro que ativou o bônus;
- free spins não debitam nova aposta;
- estado do bônus continua persistente no backend.

## Segurança / autoridade

O backend continua sendo a autoridade do resultado, multiplicador, saldo DEMO, free spins e auditoria. O frontend apenas apresenta os dados retornados pelo runtime.
