import express from "express";
import applicationRoute from "../modules/application/application.route.js";
import authRoute from "../modules/auth/auth.route.js";
import categoryRoute from "../modules/category/category.route.js";
import companyRoute from "../modules/company/company.route.js";
import educationRoute from "../modules/education/education.route.js";
import jobRoute from "../modules/job/job.route.js";
import profileRoute from "../modules/profile/profile.route.js";
import resumeRoute from "../modules/resume/resume.route.js";
import uploadRoute from "../modules/upload/upload.route.js";
import candidateRoute from "../modules/candidate/candidate.route.js";

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
    path: "/category",
    route: categoryRoute,
  },
  {
    path: "/job",
    route: jobRoute,
  },
  {
    path: "/application",
    route: applicationRoute,
  },
  {
    path: "/upload",
    route: uploadRoute,
  },
  {
    path: "/education",
    route: educationRoute,
  },
  {
    path: "/resume",
    route: resumeRoute,
  },
  {
    path: "/candidate",
    route: candidateRoute,
  },
];

routeConfigs.forEach((route) => router.use(route.path, route.route));

export default router;
