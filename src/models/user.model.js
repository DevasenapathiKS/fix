import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../constants/index.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    mobile: { type: String, required: true, alias: 'phone' },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(USER_ROLES), required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    lastLoginAt: { type: Date }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
