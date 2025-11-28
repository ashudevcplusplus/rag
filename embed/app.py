from typing import List
from fastapi import FastAPI  # type: ignore
from pydantic import BaseModel  # type: ignore
from sentence_transformers import SentenceTransformer, CrossEncoder  # type: ignore
import uvicorn  # type: ignore

app: FastAPI = FastAPI()

# Load model on startup
model: SentenceTransformer = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dimensions
reranker: CrossEncoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')


class EmbedRequest(BaseModel):
    texts: List[str]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


class RerankRequest(BaseModel):
    query: str
    documents: List[str]


class RerankResponse(BaseModel):
    scores: List[float]


class HealthResponse(BaseModel):
    status: str


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest) -> EmbedResponse:
    embeddings: List[List[float]] = model.encode(request.texts).tolist()
    return EmbedResponse(embeddings=embeddings)


@app.post("/rerank", response_model=RerankResponse)
async def rerank(request: RerankRequest) -> RerankResponse:
    if not request.documents:
        return RerankResponse(scores=[])
    pairs = [[request.query, doc] for doc in request.documents]
    scores = reranker.predict(pairs).tolist()
    return RerankResponse(scores=scores)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/docs", response_model=HealthResponse)
async def docs() -> HealthResponse:
    return HealthResponse(status="ok")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)

