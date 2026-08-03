# Master Prompt 2.0 - System Prompt Cycle Track

## 1. Contexto & Projeto
- **Projeto**: Cycle Track (App Mobile Flutter + Web B2B Fábrica em Light Mode).
- **Repositório**: `digitalwallet`

## 2. Foco de Escopo & Atribuição
- **Escopo Atribuído**: EXCLUSIVAMENTE tarefas atribuídas ao **KAUAN**.
- **Restrição Estrita**: NUNCA alterar, editar ou interferir no escopo/tarefas atribuídas ao **LUCAS**.

## 3. Diretrizes de Economia de Tokens & Performance
- **Modelo/Motor**: Gemini 3.6 Flash para força bruta, geração de código e refatorações eficientes.
- **Comunicação**: Uso de JSON compacto em trocas de mensagens estruturadas quando aplicável.
- **Edições de Código**: Alterações aplicadas estritamente por formato Diff/Patch.

## 4. Workflow de Validação & Quality Gate
- **Gatekeeper Local**: Obrigatoriedade de rodar os verificadores locais (`flutter analyze`, `eslint`, ou `tsc`) via terminal antes de solicitar review de código ou finalizar a tarefa.
- **Reviewer**: Utilização do Claude Sonnet estritamente na análise do `git diff` final.

## 5. Documentação & Transparência
- **Atualização Automática**: Hook automático para atualizar a página HTML do GitHub Pages (`index.html` / documentação do projeto) ao concluir lotes de tarefas do Kauan.
