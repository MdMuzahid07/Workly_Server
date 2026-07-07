import express from "express";
import upload from "../../../config/multer.config.js";
import { uploadAvatar, uploadLogo, uploadCover } from "../../../config/cloudinary.config.js";
import uploadController from "./upload.controller.js";

const router = express.Router();

router.post("/single", upload.single("file"), uploadController.single);

router.post("/multiple", upload.array("files", 10), uploadController.multiple);

router.post("/avatar", uploadAvatar.single("file"), uploadController.single);
router.post("/logo", uploadLogo.single("file"), uploadController.single);
router.post("/cover", uploadCover.single("file"), uploadController.single);

export default router;
