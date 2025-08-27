import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import profileService from "./profile.service.js";

const createProfile = asyncHandler(async (req, res) => {
  const result = await profileService.createProfile(req.body);

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,

    message: "Profile created successfully",
    data: result,
  });
});

const myProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const result = await profileService.myProfile(userId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My profile fetched successfully",
    data: result,
  });
});

const profileController = {
  createProfile,
  myProfile,
};
export default profileController;
