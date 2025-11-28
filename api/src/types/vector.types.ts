export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    fileId: string;
    companyId: string;
    text_preview: string;
    chunkIndex: number;
  };
}

export interface SearchResultPayload {
  fileId: string;
  companyId: string;
  text_preview: string;
  chunkIndex: number;
  [key: string]: unknown; // Allow additional properties
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload?: SearchResultPayload | Record<string, unknown> | null;
  version?: number;
  vector?: number[] | number[][] | Record<string, unknown> | null;
  shard_key?: string | number | string[] | null;
  order_value?: number | string | null;
}

export interface EmbeddingResponse {
  embeddings?: number[][];
  vectors?: number[][];
}

export interface RerankResponse {
  scores: number[];
}

export interface QdrantFilter {
  must?: Array<{
    key: string;
    match: {
      value?: string | number | boolean;
      any?: (string | number | boolean)[];
    };
  }>;
  should?: Array<{
    key: string;
    match: {
      value?: string | number | boolean;
      any?: (string | number | boolean)[];
    };
  }>;
}
