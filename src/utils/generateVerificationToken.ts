import crypto from "crypto";

const generateVerificationToken = (): string => {
  // Generate a random 32-byte token and convert to hex
  return crypto.randomBytes(32).toString("hex");
};

export default generateVerificationToken;
