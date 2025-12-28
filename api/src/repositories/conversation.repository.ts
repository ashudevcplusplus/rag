import { ConversationModel, IConversationDocument } from '../models/conversation.model';
import {
  IConversation,
  CreateConversationDTO,
  UpdateConversationDTO,
  ConversationMessage,
} from '../schemas/conversation.schema';
import { FilterQuery, Model } from 'mongoose';
import { toStringId, toStringIds, calculateSkip, calculateTotalPages } from './helpers';

export class ConversationRepository {
  public model: Model<IConversationDocument>;

  constructor() {
    this.model = ConversationModel;
  }

  /**
   * Create a new conversation
   */
  async create(
    companyId: string,
    data: CreateConversationDTO,
    userId?: string
  ): Promise<IConversation> {
    // Build initial messages array if initialMessage is provided
    const messages: ConversationMessage[] = [];
    if (data.initialMessage) {
      messages.push({
        id: `msg_${Date.now()}`,
        role: 'user',
        content: data.initialMessage,
        timestamp: new Date(),
      });
    }

    const conversation = new ConversationModel({
      companyId,
      userId: userId || undefined,
      projectId: data.projectId || undefined,
      title: data.title || 'New Conversation',
      messages,
      messageCount: messages.length,
      lastMessageAt: new Date(),
    });
    const saved = await conversation.save();
    return toStringId(saved.toObject()) as unknown as IConversation;
  }

  /**
   * Find conversation by ID
   */
  async findById(id: string): Promise<IConversation | null> {
    const conversation = await ConversationModel.findById(id).where({ deletedAt: null }).lean();
    if (!conversation) return null;
    return toStringId(conversation) as unknown as IConversation;
  }

  /**
   * Find conversation by ID and company ID (for security)
   */
  async findByIdAndCompany(id: string, companyId: string): Promise<IConversation | null> {
    const conversation = await ConversationModel.findOne({
      _id: id,
      companyId,
      deletedAt: null,
    }).lean();
    if (!conversation) return null;
    return toStringId(conversation) as unknown as IConversation;
  }

  /**
   * Update conversation
   */
  async update(
    id: string,
    companyId: string,
    data: UpdateConversationDTO
  ): Promise<IConversation | null> {
    const conversation = await ConversationModel.findOneAndUpdate(
      {
        _id: id,
        companyId,
        deletedAt: null,
      },
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!conversation) return null;
    return toStringId(conversation) as unknown as IConversation;
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    id: string,
    companyId: string,
    message: ConversationMessage
  ): Promise<IConversation | null> {
    const conversation = await ConversationModel.findOneAndUpdate(
      {
        _id: id,
        companyId,
        deletedAt: null,
      },
      {
        $push: { messages: message },
        $inc: { messageCount: 1 },
        $set: { lastMessageAt: new Date() },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!conversation) return null;
    return toStringId(conversation) as unknown as IConversation;
  }

  /**
   * Update the last message in a conversation (for streaming responses)
   */
  async updateLastMessage(
    id: string,
    companyId: string,
    messageId: string,
    updates: Partial<ConversationMessage>
  ): Promise<IConversation | null> {
    // Build $set object dynamically to only update provided fields
    const setFields: Record<string, unknown> = {
      lastMessageAt: new Date(),
    };

    if (updates.content !== undefined) {
      setFields['messages.$.content'] = updates.content;
    }
    if (updates.sources !== undefined) {
      setFields['messages.$.sources'] = updates.sources;
    }

    const conversation = await ConversationModel.findOneAndUpdate(
      {
        _id: id,
        companyId,
        'messages.id': messageId,
        deletedAt: null,
      },
      {
        $set: setFields,
      },
      { new: true, runValidators: true }
    ).lean();

    if (!conversation) return null;
    return toStringId(conversation) as unknown as IConversation;
  }

  /**
   * Soft delete conversation
   */
  async delete(id: string, companyId: string): Promise<boolean> {
    const result = await ConversationModel.findOneAndUpdate(
      {
        _id: id,
        companyId,
        deletedAt: null,
      },
      { $set: { deletedAt: new Date() } }
    );
    return !!result;
  }

  /**
   * List conversations for a company with pagination
   */
  async list(
    companyId: string,
    page: number = 1,
    limit: number = 20,
    filters?: { userId?: string; projectId?: string }
  ): Promise<{ conversations: IConversation[]; total: number; page: number; totalPages: number }> {
    const query: FilterQuery<IConversationDocument> = {
      companyId,
      deletedAt: null,
    };

    if (filters?.userId) {
      query.userId = filters.userId;
    }
    if (filters?.projectId) {
      query.projectId = filters.projectId;
    }

    const skip = calculateSkip(page, limit);

    const [conversations, total] = await Promise.all([
      ConversationModel.find(query)
        .select('title messageCount lastMessageAt projectId createdAt updatedAt')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ConversationModel.countDocuments(query),
    ]);

    return {
      conversations: toStringIds(conversations) as unknown as IConversation[],
      total,
      page,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  /**
   * Count conversations for a company
   */
  async countByCompanyId(companyId: string): Promise<number> {
    return ConversationModel.countDocuments({
      companyId,
      deletedAt: null,
    });
  }

  /**
   * Clear all messages from a conversation
   */
  async clearMessages(id: string, companyId: string): Promise<boolean> {
    const result = await ConversationModel.findOneAndUpdate(
      {
        _id: id,
        companyId,
        deletedAt: null,
      },
      {
        $set: {
          messages: [],
          messageCount: 0,
          lastMessageAt: new Date(),
        },
      }
    );
    return !!result;
  }
}

// Export singleton instance
export const conversationRepository = new ConversationRepository();
