# Escopo do piloto — rascunho para validação

Status: **rascunho de engenharia**. Sponsor, jurídico e operação ainda precisam
validar os itens marcados como hipótese.

## Objetivo

Comprovar, em um cliente na Espanha e um em Portugal, que uma embalagem pode ser
identificada desde o lote, coletada com controles antifraude, reconciliada com uma
prova pública e convertida em recompensa ao consumidor sem duplicação de valor.

## Resultado mensurável

- Cada embalagem do piloto possui serial e dois identificadores não reversíveis.
- Uma coleta válida gera no máximo um crédito, inclusive sob retry concorrente.
- O totem conserva eventos por oito horas offline e os sincroniza sem perda.
- Operação e sponsor conciliam banco, eventos públicos, saldo e KPIs.
- Dados e suporte permanecem isolados por tenant e país.

## Dentro do MVP

- Operação multi-tenant para dois clientes.
- Cadastro manual e importação controlada de CSV/XLSX.
- Ciclo MINTED → IN_CIRCULATION → COLLECTED → RECYCLED.
- QR externo de procedência e QR interno usado no contexto de coleta.
- Ledger em moeda fiduciária, saldo pendente/disponível e cashout por adaptador.
- Prova Polygon para eventos críticos, de forma assíncrona.
- Dashboard B2B, métricas executivas e exportação auditável.
- App consumidor Flutter em português, espanhol e inglês.
- Adaptador de totem com peso e fila offline.

## Fora do MVP

- Integração direta com SAP, Oracle ou linha contínua de produção.
- Marketplace, token negociável ou custódia cripto do consumidor.
- Operação além dos dois tenants e países aprovados.
- Machine learning para fraude ou previsão de retorno.
- Liquidação on-chain como fonte primária do saldo.
- Automação de decisões jurídicas, fiscais ou de KYC/KYB.

## Hipóteses que precisam de confirmação

- O incentivo é denominado e contabilizado em moeda fiduciária.
- O QR interno só fica acessível depois que o lacre é rompido.
- A balança do totem fornece leitura e identificação do dispositivo assináveis.
- O provedor de cashout cobre Pix no Brasil apenas se esse fluxo permanecer no
  piloto; SEPA cobre consumidores elegíveis em Espanha e Portugal.
- A prova on-chain pode usar hash e identificadores pseudônimos sem dado pessoal.
- O cliente fornece lote de teste anonimizado e responsáveis para UAT.

## Responsabilidades propostas

| Decisão                     | Responsável     | Aprovador            |
| --------------------------- | --------------- | -------------------- |
| Escopo, KPIs e go/no-go     | Product         | Sponsor              |
| Arquitetura e risco técnico | Architecture    | CTO/Engineering lead |
| GDPR, DPA e retenção        | Privacy/Legal   | DPO/Jurídico         |
| Recompensa e reconciliação  | Finance/Product | Finance owner        |
| Operação física e totem     | Field Ops       | Cliente piloto       |
| Incidentes e suporte        | Delivery/Ops    | Sponsor operacional  |

## Glossário mínimo

- **Tenant:** fronteira lógica de uma marca/cliente.
- **Lote:** conjunto importado e auditável de embalagens do mesmo contexto produtivo.
- **Embalagem:** unidade física com serial, QR externo e QR interno.
- **Claim:** tentativa autenticada de associar uma coleta válida ao consumidor.
- **Recompensa:** entrada imutável no ledger; o saldo é uma projeção reconciliável.
- **Cashout:** ordem assíncrona para retirar saldo por um provedor externo.
- **Outbox:** eventos gravados na transação do domínio e publicados depois por worker.
- **Prova pública:** hash/evento crítico confirmado na Polygon, sem dado pessoal.
- **Totem:** dispositivo de campo que valida QR, peso e contexto de coleta.
