import uuid
from datetime import datetime, timezone
from typing import Dict, List
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse

# Armazenamento temporário em memória para o Router do Chat (será conectado ao SQLModel/DB)
_chat_db: Dict[str, List[ChatMessageResponse]] = {}


async def save_message(data: ChatMessageCreate) -> ChatMessageResponse:
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    message = ChatMessageResponse(
        id=msg_id,
        collection_id=data.collection_id,
        sender_id=data.sender_id,
        sender_role=data.sender_role,
        content=data.content,
        timestamp=now,
    )
    if data.collection_id not in _chat_db:
        _chat_db[data.collection_id] = []
    _chat_db[data.collection_id].append(message)
    return message


async def get_messages_by_collection(collection_id: str) -> List[ChatMessageResponse]:
    return _chat_db.get(collection_id, [])
