import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import categoryService from "./category.service.js";

const getCategories = asyncHandler(async (req, res) => {
  const query = req.query;
  const data = await categoryService.getCategories(query);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories fetched successfully",
    data,
  });
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params as { slug: string };
  const data = await categoryService.getCategoryBySlug(slug);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category fetched successfully",
    data,
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const payload = req.body;
  const data = await categoryService.createCategory(payload);

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Category created successfully",
    data,
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params as { categoryId: string };
  const payload = req.body;

  const data = await categoryService.updateCategory(categoryId, payload);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully",
    data,
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params as { categoryId: string };
  const data = await categoryService.deleteCategory(categoryId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category deleted successfully",
    data,
  });
});

const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const { categoryId } = req.params as { categoryId: string };
  const data = await categoryService.toggleCategoryStatus(categoryId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Category ${data.active ? "activated" : "deactivated"} successfully`,
    data,
  });
});

const categoryController = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
};

export default categoryController;
