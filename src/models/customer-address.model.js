import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, default: 'Home' },
    contactName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    isDefault: { type: Boolean, default: false },
    notes: { type: String }
  },
  { timestamps: true }
);

addressSchema.index({ customer: 1, isDefault: 1 });

export default mongoose.model('CustomerAddress', addressSchema);
