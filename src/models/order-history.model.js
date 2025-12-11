import mongoose from 'mongoose';

const orderHistorySchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    action: { type: String, required: true },
    message: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: { createdAt: 'performedAt', updatedAt: false } }
);

orderHistorySchema.index({ order: 1, performedAt: 1 });

export default mongoose.model('OrderHistory', orderHistorySchema);
