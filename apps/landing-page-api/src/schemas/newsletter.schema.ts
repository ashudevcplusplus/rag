import { z } from "zod";

// TypeScript Interface
export interface INewsletter {
  _id: string;
  email: string;
  isSubscribed: boolean;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Zod Validation Schema for subscribing
export const subscribeNewsletterSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export type SubscribeNewsletterDTO = z.infer<typeof subscribeNewsletterSchema>;
