import jwt from "jsonwebtoken";
import config from "../config/index.js";

const generateJsonWebToken = (payload: any, tokenType: "access" | "refresh") => {
  const token = jwt.sign(
    { ...payload },
    tokenType === "access" ? config.jwt_secret : config.jwt_refresh_secret,
    {
      expiresIn:
        tokenType === "access"
          ? (config.jwt_expires_in as any)
          : (config.jwt_refresh_expires_in as any),
      algorithm: config.jwt_algorithm as jwt.Algorithm,
    },
  );

  return token;
};

export default generateJsonWebToken;
