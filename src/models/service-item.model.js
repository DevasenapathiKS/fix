import mongoose from 'mongoose';

const serviceItemSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    basePrice: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

serviceItemSchema.index({ category: 1, name: 1 }, { unique: true });

export default mongoose.model('ServiceItem', serviceItemSchema);
