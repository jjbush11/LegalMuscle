from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    """Test the health check endpoint returns 200 OK with correct status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_upload_endpoint():
    """Test the placeholder upload endpoint returns expected data."""
    response = client.post("/api/v1/upload")
    assert response.status_code == 200
    assert response.json() == {"id": "demo", "sha256": "DEADBEEF"}
