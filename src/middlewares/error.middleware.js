import ApiError from '../utils/api-error.js';

// eslint-disable-next-line no-unused-vars
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || []
    });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
};
