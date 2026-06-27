import { Router } from "express";
import authValidator from "../../app/middleware/authValidator.js";
import {
  getSettingsHandler,
  toggleMaintenanceModeHandler,
} from "../../controllers/admin/settings.controller.js";

const router = Router();

router.use(authValidator("ADMIN", "SUPER_ADMIN"));

router.get("/", getSettingsHandler);
router.patch("/maintenance", toggleMaintenanceModeHandler);

export default router;
