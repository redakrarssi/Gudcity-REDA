import { z } from 'zod';

// Shared Zod schemas and an express-style middleware generator

export type ZodSchema<T> = z.ZodType<T>;

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const parsed = schema.parse(req.body);
      req.validatedBody = parsed;
      return next();
    } catch (err: any) {
      return res.status(400).json({ error: 'Invalid request body', details: err?.errors || undefined });
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
  }),
  feedbackResponse: z.object({
    response: z.string().min(1).max(2000),
  }),
  errorReport: z.object({
    userId: z.union([z.string().min(1), z.number()]).optional(),
    error: z.string().max(4000),
    context: z.any().optional(),
    page: z.string().max(200).optional(),
    timestamp: z.string().datetime().optional(),
  }),
  scanLog: z.object({
    timestamp: z.string().datetime().optional(),
    type: z.string().max(50),
    business_id: z.union([z.string().min(1), z.number()]),
    customer_id: z.union([z.string().min(1), z.number()]),
    card_number: z.string().max(100).optional(),
    points_awarded: z.union([z.number().int().positive(), z.null()]).optional(),
    status: z.string().max(50).optional(),
    scan_duration_ms: z.union([z.number().int().nonnegative(), z.null()]).optional(),
    program_id: z.union([z.string().min(1), z.number(), z.null()]).optional(),
    device_info: z.string().max(1000).optional(),
    error: z.string().max(2000).optional(),
  }),
};


