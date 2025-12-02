from typing import List, Optional
from fastapi import FastAPI  # type: ignore
from pydantic import BaseModel  # type: ignore
from sentence_transformers import SentenceTransformer, CrossEncoder  # type: ignore
import uvicorn  # type: ignore
import torch  # type: ignore
import os  # type: ignore
from pathlib import Path  # type: ignore

# Try to import ONNX Runtime optimizations (optional)
try:
    import onnxruntime as ort  # type: ignore
    ONNX_AVAILABLE = True
except ImportError as e:
    print(f"ONNX Runtime not available, using standard CrossEncoder: {e}")
    ONNX_AVAILABLE = False

app: FastAPI = FastAPI()

# Load model on startup
model: SentenceTransformer = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dimensions

# Initialize ONNX-optimized reranker
onnx_model_dir = Path("/tmp/reranker_onnx")
reranker_onnx = None
reranker_tokenizer = None

def initialize_onnx_reranker():
    """Initialize ONNX Runtime optimized reranker for faster inference"""
    global reranker_onnx, reranker_tokenizer
    
    if not ONNX_AVAILABLE:
        print("ONNX Runtime not available, skipping ONNX optimization")
        return False
    
    model_name = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    onnx_model_path = onnx_model_dir / "model.onnx"
    
    try:
        # Check if ONNX model already exists
        if onnx_model_path.exists():
            print("Loading existing ONNX model...")
            # Create ONNX Runtime session
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            sess_options.intra_op_num_threads = 4
            sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
            
            reranker_onnx = ort.InferenceSession(
                str(onnx_model_path),
                sess_options,
                providers=["CPUExecutionProvider"]
            )
            # Use CrossEncoder to get the exact tokenizer it uses
            temp_ce = CrossEncoder(model_name)
            reranker_tokenizer = temp_ce.tokenizer
            del temp_ce  # Clean up
            print("ONNX Runtime reranker loaded successfully!")
            return True
        else:
            print("Converting CrossEncoder to ONNX format using torch.onnx.export...")
            
            # Load CrossEncoder to get the exact model and tokenizer it uses
            temp_ce = CrossEncoder(model_name)
            pt_model = temp_ce.model
            pt_model.eval()
            reranker_tokenizer = temp_ce.tokenizer
            
            # Create dummy input for export (CrossEncoder format: query, document)
            dummy_query = "test query"
            dummy_doc = "test document"
            dummy_inputs = reranker_tokenizer(
                dummy_query,
                dummy_doc,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            
            # Export to ONNX using torch.onnx.export
            onnx_model_dir.mkdir(parents=True, exist_ok=True)
            
            # Prepare inputs for export
            input_ids = dummy_inputs["input_ids"]
            attention_mask = dummy_inputs.get("attention_mask")
            
            if attention_mask is not None:
                torch.onnx.export(
                    pt_model,
                    (input_ids, attention_mask),
                    str(onnx_model_path),
                    input_names=["input_ids", "attention_mask"],
                    output_names=["logits"],
                    dynamic_axes={
                        "input_ids": {0: "batch_size", 1: "sequence_length"},
                        "attention_mask": {0: "batch_size", 1: "sequence_length"},
                        "logits": {0: "batch_size"}
                    },
                    opset_version=14,
                    do_constant_folding=True
                )
            else:
                torch.onnx.export(
                    pt_model,
                    input_ids,
                    str(onnx_model_path),
                    input_names=["input_ids"],
                    output_names=["logits"],
                    dynamic_axes={
                        "input_ids": {0: "batch_size", 1: "sequence_length"},
                        "logits": {0: "batch_size"}
                    },
                    opset_version=14,
                    do_constant_folding=True
                )
            
            # Clean up temporary CrossEncoder
            del temp_ce
            
            print("ONNX model exported successfully!")
            
            # Load the ONNX model with optimizations
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            sess_options.intra_op_num_threads = 4
            sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
            
            reranker_onnx = ort.InferenceSession(
                str(onnx_model_path),
                sess_options,
                providers=["CPUExecutionProvider"]
            )
            
            print("ONNX Runtime reranker initialized successfully!")
            return True
    except Exception as e:
        print(f"Failed to initialize ONNX reranker: {e}")
        import traceback
        traceback.print_exc()
        print("Falling back to standard CrossEncoder...")
        return False

# Try to initialize ONNX reranker, fallback to standard if it fails
use_onnx = initialize_onnx_reranker()

if not use_onnx:
    # Fallback to standard CrossEncoder with optimizations
    reranker: CrossEncoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
    reranker.model.eval()
    if hasattr(torch, 'set_num_threads'):
        torch.set_num_threads(4)
    torch.set_grad_enabled(False)
else:
    reranker = None  # Will use ONNX model instead


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
    
    if use_onnx and reranker_onnx is not None and reranker_tokenizer is not None:
        # Use ONNX Runtime optimized reranking with batch processing
        # Get input names from ONNX model
        input_names = [inp.name for inp in reranker_onnx.get_inputs()]
        
        # Batch tokenize all query-document pairs (CrossEncoder format)
        # Tokenizer expects text and text_pair as separate lists for batch processing
        queries = [request.query] * len(request.documents)
        documents = request.documents
        
        inputs = reranker_tokenizer(
            queries,
            documents,
            return_tensors="np",  # ONNX Runtime expects numpy arrays
            truncation=True,
            max_length=512,
            padding=True
        )
        
        # Prepare inputs for ONNX Runtime based on model's expected inputs
        onnx_inputs = {}
        if "input_ids" in input_names:
            onnx_inputs["input_ids"] = inputs["input_ids"].astype("int64")
        if "attention_mask" in input_names and "attention_mask" in inputs:
            onnx_inputs["attention_mask"] = inputs["attention_mask"].astype("int64")
        
        # Run batch inference with ONNX Runtime
        outputs = reranker_onnx.run(None, onnx_inputs)
        
        # Extract scores based on output shape
        # Different models may have different output formats:
        # - [batch, 2]: Binary classification logits, use [:, 1] for relevance score
        # - [batch, 1]: Single relevance score per document
        # - [batch]: Flattened relevance scores
        output_tensor = outputs[0]
        output_shape = output_tensor.shape
        
        if len(output_shape) == 1:
            # Shape: [batch] - direct scores
            scores = [float(score) for score in output_tensor]
        elif len(output_shape) == 2:
            if output_shape[1] == 1:
                # Shape: [batch, 1] - squeeze to get scores
                scores = [float(score) for score in output_tensor[:, 0]]
            elif output_shape[1] == 2:
                # Shape: [batch, 2] - binary classification, use positive class logit
                scores = [float(score) for score in output_tensor[:, 1]]
            else:
                # Unexpected shape, log warning and use first column
                print(f"Warning: Unexpected ONNX output shape {output_shape}, using first column")
                scores = [float(score) for score in output_tensor[:, 0]]
        else:
            # Unexpected dimensionality, flatten and hope for the best
            print(f"Warning: Unexpected ONNX output dimensionality {output_shape}, flattening")
            scores = [float(score) for score in output_tensor.flatten()[:len(request.documents)]]
        
        return RerankResponse(scores=scores)
    else:
        # Fallback to standard CrossEncoder
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

