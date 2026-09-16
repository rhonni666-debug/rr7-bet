# Eclipse Serpent — Mobile QA Profile

Atualizado em: 16/09/2026  
Frontend: `RIPCOM Provider 1.0.0-sandbox.8`  
Game release: `Eclipse Serpent 1.1.0`  
Modo: `SANDBOX / DEMO`

## Objetivo

Validar o Eclipse Serpent em celular real, com prioridade para experiência portrait/9:16. O vídeo de referência enviado pelo proprietário foi usado apenas para observar ritmo e proporção geral de slots mobile; nenhum asset, imagem, som, marca ou animação proprietária foi copiada.

## Perfil alvo

- orientação principal: portrait;
- proporção alvo: aproximadamente 9:16;
- reels devem ocupar a maior parte da área útil;
- controles ficam compactos na parte inferior;
- botão de spin precisa continuar confortável para toque;
- safe areas de notch/home indicator devem ser respeitadas;
- fundo continua vivo, mas com orçamento reduzido de partículas no mobile.

## Timing alvo

### Giro normal

- movimento inicial dos reels: ~`0.5–0.7s`;
- percepção de parada em sequência: rápida;
- snap visual de cada coluna: ~`0.2s`;
- resultado deve parecer responsivo, não instantâneo e nem lento.

### Quase bônus / tease

- só acontece quando o resultado real tem pelo menos 2 scatters;
- duração aproximada: `1.2–1.7s`;
- o tease deve ser perceptivelmente mais longo que um giro normal;
- o rolo decisivo recebe glow/tremor;
- áudio cresce em tensão;
- o eclipse começa a responder visualmente.

### Bônus confirmado

- 3 scatters;
- flash/impacto;
- lua fecha o eclipse;
- serpente sobe;
- texto `ECLIPSE BONUS`;
- texto `8 RODADAS GRÁTIS`;
- duração da intro: aproximadamente `4.3s` na sandbox.8.

### Free spins

- sequência automática `8 → 0`;
- intervalo curto entre rodadas;
- sem débito de nova aposta;
- HUD permanece visível;
- vitória grande pausa a sequência para celebração;
- cenário continua em modo eclipse ativo.

## Ajustes sandbox.8

Arquivo principal de tuning:

```text
ripcom-provider/src/mobile-stage8.css
```

Inclui:

- layout portrait otimizado;
- safe-area CSS para notch/home indicator;
- `100dvh` no player;
- reels flexíveis ocupando mais altura;
- título/header reduzidos no celular;
- controles inferiores compactos;
- botão de spin dimensionado para toque;
- HUD do bônus reduzido e legível;
- intro da serpente/eclipses recalibrada no mobile;
- redução de partículas e blur para performance;
- menos partículas em celebrações;
- snap visual dos reels no reveal;
- tease reforçado no rolo decisivo.

## Checklist de teste em aparelho real

1. Abrir o jogo em portrait.
2. Confirmar que não existe scroll da página durante o jogo.
3. Confirmar que header, reels e controles cabem em uma tela.
4. Verificar se o botão SPIN pode ser tocado com o polegar sem erro.
5. Rodar pelo menos 20 spins normais e observar travadas.
6. Confirmar que o fundo se move sem prejudicar leitura dos símbolos.
7. Observar scatter em idle/reveal.
8. Observar wild em idle/reveal.
9. Validar um tease com 2 scatters.
10. Validar bônus completo com 8 free spins.
11. Confirmar que o HUD não cobre os reels.
12. Confirmar que a intro da serpente não corta cabeça/corpo em telas estreitas.
13. Validar GREAT WIN, BIG WIN e MEGA WIN quando disponíveis.
14. Ligar/desligar som.
15. Testar rotação para landscape e voltar para portrait.
16. Testar recarregar a página durante free spins; o contador deve continuar.
17. Confirmar que nenhuma free spin debita a aposta.

## Critérios de aprovação

A sandbox.8 passa no QA mobile quando:

- nenhuma área importante fica cortada;
- não existe scroll acidental;
- reels permanecem legíveis;
- nenhuma animação essencial cai abaixo de fluidez aceitável no aparelho;
- tease e bonus intro são claros;
- contador 8→0 funciona;
- o saldo DEMO continua correto;
- o áudio não estoura e não atrasa a interação;
- toque do SPIN responde de forma consistente.

## Próximo passo após QA real

Depois de receber feedback de um aparelho real, criar `sandbox.9` somente com ajustes de calibração de:

- tamanho dos símbolos;
- velocidade dos reels;
- duração do tease;
- tamanho do HUD;
- volume do áudio;
- quantidade de partículas;
- intensidade do shake/glow.
