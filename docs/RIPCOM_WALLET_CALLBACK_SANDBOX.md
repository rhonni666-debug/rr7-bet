# RIPCOM Wallet Callback Sandbox

## Objetivo

Validar a integração de carteira de um operador externo sem dinheiro real. O fluxo atual é exclusivamente sandbox/fun-money.

## Endpoint de teste

`POST /functions/v1/ripcom-wallet-callback`

A chamada do operador para a RIPCOM usa os mesmos headers RSA-SHA256 do B2B principal:

- `X-Ripcom-Operator`
- `X-Ripcom-Timestamp`
- `X-Ripcom-Request-Id`
- `X-Ripcom-Signature`

Canonical path para assinatura: `/v1/wallet/callback-test`.

Eventos aceitos:

- `PING`
- `BALANCE`
- `BET`
- `WIN`
- `REFUND`

## Fluxo

1. O operador envia um request assinado para `ripcom-wallet-callback`.
2. A RIPCOM valida operador, timestamp, assinatura, `wallet_mode` e `callback_url`.
3. A RIPCOM cria um evento sandbox e faz POST para o callback HTTPS do operador.
4. O callback recebe headers de sandbox e o payload do evento.
5. A RIPCOM grava status HTTP, latência, resposta e erro em `ripcom_wallet_callback_events`.

## Headers enviados ao operador

- `X-Ripcom-Sandbox: true`
- `X-Ripcom-Event-Id`
- `X-Ripcom-Event-Type`
- `X-Ripcom-Operator`
- `X-Ripcom-Body-SHA256`

O hash serve para conferência de integridade do corpo no sandbox. Produção deve usar assinatura de callback com chave da provedora e política de rotação própria.

## Receiver DEMO

O projeto inclui `ripcom-wallet-receiver-demo`, um receiver de homologação que aceita somente eventos com `X-Ripcom-Sandbox: true` e devolve o `challenge` recebido.

O operador `rr7` está configurado como primeiro cliente de homologação com `wallet_mode = EXTERNAL_CALLBACK`, apontando para esse receiver DEMO.

## Smoke test

Use `npm run ripcom:wallet:smoke` com `RIPCOM_PRIVATE_KEY_FILE` apontando para a chave privada sandbox do operador. A chave privada nunca deve ir para GitHub, frontend ou banco RIPCOM.

## Limitações

- nenhum valor representa dinheiro real;
- o callback sandbox não é autorização para produção;
- não existe settlement financeiro real;
- produção exige assinatura de callbacks pela RIPCOM, controles de replay, reconciliação, certificação e requisitos regulatórios aplicáveis.
