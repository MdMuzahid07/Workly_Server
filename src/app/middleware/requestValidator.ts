import type { NextFunction, Request, Response } from "express";
import type { ZodObject, ZodRawShape } from "zod";

const requestValidator = (schema: ZodObject<ZodRawShape>) => {
  return async (
    req: Request,
    //@ts-ignore
    res: Response,
    next: NextFunction,
  ) => {
    try {
      await schema.parseAsync(req.body);

      return next();
    } catch (error) {
      next(error);
    }
  };
};

export default requestValidator;
