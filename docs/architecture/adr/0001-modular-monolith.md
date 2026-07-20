# ADR 0001 — Monólito modular no MVP

- Status: Aceito para implementação local
- Data: 2026-07-15

## Contexto

O piloto possui transações fortemente relacionadas, equipe inicial pequena e prazo
curto. Separar serviços antes de conhecer os limites operacionais aumentaria deploys,
falhas distribuídas e custo de observabilidade.

## Decisão

Usar NestJS como aplicação modular única, com domínio independente e workers
executáveis separadamente. Limites de módulo e eventos são explícitos desde o início.

## Consequências

- Transações de embalagem, recompensa e outbox podem ser atômicas.
- Uma pipeline publica a API; workers podem escalar de forma independente depois.
- Módulos não podem acessar tabelas de outros módulos sem uma porta definida.
- Extração futura será orientada por volume e falhas observadas, não por previsão.
