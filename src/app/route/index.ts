import express from "express";
import authRoute from "../modules/auth/auth.route.js";

const router = express.Router();

const routeConfigs = [
  {
    path: "/auth",
    route: authRoute,
  },
];

routeConfigs.forEach((route) => router.use(route.path, route.route));

export default router;
