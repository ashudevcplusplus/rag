import { Router } from "express";
import { submitContact } from "../controllers/contact.controller";
import { contactLimiter } from "../middleware/rate-limiter.middleware";

const router = Router();

// Public endpoint - submit contact form
router.post("/", contactLimiter, submitContact);

export default router;
