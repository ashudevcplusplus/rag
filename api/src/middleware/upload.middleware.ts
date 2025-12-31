import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { logger } from '../utils/logger';

// Use environment variable or calculate from project root
// In Docker: /app/data/uploads
// In development: <project-root>/data/uploads
// Using __dirname ensures stable path resolution regardless of
// the current working directory when the process starts
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../../data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info('Upload directory created', { path: uploadDir });
}

// Maximum number of files allowed per upload
export const MAX_FILES_PER_UPLOAD = 30;

// Allowed document MIME types
const ALLOWED_MIME_TYPES = new Set([
  // PDF
  'application/pdf',
  // Plain text
  'text/plain',
  // Microsoft Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Rich Text Format
  'application/rtf',
  'text/rtf',
  // OpenDocument Text
  'application/vnd.oasis.opendocument.text',
  // Markdown
  'text/markdown',
  'text/x-markdown',
  // CSV
  'text/csv',
  // XML
  'application/xml',
  'text/xml',
  // JSON
  'application/json',
  // HTML
  'text/html',
  // Email (text-based formats only)
  'message/rfc822',
  // Note: application/vnd.ms-outlook (.msg) is a binary OLE format and cannot be extracted as text
  // Code
  'text/javascript',
  'application/javascript',
  'text/typescript',
  'text/x-python',
  'text/x-java-source',
  'text/x-c',
  'text/x-go',
]);

// Allowed file extensions (as fallback when MIME type detection fails)
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.txt',
  '.doc',
  '.docx',
  '.rtf',
  '.odt',
  '.md',
  '.markdown',
  '.csv',
  '.xml',
  '.json',
  '.html',
  '.htm',
  '.eml',
  // Note: .msg (Outlook) is a binary OLE format and cannot be extracted as text
  '.js',
  '.ts',
  '.py',
  '.java',
  '.c',
  '.go',
]);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  },
});

// File filter to only allow document types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fileFilter = (_req: Request, file: any, cb: multer.FileFilterCallback): void => {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  // Check if MIME type or extension is allowed
  if (ALLOWED_MIME_TYPES.has(mimeType) || ALLOWED_EXTENSIONS.has(extension)) {
    cb(null, true);
  } else {
    logger.warn('File upload rejected: unsupported file type', {
      filename: file.originalname,
      mimetype: mimeType,
      extension,
    });
    cb(
      new Error(
        `Unsupported file type: ${extension || mimeType}. Only document files (PDF, TXT, DOCX, DOC, RTF, ODT, MD, CSV, XML, JSON, HTML) are allowed.`
      )
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
});
