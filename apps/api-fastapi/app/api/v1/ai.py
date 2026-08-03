from fastapi import APIRouter
from app.schemas.ai import AIQueryRequest, AIQueryResponse
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["AI & RAG"])


@router.post("/query", response_model=AIQueryResponse)
async def query_ai_assistant(payload: AIQueryRequest):
    return await ai_service.process_rag_query(payload)
