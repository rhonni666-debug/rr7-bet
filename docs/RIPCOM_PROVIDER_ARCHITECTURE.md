# RIPCOM Game Provider

## Status atual

A RIPCOM é uma provedora própria registrada como `REAL` no catálogo do RR7. O RR7 é o primeiro operador sandbox da RIPCOM.

### Provider
- slug: `ripcom`
- provider_type: `REAL`
- status: `ACTIVE`
- runtime: Supabase Edge Function `ripcom-provider`

### Primeiro jogo
- nome: `Eclipse Serpent`
- slug: `eclipse-serpent`
- external_game_id: `ripcom-slot:eclipse-serpent`
- launch_type: `PROVIDER_SESSION`
- modo atual: `DEMO`

## Separação de responsabilidades

### RR7
É um operador/cliente da RIPCOM. Não deve conter regras exclusivas do motor matemático da provedora.

### RIPCOM
Responsável por:
- catálogo de jogos;
- sessões de jogo;
- motor de rodada;
- resultado/RNG;
- liquidação DEMO;
- logs e auditoria;
- futura API B2B para outros operadores.

## Runtime interno v1

O frontend do RR7 seleciona `RipcomProviderAdapter` quando:

- `provider.slug === "ripcom"`
- `provider.providerType === "REAL"`

O adapter chama a Edge Function `ripcom-provider`, que valida que jogo/sessão pertencem à RIPCOM antes de encaminhar a execução ao motor atual.

## Registro B2B

As tabelas `ripcom_operators` e `ripcom_operator_games` separam plataformas clientes dos usuários finais.

O operador inicial é:

- code: `rr7`
- environment: `SANDBOX`
- status: `ACTIVE`
- integration: interna

Novos operadores devem receber cadastro próprio e apenas os jogos explicitamente habilitados em `ripcom_operator_games`.

## API B2B externa planejada

A interface pública deve ser versionada e independente da autenticação Supabase do RR7.

Endpoints alvo:

- `GET /v1/health`
- `GET /v1/games`
- `POST /v1/sessions`
- `POST /v1/games/launch`
- `POST /v1/wallet/balance`
- `POST /v1/wallet/bet`
- `POST /v1/wallet/win`
- `POST /v1/wallet/refund`
- `POST /v1/sessions/close`

## Autenticação B2B recomendada

Para operadores externos, não reutilizar JWT de usuário do RR7.

Usar assinatura assimétrica por operador:

- cada operador mantém sua chave privada;
- RIPCOM armazena apenas a chave pública em `ripcom_operators.public_key_pem`;
- header `X-Ripcom-Operator` identifica o operador;
- header `X-Ripcom-Timestamp` limita replay;
- header `X-Ripcom-Request-Id` garante idempotência;
- header `X-Ripcom-Signature` contém assinatura do payload canônico.

Payload canônico sugerido:

`METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + REQUEST_ID + "\n" + SHA256(BODY)`

## Produção

O runtime atual é exclusivamente DEMO/fun-money. Suporte a dinheiro real não deve ser habilitado apenas por alteração de configuração. Exige uma camada separada de compliance, certificação do RNG/jogo, controles de operação e requisitos aplicáveis à jurisdição e aos operadores integrados.
