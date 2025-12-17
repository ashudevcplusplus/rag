import { Schema, model, Document } from "mongoose";
import { IContact } from "../schemas/contact.schema";

export interface IContactDocument extends Omit<IContact, "_id">, Document {}

const contactSchema = new Schema<IContactDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
    },
  },
  {
    timestamps: true,
    collection: "contacts",
  },
);

// Indexes
contactSchema.index({ status: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ createdAt: -1 });

export const ContactModel = model<IContactDocument>("Contact", contactSchema);
