# ADR 0007: Estratégia de Rollout, Rollback e Severidades

## Status

Aprovado

## Contexto

Para garantir zero indisponibilidade em produção nas fábricas e cooperativas que operam 24/7, precisamos padronizar nossa esteira de deploy e recuperação de falhas.

## Decisões

### 1. Estratégia de Deploy (Rollout)

- **Blue/Green Deployments:** Toda nova versão da API será implantada em um ambiente paralelo antes de chavear o tráfego de rede (utilizando AWS Route53 ou ALB Target Groups).
- **Canary Releases:** Rollouts graduais (começando com 10% dos tenants secundários antes de subir para as fábricas piloto principais na Espanha e Portugal).

### 2. Estratégia de Recuperação (Rollback)

- **Rollback Automático:** Monitorado pelo Prometheus/Logfire. Se a taxa de erros `5xx` na API passar de 1.5% nos primeiros 5 minutos de deploy, o tráfego volta 100% para a versão estável automaticamente.
- **Banco de Dados (Migrations):** Proibição de migrações destrutivas (ex: exclusão de colunas). Mudanças devem ser feitas em etapas de deprecabilidade (Expand and Contract).

### 3. Matriz de Severidades

| Nível            | Descrição                                | Tempo de Resposta (SLA) | Ação                                                            |
| :--------------- | :--------------------------------------- | :---------------------- | :-------------------------------------------------------------- |
| **S1 (Crítico)** | API inoperante ou Ledger corrompido.     | 15 minutos              | Acionamento de plantão e início do rollback imediato.           |
| **S2 (Alto)**    | Falha ao processar uploads de planilhas. | 2 horas                 | Investigação de bug e deploy de hotfix direcionado.             |
| **S3 (Médio)**   | Lentidão nos relatórios de dashboard.    | 24 horas                | Ajuste de query, criação de index ou escalonamento de réplicas. |

## Consequências

- A automação do pipeline CI/CD exigirá verificações ativas de integridade pós-deploy antes de finalizar a promoção do ambiente Blue para Green.
