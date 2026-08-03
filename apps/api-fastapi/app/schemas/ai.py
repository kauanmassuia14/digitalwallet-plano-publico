from typing import Optional
from pydantic import BaseModel, Field


class AIQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Pergunta ou instrução para o assistente de IA")
    context: Optional[str] = Field(None, description="Contexto adicional da coleta ou perfil do usuário")


class AIQueryResponse(BaseModel):
    answer: str
    confidence: float = 0.95
    sources: list[str] = ["Cycle Track RAG Base", "Gemini 3.6 Engine"]
