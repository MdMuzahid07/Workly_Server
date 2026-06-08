import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import { followService } from "./follow.service.js";

const followCompany = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { companyId } = req.params;

  const result = await followService.followCompany(userId, companyId as string);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company followed successfully",
    data: result,
  });
});

const unfollowCompany = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { companyId } = req.params;

  const result = await followService.unfollowCompany(userId, companyId as string);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company unfollowed successfully",
    data: result,
  });
});

const getFollowedCompanies = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;

  const { data, meta } = await followService.getFollowedCompanies(userId, req.query);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Followed companies fetched successfully",
    data,
    meta,
  });
});

const isFollowing = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user?.userId;
  const { companyId } = req.params;

  if (!userId) {
    return sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Check follow status",
      data: false,
    });
  }

  const result = await followService.isFollowing(userId, companyId as string);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Follow status fetched successfully",
    data: result,
  });
});

export const followController = {
  followCompany,
  unfollowCompany,
  getFollowedCompanies,
  isFollowing,
};
