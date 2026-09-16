# RIPCOM — Relatório de Homologação Core

Data: **16/09/2026**  
Ambiente: **SANDBOX / DEMO**  
Operador de teste: `ripcom-qa`

## Objetivo

Validar o núcleo transacional da RIPCOM antes de integrar uma plataforma externa real.

## Resultado geral

**PASSOU — CORE DB FLOW**

O teste externo HTTP assinado não foi executado neste ambiente porque o terminal disponível não conseguiu resolver o domínio do Supabase. Isso é uma limitação do ambiente de execução, não um resultado negativo da API.

## Testes executados

### 1. Operador sandbox independente

Foi criado `ripcom-qa`, separado do operador `rr7`, com chave pública RSA própria e acesso apenas ao Eclipse Serpent.

Fingerprint SHA-256 da public key usada no teste:

`37adfb44a3d17dd02c18ac3c2a6c838e68fad587b90e926942b2a989f1fc2214`

A private key foi tratada como chave efêmera de QA e **não foi commitada no GitHub**.

Após a homologação core, o operador foi colocado em `SUSPENDED`. Uma nova chave deve ser gerada/rotacionada antes do smoke test HTTP externo.

### 2. Versionamento do jogo

O Eclipse Serpent possui release formal:

- versão: `1.0.0`
- status: `SANDBOX`
- game code: `ripcom-slot:eclipse-serpent`

Os operadores `rr7` e `ripcom-qa` ficaram fixados na release `1.0.0`.

### 3. Vínculo automático de sessão com release

Foi criada uma sessão B2B para `ripcom-qa`.

Resultado:

- status inicial: `ACTIVE`
- saldo inicial: `1000 DEMO`
- release associada automaticamente: `1.0.0`

Isso comprova que uma sessão guarda a versão do jogo usada no momento da criação.

### 4. Liquidação de rodada DEMO

Rodada de QA:

- aposta: `5`
- prêmio: `10`
- multiplicador: `2x`
- saldo inicial: `1000`
- saldo esperado após rodada: `1005`
- saldo observado: `1005`

Resultado: **PASSOU**.

### 5. Idempotência de round

O mesmo `request_id` (`qa-idempotency-001`) foi enviado duas vezes para a função de liquidação.

Resultado observado:

- rounds persistidos com esse request ID: `1`
- saldo final: `1005`
- débito/crédito não foi aplicado uma segunda vez

Resultado: **PASSOU**.

### 6. Encerramento de sessão

A sessão foi alterada para `CLOSED`.

Depois disso, uma nova tentativa de rodada retornou:

`SESSION_NOT_ACTIVE`

Resultado: **PASSOU**.

## O que este teste comprova

- operador independente pode receber entitlement de jogo;
- operador pode ser fixado em uma release específica;
- sessão B2B recebe a release automaticamente;
- ledger DEMO é atualizado atomicamente;
- request duplicado não duplica a rodada;
- saldo não sofre dupla alteração;
- sessão encerrada não aceita novas rodadas.

## O que ainda precisa ser validado

Antes de considerar a integração de parceiro sandbox totalmente homologada:

1. gerar uma nova chave RSA para o operador de homologação;
2. reativar o operador;
3. executar `GET /v1/games` com assinatura RSA por HTTP;
4. executar `POST /v1/sessions`;
5. executar `POST /v1/games/launch`;
6. abrir o player por `launch_url`;
7. executar um spin pelo player;
8. encerrar a sessão pela API;
9. validar telemetria HTTP e duração dos requests.

## Observação de segurança

O operador QA permanece suspenso após o teste. A private key usada nesta homologação não deve ser considerada uma credencial permanente.
