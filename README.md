# RR7.BET

Laboratório educacional/demonstrativo de uma plataforma de lobby de jogos, construído mobile-first.

## Escopo atual

- lobby responsivo RR7.BET;
- catálogo, provedores, categorias, banners e promoções carregados do Supabase;
- autenticação por e-mail com Supabase Auth;
- favoritos e recentes persistidos por usuário;
- carteira com 10.000 créditos exclusivamente DEMO;
- ledger PostgreSQL imutável para bônus, apostas e resultados DEMO;
- RLS para isolar dados entre usuários;
- RPC idempotente para processar rodadas demonstrativas;
- painel ADMIN para jogos, provedores, categorias, banners, promoções, usuários e auditoria;
- proteção contra autoelevação de papel para ADMIN;
- auditoria automática de mutações administrativas;
- arquitetura preparada para futuros adapters B2B autorizados.

## Importante

Este projeto **não processa dinheiro real**, PIX, depósitos ou saques. Os jogos e provedores atuais são fictícios/demonstrativos.

## Stack

React + TypeScript + Vite + TanStack Router + TanStack Query + Tailwind CSS + Supabase/PostgreSQL.

## Supabase

Projeto: `tndnqjbkfwongolorvjm`

Somente a chave **publishable** é usada no frontend. Chaves privadas ou `service_role` não pertencem ao código cliente.

Copie `.env.example` para `.env` se quiser sobrescrever as configurações públicas do projeto:

```bash
cp .env.example .env
```

## Administração

As rotas `/admin/*` exigem sessão autenticada e `profiles.role = 'ADMIN'`. Como a elevação de papel é protegida no banco, uma conta comum não consegue promover a si mesma pelo cliente.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Validação

```bash
npm run typecheck
npm run build
```

O GitHub Actions executa os dois comandos em pushes e pull requests para `main`.
