import express from "express";
import companyController from "./company.controller.js";

const router = express.Router();

router.post(
  "/new-company",
  //  requestValidator(),
  companyController.createCompany,
);

const companyRoute = router;
export default companyRoute;
