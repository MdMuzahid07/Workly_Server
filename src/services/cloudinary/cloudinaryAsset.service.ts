import cloudinary from "../../config/cloudinary.config.js";
import AppError from "../../app/error/AppError.js";
import httpStatus from "http-status";

export type ParsedCloudinaryUrl = {
  resourceType: string;
  publicIdWithExtension: string;
  publicIdBase: string;
  format: string | null;
};

export const isCloudinaryUrl = (url: string) => url.includes("res.cloudinary.com");

/**
 * Parse a Cloudinary delivery URL into lookup keys for the Admin API.
 * Example:
 *   .../image/upload/v1777476061/workly-job/resumes/file.pdf
 *   → resourceType image, publicIdBase workly-job/resumes/file
 */
export const parseCloudinaryDeliveryUrl = (url: string): ParsedCloudinaryUrl | null => {
  const match = url.match(/\/(image|raw|video)\/upload\/(?:s--[^/]+--)?(?:v\d+\/)?(.+)$/i);
  if (!match?.[1] || !match[2]) return null;

  const resourceType = match[1].toLowerCase();
  const publicIdWithExtension = match[2].split("?")[0] ?? "";
  if (!publicIdWithExtension) return null;
  const extensionMatch = publicIdWithExtension.match(/\.([a-z0-9]+)$/i);
  const format = extensionMatch?.[1]?.toLowerCase() ?? null;
  const publicIdBase = format
    ? publicIdWithExtension.replace(new RegExp(`\\.${format}$`, "i"), "")
    : publicIdWithExtension;

  return { resourceType, publicIdWithExtension, publicIdBase, format };
};

const uniqueAttempts = (parsed: ParsedCloudinaryUrl) => {
  const resourceTypes = [parsed.resourceType, "image", "raw", "video"];
  const publicIds = [parsed.publicIdBase, parsed.publicIdWithExtension];

  const seen = new Set<string>();
  const attempts: Array<{ publicId: string; resourceType: string }> = [];

  for (const publicId of publicIds) {
    for (const resourceType of resourceTypes) {
      const key = `${resourceType}:${publicId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      attempts.push({ publicId, resourceType });
    }
  }

  return attempts;
};

type CloudinaryResource = {
  public_id: string;
  format?: string;
  resource_type: string;
  type?: string;
};

const resolveCloudinaryResource = async (
  parsed: ParsedCloudinaryUrl,
): Promise<CloudinaryResource> => {
  let lastError: unknown;

  for (const attempt of uniqueAttempts(parsed)) {
    try {
      return (await cloudinary.api.resource(attempt.publicId, {
        resource_type: attempt.resourceType as "image" | "raw" | "video",
        type: "upload",
      })) as CloudinaryResource;
    } catch (error) {
      lastError = error;
    }
  }

  throw new AppError(
    httpStatus.BAD_GATEWAY,
    `Resume not found in Cloudinary: ${lastError instanceof Error ? lastError.message : "unknown error"}`,
  );
};

const downloadViaAuthenticatedUrl = async (resource: CloudinaryResource): Promise<Buffer> => {
  const format = resource.format || "pdf";
  const downloadUrl = cloudinary.utils.private_download_url(resource.public_id, format, {
    resource_type: resource.resource_type,
    type: resource.type ?? "upload",
  });

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `Cloudinary download failed with status ${response.status}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 4 || buffer.subarray(0, 4).toString() !== "%PDF") {
    throw new AppError(httpStatus.BAD_GATEWAY, "Downloaded file is not a valid PDF");
  }

  return buffer;
};

const downloadExternalUrl = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new AppError(httpStatus.BAD_GATEWAY, `Failed to download file (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
};

/**
 * Download a file that was stored as a Cloudinary secure URL (or any HTTPS URL).
 * Uses the Admin API + authenticated download URL — works for private/restricted assets.
 */
export const downloadStoredFile = async (storedUrl: string): Promise<Buffer> => {
  if (!storedUrl?.trim()) {
    throw new AppError(httpStatus.NOT_FOUND, "File URL is missing");
  }

  if (!isCloudinaryUrl(storedUrl)) {
    return downloadExternalUrl(storedUrl);
  }

  const parsed = parseCloudinaryDeliveryUrl(storedUrl);
  if (!parsed) {
    throw new AppError(httpStatus.BAD_GATEWAY, "Invalid Cloudinary file URL");
  }

  const resource = await resolveCloudinaryResource(parsed);
  return downloadViaAuthenticatedUrl(resource);
};
