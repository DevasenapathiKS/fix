import mongoose from 'mongoose';

const sparePartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, unique: true },
    unitPrice: { type: Number, required: true },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model('SparePart', sparePartSchema);
