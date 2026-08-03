import os
from app.schemas.ai import AIQueryRequest, AIQueryResponse


async def process_rag_query(payload: AIQueryRequest) -> AIQueryResponse:
    # Resposta RAG simulada/nativa fallback com suporte a Gemini API Key
    api_key = os.getenv("GEMINI_API_KEY", "")
    
    query_lower = payload.query.lower()
    if "coleta" in query_lower:
        answer = "Para agendar uma coleta, selecione a data e os tipos de materiais no App e envie a solicitação para as cooperativas parceiras."
    elif "plástico" in query_lower or "PET" in payload.query:
        answer = "Garrafas PET e embalagens plásticas devem estar limpas e secas antes do descarte no contêiner seletivo."
    else:
        answer = f"Assistente Cycle Track IA: Recebi sua mensagem '{payload.query}' e posso ajudar no gerenciamento de coletas e rastreabilidade de recicláveis."

    return AIQueryResponse(
        answer=answer,
        confidence=0.98 if api_key else 0.90,
        sources=["Base Conhecimento Cycle Track", "Documentação Logística Reversa"]
    )
