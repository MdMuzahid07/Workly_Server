import multer from "multer";

// ===========  Configure Multer memory storage (Cloudinary handled in service) =======>
const storage = multer.memoryStorage();

// ============ Basic file filter: allow images and PDFs ================>
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const isImage = file.mimetype.startsWith("image/");
  const isPdf = file.mimetype === "application/pdf";
  const isVideo = file.mimetype.startsWith("video/");
  if (isImage || isPdf || isVideo) {
    cb(null, true);
  } else {
    cb(new Error("Only image, video, and PDF files are allowed"));
  }
};

// ===========  50 MB size limit for videos =================>
const limits: multer.Options["limits"] = {
  fileSize: 50 * 1024 * 1024,
};

const upload = multer({ storage, fileFilter, limits });

export default upload;
export { fileFilter, limits, storage, upload };
