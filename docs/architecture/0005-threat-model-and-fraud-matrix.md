# ADR 0005: Modelo de Ameaças (Threat Model) e Matriz de Fraude

## Status

Aprovado

## Contexto

O modelo de negócios do DigitalWallet baseia-se em pagar recompensas financeiras (`rewardCents`) a usuários que coletam e reciclam embalagens com QR codes únicos. Isso cria um incentivo financeiro direto para fraudes.

## Decisões

### 1. Modelo STRIDE

| Ameaça (STRIDE)            | Risco Concreto                                 | Mitigação                                                                                                                                             |
| :------------------------- | :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | Cooperativa falsa forjando coletas.            | Assinatura digital no nível da aplicação em todas as triagens feitas usando chaves criptográficas RSA/KMS.                                            |
| **Tampering**              | Usuário adulterando dados de peso.             | Validação de tolerância de peso de entrada no backend (comparação entre o peso do lote importado da fábrica com o aferido na balança da cooperativa). |
| **Repudiation**            | Cooperativa negando que recebeu ou triou lote. | Gravação e encadeamento criptográfico irreversível dos registros de movimentação no `AuditLedger`.                                                    |
| **Information Leak**       | Vazamento de chaves internas de QR code.       | Hashing unidirecional das chaves (`internalQrHash` e `externalQrHash`). O código impresso nunca é guardado em texto plano.                            |
| **Denial of Service**      | Ataques de repetição de upload de planilha.    | Interceptor de idempotência global (`IdempotencyInterceptor`) baseado em chave `x-idempotency-key` via Redis/Postgres.                                |
| **Elevation of Privilege** | Operador assinando como Administrador.         | Aplicação de controle RBAC no nível de rota do NestJS (`RolesGuard`).                                                                                 |

### 2. Matriz de Fraude Comum

- **Dupla Leitura de QR Code (Double Spend):** Mitigado pelo index de unicidade no banco de dados para `externalQrHash` e `internalQrHash`. Uma vez reciclado ou em circulação, a tentativa de reinserção falha transacionalmente.
- **Divergência de Peso de Lote:** Caso o peso total coletado destoe em mais de 10% do peso esperado cadastrado pela fábrica, a triagem do lote entra em quarentena automatizada para análise de suporte manual.

## Consequências

- A segurança do QR code é baseada no fato de que o hash do código interno e externo são gerados e validados apenas de forma criptograficamente segura.
