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
   * Create multiple embeddings
   */
  async createMany(data: CreateEmbeddingDTO[]): Promise<IEmbedding[]> {
    const embeddings = await EmbeddingModel.insertMany(data);
    return toStringIds(embeddings.map(e => e.toObject())) as unknown as IEmbedding[];
  }

  /**
   * Find by File ID
   */
  async findByFileId(fileId: string): Promise<IEmbedding[]> {
    const embeddings = await EmbeddingModel.find({ fileId })
      .sort({ chunkIndex: 1 })
      .lean();
    return toStringIds(embeddings) as unknown as IEmbedding[];
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
   * Delete by File ID
   */
  async deleteByFileId(fileId: string): Promise<number> {
    const result = await EmbeddingModel.deleteMany({ fileId });
    return result.deletedCount;
  }
}

export const embeddingRepository = new EmbeddingRepository();

