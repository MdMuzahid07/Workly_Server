declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    PORT: string;
    BCRYPT_SALT_ROUNDS: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;
    JWT_ALGORITHM: string;
    ENVIRONMENT: "development" | "production";
  }
}
