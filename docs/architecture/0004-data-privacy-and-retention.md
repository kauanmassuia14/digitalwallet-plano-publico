# ADR 0004: Mapa de Privacidade de Dados e Política de Retenção

## Status

Aprovado

## Contexto

O ecossistema DigitalWallet lida com dados de transações financeiras, pesagens físicas, identificadores de embalagens e credenciais de usuários e cooperativas. Para operar em conformidade com as legislações vigentes (GDPR na Europa e LGPD no Brasil), precisamos definir claramente os limites de guarda, anonimização e minimização de dados.

## Decisões

### 1. Inventário de Dados Pessoais (PII)

- **Dados Coletados:** Nome do usuário, e-mail (autenticação), hash de subject de autenticação (`externalSubject`), e histórico de créditos recebidos.
- **Base Legal:** Execução de contrato (fornecimento de saldo de reciclagem e incentivos) e consentimento (para comunicações).

### 2. Políticas de Retenção de Dados

- **Registros de Auditoria (`AuditLog`):** Retenção máxima de **2 anos**, após os quais serão expurgados ou arquivados de forma compactada e offline.
- **Contas e Transações Financeiras (`RewardAccount`, `RewardTransaction`):** Mantidos por **5 anos** para obrigações fiscais e regulatórias.
- **Snapshots de Importação Expirados (`ImportJob`):** Serão totalmente deletados do banco após a transição para o estado `EXPIRED`, mantendo-se apenas metadados agregados para fins estatísticos (quantidade total e data).

### 3. Estratégia de Anonimização

- Ao solicitar o encerramento de conta, o e-mail do usuário em `User` é substituído por um hash irreversible e o `externalSubject` é removido, de modo que suas transações no Ledger permaneçam válidas para auditoria, mas sem qualquer associação de identidade.

## Consequências

- Implementação de um job periódico de purga de `ImportJob` no banco.
- Garantia de que logs estruturados de aplicação (Logfire/OpenTelemetry) nunca recebam e-mails de usuários em texto limpo.
