import cors from "cors";
import express, { type Application, type NextFunction, type Request, type Response } from "express";
import globalErrorHandler from "./app/middleware/globalErrorHandler.js";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/", (_req: Request, res: Response) => {
  res.send("ph healthcare server 🚀🚀");
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
//@ts-ignore
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: "API not found!",
    error: {
      path: req.originalUrl,
      message: "you requested path not found",
    },
  });
});

app.use(globalErrorHandler);

export default app;
