import multer from "multer";
// Note: We intentionally avoid multer-storage-cloudinary when using Multer v2.

// ===========  Configure Multer memory storage (Cloudinary handled in service) =======>
const storage = multer.memoryStorage();

// ============ Basic file filter: allow images and PDFs ================>
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const isImage = file.mimetype.startsWith("image/");
  const isPdf = file.mimetype === "application/pdf";
  if (isImage || isPdf) {
    cb(null, true);
  } else {
    cb(new Error("Only image and PDF files are allowed"));
  }
};

// ===========  10 MB size limit by default =================>
const limits: multer.Options["limits"] = {
  fileSize: 10 * 1024 * 1024,
};

const upload = multer({ storage, fileFilter, limits });

export default upload;
export { fileFilter, limits, storage, upload };
