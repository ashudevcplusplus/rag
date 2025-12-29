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
      .select('fileId projectId chunkCount provider modelName vectorDimensions createdAt')
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

  /**
   * Get all chunks for a file with their content
   * Returns chunks sorted by index
   */
  async findAllChunksByFileId(
    fileId: string
  ): Promise<{ chunkIndex: number; content: string }[] | null> {
    const embedding = await EmbeddingModel.findOne({ fileId, deletedAt: null })
      .select('contents')
      .lean();

    if (!embedding || !embedding.contents) return null;

    return embedding.contents.map((content, index) => ({
      chunkIndex: index,
      content,
    }));
  }

  /**
   * Get a range of chunks for a file (for context window)
   * @param fileId - The file ID
   * @param startIndex - Starting chunk index (inclusive)
   * @param endIndex - Ending chunk index (inclusive)
   * @returns Array of chunks within the range, or null if file not found
   */
  async findChunkRange(
    fileId: string,
    startIndex: number,
    endIndex: number
  ): Promise<{ chunkIndex: number; content: string }[] | null> {
    const embedding = await EmbeddingModel.findOne({ fileId, deletedAt: null })
      .select('contents chunkCount')
      .lean();

    if (!embedding || !embedding.contents) return null;

    const results: { chunkIndex: number; content: string }[] = [];
    const validStart = Math.max(0, startIndex);
    const validEnd = Math.min(embedding.contents.length - 1, endIndex);

    for (let i = validStart; i <= validEnd; i++) {
      if (embedding.contents[i]) {
        results.push({
          chunkIndex: i,
          content: embedding.contents[i],
        });
      }
    }

    return results;
  }

  /**
   * Get chunk count for a file
   */
  async getChunkCount(fileId: string): Promise<number | null> {
    const embedding = await EmbeddingModel.findOne({ fileId, deletedAt: null })
      .select('chunkCount')
      .lean();

    if (!embedding) return null;
    return embedding.chunkCount;
  }
}

export const embeddingRepository = new EmbeddingRepository();
