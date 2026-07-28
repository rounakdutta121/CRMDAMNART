export interface AppErrorShape {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export class AppError extends Error implements AppErrorShape {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function toAppErrorShape(error: unknown): AppErrorShape {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
    statusCode: 500,
  };
}
