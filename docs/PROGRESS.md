# DigitalWallet — progresso vivo

Atualizado em **2026-07-15**. Este arquivo é a fonte textual dos checks; o plano
HTML apresenta a mesma decomposição de forma visual.

Legenda: `[x]` concluído e verificado · `[~]` em execução · `[ ]` pendente ·
`[!]` depende de decisão, credencial ou ação externa.

## Visão rápida

| Fase                             | Estado      | Progresso | Próxima evidência              |
| -------------------------------- | ----------- | --------: | ------------------------------ |
| F00 · Fundação reproduzível      | Concluída   |       6/6 | gate local reproduzido         |
| W01 · Escopo e jornadas          | Em execução |       4/6 | fórmulas de KPI versionadas    |
| W02 · Arquitetura, dados e risco | Em execução |       2/7 | mapa de dados + threat model   |
| W03 · Banco, API e CI            | Em execução |       5/7 | baseline de IaC dev/stage      |
| W04 · Identidade e tenancy       | Em execução |       1/8 | adaptador de identidade real   |
| W05 · Catálogo e importação      | Em execução |       1/7 | lote e importação transacional |
| W06 · Coleta e Ledger            | Pendente    |       0/7 | Ledger e matchmaking de coletas|
| W07 · Métricas e Reconciliação   | Pendente    |       0/7 | crédito concorrente único      |
| W08 · App consumidor             | Pendente    |       0/7 | builds Android/iOS instaláveis |
| W09 · QR e carteira              | Pendente    |       0/7 | E2E mobile crítico verde       |
| W10 · App Coop offline           | Pendente    |       0/7 | teste offline de oito horas    |
| W11 · Hardening e UAT            | Pendente    |       0/7 | release candidate aprovado     |
| W12 · Piloto Espanha             | Pendente    |       0/7 | aceite operacional Espanha     |
| W13 · Piloto Portugal            | Pendente    |       0/7 | aceite operacional Portugal    |
| W14 · Hypercare                  | Pendente    |       0/7 | relatório e decisão go/no-go   |

## Checks da execução atual

### F00 · Fundação reproduzível

- [x] Derivar a execução do plano mestre existente.
- [x] Criar topologia, convenções e comandos do monorepo.
- [x] Fixar e instalar versões das ferramentas.
- [x] Configurar ambiente local sem segredos reais.
- [x] Automatizar lint, typecheck, testes e build.
- [x] Comprovar onboarding técnico pelo README.

### W01 · Escopo e jornadas

- [x] Escrever escopo inicial e glossário a partir do plano.
- [x] Descrever jornada fábrica (B2B).
- [x] Descrever jornada condomínio/morador.
- [x] Descrever jornada cooperativa/coleta e suporte.
- [ ] Versionar fórmulas e fontes dos KPIs.
- [!] Validar hipóteses com sponsor, jurídico e operação.

### W02 · Arquitetura, dados e risco

- [x] Registrar as decisões arquiteturais iniciais.
- [x] Versionar contrato de dados mínimo.
- [ ] Rascunhar mapa de dados pessoais e retenção.
- [ ] Rascunhar threat model e matriz de fraude.
- [ ] Priorizar backlog por risco e caminho crítico.
- [ ] Documentar rollout, rollback e severidades.
- [!] Obter aprovação dos responsáveis.

### W03 · Banco, API e CI

- [x] Subir PostgreSQL local isolado em `127.0.0.1:55432`.
- [x] Validar schema Prisma e aplicar a primeira migração.
- [x] Criar health/readiness da API.
- [x] Publicar OpenAPI e política de erros.
- [x] Validar lint, typecheck, 19 testes e build.
- [ ] Preparar baseline de IaC dev/stage.
- [!] Executar restore e deploy em conta AWS autorizada.

### W04 · Identidade, tenancy e auditoria

- [ ] Validar token do provedor real e normalizar o principal.
- [~] Substituir o header local por tenant derivado de membership autenticada.
- [ ] Implementar RBAC de operação, suporte e administração.
- [ ] Persistir auditoria append-only.
- [ ] Implementar idempotência para comandos mutáveis.
- [ ] Criar staging privado e expiração de importações.
- [x] Testar que um tenant não encontra a embalagem de outro.
- [ ] Instrumentar logs estruturados, traces e métricas.

### W05 · Catálogo e importação

- [x] Implementar agregado de embalagem e transições explícitas.
- [ ] Implementar lote e repositório Prisma transacional.
- [ ] Validar CSV/XLSX por contrato e duplicidade.
- [ ] Gerar prévia e relatório de erros por linha.
- [ ] Disponibilizar cadastro manual com as mesmas regras.
- [ ] Persistir hashes distintos para QR externo e interno.
- [ ] Comprovar reprocessamento e versão otimista no PostgreSQL.

## Evidência mais recente

- Snapshot: `2026-07-15T21:11:02-03:00`.
- Lockfile criado com versões fixadas e scripts de instalação explicitamente
  permitidos ou negados.
- PostgreSQL 17 saudável; migração `20260716000948_init` aplicada e status em dia.
- Prisma schema válido e client `7.8.0` gerado.
- TypeScript, ESLint e build verdes.
- 13 testes de domínio e 6 testes E2E verdes.
- Relatório: [`docs/evidence/2026-07-15-foundation.md`](./evidence/2026-07-15-foundation.md).

## Dependências externas conhecidas

- [!] Decisão sobre provedor de identidade e acesso ao tenant de homologação.
- [!] Contas AWS, Banco PostgreSQL Prod, Apple Developer e Google Play corporativas.
- [!] Provedor de Pix/SEPA e credenciais de sandbox.
- [!] Integração regional e aplicativo da cooperativa.
- [!] Aprovação jurídica de GDPR/DPA, termos, privacidade e incentivo financeiro.
- [!] Clientes piloto, lotes anonimizados e agenda de UAT.

## Regra para novos checks

Um item só recebe `[x]` quando a evidência correspondente existe no repositório ou
foi executada e registrada. Arquivo criado sem validação permanece `[~]`.
