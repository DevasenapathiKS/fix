import OrderHistory from '../models/order-history.model.js';

const sanitizeEntry = (entry) => ({
  id: entry._id,
  action: entry.action,
  message: entry.message,
  metadata: entry.metadata,
  performedAt: entry.performedAt,
  performedBy: entry.performedBy
});

export const orderHistoryService = {
  async recordEntry({ orderId, action, message, metadata, performedBy }) {
    if (!orderId) {
      throw new Error('orderId is required to record history');
    }
    return OrderHistory.create({ order: orderId, action, message, metadata, performedBy });
  },

  async listEntries(orderId) {
    if (!orderId) {
      return [];
    }
    const entries = await OrderHistory.find({ order: orderId })
      .sort({ performedAt: 1 })
      .populate('performedBy', 'name role email')
      .lean();
    return entries.map(sanitizeEntry);
  }
};
