import express from "express";
import upload from "../../../config/multer.config.js";
import uploadController from "./upload.controller.js";

const router = express.Router();

router.post("/single", upload.single("file"), uploadController.single);

router.post("/multiple", upload.array("files", 10), uploadController.multiple);

export default router;
