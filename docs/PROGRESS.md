# DigitalWallet — Progresso Vivo & Planejamento de Migração Total para FastAPI (Python)

Atualizado em **2026-07-29**. Este arquivo define o roadmap do ecossistema DigitalWallet, estabelecendo o **FastAPI (Python)** como o backend oficial do projeto e dividindo as responsabilidades de engenharia entre **Kauan (Fullstack/IA/APIs)** e **Lucas (Core Engine/Ledger/Infra)**.

---

## 👥 Matriz de Divisão de Responsabilidades

| Desenvolvedor | Frente Principal | Responsabilidades |
| :--- | :--- | :--- |
| **Kauan** | **Fullstack (FastAPI & Flutter) + IA Lead** | Routers FastAPI (Chat, Coletas, IA RAG, Sync), App Mobile (Flutter), Interface do Chatbot de IA, Design System, Scripting & Automação |
| **Lucas** | **Backend Core (FastAPI) + Ledger Criptográfico + DB** | Migração FastAPI (Ledger, Auth/JWT, Multitenancy), Schemas SQLModel / Pydantic v2, Redis Queues, WebSockets e Reconciliação |

---

## 📊 Visão Geral de Progresso por Módulo

| Módulo / Fase | Estado | Progresso | Responsável Principal | Próxima Entrega / Evidência |
| :--- | :--- | :---: | :--- | :--- |
| **F00 · Fundação e Ambiente** | Concluída | 6/6 | **Kauan & Lucas** | Monorepo e scripts de ambiente verde |
| **W01 · Escopo e Jornadas** | Concluída | 6/6 | **Kauan** | Escopo das frentes Fábrica/Condo/Coop |
| **W02 · Arquitetura e Dados** | Concluída | 7/7 | **Lucas** | Threat model, schema Prisma/SQLModel e contratos |
| **W03 · Banco e IaC Base** | Concluída | 7/7 | **Lucas** | PostgreSQL, migrações e infraestrutura Docker |
| **W04 · Identidade e Tenancy (FastAPI)** | Pendente | 0/8 | **Lucas** | Middlewares de Multitenancy e JWT no FastAPI |
| **W05 · Catálogo e Importação (FastAPI)** | Pendente | 0/7 | **Lucas & Kauan** | Importação transacional de lotes via pandas/openpyxl |
| **W06 · Coletas e Matchmaking (FastAPI)** | Pendente | 0/7 | **Lucas & Kauan** | Queue de coletas e Routers no FastAPI |
| **W07 · Ledger e Reconciliação (FastAPI)** | Pendente | 0/7 | **Lucas** | Row chaining, auditoria e reconciliação em Python |
| **W08 · App Consumidor (Flutter)** | Concluída | 7/7 | **Kauan** | App Flutter com login por role (Condo/Coop) |
| **W09 · Chat & Atendimento (NestJS Legado)** | Concluída | 7/7 | **Kauan & Lucas** | Validação inicial do fluxo de chat e mensagens |
| **W10 · Migração para FastAPI (Python)** | Pendente | 0/7 | **Kauan & Lucas** | Estruturação da API FastAPI e Routers de Chat/IA |
| **W11 · Assistente de IA RAG & WebSockets** | Pendente | 0/7 | **Kauan & Lucas** | RAG Backend em Python (Kauan) + WebSockets (Lucas) |
| **W12 · Ajustes Finais & Release Candidate** | Pendente | 0/7 | **Kauan & Lucas** | Build de produção Android/iOS/Web com FastAPI |

---

## 📝 Roadmap Detalhado da Migração FastAPI por Desenvolvedor

### 🟢 1. Tasks de Kauan (Fullstack, FastAPI & IA)

#### [x] Concluídas por Kauan (App Mobile & Frontend)
- [x] **Seletor de Portal no App Mobile**: Tela de Onboarding permitindo escolha entre Condomínio 🏢 e Cooperativa ♻️.
- [x] **Login por Role**: Autenticação parametrizada salvando `role`, `entityId` e `entityName` no `SecureStorage`.
- [x] **Dashboard de Condomínio**: Visualização de solicitações ativas, cards de status e botão de nova solicitação.
- [x] **Dashboard de Cooperativa**: Aba de solicitações pendentes (Fila), Minhas coletas e Histórico de concluídas.
- [x] **Formulário de Nova Coleta**: Agendamento com seletor de data/hora e tipos de materiais recicláveis.
- [x] **Interface do Chat de Coleta**: Lista de mensagens estilo balão com indicação de remetente (Condomínio, Cooperativa e IA).

#### [ ] Próximas Tasks de Kauan (FastAPI & IA)
- [ ] **K-01 · App FastAPI Bootstrap**: Criar a estrutura inicial `apps/api-fastapi` em Python com Uvicorn e Pydantic v2.
- [ ] **K-02 · Chat Router FastAPI**: Desenvolver o Router `/api/v1/chat` assíncrono para mensagens de atendimento em Python.
- [ ] **K-03 · Módulo RAG com Gemini API**: Implementar endpoint `/api/v1/ai/query` integrado nativamente com LangChain e Gemini em Python.
- [ ] **K-04 · Interface do Chatbot de IA**: Widget de bate-papo interativo no Flutter conectado ao endpoint de IA em FastAPI.
- [ ] **K-05 · Apontamento do App Mobile**: Atualizar `ApiClient` e repositórios do Flutter para consumir os novos Routers do FastAPI.

---

### 🔵 2. Tasks de Lucas (Backend Core, Ledger & Infra)

#### [x] Concluídas por Lucas (Modelagem & Validação)
- [x] **Modelagem de Dados**: Schema PostgreSQL, migrações e baseline de infraestrutura Docker.
- [x] **Validação do Ledger**: Regras de criptografia e auditoria transacional.

#### [ ] Próximas Tasks de Lucas (FastAPI Core Engine)
- [ ] **L-01 · Multitenancy Middleware FastAPI**: Implementar middleware de extração de Tenant via token JWT em Python.
- [ ] **L-02 · Schemas SQLModel / SQLAlchemy**: Converter modelos do Prisma para objetos `SQLModel` / `Pydantic` em Python.
- [ ] **L-03 · Ledger Criptográfico em Python**: Implementar biblioteca de encadeamento de hashes (Row Chaining) em Python.
- [ ] **L-04 · Redis Queues & WebSockets**: Configurar filas assíncronas (Celery/ARQ) e WebSockets nativos em Python.
- [ ] **L-05 · Importação em Lote via Pandas**: Criar serviço de leitura de arquivos CSV/XLSX transacional em FastAPI.

---

## 🛠️ Guia de Execução do Novo Backend FastAPI

1. **Subir Banco de Dados e Redis**:
   ```bash
   docker start digitalwallet-postgres-1 digitalwallet-redis-1
   ```

2. **Iniciar Backend FastAPI (Python)**:
   ```bash
   cd apps/api-fastapi
   python3 -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 3000
   ```

3. **Iniciar App Flutter**:
   ```bash
   cd apps/consumer
   flutter run -d chrome --web-port 4000 --web-hostname 0.0.0.0
   ```
