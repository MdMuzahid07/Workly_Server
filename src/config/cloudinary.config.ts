import { v2 as cloudinary } from "cloudinary";
import { env } from "./index.js";

// P0.5 — use validated env object; values may be undefined (optional fields)
// Upload routes should guard against missing credentials at the service layer.
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const cloudinaryUpload = cloudinary;
export default cloudinaryUpload;
