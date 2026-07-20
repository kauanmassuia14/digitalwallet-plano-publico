# Arquitetura inicial

O MVP começa como um monólito modular com workers separados por responsabilidade.
Isso mantém as transações críticas próximas sem misturar domínio, HTTP, persistência
e integrações externas.

```text
Flutter / Dashboard / Totem
            │
      API HTTP NestJS
            │
  ┌─────────┼────────────┐
  │         │            │
Domínio  PostgreSQL    Outbox
                        │
                 workers assíncronos
                    │         │
                 Polygon   Cashout
```

## Fronteiras de módulo

- **Identity:** principal autenticado, memberships e papéis.
- **Tenancy:** contexto obrigatório e políticas de isolamento.
- **Packaging:** lote, embalagem, QR e ciclo físico.
- **Collection:** challenge, peso, evento do totem e claim.
- **Rewards:** ledger, saldo projetado, cashout e reversão.
- **Trust:** outbox, prova Polygon, nonce e reconciliação.
- **Metrics:** projeções e fórmulas versionadas.
- **Audit:** ações administrativas append-only.

## Regras de dependência

- O domínio não importa NestJS, Prisma, HTTP ou SDK de terceiros.
- Controllers traduzem protocolo; não decidem transições de negócio.
- Repositórios pertencem às portas do caso de uso; Prisma é um adaptador.
- Publicação externa parte da outbox gravada na mesma transação do domínio.
- IDs, timestamps, tenant e idempotency key entram explicitamente nos comandos.

As decisões aceitas e suas consequências ficam em `docs/architecture/adr`.
