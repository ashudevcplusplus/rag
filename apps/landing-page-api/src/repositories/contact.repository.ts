import { ContactModel, IContactDocument } from "../models/contact.model";
import {
  CreateContactDTO,
  UpdateContactDTO,
  IContact,
} from "../schemas/contact.schema";
import { FilterQuery, Model } from "mongoose";
import { toStringId, toStringIds } from "./helpers";

export class ContactRepository {
  public model: Model<IContactDocument>;

  constructor() {
    this.model = ContactModel;
  }

  /**
   * Create a new contact submission
   */
  async create(data: CreateContactDTO): Promise<IContact> {
    const contact = new ContactModel(data);
    const saved = await contact.save();
    return toStringId(saved) as IContact;
  }

  /**
   * Find contact by ID
   */
  async findById(id: string): Promise<IContact | null> {
    const contact = await ContactModel.findById(id).lean();
    if (!contact) return null;
    return toStringId(contact) as IContact;
  }

  /**
   * Update contact status
   */
  async update(id: string, data: UpdateContactDTO): Promise<IContact | null> {
    const contact = await ContactModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();

    if (!contact) return null;
    return toStringId(contact) as IContact;
  }

  /**
   * Delete contact
   */
  async delete(id: string): Promise<boolean> {
    const result = await ContactModel.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * List contacts with pagination
   */
  async list(
    page: number = 1,
    limit: number = 20,
    filters?: { status?: string },
  ): Promise<{
    contacts: IContact[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: FilterQuery<IContactDocument> = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      ContactModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactModel.countDocuments(query),
    ]);

    return {
      contacts: toStringIds(contacts) as IContact[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get contact stats
   */
  async getStats(): Promise<{
    total: number;
    new: number;
    read: number;
    replied: number;
  }> {
    const [total, newCount, readCount, repliedCount] = await Promise.all([
      ContactModel.countDocuments({}),
      ContactModel.countDocuments({ status: "new" }),
      ContactModel.countDocuments({ status: "read" }),
      ContactModel.countDocuments({ status: "replied" }),
    ]);

    return {
      total,
      new: newCount,
      read: readCount,
      replied: repliedCount,
    };
  }
}

export const contactRepository = new ContactRepository();
