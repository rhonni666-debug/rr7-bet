# RIPCOM — Partner Onboarding Runbook

## Escopo atual

A RIPCOM v1 está disponível apenas em `SANDBOX` e `DEMO/fun-money`. Este processo não habilita dinheiro real.

## 1. Cadastro do operador

No painel RR7 Admin → RIPCOM B2B:

1. criar um operador com código único;
2. manter `environment = SANDBOX`;
3. manter `status = PENDING` até a troca de chaves terminar;
4. definir origens web permitidas quando houver player em iframe;
5. liberar explicitamente os jogos contratados/testados.

## 2. Chave do parceiro

O parceiro gera um par RSA de 2048 ou 3072 bits.

- A chave privada permanece exclusivamente no backend do parceiro.
- A RIPCOM recebe e armazena somente a chave pública PEM (`BEGIN PUBLIC KEY`).
- Nunca enviar chave privada por e-mail, chat ou painel RIPCOM.

Após troca de chave, registrar a data em `last_key_rotation_at` e ativar o operador somente depois do smoke test.

## 3. Assinatura

Headers obrigatórios:

- `X-Ripcom-Operator`
- `X-Ripcom-Timestamp`
- `X-Ripcom-Request-Id`
- `X-Ripcom-Signature`

Payload canônico:

`METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + REQUEST_ID + "\n" + SHA256(BODY)`

Assinatura: RSA-SHA256 / PKCS#1 v1.5, Base64.

O timestamp deve estar dentro da janela aceita pela API e cada `request_id` deve ser único. Repetir o mesmo `request_id` com payload diferente gera conflito de idempotência.

## 4. Smoke test obrigatório

Executar nesta ordem:

1. `GET /v1/health`
2. `GET /v1/games`
3. `POST /v1/sessions`
4. `POST /v1/games/launch`
5. abrir `launch_url` em desktop
6. executar pelo menos 10 giros DEMO
7. repetir em viewport mobile
8. `POST /v1/sessions/close`

Validar:

- assinatura aceita;
- catálogo contém somente jogos habilitados;
- saldo DEMO reduz com aposta e aumenta com prêmio;
- request idempotente não duplica operação;
- launch URL abre sem interface do RR7;
- sessão expirada/encerrada não aceita novos giros.

## 5. Limites

Cada operador possui limites independentes:

- `max_requests_per_minute`;
- `max_sessions_per_minute`.

Os limites são impostos no banco, não apenas no frontend. Operadores suspensos ou revogados não podem registrar novas requests/sessões.

## 6. Observabilidade

A RIPCOM registra para requests B2B:

- operador;
- request id;
- método e path;
- hash SHA-256 do body;
- status HTTP;
- sucesso/falha;
- código de erro;
- latência;
- timestamps.

Não registrar chaves privadas nem payloads sensíveis em logs.

## 7. Checklist para homologação de plataforma

Antes de considerar o sandbox homologado:

- [ ] chave pública RSA instalada;
- [ ] origens autorizadas conferidas;
- [ ] catálogo correto;
- [ ] launch desktop aprovado;
- [ ] launch mobile aprovado;
- [ ] idempotência validada;
- [ ] rate limit validado;
- [ ] encerramento/expiração de sessão validado;
- [ ] erros documentados;
- [ ] p95 de API medido em amostra representativa;
- [ ] nenhuma chave privada presente em frontend ou repositório.

## 8. Produção futura

`PRODUCTION` não deve ser liberado apenas mudando uma flag. Antes de dinheiro real, será necessário definir e validar separadamente:

- modelo de wallet/callback do operador;
- autenticação de callbacks e retry;
- reconciliação e idempotência financeira;
- segregação sandbox/produção;
- gestão e rotação de chaves;
- alertas/monitoramento;
- requisitos contratuais e regulatórios aplicáveis;
- certificação de jogo/RNG quando exigida.

Até essa etapa existir e ser aprovada, a RIPCOM permanece DEMO/fun-money.
