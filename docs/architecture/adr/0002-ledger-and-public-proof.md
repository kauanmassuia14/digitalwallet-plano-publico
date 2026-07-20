# ADR 0002 — Ledger no PostgreSQL e prova pública assíncrona

- Status: Aceito para implementação local
- Data: 2026-07-15

## Contexto

Saldo, idempotência, reversão e cashout exigem consistência forte e baixa latência.
Blockchain oferece prova pública, mas confirmação, nonce, RPC e taxas são variáveis.

## Decisão

PostgreSQL é a fonte transacional do ledger e do estado da embalagem. Eventos
críticos geram uma outbox na mesma transação e são ancorados na Polygon por worker.

## Consequências

- A API não aguarda confirmação on-chain para registrar uma operação válida.
- O usuário vê separadamente estado operacional e estado de prova pública.
- Retry on-chain não repete o evento de domínio.
- Um reconciliador compara outbox, recibo e chain e abre divergências auditáveis.
- Nenhum dado pessoal ou saldo individual é escrito no contrato.
