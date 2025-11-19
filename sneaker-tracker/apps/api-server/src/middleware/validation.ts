import { Request, Response, NextFunction } from 'express';
import { APIError } from './error';
import Joi from 'joi';

export const validateRequest = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      throw new APIError(400, 'Validation error', {
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};

// Common validation schemas
export const schemas = {
  batchPrediction: Joi.object({
    releaseIds: Joi.array().items(Joi.string()).min(1).required()
  })
};