import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";
import config from "../../config/index.js";
import AppError from "../error/AppError.js";
const authValidator = (...requiredRoles: string[]) => {
  return async (
    req: Request,
    //@ts-ignore
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError(httpStatus.BAD_REQUEST, "Token not found");
      }

      const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

      if (!token) {
        throw new AppError(httpStatus.BAD_REQUEST, "Token not found");
      }

      const verifiedUser = jwt.verify(
        token,
        config.jwt_secret as Secret,
      ) as unknown as JwtPayload & {
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
