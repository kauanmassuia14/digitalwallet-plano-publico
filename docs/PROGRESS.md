# DigitalWallet — Progresso Vivo & Divisão de Tarefas (Roadmap)

Atualizado em **2026-07-29**. Este arquivo é a fonte textual dos checks e do planejamento do projeto, dividindo as responsabilidades de engenharia entre **Kauan (Frontend/UX/IA)** e **Lucas (Backend/Infra/Ledger)**.

---

## 👥 Matriz de Divisão de Responsabilidades

| Desenvolvedor | Frente Principal | Responsabilidades |
| :--- | :--- | :--- |
| **Kauan** | **Fullstack (FastAPI/Python & Flutter) + IA Lead** | Migração FastAPI (Routers Chat, IA RAG, Sync), App Mobile (Flutter), Interface do Chatbot de IA, Design System, Scripting (Expo QR) |
| **Lucas** | **Backend Core (FastAPI/Python) + Ledger & Infra** | Migração FastAPI (Ledger Criptográfico, Auth/JWT, Multitenancy), Redis Queues, WebSockets Realtime & Banco PostgreSQL/SQLModel |

---

## 📊 Visão Geral de Progresso por Módulo

| Módulo / Fase | Estado | Progresso | Responsável Principal | Próxima Entrega / Evidência |
| :--- | :--- | :---: | :--- | :--- |
| **F00 · Fundação e Ambiente** | Concluída | 6/6 | **Kauan & Lucas** | Monorepo e scripts de ambiente verde |
| **W01 · Escopo e Jornadas** | Concluída | 6/6 | **Kauan** | Escopo das frentes Fábrica/Condo/Coop |
| **W02 · Arquitetura e Dados** | Concluída | 7/7 | **Lucas** | Threat model, schema Prisma e contratos |
| **W03 · Banco, API e CI** | Concluída | 7/7 | **Lucas** | PostgreSQL, migrações e endpoints base |
| **W04 · Identidade e Tenancy** | Concluída | 8/8 | **Lucas** | Multitenancy por header/token e RBAC |
| **W05 · Catálogo e Importação** | Concluída | 7/7 | **Lucas** | Importação transacional de lotes |
| **W06 · Coletas e Matchmaking** | Concluída | 7/7 | **Lucas & Kauan** | Queue de coletas e integração API |
| **W07 · Ledger e Métricas** | Concluída | 7/7 | **Lucas** | Row chaining, auditoria e reconciliação |
| **W08 · App Consumidor (Flutter)** | Concluída | 7/7 | **Kauan** | App Flutter com login por role (Condo/Coop) |
| **W09 · Chat & Atendimento (NestJS)** | Concluída | 7/7 | **Kauan & Lucas** | Polling chat, mensagens e seeds reais em NestJS |
| **W10 · Migração para FastAPI (Python)** | Em Execução | 3/7 | **Kauan & Lucas** | Estruturação do aplicativo FastAPI e Módulos RAG/Chat |
| **W11 · Assistente de IA RAG & WebSockets** | Em Execução | 2/7 | **Kauan & Lucas** | RAG Backend em Python (Kauan) + WebSockets (Lucas) |
| **W12 · Ajustes Finais & Release** | Pendente | 0/7 | **Kauan & Lucas** | Build de produção Android/iOS/Web com FastAPI |

---

## 📝 Roadmap Detalhado de Tasks por Desenvolvedor

### 🟢 1. Tasks de Kauan (Frontend & UX)

#### [x] Concluídas por Kauan
- [x] **Seletor de Portal no App Mobile**: Tela de Onboarding permitindo escolha entre Condomínio 🏢 e Cooperativa ♻️.
- [x] **Login por Role**: Autenticação parametrizada salvando `role`, `entityId` e `entityName` no `SecureStorage`.
- [x] **Dashboard de Condomínio**: Visualização de solicitações ativas, cards de status e botão de nova solicitação.
- [x] **Dashboard de Cooperativa**: Aba de solicitações pendentes (Fila), Minhas coletas e Histórico de concluídas.
- [x] **Formulário de Nova Coleta**: Agendamento com seletor de data/hora e tipos de materiais recicláveis.
- [x] **Interface do Chat de Coleta**: Lista de mensagens estilo balão com indicação de remetente (Condomínio, Cooperativa e IA).
- [x] **Correção de Alinhamento e Overflow**: Ajuste no grid responsivo para telas pequenas de celular.

