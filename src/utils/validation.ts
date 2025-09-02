import { z } from 'zod';

// Shared Zod schemas and an express-style middleware generator

export type ZodSchema<T> = z.ZodType<T>;

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      // Strict parsing - will throw on invalid/missing required fields
      const parsed = schema.parse(req.body);
      req.validatedBody = parsed;
      
      // Remove req.body to prevent fallback usage
      delete req.body;
      
      return next();
    } catch (err: any) {
      // Enhanced error response with specific validation issues
      const validationErrors = err?.errors?.map((error: any) => ({
        field: error.path?.join('.') || 'unknown',
        message: error.message,
        received: error.received
      })) || [];
      
      return res.status(400).json({ 
        error: 'Request validation failed', 
        message: 'One or more required fields are missing or invalid',
        validationErrors
      });
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const parsed = schema.parse(req.query);
      req.validatedQuery = parsed;
      return next();
    } catch (err: any) {
      return res.status(400).json({ error: 'Invalid query parameters', details: err?.errors || undefined });
    }
  };
}

export const schemas = {
  awardPoints: z.object({
    customerId: z.string().min(1),
    programId: z.string().min(1),
    points: z.number().int().positive(),
    description: z.string().max(500).optional(),
    source: z.string().max(50).optional(),
  }),
  feedback: z.object({
    userId: z.union([z.string().min(1), z.number()]).optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
    category: z.string().max(100).optional(),
    page: z.string().max(200).optional(),
    timestamp: z.string().datetime().optional(),
  }).strict(), // Reject unknown properties
  errorReport: z.object({
    userId: z.union([z.string().min(1), z.number()]).optional(),
    error: z.string().min(1).max(4000), // Require non-empty error message
    context: z.record(z.any()).optional(), // More specific than z.any()
    page: z.string().max(200).optional(),
    timestamp: z.string().datetime().optional(),
  }).strict(),
  scanLog: z.object({
    timestamp: z.string().datetime().optional(),
    type: z.string().min(1).max(50), // Require non-empty type
    business_id: z.union([z.string().min(1), z.number().positive()]),
    customer_id: z.union([z.string().min(1), z.number().positive()]),
    card_number: z.string().max(100).optional(),
    points_awarded: z.union([z.number().int().positive(), z.null()]).optional(),
    status: z.string().min(1).max(50), // Require non-empty status
    scan_duration_ms: z.union([z.number().int().nonnegative(), z.null()]).optional(),
    program_id: z.union([z.string().min(1), z.number().positive(), z.null()]).optional(),
    device_info: z.string().max(1000).optional(),
    error: z.string().max(2000).optional(),
  }).strict(),
  feedbackResponse: z.object({
    response: z.string().min(1).max(2000), // Required response text
  }).strict(),
  businessFeedbackQuery: z.object({
    period: z.enum(['week', 'month', 'year']).default('month'),
  }).strict(),
};


