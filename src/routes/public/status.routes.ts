import { Router } from "express";
import { publicStatusHandler } from "../../controllers/public/status.controller.js";

const router = Router();

// No auth middleware — this endpoint is intentionally public
router.get("/", publicStatusHandler);

export default router;
