---
name: digitalwallet-agent
description: Instruções completas, arquitetura, regras de codificação, banco de dados e guias de desenvolvimento para assistentes de IA e desenvolvedores no projeto DigitalWallet. Use quando precisar modificar o backend NestJS, app consumidor Flutter, painel web ou arquitetura de dados e agentes.
---

# Skill do Projeto DigitalWallet — Guia Completo para IA e Desenvolvedores

Esta skill reúne todo o conhecimento arquitetural, regras de negócio, contratos da API, estrutura do banco de dados e boas práticas do ecossistema **DigitalWallet**.

---

## 1. Visão Geral da Arquitetura

O **DigitalWallet** é uma plataforma de economia circular e rastreabilidade de embalagens recicláveis com 3 frentes de usuários:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ECOSSISTEMA DIGITALWALLET                     │
└─────────────────────────────────────────────────────────────────────────┘
        │                                 │                               │
        ▼                                 ▼                               ▼
┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
│ FÁBRICA / BRAND  │            │    CONDOMÍNIO    │            │   COOPERATIVA    │
│ (Portal Web)     │            │   (App Mobile)   │            │   (App Mobile)   │
│ - Lotes de recic.│            │ - Solicita coleta│            │ - Aceita coletas │
│ - Métricas & KPI │            │ - Chat com coop  │            │ - Chat com condo │
│ - Reconciliação  │            │ - Agendamento    │            │ - Gestão de rota │
└────────┬─────────┘            └────────┬─────────┘            └────────┬─────────┘
         │                               │                               │
         └───────────────────────┬───────┴───────────────────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │    BACKEND API (NestJS)  │
                    │ - PostgreSQL + Prisma    │
                    │ - Redis (Queue/Cache)    │
                    │ - Chat & Coletas (v1)    │
                    │ - Ledger Criptográfico   │
                    │ - AI Agent RAG Adapter   │
                    └──────────────────────────┘
```

---

## 2. Estrutura do Monorepo

```
digitalwallet/
├── apps/
│   ├── api/          # Backend NestJS (REST API, Redis, Ledger, Auth, Chat, Coletas)
│   ├── consumer/     # App Mobile / Web em Flutter (Condomínio & Cooperativa)
│   └── web/          # Portal Web Fábrica (Vite / TypeScript)
├── packages/
│   └── database/     # Prisma ORM, Schemas e Migrações PostgreSQL
├── .agents/
│   └── skills/       # Skills e instruções para Agentes de IA
├── docs/             # Documentação técnica, arquitetura e PROGRESS.md
└── index.html        # Landing Page e Dashboard de Progresso (GitHub Pages)
```

---

## 3. Principais Modelos de Dados (Prisma Schema)

- **Tenant**: Fábrica / Organização contratante do ecossistema.
- **Condominium**: Entidade do condomínio solicitante (`id`, `name`, `address`, `tenantId`).
- **Cooperative**: Entidade da cooperativa de reciclagem (`id`, `name`, `contactPhone`, `tenantId`).
- **CollectionRequest**: Solicitação de coleta criada pelo condomínio (`status`: `PENDING`, `ASSIGNED`, `COMPLETED`, `CANCELLED`).
- **ChatMessage**: Mensagem do chat atrelado à solicitação (`senderType`: `CONDOMINIUM`, `COOPERATIVE`, `FACTORY`, `AI_AGENT`).

---

## 4. Regras de Código Workspace (AGENTS.md)

1. **Limite de Tamanho de Arquivo Frontend**:
   - Nenhum arquivo de código no frontend (Flutter/Dart ou React/TypeScript) pode exceder **400 linhas**.
   - Se um componente crescer perto desse limite, DEVE ser modularizado em sub-componentes.
2. **Componentização Modular**:
   - Evitar arquivos monolíticos. Separar botões, cards, modais, formulários e listas.
3. **Comunicação por Roles**:
   - Web é **exclusivo para Fábrica**.
   - App Mobile (Flutter) é **para Condomínio e Cooperativa**, com seleção de portal no login.

---

## 5. Como Executar o Projeto Localmente

### Subir Banco de Dados e Redis (Docker)
```bash
docker start digitalwallet-postgres-1 digitalwallet-redis-1
```

### Iniciar Backend API (Porta 3000)
```bash
export $(cat .env | grep -v ^# | xargs)
cd apps/api
pnpm run dev
```

### Iniciar App Consumer (Flutter Web/Mobile)
```bash
cd apps/consumer
export DART_VM_OPTIONS="--http_unverified_trusted_cert"
flutter run -d chrome --web-port 4000 --web-hostname 0.0.0.0
```

---

## 6. Orientações para Agentes de IA

- **Sempre consulte este guia** antes de realizar alterações nas telas de Coleta ou Chat.
- **Preserve os IDs das entidades de teste** (`cd000001-...` para Edifício Verde e `dddddddd-...` para CoopRecicla SP) em ambientes de simulação/seed.
- **Não remova a tipagem do `ChatMessageSenderType.AI_AGENT`**, pois ela garante a retrocompatibilidade com o assistente inteligente individualizado de cada conta.
