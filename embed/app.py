from typing import List
from fastapi import FastAPI  # type: ignore
from pydantic import BaseModel  # type: ignore
from sentence_transformers import SentenceTransformer  # type: ignore
import uvicorn  # type: ignore

app: FastAPI = FastAPI()

# Load model on startup
model: SentenceTransformer = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dimensions


class EmbedRequest(BaseModel):
    texts: List[str]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


class HealthResponse(BaseModel):
    status: str


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest) -> EmbedResponse:
    embeddings: List[List[float]] = model.encode(request.texts).tolist()
    return EmbedResponse(embeddings=embeddings)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/docs", response_model=HealthResponse)
async def docs() -> HealthResponse:
    return HealthResponse(status="ok")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)

