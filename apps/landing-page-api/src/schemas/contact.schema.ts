import { z } from "zod";

// TypeScript Interface
export interface IContact {
  _id: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  status: "new" | "read" | "replied";
  createdAt: Date;
  updatedAt: Date;
}

// Zod Validation Schema for creating a contact
export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  company: z.string().max(100).trim().optional(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000)
    .trim(),
});

// Zod Schema for updating contact status
export const updateContactSchema = z.object({
  status: z.enum(["new", "read", "replied"]),
});

export type CreateContactDTO = z.infer<typeof createContactSchema>;
export type UpdateContactDTO = z.infer<typeof updateContactSchema>;
