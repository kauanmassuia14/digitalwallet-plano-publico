# ADR 0006: Backlog de Riscos e Caminho Crítico

## Status

Aprovado

## Contexto

Toda nova feature ou modificação na infraestrutura do DigitalWallet deve passar por uma análise prévia de risco sistêmico. Definimos aqui a nossa matriz e o plano de mitigação do caminho crítico.

## Decisões

### 1. Classificação de Riscos Críticos

- **Risco 1: Concorrência ao creditar saldo de reciclagem (Inconsistência de Ledger)**
  - _Impacto:_ Alto (Fraude financeira/Duplo pagamento).
  - _Mitigação:_ Implementação de controle de concorrência otimista (campo `version` na entidade `RewardAccount`) e transações isoladas em nível de banco de dados SQL (isolamento de transações com bloqueios adequados).
- **Risco 2: Quebra de integridade da cadeia de blocos (AuditLedger)**
  - _Impacto:_ Alto (Perda de capacidade de provar auditorias regulatórias).
  - _Mitigação:_ Encadeamento de hash SHA-256 (`rowHash` derivado de `prevHash` + `payload`). Criado validador de integridade executado no serviço de reconciliação de forma contínua.
- **Risco 3: Indisponibilidade ou estouro de custos com IA/LLM**
  - _Impacto:_ Médio (Custos operacionais elevados de nuvem).
  - _Mitigação:_ Implementação do controle do módulo ativo (`aiAgentModuleEnabled`) por Tenant/Fábrica e limitação rígida de cota (Rate Limiting) no gateway de IA.

## Consequências

- A priorização de novas integrações de carteiras e provedores financeiros deve sempre exigir a validação do fluxo no ambiente de sandbox antes da ativação em produção.
