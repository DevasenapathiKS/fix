import { validationResult } from 'express-validator';
import ApiError from '../utils/api-error.js';

export const validate = (validations) => {
  return async (req, res, next) => {
    for (const validation of validations) {
      // eslint-disable-next-line no-await-in-loop
      await validation.run(req);
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return next(new ApiError(422, 'Validation failed', errors.array()));
  };
};
