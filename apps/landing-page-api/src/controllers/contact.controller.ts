import { Request, Response } from "express";
import { asyncHandler } from "../middleware/error.middleware";
import { contactRepository } from "../repositories/contact.repository";
import {
  createContactSchema,
  updateContactSchema,
} from "../schemas/contact.schema";
import { logger } from "../utils/logger";

/**
 * Submit a contact form
 * POST /api/contact
 */
export const submitContact = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = createContactSchema.parse(req.body);

    logger.info("Contact form submission received", {
      email: data.email,
      hasCompany: !!data.company,
    });

    const contact = await contactRepository.create(data);

    logger.info("Contact form saved successfully", { contactId: contact._id });

    res.status(201).json({
      message: "Thank you for your message! We will get back to you shortly.",
      id: contact._id,
    });
  },
);

/**
 * List all contacts (admin endpoint)
 * GET /api/admin/contacts
 */
export const listContacts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;

    const filters = status ? { status } : undefined;
    const result = await contactRepository.list(page, limit, filters);

    res.json(result);
  },
);

/**
 * Get contact stats (admin endpoint)
 * GET /api/admin/contacts/stats
 */
export const getContactStats = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const stats = await contactRepository.getStats();
    res.json(stats);
  },
);

/**
 * Update contact status (admin endpoint)
 * PATCH /api/admin/contacts/:id
 */
export const updateContactStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = updateContactSchema.parse(req.body);

    const contact = await contactRepository.update(id, data);

    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    logger.info("Contact status updated", {
      contactId: id,
      status: data.status,
    });
    res.json(contact);
  },
);
