import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import apiNotFound from "./app/middleware/apiNotFound.js";
import globalErrorHandler from "./app/middleware/globalErrorHandler.js";
import router from "./app/route/index.js";
import config from "./config/index.js";

const app: Application = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    credentials: true,
    origin: config.environment === "production" ? config.frontend_url : "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/api/v1", router);

app.use(apiNotFound);

app.use(globalErrorHandler);

export default app;
