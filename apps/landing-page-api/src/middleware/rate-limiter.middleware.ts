import rateLimit from "express-rate-limit";

// General rate limiter for all requests
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for contact form (prevent spam)
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 contact submissions per hour
  message: { error: "Too many contact submissions, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for newsletter subscription
export const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 subscription attempts per hour
  message: { error: "Too many subscription attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
