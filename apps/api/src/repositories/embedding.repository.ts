import { EmbeddingModel } from '../models/embedding.model';
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
   * Find by File ID (excludes soft-deleted)
   */
  async findByFileId(fileId: string): Promise<IEmbedding | null> {
    const embedding = await EmbeddingModel.findOne({ fileId, deletedAt: null }).lean();
    if (!embedding) return null;
    return toStringId(embedding) as unknown as IEmbedding;
  }

  /**
   * Find by Project ID (excludes soft-deleted)
   */
  async findByProjectId(projectId: string): Promise<IEmbedding[]> {
    const embeddings = await EmbeddingModel.find({ projectId, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();
    return toStringIds(embeddings) as unknown as IEmbedding[];
  }

  /**
   * Find by multiple Project IDs with pagination
   */
  async findByProjectIds(
    projectIds: string[],
    page: number = 1,
    limit: number = 20
  ): Promise<{ embeddings: IEmbedding[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const query = { projectId: { $in: projectIds }, deletedAt: null };

    const [embeddings, total] = await Promise.all([
      EmbeddingModel.find(query)
        .select('fileId projectId chunkCount createdAt') // Only fetch needed fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fileId', 'originalFilename')
        .populate('projectId', 'name')
        .lean(),
      EmbeddingModel.countDocuments(query),
    ]);

    return {
      embeddings: toStringIds(embeddings) as unknown as IEmbedding[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find specific chunks by fileId and chunkIndex (excludes soft-deleted)
   * Returns an array of objects with content for the requested chunks
   */
  async findChunks(
    chunks: { fileId: string; chunkIndex: number }[]
  ): Promise<{ fileId: string; chunkIndex: number; content: string }[]> {
    if (chunks.length === 0) return [];

    const fileIds = [...new Set(chunks.map((c) => c.fileId))];
    const embeddings = await EmbeddingModel.find({
      fileId: { $in: fileIds },
      deletedAt: null,
    })
      .select('fileId contents')
      .lean();

    const embeddingsMap = new Map(embeddings.map((e) => [e.fileId.toString(), e]));

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
   * Soft delete by File ID
   */
  async deleteByFileId(fileId: string): Promise<number> {
    const result = await EmbeddingModel.updateMany(
      { fileId, deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );
    return result.modifiedCount;
  }
}

export const embeddingRepository = new EmbeddingRepository();
