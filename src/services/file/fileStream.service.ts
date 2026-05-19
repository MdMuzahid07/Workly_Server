import type { Response } from "express";
import httpStatus from "http-status";
import AppError from "../../app/error/AppError.js";
import { downloadStoredFile } from "../cloudinary/cloudinaryAsset.service.js";

type StreamPdfOptions = {
  res: Response;
  fileUrl: string;
  filename?: string;
};

/**
 * Stream a PDF to the client with standard headers for inline viewing.
 */
export const streamPdfToClient = async ({
  res,
  fileUrl,
  filename = "document.pdf",
}: StreamPdfOptions): Promise<void> => {
  let pdfBuffer: Buffer;

  try {
    pdfBuffer = await downloadStoredFile(fileUrl);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(httpStatus.BAD_GATEWAY, "Could not retrieve file from storage");
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader("Content-Length", pdfBuffer.length);
  res.send(pdfBuffer);
};
