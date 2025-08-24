import type { Response } from "express";
const sendApiResponse = (
  res: Response,
  {
    message,
    statusCode,
    success,
    data,
    meta,
  }: {
    message: string;
    statusCode: number;
    success: boolean;
    data?: unknown;
    meta?: unknown;
  },
) => {
  res.status(statusCode).json({
    success,
    message,
    meta,
    data,
  });
};

export default sendApiResponse;
