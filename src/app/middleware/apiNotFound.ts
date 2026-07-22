import type { NextFunction, Request, Response } from 'express';
const apiNotFound = (req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: 'API not found!',
    error: {
      path: req.originalUrl,
      method: req.method,
      message: 'Your requested endpoint does not exists on this server',
    },
  });
};

export default apiNotFound;
