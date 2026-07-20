# DigitalWallet — roadmap de execução

Este roadmap transforma as cinco macrofases do plano mestre em uma fase zero e
quatorze fases semanais. A semana é uma unidade de planejamento, não uma promessa
de calendário: uma fase só avança quando sua evidência e seu gate estão atendidos.

## Princípios de execução

- Cada check precisa apontar para código, teste, documento, relatório ou decisão.
- Trabalho local pode avançar sem contas externas; publicação e aprovações permanecem bloqueadas até haver autorização e credenciais.
- Dinheiro e estados de embalagem são transacionais no PostgreSQL. O Ledger relacional mantido com encadeamento criptográfico de hashes (Row Chaining) garante a auditabilidade de eventos críticos.
- Todo comando crítico deve ser repetível localmente e no CI.
- Segurança, acessibilidade, observabilidade e reversibilidade fazem parte da entrega.

## Gates

| Gate | Fases   | Pergunta de saída                               | Evidência mínima                                        |
| ---- | ------- | ----------------------------------------------- | ------------------------------------------------------- |
| G-1  | F00     | O repositório é reproduzível e verificável?     | instalação, lint, testes e build documentados           |
| G0   | W01–W02 | Sabemos o que construir e quais riscos aceitar? | escopo, ADRs, esquemas Prisma, KPIs e aprovações        |
| G1   | W03–W04 | A fundação isola clientes e pode ser operada?   | stage, restore, OpenAPI, auditoria e teste multi-tenant |
| G2   | W05–W07 | O núcleo completa o ciclo sem duplicar valor?   | importação, ledger com row-chaining e reconciliação     |
| G3   | W08–W10 | Condomínio e cooperativa operam offline/online? | app mobile, coleta offline e E2E de sincronização       |
| G4   | W11–W14 | O piloto pode entrar e permanecer em campo?     | UAT, runbooks, pilotos, relatório e go/no-go            |

## F00 — Fundação reproduzível

- Definir topologia do monorepo e responsabilidades por pacote.
- Fixar versões de runtime e gerenciador de pacotes.
- Criar convenções de TypeScript, formatação, lint e imports.
- Disponibilizar ambiente local e contrato de variáveis sem segredos.
- Criar comandos únicos para validar, testar e compilar tudo.
- Publicar checklist vivo e critérios objetivos de conclusão.

**Saída:** uma pessoa nova consegue validar o repositório seguindo apenas o README.

## W01 — Escopo e jornadas do piloto

- Desenhar jornadas de fábrica (mensalidade €250), condomínio, cooperativa e suporte.
- Delimitar o que entra e o que não entra no piloto de Espanha e Portugal.
- Definir glossário de embalagem, lote, coleta, recompensa e liquidação.
- Fixar as fórmulas e fontes dos KPIs executivos (foco em consumo regional e volumes).
- Identificar owners, aprovadores e dependências externas.
- Validar hipóteses com sponsor, jurídico e operação de campo.

**Saída:** escopo e critérios de sucesso aprovados pelos responsáveis.

## W02 — Arquitetura, dados e risco

- Registrar decisões de stack, tenancy, ledger com row-chaining e operação offline.
- Versionar contratos de dados para lote, condomínio, cooperativa, coleta e evento.
- Mapear dados pessoais, retenção, exclusão e base legal GDPR.
- Produzir threat model e matriz de fraude com controles e aceite.
- Priorizar backlog por risco e caminho crítico.
- Definir rollout, rollback, suporte e severidades de incidente.
- Obter aprovação das decisões que alteram risco ou custo.

**Saída:** G0 aprovado, com decisões rastreáveis e riscos conhecidos.

## W03 — Banco, API e entrega contínua

- Subir PostgreSQL local com healthcheck e persistência descartável.
- Implementar schema Prisma, primeira migração e dados mínimos de desenvolvimento.
- Criar aplicação NestJS com health, readiness e shutdown gracioso.
- Publicar OpenAPI versionada e política uniforme de erros.
- Automatizar lint, typecheck, testes, schema e build no CI.
- Criar baseline de IaC para dev/stage, budgets, secrets e logs.
- Executar e registrar um restore de banco.

**Saída:** deploy automatizado em stage e migração reversível comprovada.

## W04 — Identidade, tenancy e auditoria

- Validar token do provedor de identidade e normalizar principal autenticado.
- Resolver tenant no servidor, sem confiar em filtros enviados pelo cliente.
- Implementar RBAC para operação, suporte e administração.
- Persistir trilha de auditoria append-only para ações administrativas.
- Padronizar idempotência em comandos mutáveis.
- Criar staging privado para importações e expiração de arquivos.
- Testar isolamento de tenant e negação por papel em integração.
- Instrumentar logs estruturados, traces e métricas essenciais.

**Saída:** nenhuma consulta ou mutação atravessa tenants nos testes de integração.

## W05 — Catálogo e importação de embalagens

- Implementar lote e embalagem como agregados com transições explícitas.
- Validar CSV/XLSX por contrato, conteúdo e duplicidade.
- Mostrar prévia, aceitar parcialmente por linha e exportar erros acionáveis.
- Disponibilizar cadastro manual B2B com as mesmas regras da importação.
- Gerar e armazenar hashes distintos para QR externo e interno.
- Implementar MINTED → IN_CIRCULATION → COLLECTED → RECYCLED.
- Garantir reprocessamento seguro, versão otimista e relatório de lote.

