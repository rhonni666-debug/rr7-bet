# Hub88 DEMO POC — RR7

## Objetivo
Preparar o RR7 para testar conteúdo original de PG SOFT e TaDa Gaming por uma conta Hub88 de staging autorizada, estritamente em modo DEMO/fun-money.

## Limite de segurança
Esta POC não implementa depósito, saque, PIX, carteira de dinheiro real nem apostas com dinheiro real. O caminho Hub88 permanece desativado até existirem credenciais oficiais de staging.

## Segredos somente no servidor
Configure estes valores apenas como secrets das Supabase Edge Functions. Nunca use prefixo `VITE_` e nunca coloque valores reais no código do frontend:

- `HUB88_ENABLED=false`
- `HUB88_OPERATOR_ID`
- `HUB88_PRIVATE_KEY` (chave privada PEM PKCS#8)
- `HUB88_BASE_URL=https://api.server1.ih.testenv.io`
- `HUB88_LOBBY_URL=https://<dominio-demo-privado>/casino`
- `HUB88_COUNTRY=BR`
- `HUB88_LANGUAGE=pt-br`

Mantenha `HUB88_ENABLED=false` até a Hub88 confirmar a configuração de staging e a troca da chave pública RSA.

## Fluxo oficial implementado
A Edge Function `hub88-demo` suporta:

1. `list_products` → `POST /operator/generic/v2/products/list`
2. `list_games` → `POST /operator/generic/v2/game/list`
3. `launch_demo` → `POST /operator/generic/v2/game/url`

Cada requisição Hub88 assina o corpo JSON exato com RSA-SHA256 e envia a assinatura Base64 em `X-Hub88-Signature`.

O lançamento DEMO usa:

- `currency: "XXX"`
- `game_currency: "XXX"`
- sem `user`/`token` do jogador
- `GPL_MOBILE` ou `GPL_DESKTOP`
- lobby URL, país e idioma controlados no servidor

O catálogo é filtrado para `demo_game_support=true` e `enabled=true` antes de chegar ao cliente de POC.

## Sequência após receber as credenciais

1. Fazer deploy de `hub88-demo` sem habilitá-la.
2. Definir todos os secrets Hub88, mantendo `HUB88_ENABLED=false`.
3. Confirmar que a chave pública RSA foi aceita pela Hub88.
4. Alterar `HUB88_ENABLED=true` somente no staging.
5. Acessar `/admin/hub88-poc` e consultar `Status`.
6. Consultar os produtos e identificar os product codes realmente liberados para PG SOFT e TaDa Gaming. Não adivinhar códigos.
7. Consultar os jogos dos product codes retornados.
8. Usar somente `game_code` retornado pela API.
9. Lançar os demos e registrar `meta.latencyMs`.
10. Confirmar se cada provedor permite iframe na conta atribuída; caso contrário usar redirect/nova aba.

## Métricas da POC
Para cada provedor e tipo de dispositivo, medir pelo menos 100 lançamentos quando o sandbox permitir:

- taxa de sucesso
- latência da API p50/p95/p99
- tempo até primeiro frame jogável
- taxa de falha de iframe/redirect
- mobile vs desktop
- erros específicos por provedor
- completude do catálogo

Não executar teste de carga de alto volume em staging sem aprovação escrita da Hub88.

## Gate comercial
Ter o código no RR7 não autoriza uso comercial dos jogos. A ativação de produção depende das permissões contratuais fornecidas pela Hub88 e pelos provedores subjacentes.
