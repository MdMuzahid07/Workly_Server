import express from "express";
import applicationRoute from "../modules/application/application.route.js";
import authRoute from "../modules/auth/auth.route.js";
import companyRoute from "../modules/company/company.route.js";
import jobRoute from "../modules/job/job.route.js";
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
  {
    path: "/company",
    route: companyRoute,
  },
  {
    path: "/job",
    route: jobRoute,
  },
  {
    path: "/application",
    route: applicationRoute,
  },
];

routeConfigs.forEach((route) => router.use(route.path, route.route));

export default router;
