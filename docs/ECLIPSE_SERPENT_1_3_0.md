# Eclipse Serpent 1.3.0 — 3×3 / 5 Linhas

Status: **SANDBOX / DEMO**  
Frontend de referência: **RIPCOM 1.0.0-sandbox.14**

## Modelo matemático

A release 1.3.0 usa uma grade `3×3` e **5 linhas fixas**.

Linhas:

1. meio: `[1,1,1]`
2. topo: `[0,0,0]`
3. baixo: `[2,2,2]`
4. diagonal descendente: `[0,1,2]`
5. diagonal ascendente: `[2,1,0]`

Uma linha vence quando os três rolos formam o mesmo símbolo, aceitando Wild como substituto. Cada linha é avaliada apenas uma vez. Se mais de um símbolo puder ser formado por Wilds, paga-se o símbolo válido de maior valor naquela linha.

O Scatter não possui pagamento direto nesta release; 3 ou mais Scatters ativam o Eclipse Bonus.

## Paytable RIPCOM por linha

| Símbolo | Valor base por linha |
|---|---:|
| Fragmento roxo | 0,20× |
| Lua / pedra vermelha | 0,30× |
| Runa / safira | 0,45× |
| Núcleo / esmeralda | 0,70× |
| Serpente Eclipse | 1,25× |
| Wild | 2,50× |
| Portal / Scatter | BONUS |

Exemplo: Fragmento roxo vencendo em 1 linha = `0,20×`. O mesmo símbolo vencendo em 3 linhas = `0,20× × 3 = 0,60×`.

O ganho DEMO final é `aposta × soma dos multiplicadores das linhas vencedoras`.

## Ritmo

- giro normal: ~1,5 s antes das paradas;
- intervalo entre paradas dos rolos: ~280 ms;
- rolos param sequencialmente;
- tease de Scatter: ~2,6 s; se houver bônus, ~3,4 s;
- intro do Eclipse Bonus: ~7 s;
- subida da serpente: ~4,15 s;
- free spins mantêm ritmo um pouco mais rápido, sem sensação turbo.

## Apresentação

As pedras mostram o valor base por linha (`0,20×`, `0,30×`, etc.). Após uma vitória o player mostra, por exemplo:

`0,20× × 3 LINHAS = 0,60×`

Também exibe os números das linhas vencedoras (`L1`, `L2`, etc.) e o ganho DEMO em CR.

## Bônus

- 3 Scatters;
- 8 free spins;
- sem retrigger nesta release;
- mesma aposta do giro que ativou o bônus;
- free spins não debitam nova aposta;
- estado persistente no backend.

## Autoridade

RNG, linha vencedora, multiplicador, saldo DEMO, rounds e bônus são definidos no backend `ripcom-player-runtime`. O frontend apenas apresenta o resultado retornado.
