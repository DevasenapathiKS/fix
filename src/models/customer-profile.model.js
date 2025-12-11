import mongoose from 'mongoose';

const customerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    displayName: { type: String },
    email: { type: String },
    phone: { type: String },
    loyaltyTier: { type: String, enum: ['standard', 'gold', 'platinum'], default: 'standard' },
    preferences: {
      communication: { type: String, enum: ['sms', 'email', 'whatsapp'], default: 'sms' }
    }
  },
  { timestamps: true }
);

export default mongoose.model('CustomerProfile', customerProfileSchema);
