import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  error: string;
  code: string;
  field?: string;
  details: ValidationErrorDetail[];
}

export interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Format Zod issues into a sanitized client-facing structure without leaking internal details.
 */
function formatZodError(error: ZodError): ValidationErrorResponse {
  const details: ValidationErrorDetail[] = error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));

  const primaryField = details[0]?.field;
  const primaryMessage = details[0]?.message || 'Invalid input data';

  return {
    error: primaryMessage,
    code: 'VALIDATION_ERROR',
    field: primaryField,
    details,
  };
}

/**
 * Middleware factory for validating untrusted request bodies using a Zod schema.
 */
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(formatZodError(result.error));
    }
    req.body = result.data;
    next();
  };
}

/**
 * Middleware factory for validating untrusted request query parameters using a Zod schema.
 */
export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json(formatZodError(result.error));
    }
    req.query = result.data as any;
    next();
  };
}

/**
 * Middleware factory for validating untrusted route parameters using a Zod schema.
 */
export function validateParams<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json(formatZodError(result.error));
    }
    req.params = result.data as any;
    next();
  };
}

/**
 * Middleware factory for validating multiple request targets (body, query, params) atomically.
 */
export function validateRequest(schemas: ValidationTargets): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        return res.status(400).json(formatZodError(result.error));
      }
      req.params = result.data as any;
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        return res.status(400).json(formatZodError(result.error));
      }
      req.query = result.data as any;
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(formatZodError(result.error));
      }
      req.body = result.data;
    }

    next();
  };
}
