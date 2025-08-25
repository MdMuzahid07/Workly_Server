import { ZodError } from "zod";
interface FormattedZodErrorResponse {
  success: boolean;
  message: string;
  errorSources: {
    path: string;
    message: string;
    details?: {
      field: string;
      message: string;
      code: string;
    }[];
  };
}

const formatZodError = (error: ZodError, originalUrl: string): FormattedZodErrorResponse => {
  const message = "Validation Error";

  const errorInfo = error.issues.map((err) => ({
    field: err.path.join("."),
    message: err.message,
    code: err.code,
  }));

  return {
    success: false,
    message,
    errorSources: {
      path: originalUrl,
      message: "validation failed",
      details: errorInfo,
    },
  };
};

export default formatZodError;
