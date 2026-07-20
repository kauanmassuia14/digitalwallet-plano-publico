# Evidência — fundação local

- Executado em: `2026-07-15T21:11:02-03:00`
- Runtime: Node.js `22.22.2`
- Package manager: pnpm `11.1.1`
- Banco: PostgreSQL `17-alpine`, healthcheck saudável em `127.0.0.1:55432`
- ORM: Prisma `7.8.0`

## Verificações executadas

| Verificação                      | Resultado                                                         |
| -------------------------------- | ----------------------------------------------------------------- |
| `pnpm install`                   | lockfile resolvido; builds permitidos somente para Prisma/esbuild |
| `prisma validate`                | schema válido                                                     |
| `prisma generate`                | client gerado                                                     |
| `prisma migrate dev --name init` | migração criada e aplicada                                        |
| `prisma migrate status`          | banco em dia com 1 migração                                       |
| `pnpm typecheck`                 | 3 projetos verdes                                                 |
| `pnpm lint`                      | zero erro                                                         |
| `pnpm test`                      | 19 testes verdes                                                  |
| `pnpm build`                     | domínio, database e API compilados                                |
| Playwright desktop/mobile        | 15 fases, contadores, clique, teclado, largura e console válidos  |

## Comportamentos cobertos

- Criação de embalagem em `MINTED` preservando zeros do serial.
- Transições somente na ordem permitida.
- Tolerância de peso inclusiva em ±5%.
- Rejeição com evidência para peso fora da tolerância.
- Rejeição de timestamps regressivos.
- Cópias defensivas de datas do agregado.
- Header de tenant obrigatório e validado no adaptador local.
- Mesma embalagem invisível para outro tenant (`404`).
- Serial único dentro do tenant e reutilizável em tenant diferente.
- Contrato HTTP rejeita propriedades não declaradas.
- Plano visual calcula 19/104 checks e navega por F00 + W01–W14.
- Layout mobile não cria overflow horizontal e mantém navegação por teclado.

## Limites desta evidência

- A API ainda usa repositório em memória; a migração foi exercitada separadamente.
- O header local não é autenticação e não pode ser usado em produção.
- O readiness ainda cobre apenas o processo, não consulta banco ou dependências.
- CI foi versionado, mas ainda não foi executado pelo GitHub.
- Restore e deploy AWS dependem de conta e autorização externas.
