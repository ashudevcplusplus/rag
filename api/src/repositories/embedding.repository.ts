import { EmbeddingModel, IEmbeddingDocument } from '../models/embedding.model';
import { CreateEmbeddingDTO, IEmbedding } from '../schemas/embedding.schema';
import { toStringId, toStringIds } from './helpers';

export class EmbeddingRepository {
  /**
   * Create new embedding
   */
  async create(data: CreateEmbeddingDTO): Promise<IEmbedding> {
    const embedding = new EmbeddingModel(data);
    const saved = await embedding.save();
    return toStringId(saved.toObject()) as unknown as IEmbedding;
  }

  /**
   * Find by File ID
   */
  async findByFileId(fileId: string): Promise<IEmbedding | null> {
    const embedding = await EmbeddingModel.findOne({ fileId }).lean();
    if (!embedding) return null;
    return toStringId(embedding) as unknown as IEmbedding;
  }

  /**
   * Find by Project ID
   */
  async findByProjectId(projectId: string): Promise<IEmbedding[]> {
    const embeddings = await EmbeddingModel.find({ projectId })
      .sort({ createdAt: -1 })
      .lean();
    return toStringIds(embeddings) as unknown as IEmbedding[];
  }

  /**
   * Find specific chunks by fileId and chunkIndex
   * Returns an array of objects with content for the requested chunks
   */
  async findChunks(chunks: { fileId: string; chunkIndex: number }[]): Promise<{ fileId: string; chunkIndex: number; content: string }[]> {
    if (chunks.length === 0) return [];

    const fileIds = [...new Set(chunks.map(c => c.fileId))];
    const embeddings = await EmbeddingModel.find({ fileId: { $in: fileIds } }).lean();
    
    const embeddingsMap = new Map(embeddings.map(e => [e.fileId.toString(), e]));

    const results: { fileId: string; chunkIndex: number; content: string }[] = [];

    for (const chunk of chunks) {
      const doc = embeddingsMap.get(chunk.fileId);
      if (doc && doc.contents && doc.contents[chunk.chunkIndex]) {
        results.push({
          fileId: chunk.fileId,
          chunkIndex: chunk.chunkIndex,
          content: doc.contents[chunk.chunkIndex],
        });
      }
    }

    return results;
  }

  /**
   * Delete by File ID
   */
  async deleteByFileId(fileId: string): Promise<number> {
    const result = await EmbeddingModel.deleteMany({ fileId });
    return result.deletedCount;
  }
}

export const embeddingRepository = new EmbeddingRepository();
