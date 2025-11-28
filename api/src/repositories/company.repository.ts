import { CompanyModel, ICompanyDocument } from '../models/company.model';
import { CreateCompanyDTO, UpdateCompanyDTO, ICompany } from '../schemas/company.schema';
import { FilterQuery, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export class CompanyRepository {
  public model: Model<ICompanyDocument>;

  constructor() {
    this.model = CompanyModel;
  }

  /**
   * Create a new company
   */
  async create(data: CreateCompanyDTO): Promise<ICompany> {
    // Generate API key
    const apiKey = data.apiKey || `ck_${uuidv4().replace(/-/g, '')}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    // Remove apiKey from data to avoid passing it twice if it exists
    // but data is CreateCompanyDTO which includes it now.
    // However, CompanyModel constructor handles extra fields gracefully or we should spread carefully.
    const { apiKey: _, ...rest } = data;
    
    const company = new CompanyModel({
      ...rest,
      apiKey,
      apiKeyHash,
    });

    const saved = await company.save();

    // Return company with plain API key (only time it's visible)
    const companyObj = saved.toObject();
    return { ...companyObj, _id: companyObj._id.toString(), apiKey };
  }

  /**
   * Find company by ID
   */
  async findById(id: string): Promise<ICompany | null> {
    const company = await CompanyModel.findById(id).where({ deletedAt: null }).lean();
    if (!company) return null;
    return { ...company, _id: company._id.toString() } as ICompany;
  }

  /**
   * Find company by slug
   */
  async findBySlug(slug: string): Promise<ICompany | null> {
    const company = await CompanyModel.findOne({ slug, deletedAt: null }).lean();
    if (!company) return null;
    return { ...company, _id: company._id.toString() } as ICompany;
  }

  /**
   * Find company by API key
   */
  async findByApiKey(apiKey: string): Promise<ICompany | null> {
    const company = await CompanyModel.findOne({ apiKey, deletedAt: null }).lean();
    if (!company) return null;
    return { ...company, _id: company._id.toString() } as ICompany;
  }

  /**
   * Validate API key and return company
   */
  async validateApiKey(apiKey: string): Promise<ICompany | null> {
    const company = await this.findByApiKey(apiKey);
    if (!company) {
      return null;
    }

    // Update last used timestamp
    await CompanyModel.findByIdAndUpdate(company._id, {
      apiKeyLastUsed: new Date(),
    });

    return company;
  }

  /**
   * Update company
   */
  async update(id: string, data: UpdateCompanyDTO): Promise<ICompany | null> {
    const company = await CompanyModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .where({ deletedAt: null })
      .lean();

    if (!company) return null;
    return { ...company, _id: company._id.toString() } as ICompany;
  }

  /**
   * Soft delete company
   */
  async delete(id: string): Promise<boolean> {
    const result = await CompanyModel.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    return !!result;
  }

  /**
   * Update storage used
   */
  async updateStorageUsed(id: string, bytes: number): Promise<void> {
    await CompanyModel.findByIdAndUpdate(id, {
      $inc: { storageUsed: bytes },
    });
  }

  /**
   * Check if company has reached storage limit
   */
  async hasReachedStorageLimit(id: string): Promise<boolean> {
    const company = await this.findById(id);
    if (!company) {
      return true;
    }
    return company.storageUsed >= company.storageLimit;
  }

  /**
   * List all companies with pagination
   */
  async list(
    page: number = 1,
    limit: number = 10,
    filters?: { status?: string; subscriptionTier?: string }
  ): Promise<{ companies: ICompany[]; total: number; page: number; totalPages: number }> {
    const query: FilterQuery<ICompanyDocument> = { deletedAt: null };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.subscriptionTier) {
      query.subscriptionTier = filters.subscriptionTier;
    }

    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      CompanyModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CompanyModel.countDocuments(query),
    ]);

    return {
      companies: companies.map((c) => ({ ...c, _id: c._id.toString() })) as ICompany[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get company stats
   */
  async getStats(id: string): Promise<{
    userCount: number;
    projectCount: number;
    fileCount: number;
    storageUsed: number;
    storageLimit: number;
  } | null> {
    const company = await this.findById(id);
    if (!company) {
      return null;
    }

    // Import models inline to avoid circular dependencies
    const { UserModel } = await import('../models/user.model');
    const { ProjectModel } = await import('../models/project.model');
    const { FileMetadataModel } = await import('../models/file-metadata.model');

    const [userCount, projectCount, fileCount] = await Promise.all([
      UserModel.countDocuments({ companyId: id, deletedAt: null }),
      ProjectModel.countDocuments({ companyId: id, deletedAt: null }),
      FileMetadataModel.countDocuments({
        projectId: { $in: await ProjectModel.find({ companyId: id }).distinct('_id') },
        deletedAt: null,
      }),
    ]);

    return {
      userCount,
      projectCount,
      fileCount,
      storageUsed: company.storageUsed,
      storageLimit: company.storageLimit,
    };
  }
}

// Export singleton instance
export const companyRepository = new CompanyRepository();
