import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/user.model.js';
import ApiError from '../utils/api-error.js';

const buildToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

export const AuthService = {
  async login({ email, password, role }) {
    const user = await User.findOne({ email, role, status: 'active' }).select('+password');
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // user.lastLoginAt = new Date();
    // await user.save();

    const token = buildToken(user);
    return { token, user: { id: user._id, name: user.name, role: user.role } };
  }
};
