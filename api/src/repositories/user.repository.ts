import { UserModel, IUserDocument } from '../models/user.model';
import { CreateUserDTO, UpdateUserDTO, IUser } from '../schemas/user.schema';
import { FilterQuery, UpdateQuery } from 'mongoose';
import bcrypt from 'bcryptjs';

export class UserRepository {
  /**
   * Create a new user
   */
  async create(data: Omit<CreateUserDTO, 'password'> & { passwordHash: string }): Promise<IUser> {
    const user = new UserModel(data);
    const saved = await user.save();
    const userObj = saved.toObject();
    return {
      ...userObj,
      _id: userObj._id.toString(),
      companyId: userObj.companyId.toString(),
    } as IUser;
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<IUser | null> {
    const user = await UserModel.findById(id).where({ deletedAt: null }).lean();
    if (!user) return null;
    return { ...user, _id: user._id.toString(), companyId: user.companyId.toString() } as IUser;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUser | null> {
    const user = await UserModel.findOne({ email: email.toLowerCase(), deletedAt: null }).lean();
    if (!user) return null;
    return { ...user, _id: user._id.toString(), companyId: user.companyId.toString() } as IUser;
  }

  /**
   * Find users by company ID
   */
  async findByCompanyId(companyId: string): Promise<IUser[]> {
    const users = await UserModel.find({ companyId, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();
    return users.map((u) => ({
      ...u,
      _id: u._id.toString(),
      companyId: u.companyId.toString(),
    })) as IUser[];
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserDTO): Promise<IUser | null> {
    const user = await UserModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .where({ deletedAt: null })
      .lean();

    if (!user) return null;
    return { ...user, _id: user._id.toString(), companyId: user.companyId.toString() } as IUser;
  }

  /**
   * Update password
   */
  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(newPassword);
    const result = await UserModel.findByIdAndUpdate(id, {
      $set: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
    return !!result;
  }

  /**
   * Update last login
   */
  async updateLastLogin(id: string, ipAddress: string): Promise<void> {
    await UserModel.findByIdAndUpdate(id, {
      $set: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        failedLoginAttempts: 0,
      },
    });
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedLoginAttempts(id: string): Promise<void> {
    const user = await UserModel.findById(id);
    if (!user) return;

    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const updates: UpdateQuery<IUserDocument> = {
      failedLoginAttempts: failedAttempts,
    };

    // Lock account after 5 failed attempts for 30 minutes
    if (failedAttempts >= 5) {
      updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    await UserModel.findByIdAndUpdate(id, { $set: updates });
  }

  /**
   * Check if user is locked
   */
  async isLocked(id: string): Promise<boolean> {
    const user = await UserModel.findById(id);
    if (!user || !user.lockedUntil) return false;
    return user.lockedUntil > new Date();
  }

  /**
   * Soft delete user
   */
  async delete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date(), isActive: false } },
      { new: true }
    );
    return !!result;
  }

  /**
   * Activate/Deactivate user
   */
  async setActive(id: string, isActive: boolean): Promise<boolean> {
    const result = await UserModel.findByIdAndUpdate(id, { $set: { isActive } });
    return !!result;
  }

  /**
   * List users with pagination
   */
  async list(
    companyId: string,
    page: number = 1,
    limit: number = 10,
    filters?: { role?: string; isActive?: boolean }
  ): Promise<{ users: IUser[]; total: number; page: number; totalPages: number }> {
    const query: FilterQuery<IUserDocument> = { companyId, deletedAt: null };

    if (filters?.role) {
      query.role = filters.role;
    }
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      UserModel.countDocuments(query),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        _id: u._id.toString(),
        companyId: u.companyId.toString(),
      })) as IUser[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Count users in a company
   */
  async countByCompanyId(companyId: string): Promise<number> {
    return UserModel.countDocuments({ companyId, deletedAt: null });
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
