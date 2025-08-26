import express from "express";
import profileController from "./profile.controller.js";

const router = express.Router();

router.post(
  "/create-profile",
  //   requestValidator(profileValidation.createProfile),
  profileController.createProfile,
);

const profileRoute = router;

export default profileRoute;
