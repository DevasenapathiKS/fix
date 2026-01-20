import mongoose from 'mongoose';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '../constants/index.js';

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false }, // Made optional for payment-first flow
    jobCard: { type: mongoose.Schema.Types.ObjectId, ref: 'JobCard' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    method: { type: String, enum: Object.values(PAYMENT_METHODS), required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.INITIATED },
    transactionRef: { type: String },
    paidAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

paymentSchema.index({ order: 1, status: 1 }, { sparse: true }); // Sparse index to handle payments without orders

export default mongoose.model('Payment', paymentSchema);
