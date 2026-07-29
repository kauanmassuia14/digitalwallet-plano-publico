---
name: digitalwallet-agent
description: Instruções completas, arquitetura, regras de codificação, banco de dados e guias de desenvolvimento para assistentes de IA e desenvolvedores no projeto DigitalWallet. Use quando precisar modificar o backend FastAPI (Python), NestJS (Legado/Migração), app consumidor Flutter, painel web ou arquitetura de dados e agentes.
---

# Skill do Projeto DigitalWallet — Guia Completo para IA e Desenvolvedores

Esta skill reúne todo o conhecimento arquitetural, regras de negócio, contratos da API, estrutura do banco de dados e boas práticas do ecossistema **DigitalWallet** (incluindo o plano de migração do backend de NestJS para FastAPI).

---

## 1. Visão Geral da Arquitetura & Migração FastAPI

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
                    │  BACKEND FASTAPI (Python)│  ◄── [Plano de Migração]
                    │ - PostgreSQL + SQLModel  │  (Substituindo NestJS)
                    │ - Redis + Celery / ARQ   │
                    │ - Chat Realtime & Coletas│
                    │ - Ledger & Criptografia  │
                    │ - IA RAG & Gemini Native │
                    └──────────────────────────┘
```

---

## 2. Estrutura do Monorepo

```
digitalwallet/
├── apps/
│   ├── api-fastapi/  # Backend FastAPI em Python (Novo Padrão)
│   ├── api/          # Backend NestJS (Legado / Fonte de Regras de Negócio)
│   ├── consumer/     # App Mobile / Web em Flutter (Condomínio & Cooperativa)
│   └── web/          # Portal Web Fábrica (Vite / TypeScript)
├── packages/
│   └── database/     # Schemas PostgreSQL, Migrações e Seeds
├── .agents/
│   └── skills/       # Skills e instruções para Agentes de IA
├── docs/             # Documentação técnica, arquitetura e PROGRESS.md
└── index.html        # Landing Page e Dashboard de Progresso (GitHub Pages)
```

---

## 3. Principais Módulos da API em FastAPI (Python)

- **Auth & Multitenancy**: Injeção de dependência via `Depends(get_current_tenant)` e tokens JWT (`python-jose`/`passlib`).
- **Collections Router** (`/api/v1/collections`): Endpoints de solicitações de coleta, aceite pela cooperativa e atualização de status.
- **Chat Router** (`/api/v1/chat`): Mensagens de chat com suporte a polling e WebSockets nativos (`asyncio`).
- **Packaging & Batch Router** (`/api/v1/packaging`): Importação transacional de lotes via `pandas` / `openpyxl`.
- **AI Agent Module** (`/api/v1/ai`): Pipeline RAG nativo em Python com LangChain e Gemini API.
- **Ledger Router** (`/api/v1/ledger`): Encadeamento de hashes (Row Chaining) e auditoria.

---

## 4. Regras de Código Workspace (AGENTS.md)

1. **Backend Python/FastAPI**:
   - Usar `Pydantic v2` para Schemas e DTOs.
   - Tipagem estática rigorosa (`mypy` / `pyright`).
   - Gerenciador de dependências `uv` ou `poetry`.
2. **Limite de Tamanho de Arquivo Frontend**:
   - Nenhum arquivo no Flutter ou Web pode exceder **400 linhas**.

---

## 5. Como Executar o Ambiente Localmente

### Subir Banco de Dados e Redis (Docker)
```bash
docker start digitalwallet-postgres-1 digitalwallet-redis-1
```

### Iniciar Backend NestJS (Legado)
```bash
export $(cat .env | grep -v ^# | xargs) && cd apps/api && pnpm run dev
```

### Iniciar Backend FastAPI (Novo)
```bash
cd apps/api-fastapi
uvicorn app.main:app --reload --port 3000
```
