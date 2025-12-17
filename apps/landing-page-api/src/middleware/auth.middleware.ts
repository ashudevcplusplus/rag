import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { CONFIG } from "../config";

/**
 * Simple admin authentication middleware
 * Uses API key from environment variable or header
 */
export const authenticateAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Get API key from header or environment
  const apiKey = req.headers["x-api-key"] as string;
  const adminApiKey = CONFIG.ADMIN_API_KEY || process.env.ADMIN_API_KEY;

  // If no admin API key is configured, allow in development only
  if (!adminApiKey) {
    if (CONFIG.NODE_ENV === "production") {
      logger.error("Admin API key not configured in production");
      res.status(500).json({ error: "Admin authentication not configured" });
      return;
    }
    // Development mode: allow without auth (not recommended for production)
    logger.warn(
      "Admin route accessed without authentication (development mode)",
    );
    next();
    return;
  }

  // Check if API key is provided
  if (!apiKey) {
    logger.warn("Admin authentication failed: Missing API key", {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({ error: "API key required" });
    return;
  }

  // Validate API key
  if (apiKey !== adminApiKey) {
    logger.warn("Admin authentication failed: Invalid API key", {
      path: req.path,
      ip: req.ip,
      apiKeyPrefix: apiKey.substring(0, 8) + "...",
    });
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  logger.debug("Admin request authenticated", {
    path: req.path,
    ip: req.ip,
  });

  next();
};
