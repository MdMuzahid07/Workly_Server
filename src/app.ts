import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import apiNotFound from "./app/middleware/apiNotFound.js";
import globalErrorHandler from "./app/middleware/globalErrorHandler.js";
import router from "./app/route/index.js";
import config from "./config/index.js";
import passport from "./config/passport.config.js";

const app: Application = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
// Production-Grade CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      // Check if origin is in the allowed whitelist
      if (config.allowed_origins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      // Development: same machine, any port (localhost vs 127.0.0.1 mismatch breaks CORS otherwise)
      if (
        config.environment !== "production" &&
        (/^https?:\/\/localhost(?::\d+)?$/i.test(origin) ||
          /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin))
      ) {
        return callback(null, true);
      }

      // Development-specific: Allow local network access (192.168.x.x)
      if (config.environment !== "production" && origin.startsWith("http://192.168.")) {
        return callback(null, true);
      }

      // Production-specific matching (optional, e.g. subdomains)
      if (config.environment === "production" && config.frontend_url === origin) {
        return callback(null, true);
      }

      // Reject all other origins
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400, // Cache preflight response for 24 hours
  }),
);

app.use("/api/v1", router);

app.use(apiNotFound);

app.use(globalErrorHandler);

export default app;
