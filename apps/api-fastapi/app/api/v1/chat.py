from typing import List
from fastapi import APIRouter, status
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(payload: ChatMessageCreate):
    return await chat_service.save_message(payload)


@router.get("/messages/{collection_id}", response_model=List[ChatMessageResponse])
async def list_messages(collection_id: str):
    return await chat_service.get_messages_by_collection(collection_id)
