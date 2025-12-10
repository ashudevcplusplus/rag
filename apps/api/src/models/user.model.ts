import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from '../schemas/user.schema';
import { UserRole } from '../types/enums';

export interface IUserDocument extends Omit<IUser, '_id' | 'companyId' | 'fullName'>, Document {
  companyId: Types.ObjectId;
  fullName: string;
}

const userSchema = new Schema<IUserDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    // Authentication
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
    },

    // Profile
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    avatarUrl: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },

    // Access Control
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.MEMBER,
    },
    permissions: {
      type: Schema.Types.Mixed,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Session & Security
    lastLoginAt: {
      type: Date,
    },
    lastLoginIp: {
      type: String,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },

    // Soft delete
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'users',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for fullName
userSchema.virtual('fullName').get(function (this: IUserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes
userSchema.index({ companyId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ companyId: 1, role: 1 });

export const UserModel = model<IUserDocument>('User', userSchema);
