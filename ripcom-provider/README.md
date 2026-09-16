# RIPCOM Game Provider Frontend

Este diretório contém o **frontend oficial e independente da RIPCOM**.

Ele não depende da interface do RR7 para funcionar como portal/provider player. O RR7 continua sendo o primeiro operador sandbox e também hospeda temporariamente o build no GitHub Pages, mas a aplicação RIPCOM possui ciclo de build próprio.

## Responsabilidades

O app `ripcom-provider/` concentra:

- portal público da provedora;
- documentação visual da API B2B;
- visão de sandbox/operator;
- player independente para sessões RIPCOM;
- branding da RIPCOM;
- conexão pública do player com `ripcom-b2b`;
- camada visual reativa dos jogos.

## O que NÃO pertence a este frontend

- private key RSA de operadores;
- autenticação server-to-server de parceiros;
- lógica sensível de liquidação;
- service role do Supabase;
- wallet de dinheiro real;
- segredo B2B.

Esses elementos ficam no backend.

## Player

O player abre usando um token temporário de sessão:

```text
?play=<session_token>
```

Exemplo no host temporário do GitHub Pages:

```text
/rr7-bet/ripcom-provider/?play=<session_token>
```

O browser recebe somente o `session_token`. A chave privada do operador nunca entra no player.

## Eclipse Serpent — apresentação reativa

A versão `1.0.0-sandbox.2` adiciona a camada visual viva do Eclipse Serpent sem alterar a matemática `1.0.0` do jogo.

Inclui:

- cenário original de templo sob eclipse;
- névoa em camadas;
- partículas ambientes;
- halo e runas animados;
- movimento contínuo do fundo em desktop e mobile;
- reação visual durante o spin;
- tease quando o resultado real possui pelo menos 2 scatters;
- rolo decisivo em suspense;
- entrada cinematográfica `ECLIPSE BONUS` quando `scatterCount >= 3`;
- modo reduzido para `prefers-reduced-motion`.

Documentação detalhada:

```text
docs/ECLIPSE_SERPENT_VFX.md
```

## API

O frontend usa a variável:

```text
VITE_RIPCOM_API_BASE_URL
```

Fallback atual de sandbox:

```text
https://tndnqjbkfwongolorvjm.supabase.co/functions/v1/ripcom-b2b
```

## Desenvolvimento

```bash
npm --prefix ripcom-provider install
npm --prefix ripcom-provider run dev
```

## Validação

```bash
npm --prefix ripcom-provider run typecheck
npm --prefix ripcom-provider run build
```

Esses dois comandos também fazem parte do CI principal do repositório.

## Deploy atual

O workflow `.github/workflows/deploy-pages.yml`:

1. compila o RR7;
2. compila este app separadamente;
3. copia o build para `dist/ripcom-provider/`;
4. publica ambos no GitHub Pages.

Esse hosting compartilhado é **temporário**. A arquitetura já permite migrar o frontend RIPCOM para um domínio próprio sem mover a API B2B nem o banco.

## Domínio futuro

Quando houver domínio próprio, a direção recomendada é separar:

```text
provider.<dominio-ripcom>   -> portal/player
api.<dominio-ripcom>        -> API B2B
```

A URL pública de launch deverá apontar diretamente para o frontend RIPCOM independente.

## Versionamento

Versão formal atual do frontend/provider portal:

```text
1.0.0-sandbox.2
```

O versionamento do **frontend da provedora** é separado do versionamento dos **jogos**:

```text
RIPCOM Provider Frontend 1.0.0-sandbox.2
Eclipse Serpent 1.0.0
```

Isso permite atualizar apresentação, portal e player sem fingir que o jogo teve uma nova release matemática.
