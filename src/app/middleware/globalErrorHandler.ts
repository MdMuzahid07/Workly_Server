import type { NextFunction, Request, Response } from "express";

interface IError extends Error {
  statusCode?: number;
  path?: string[];
  message: string;
}

const globalErrorHandler = (
  error: IError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //@ts-ignore
  next: NextFunction,
) => {
  const statusCode = error.statusCode || 500;
  const message = error.name || "Something went wrong!";

  res.status(statusCode).json({
    success: false,
    message,
    errorSources: {
      path: error.path || req.originalUrl,
      message: error.message,
    },
  });
};

export default globalErrorHandler;
