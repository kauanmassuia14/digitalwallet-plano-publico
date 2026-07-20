# ADR 0003 — Tenant resolvido pelo principal autenticado

- Status: Aceito para implementação local
- Data: 2026-07-15

## Contexto

Filtros de tenant recebidos do cliente são fáceis de omitir e podem expor dados de
outra marca. Suporte precisa trocar de contexto de forma explícita e auditável.

## Decisão

O servidor resolve os tenants permitidos a partir do principal autenticado. Cada
caso de uso recebe um `tenantId` obrigatório e cada consulta inclui esse escopo.
Troca de tenant exige membership/papel e gera auditoria.

Enquanto a integração real de identidade não existe, a API local aceita
`x-tenant-id` apenas no modo de desenvolvimento, validando UUID e tratando o valor
como contexto não confiável. Esse adaptador não pode ser habilitado em produção.

## Consequências

- Endpoints não aceitam `tenantId` no corpo como fonte de autorização.
- IDs conhecidos de outro tenant retornam `404`, não revelando sua existência.
- Testes de integração criam dois tenants e tentam acesso cruzado.
- Políticas futuras de banco/RLS podem reforçar, mas não substituir, o escopo no caso
  de uso.
