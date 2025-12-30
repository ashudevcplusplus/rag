import { Request, Response } from "express";
import { asyncHandler } from "../middleware/error.middleware";
import { newsletterRepository } from "../repositories/newsletter.repository";
import { subscribeNewsletterSchema } from "../schemas/newsletter.schema";
import { logger } from "../utils/logger";

/**
 * Subscribe to newsletter
 * POST /api/newsletter/subscribe
 */
export const subscribe = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = subscribeNewsletterSchema.parse(req.body);

    logger.info("Newsletter subscription request", { email: data.email });

    const { subscriber, isNew } = await newsletterRepository.subscribe(data);

    if (isNew) {
      logger.info("New newsletter subscriber", { email: data.email });
      res.status(201).json({
        message: "Successfully subscribed to our newsletter!",
        email: subscriber.email,
      });
    } else {
      logger.info("Existing subscriber reconfirmed", { email: data.email });
      res.status(200).json({
        message: "You are already subscribed to our newsletter.",
        email: subscriber.email,
      });
    }
  },
);

/**
 * Unsubscribe from newsletter
 * POST /api/newsletter/unsubscribe
 */
export const unsubscribe = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = subscribeNewsletterSchema.parse(req.body);

    logger.info("Newsletter unsubscribe request", { email: data.email });

    const success = await newsletterRepository.unsubscribe(data.email);

    if (success) {
      logger.info("Newsletter unsubscribed", { email: data.email });
      res.json({
        message: "You have been unsubscribed from our newsletter.",
      });
    } else {
      res.status(404).json({
        error: "Email not found in our newsletter list.",
      });
    }
  },
);

/**
 * List subscribers (admin endpoint)
 * GET /api/admin/newsletter
 */
export const listSubscribers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Parse and validate pagination parameters
    const pageParam = parseInt(req.query.page as string);
    const limitParam = parseInt(req.query.limit as string);

    // Ensure positive values, default to 1 and 50 if invalid or negative
    const page = pageParam > 0 ? pageParam : 1;
    const limit = limitParam > 0 ? limitParam : 50;

    const isSubscribed =
      req.query.active !== undefined ? req.query.active === "true" : undefined;

    const filters = isSubscribed !== undefined ? { isSubscribed } : undefined;
    const result = await newsletterRepository.list(page, limit, filters);

    res.json(result);
  },
);

/**
 * Get newsletter stats (admin endpoint)
 * GET /api/admin/newsletter/stats
 */
export const getNewsletterStats = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const stats = await newsletterRepository.getStats();
    res.json(stats);
  },
);
