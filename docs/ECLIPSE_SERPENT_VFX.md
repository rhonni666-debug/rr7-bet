# Eclipse Serpent — Living Scene & Bonus VFX

Atualizado em: 16/09/2026  
Frontend RIPCOM: `1.0.0-sandbox.2`  
Game release/math: `Eclipse Serpent 1.0.0`  
Modo: `SANDBOX / DEMO`

## Objetivo

Dar vida ao Eclipse Serpent sem alterar a matemática da release `1.0.0`. Esta entrega modifica a camada visual do player standalone RIPCOM.

## Arquivos principais

- `ripcom-provider/src/App.tsx` — máquina de estados visuais e timing do tease/bônus.
- `ripcom-provider/src/game-vfx.css` — animações, partículas, névoa, halo, transições e responsividade.
- `ripcom-provider/src/assets/eclipse-temple-bg.svg` — cenário original do templo sob eclipse.
- `ripcom-provider/src/main.tsx` — carrega a camada VFX.
- `ripcom-provider/public/provider-manifest.json` — registra capacidades VFX e versão do frontend.

## Estados visuais do jogo

O player utiliza os estados:

- `idle` — cenário vivo em movimento contínuo.
- `spinning` — partículas aceleram e o cenário ganha mais saturação/luz.
- `tease` — ameaça de bônus com dois scatters já visíveis e um rolo decisivo em suspense.
- `bonus` — entrada cinematográfica do Eclipse Bonus.
- `reveal` — retorno controlado para exibir o resultado e prêmio.

## Fundo vivo

O cenário foi criado especificamente para o Eclipse Serpent e contém:

- templo antigo;
- eclipse central;
- silhuetas de montanhas/ruínas;
- runas e círculos místicos;
- névoa em duas profundidades;
- partículas/brasas verdes subindo;
- halo respirando ao redor do eclipse;
- varredura lenta de luz;
- movimento contínuo do cenário também no celular.

O fundo não depende do mouse para parecer vivo.

## Tease de bônus

O tease não é acionado aleatoriamente.

Ele só acontece quando o **resultado real da rodada contém pelo menos 2 scatters** e existe uma coluna que pode ser usada como rolo decisivo mantendo dois scatters já visíveis.

Fluxo:

1. o servidor devolve o resultado da rodada;
2. dois scatters são mantidos visíveis;
3. o rolo decisivo continua girando visualmente;
4. o fundo escurece e muda de energia;
5. o halo do eclipse pulsa em tom dourado;
6. o rolo decisivo recebe glow/tremor leve;
7. surge a mensagem `O ECLIPSE ESTÁ ABRINDO`;
8. depois do suspense o resultado real é revelado.

Isso evita um “quase bônus” falso desconectado do resultado real.

## Bônus ativado

Quando `scatterCount >= 3`:

1. os rolos revelam o resultado real;
2. o estado muda para `bonus`;
3. o cenário fica mais brilhante/saturado;
4. o eclipse ganha halo forte;
5. partículas aceleram;
6. anéis de energia se expandem na tela;
7. partículas explodem radialmente;
8. entra a tela `ECLIPSE BONUS`;
9. a quantidade real de scatters aparece na mensagem;
10. após a intro o jogo entra no estado de revelação da rodada.

Esta animação representa o evento de scatter da versão atual. Ela **não afirma free spins** porque a matemática `1.0.0` ainda não possui um modo persistente de free spins separado.

## Responsividade e acessibilidade

- O cenário possui movimento específico para mobile.
- A intensidade visual é reduzida automaticamente quando o dispositivo/usuário utiliza `prefers-reduced-motion`.
- Nenhuma chave RSA, segredo de operador ou service role entra na camada visual.

## Versionamento

A matemática permanece:

`Eclipse Serpent = 1.0.0`

A camada standalone RIPCOM passa para:

`RIPCOM Provider Frontend = 1.0.0-sandbox.2`

A separação é intencional: mudanças de apresentação podem evoluir sem fingir que a matemática do jogo mudou.

## Próxima evolução visual recomendada

- efeitos sonoros próprios para tease e bônus;
- animação individual de cada símbolo;
- contador animado de prêmio;
- Big Win / Mega Win;
- modo bônus persistente apenas quando a matemática e o backend tiverem uma feature de bônus real definida;
- testes em dispositivos móveis reais para calibrar intensidade e performance.