#### [~] Melhorias e Próximas Tasks de Kauan
- [ ] **K-01 · Upload de Imagens no Chat e Coleta**: Permitir anexo de fotos das embalagens/entulhos diretamente pelo celular.
- [ ] **K-02 · Interface de Chatbot IA (Assistente da Conta)**: Criar widget de bate-papo dedicado para tirar dúvidas sobre recicláveis da conta.
- [ ] **K-03 · Notificações Push Locais**: Notificar o usuário quando a cooperativa aceitar a coleta ou enviar mensagem.
- [ ] **K-04 · Refatoração em Sub-componentes**: Manter todos os arquivos Flutter abaixo de 400 linhas (regra de código workspace).

---

### 🔵 2. Tasks de Lucas (Backend & Infraestrutura)

#### [x] Concluídas por Lucas
- [x] **Endpoints REST de Coleta**: `GET /api/v1/collections/requests`, `POST /api/v1/collections/requests`, `POST /api/v1/collections/match`.
- [x] **Módulo de Chat API**: Endpoints `GET /api/v1/chat/:requestId/messages` e `POST /api/v1/chat/:requestId/messages`.
- [x] **Schema Prisma & Migrações**: Inclusão de `ChatMessage` e enum `ChatSenderType` (`CONDOMINIUM`, `COOPERATIVE`, `FACTORY`, `AI_AGENT`).
- [x] **Seed de Dados Reais**: Geração de condomínio (`Edifício Verde`), cooperativa (`CoopRecicla SP`), coletas e histórico de mensagens.
- [x] **Configuração de CORS e IP Público**: Habilitação de CORS no NestJS para permitir chamadas via Flutter Web e túneis.

#### [~] Melhorias e Próximas Tasks de Lucas
- [ ] **L-01 · WebSockets / Socket.io para Chat**: Substituir a busca por polling de 5s por conexão WebSocket em tempo real.
- [ ] **L-02 · Paginação e Upload de Anexos**: Adicionar limite/cursor nas mensagens de chat e armazenamento de fotos no S3.
- [ ] **L-03 · Pipeline RAG do Assistente IA**: Criar endpoint `/api/v1/ai/query` integrado com banco vetorial/Gemini API para responder dúvidas do tenant.
- [ ] **L-04 · Autenticação JWT Real**: Substituir IDs mockados de dev por integração completa com provedor Auth0/Firebase.

---

## 🛠️ Guia de Resolução para Desenvolvedores e Agentes de IA

### Como rodar a aplicação para testes

1. **Subir Banco de Dados e Redis**:
   ```bash
   docker start digitalwallet-postgres-1 digitalwallet-redis-1
   ```

2. **Iniciar API Backend**:
   ```bash
   export $(grep -v ^# .env | xargs) && cd apps/api && pnpm run dev
   ```

3. **Iniciar App Flutter (Web ou Mobile)**:
   ```bash
   cd apps/consumer
   export DART_VM_OPTIONS="--http_unverified_trusted_cert"
   flutter run -d chrome --web-port 4000 --web-hostname 0.0.0.0
   ```

4. **Gerar QR Code para celular (Expo Style)**:
   ```bash
   ./expo_qr.py
   ```

---

## 🔒 Regras Invioláveis do Projeto

1. **Monolitos Proibidos**: Nenhum arquivo no frontend pode ultrapassar 400 linhas.
2. **Separação de Contexto**: O Portal Web é exclusivo da Fábrica. O App Mobile/Web é para Condomínios e Cooperativas.
3. **Persistência do Ledger**: Transações financeiras e de triagem devem passar pelo encadeamento criptográfico no Ledger.
