# DigitalWallet

Infraestrutura para rastrear embalagens retornáveis, comprovar circularidade e
creditar recompensas com segurança. O repositório está no início da execução do
MVP descrito no [plano mestre](./index.html).

## Estado atual

- O [roadmap](./docs/ROADMAP.md) divide a entrega em `F00` + 14 fases semanais.
- O [progresso vivo](./docs/PROGRESS.md) registra checks e dependências externas.
- A primeira fatia implementável cobre domínio, API e persistência local.
- Nenhum ambiente de produção ou conta externa é alterado por estes comandos.

## Pré-requisitos

- Node.js `22.22.x`
- pnpm `11.1.1`
- Docker com Compose v2 (para PostgreSQL local)

O Flutter SDK será necessário quando a fase mobile começar; ele ainda não faz
parte da fundação local atual.

## Primeira execução

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm validate
pnpm dev:api
```

A API fica em `http://localhost:3000/api`, a documentação em
`http://localhost:3000/api/docs` e o healthcheck em
`http://localhost:3000/api/v1/health`.

## Comandos de qualidade

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm validate
```

`pnpm validate` é o gate local completo. Novos checks em `docs/PROGRESS.md` só
são concluídos depois que a evidência correspondente existe e esse gate passa.

## Estrutura

```text
apps/api/              API NestJS e adaptadores HTTP
packages/domain/       regras de negócio sem dependência de framework
packages/database/     schema, migrações e cliente Prisma
docs/                  escopo, decisões, roadmap e progresso
index.html             plano mestre visual e interativo
```

## Segurança local

`.env.example` contém apenas valores de desenvolvimento. Nunca grave chaves de
RPC, credenciais cloud, tokens de identidade ou segredos de cashout no Git.
