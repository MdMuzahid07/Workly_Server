import cors from "cors";
import express, { type Application } from "express";
import apiNotFound from "./app/middleware/apiNotFound.js";
import globalErrorHandler from "./app/middleware/globalErrorHandler.js";
import router from "./app/route/index.js";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/api/v1", router);

app.use(apiNotFound);

app.use(globalErrorHandler);

export default app;
