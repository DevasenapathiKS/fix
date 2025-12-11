import asyncHandler from '../utils/async-handler.js';
import { AuthService } from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  const result = await AuthService.login({ email, password, role });
  return successResponse(res, { data: result, message: 'Login successful' });
});
