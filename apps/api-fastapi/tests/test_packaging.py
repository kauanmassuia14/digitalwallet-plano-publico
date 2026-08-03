from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_packaging_registration_and_hash_generation():
    payload = {
        "brand_id": "brand-999",
        "sku": "SKU-PET-500ML",
        "name": "Garrafa PET Água 500ml",
        "material_type": "PET",
        "weight_grams": 25.5,
    }
    response = client.post("/api/v1/packaging", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["brand_id"] == "brand-999"
    assert data["sku"] == "SKU-PET-500ML"
    assert len(data["external_qr_hash"]) == 64
    assert len(data["internal_qr_hash"]) == 64
    assert data["external_qr_hash"] != data["internal_qr_hash"]

    # Testar listagem filtrada por brand_id
    list_res = client.get("/api/v1/packaging?brand_id=brand-999")
    assert list_res.status_code == 200
    pkgs = list_res.json()
    assert len(pkgs) == 1
    assert pkgs[0]["id"] == data["id"]
