import express from "express";
import statisticsController from "./statistics.controller.js";

const router = express.Router();

router.get("/", statisticsController.getLandingPageStats);

export default router;
