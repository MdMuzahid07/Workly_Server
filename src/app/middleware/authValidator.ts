import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";
import AppError from "../error/AppError.js";
const authValidator = (...requiredRoles: string[]) => {
  return async (
    req: Request,
    //@ts-ignore
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const token = req.headers.authorization;
      if (!token) {
        throw new AppError(httpStatus.BAD_REQUEST, "Token not found");
      }

      let verifiedUser = null;

      verifiedUser = jwt.verify(token, process.env.JWT_SECRET as Secret) as JwtPayload & {
        role: string;
      };

      if (!verifiedUser) {
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid token");
      }

      req.user = verifiedUser;

      if (requiredRoles.length && !requiredRoles.includes(verifiedUser.role)) {
        throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to access this route");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authValidator;
