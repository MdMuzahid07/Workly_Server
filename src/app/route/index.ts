import express from "express";
import authRoute from "../modules/auth/auth.route.js";
import profileRoute from "../modules/profile/profile.route.js";

const router = express.Router();

const routeConfigs = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/profile",
    route: profileRoute,
  },
];

routeConfigs.forEach((route) => router.use(route.path, route.route));

export default router;
