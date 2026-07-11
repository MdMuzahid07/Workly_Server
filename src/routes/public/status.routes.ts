import { Router } from 'express';
import {
  publicStatusHandler,
  publicHealthHandler,
} from '../../controllers/public/status.controller.js';

const router = Router();

// No auth middleware — this endpoint is intentionally public
router.get('/', publicStatusHandler);
router.get('/health', publicHealthHandler);

export default router;
