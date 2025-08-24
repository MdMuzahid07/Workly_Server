class AppError extends Error {
  public statusCode: number;

  /**
   * @param {number} statusCode - The HTTP status code of the error.
   * @param {string} message - The error message.
   * @param {string} [stack] - The error stack. If not provided, it will be
   *   automatically generated using {@link Error.captureStackTrace}.
   */
  constructor(statusCode: number, message: string, stack?: "") {
    super(message);
    this.statusCode = statusCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
