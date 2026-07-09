import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { env } from "./index.js";

// P0.5 — use validated env object; values may be undefined (optional fields)
// Upload routes should guard against missing credentials at the service layer.
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Avatar — small, aggressively optimized, face-centered square crop
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "workly/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [
      {
        width: 500,
        height: 500,
        crop: "fill",
        gravity: "face",
        quality: "auto:good",
        fetch_format: "auto",
      },
    ],
  } as any,
});

// Company logo — moderate size, PRESERVE transparency, never force-crop
const logoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "workly/logos",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [
      { width: 800, height: 800, crop: "limit", quality: "auto:good", fetch_format: "auto" },
    ],
  } as any,
});

// Cover image — large hero banner, prioritize visual quality over aggressive compression
const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "workly/covers",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 1920, crop: "limit", quality: "auto:best", fetch_format: "auto" }],
  } as any,
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // sanity ceiling on the RAW upload, not the final stored size
});

export const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const cloudinaryUpload = cloudinary;
export default cloudinaryUpload;