**Saída:** um lote real anonimizado entra, é auditado e pode ser reconciliado.

## W06 — Processo de Coleta e Auditoria Ledger

- Modelar tabelas de solicitações e atribuições de coletas no Prisma.
- Implementar fila Redis para o matchmaking de coletas das cooperativas.
- Desenvolver rotina de encadeamento criptográfico no Ledger (Row Chaining).
- Implementar assinatura digital de transações de triagem com chaves RSA/KMS.
- Escrever testes de integridade para a cadeia de hashes do Ledger.
- Configurar geração e criptografia de logs de auditoria e relatórios.
- Reconciliar dados de coletas físicas com a folha de auditoria final.

**Saída:** solicitações de coleta e assinaturas criptográficas do Ledger validadas com sucesso.

## W07 — Ledger, métricas e operação B2B

- Implementar ledger imutável e projeção de saldo na mesma transação.
- Garantir um único crédito por embalagem sob retry e concorrência.
- Modelar earn, cashout, reversão, pending, settled e failed.
- Criar adaptador de cashout e simulador determinístico de sandbox.
- Calcular KPIs com fórmulas versionadas e janelas explícitas.
- Entregar dashboard por país, tenant, lote e período.
- Implementar reconciliação financeira e exportação auditável.

**Saída:** embalagem coletada gera exatamente um crédito e métricas conciliadas.

## W08 — Fundação do app consumidor

- Criar app Flutter com arquitetura por feature e design system acessível.
- Configurar flavors, ambientes e pipeline Android/iOS.
- Implementar onboarding, consentimento, login e recuperação.
- Armazenar tokens apenas em secure storage e renovar sessão com segurança.
- Entregar português, espanhol e inglês por ARB, incluindo erros.
- Definir navegação, estados vazios, offline e acessibilidade.
- Instrumentar crash reporting e telemetria sem dados sensíveis.

**Saída:** builds instaláveis autenticam nos dois sistemas em três idiomas.

## W09 — QR, carteira e cashout

- Ler QR externo sem autenticação e apresentar procedência permitida.
- Exigir contexto de coleta para o QR interno e consumir challenge único.
- Exibir saldo disponível, pendente e histórico paginado.
- Implementar estados de claim, retry seguro e suporte acionável.
- Integrar cashout Pix/SEPA por adaptador sandbox.
- Cobrir deep links, permissões de câmera e dispositivos sem câmera.
- Executar E2E cadastro → leitura → claim → saldo → cashout.

**Saída:** fluxo crítico funciona em iOS e Android sem crédito duplicado.

## W10 — Aplicativo da Cooperativa e Operação Offline

- Desenvolver fluxo de leitura de múltiplos QR Codes no aplicativo móvel.
- Validar seriais e assinaturas dos lotes offline via App da Cooperativa.
- Persistir leituras em banco SQLite local do dispositivo.
- Assinar requisições com chave privada do operador da cooperativa.
- Sincronizar coletas de forma idempotente em lote ao recuperar rede.
- Exibir histórico local de coletas e sincronizações pendentes.
- Testar simulação offline por 8 horas seguidas no aplicativo.

**Saída:** leitura de múltiplos itens offline e sincronização em lote concluídas sem perdas.

## W11 — Hardening e UAT

- Medir carga, P50/P95/P99 e capacidade por serviço.
- Executar testes de autorização, abuso, fraude e dependências.
- Testar restore, indisponibilidade de banco de dados, fila e cashout.
- Validar acessibilidade mobile/web e matriz de dispositivos.
- Fazer dry run de suporte e incidentes com responsáveis.
- Executar UAT conjunto com Espanha e Portugal.
- Fechar todos os P0/P1 ou obter aceite formal de risco.

**Saída:** release candidate aprovado e runbooks exercitados.

## W12 — Release candidate e piloto Espanha

- Assinar builds e concluir requisitos de publicação/teste fechado.
- Treinar operação, suporte e responsáveis do cliente espanhol.
- Carregar lote do piloto com dupla conferência.
- Rodar dry run de coleta física no condomínio antes de liberar recompensa real.
- Ativar feature flags por tenant e plano de rollback.
- Monitorar claims, saldo, reconciliação e incidentes diariamente.
- Registrar aceite e aprendizados do primeiro país.

**Saída:** Espanha opera sem P0 aberto e com reconciliação diária aprovada.

## W13 — Piloto Portugal e comparação

- Aplicar correções aprendidas sem quebrar o tenant espanhol.
- Treinar operação e suporte do cliente português.
- Carregar e conferir lote português.
- Ativar Portugal por feature flag com rollback independente.
- Validar diferenças de idioma, cashout, fiscalidade e operação.
- Comparar KPIs, fraude, suporte e custo entre países.
- Manter reconciliação financeira e do Ledger diária.

**Saída:** dois países operam isoladamente com KPIs comparáveis.

## W14 — Hypercare e decisão de escala

- Operar sala de hypercare com SLIs, owners e cadência diária.
- Corrigir P0/P1 e priorizar dívida observada em campo.
- Fechar métricas executivas com fontes e ressalvas.
- Produzir post-mortem do piloto e atualizar runbooks.
- Medir custo real por embalagem, claim e cashout.
- Preparar backlog de escala, integração ERP e produção contínua.
- Conduzir go/no-go com critérios previamente aprovados.

**Saída:** relatório aceito, zero P0 e decisão documentada de próxima escala.
