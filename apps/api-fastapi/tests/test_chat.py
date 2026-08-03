from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_chat_flow():
    payload = {
        "collection_id": "col-123",
        "sender_id": "user-456",
        "sender_role": "condominium",
        "content": "Olá, a coleta está agendada?",
    }
    response = client.post("/api/v1/chat/messages", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["collection_id"] == "col-123"
    assert data["content"] == "Olá, a coleta está agendada?"
    assert "id" in data

    # Listar mensagens
    list_res = client.get("/api/v1/chat/messages/col-123")
    assert list_res.status_code == 200
    messages = list_res.json()
    assert len(messages) == 1
    assert messages[0]["id"] == data["id"]
