import type { Request } from "express";
import { Readable } from "stream";
import cloudinary from "../../../config/cloudinary.config.js";

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

const uploadService = {
  handleSingleUpload: async (req: Request) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return { url: undefined };
    const { secure_url } = await uploadBufferToCloudinary(file.buffer, {
      folder: CLOUDINARY_FOLDER,
    });
    return { url: secure_url };
  },
  handleMultipleUpload: async (req: Request) => {
    const files = (Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : []) || [];
    const results = await Promise.all(
      files.map((f) => uploadBufferToCloudinary(f.buffer, { folder: CLOUDINARY_FOLDER })),
    );
    const urls = results.map((r) => r.secure_url);
    return { urls };
  },
};

export default uploadService;
