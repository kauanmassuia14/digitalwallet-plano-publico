# Plano de Arquitetura e Migração Oficial para FastAPI (Python)

Este documento define o plano técnico de engenharia para a substituição do backend legado NestJS pelo novo backend **FastAPI em Python** no monorepo **DigitalWallet**.

---

## 🎯 Objetivo da Migração
Substituir o ecossistema `apps/api` (NestJS/TypeScript) pelo novo `apps/api-fastapi` (FastAPI/Python) aproveitando:
- Ecossistema nativo de IA & RAG (LangChain, Pydantic v2, Gemini API).
- Processamento assíncrono de alta performance via `asyncio` e `uvicorn`.
- Documentação OpenAPI/Swagger automática.
- Suporte a data-science (Pandas) para reconciliação e importação de lotes.

---

## 👥 Matriz de Responsabilidades (Kauan & Lucas)

| Desenvolvedor | Papel no FastAPI | Tarefas Principais |
| :--- | :--- | :--- |
| **Kauan** | **Fullstack (FastAPI & Flutter) + IA Lead** | Módulo RAG em Python, Routers de Chat & Coleta, Chatbot UI e Integração Flutter |
| **Lucas** | **Backend Core Engine + Ledger & DB** | Schemas SQLModel / Pydantic, Middleware JWT Multitenant, Ledger em Python e Redis Queues |

---

## 📌 Checklist do Roadmap de Migração (Pendente / A Fazer)

- [ ] **W04 · Identidade e Tenancy (FastAPI)**: Middlewares de Multitenancy e Auth JWT (`[Lucas]`).
- [ ] **W05 · Catálogo e Importação (FastAPI)**: Leitura de lotes CSV/XLSX via Pandas (`[Lucas & Kauan]`).
- [ ] **W06 · Coletas e Matchmaking (FastAPI)**: Routers de solicitações e filas Redis (`[Kauan & Lucas]`).
- [ ] **W07 · Ledger e Reconciliação (FastAPI)**: Encadeamento de hashes criptográficos em Python (`[Lucas]`).
- [ ] **W10 · AI RAG Module**: Endpoint `/api/v1/ai/query` integrado com Gemini API (`[Kauan]`).
