from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ChatMessageCreate(BaseModel):
    collection_id: str = Field(..., description="ID da coleta associada")
    sender_id: str = Field(..., description="ID do remetente (Usuário ou Entidade)")
    sender_role: str = Field(..., description="Role do remetente (condominium, cooperative, ai)")
    content: str = Field(..., min_length=1, max_length=2000, description="Conteúdo da mensagem")


class ChatMessageResponse(BaseModel):
    id: str
    collection_id: str
    sender_id: str
    sender_role: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True
