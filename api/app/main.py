from fastapi import FastAPI
from uuid import uuid4

app = FastAPI(
    title="Evidence‑MVP",
    description="API for evidence collection and management",
    version="0.1.0",
)

@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is running."""
    return {"status": "ok"}

@app.post("/api/v1/upload")
async def upload_evidence():
    """Placeholder endpoint for evidence upload."""
    # This is just a placeholder - will be implemented with actual logic later
    return {
        "id": "demo",
        "sha256": "DEADBEEF"
    }
