# Jornadas do piloto — rascunho

## Operador B2B

1. Autentica com identidade corporativa e tenant resolvido pelo servidor.
2. Baixa o template versionado ou inicia cadastro manual.
3. Envia o lote; o arquivo vai para staging privado e recebe hash.
4. Revisa prévia, erros por linha e totais antes de confirmar.
5. Confirma linhas válidas; a gravação é idempotente e auditada.
6. Acompanha estados, divergências, recompensas e reconciliação por lote.
7. Exporta relatório com filtros, fórmula e instante de corte explícitos.

Falhas que precisam de UX própria: coluna ausente, serial duplicado, linha inválida,
arquivo expirado, autorização insuficiente e importação já confirmada.

## Consumidor

1. Lê o QR externo e consulta a procedência pública permitida.
2. Instala/abre o app, escolhe idioma e conclui consentimento/autenticação.
3. Entrega a embalagem no totem e lê o QR interno quando instruído.
4. Vê a coleta como pendente enquanto peso e evento são reconciliados.
5. Recebe o crédito exatamente uma vez e consulta o extrato explicável.
6. Solicita cashout; acompanha pending, settled ou failed sem repetir pagamento.

Falhas que precisam de UX própria: QR desconhecido, já utilizado, fora de contexto,
peso divergente, conexão indisponível, claim pendente e cashout recusado.

## Totem

1. Inicializa com identidade do dispositivo e configuração versionada.
2. Verifica capacidade local, relógio, balança e conectividade.
3. Lê o QR interno e cria challenge de coleta de uso único.
4. Compara peso medido com peso esperado dentro de ±5%.
5. Persiste o evento localmente antes de confirmar sucesso ao usuário.
6. Envia lotes idempotentes; recebe confirmação individual por evento.
7. Mantém rejeitados para suporte, sem bloquear eventos válidos.

## Suporte e incidente

1. Localiza evento por correlation ID sem expor dados de outro tenant.
2. Consulta auditoria, tentativa, estado do ledger e reconciliação.
3. Executa apenas ações compatíveis com seu papel; toda ação é auditada.
4. Reverte por uma nova entrada, nunca editando o ledger original.
5. Escala conforme severidade e preserva evidências do incidente.

## Perguntas abertas para campo

- Quem rompe o lacre e em qual momento o QR interno fica visível?
- A balança entrega gramas estáveis ou uma janela de amostras?
- Qual é a capacidade física antes de bloquear novas coletas?
- O totem possui relógio confiável, secure element e atualização remota?
- Qual mensagem e canal de suporte são adequados em cada país?
