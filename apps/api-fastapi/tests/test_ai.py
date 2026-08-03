from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_ai_query():
    payload = {
        "query": "Como descarte garrafas de plástico PET?",
    }
    response = client.post("/api/v1/ai/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "garrafas PET" in data["answer"] or "plástica" in data["answer"]
    assert data["confidence"] > 0.8
