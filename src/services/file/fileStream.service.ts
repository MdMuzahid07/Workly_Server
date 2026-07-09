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

const getMimeType = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "txt":
      return "text/plain";
    case "html":
      return "text/html";
    case "json":
      return "application/json";
    case "zip":
      return "application/zip";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
};

/**
 * Stream any file type to the client with appropriate Content-Type and inline headers.
 */
export const streamFileToClient = async ({
  res,
  fileUrl,
  filename = "file",
}: StreamPdfOptions): Promise<void> => {
  let fileBuffer: Buffer;

  try {
    fileBuffer = await downloadStoredFile(fileUrl);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(httpStatus.BAD_GATEWAY, "Could not retrieve file from storage");
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const mimeType = getMimeType(safeName);

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader("Content-Length", fileBuffer.length);
  res.send(fileBuffer);
};
