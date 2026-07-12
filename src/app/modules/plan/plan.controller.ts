import { Request, Response } from 'express';
import httpStatus from 'http-status';
import asyncHandler from '../../../utils/asyncHandler.js';
import sendApiResponse from '../../../utils/sendApiResponse.js';
import { AdminActor } from '../admin/admin.interface.js';
import planService from './plan.service.js';

const getPlansList = asyncHandler(async (req: Request, res: Response) => {
  const result = await planService.getPlans(req.query);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Plans fetched successfully',
    data: result,
  });
});

const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const result = await planService.createPlan(req.body);
  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Plan created successfully',
    data: result,
  });
});

const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await planService.updatePlan(id, req.body);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Plan updated successfully',
    data: result,
  });
});

const togglePlanStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await planService.togglePlanStatus(id);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Plan status toggled successfully',
    data: result,
  });
});

const deletePlan = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await planService.deletePlan(id, req.user as AdminActor);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Plan deleted successfully',
    data: null,
  });
});

export default {
  getPlansList,
  createPlan,
  updatePlan,
  togglePlanStatus,
  deletePlan,
};
