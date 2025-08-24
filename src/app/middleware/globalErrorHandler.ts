import type { NextFunction, Request, Response } from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {};

export default globalErrorHandler;
