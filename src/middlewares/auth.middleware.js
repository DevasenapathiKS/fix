import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/api-error.js';
import { USER_ROLES } from '../constants/index.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication token missing'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    return next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};

export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new ApiError(403, 'Forbidden'));
  }
  return next();
};

export const allowAdminOnly = authorize(USER_ROLES.ADMIN);
export const allowTechnicianOnly = authorize(USER_ROLES.TECHNICIAN);
export const allowCustomerOnly = authorize(USER_ROLES.CUSTOMER);
