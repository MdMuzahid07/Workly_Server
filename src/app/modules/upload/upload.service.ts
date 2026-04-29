import type { Request } from "express";
import { Readable } from "stream";
import cloudinary from "../../../config/cloudinary.config.js";

/**
 * Uploads a Buffer to Cloudinary using the Upload API (upload_stream).
 * @param buffer The Buffer to upload.
 * @param options An object with a single property, `folder`, which specifies
 * the Cloudinary folder to upload the file to.
 * @returns A Promise that resolves to an object containing the secure_url property.
 */
const uploadBufferToCloudinary = (buffer: Buffer, options: { folder: string }) =>
  new Promise<{ secure_url: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error);
          return;
        }
        resolve(result as unknown as { secure_url: string });
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });

const CLOUDINARY_FOLDER = "workly-job/uploads";

const handleSingleUpload = async (req: Request) => {
  const file = req.file as Express.Multer.File | (undefined & { path?: string });
  if (!file) return { url: undefined };
  // =====  If using multer-storage-cloudinary, file.path is already the CDN URL =====>
  // =====  Otherwise, fallback to buffer upload =============>
  if ((file as any).path) {
    return { url: (file as any).path as string };
  }
  const { secure_url } = await uploadBufferToCloudinary(file.buffer, {
    folder: CLOUDINARY_FOLDER,
  });
  return { url: secure_url };
};

const handleMultipleUpload = async (req: Request) => {
  const files =
    (Array.isArray(req.files) ? (req.files as (Express.Multer.File & { path?: string })[]) : []) ||
    [];
  const maybeUrls = files.map((f) => f.path).filter(Boolean) as string[];
  if (maybeUrls.length === files.length && files.length > 0) {
    return { urls: maybeUrls };
  }
  const results = await Promise.all(
    files.map((f) => uploadBufferToCloudinary(f.buffer, { folder: CLOUDINARY_FOLDER })),
  );
  return { urls: results.map((r) => r.secure_url) };
};

const uploadService = {
  handleSingleUpload,
  handleMultipleUpload,
  uploadBufferToCloudinary,
};

export { uploadBufferToCloudinary };
export default uploadService;
