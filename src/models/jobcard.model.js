import mongoose from 'mongoose';
import { JOB_STATUS } from '../constants/index.js';

const checkInSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    note: { type: String }
  },
  { _id: false }
);

const extraWorkSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    serviceCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    serviceItem: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem', required: true }
  },
  { _id: false }
);

const sparePartUsageSchema = new mongoose.Schema(
  {
    part: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart', required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true }
  },
  { _id: false }
);

const jobCardSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: Object.values(JOB_STATUS), default: JOB_STATUS.OPEN },
    estimateAmount: { type: Number, default: 0 },
    additionalCharges: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    otp: { type: String, minlength: 6, maxlength: 6 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial'],
      default: 'pending'
    },
    checkIns: [checkInSchema],
    extraWork: [extraWorkSchema],
    sparePartsUsed: [sparePartUsageSchema],
    lockedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model('JobCard', jobCardSchema);
