import OrderHistory from '../models/order-history.model.js';
import { socketService } from './socket.service.js';

const ORDER_ACTIVITY = 'ORDER_ACTIVITY';

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
    const doc = await OrderHistory.create({ order: orderId, action, message, metadata, performedBy });
    const orderIdStr = orderId && typeof orderId.toString === 'function' ? orderId.toString() : String(orderId);
    const performedByStr = performedBy && typeof performedBy.toString === 'function' ? performedBy.toString() : (performedBy ?? null);
    socketService.emitToOrder(orderIdStr, ORDER_ACTIVITY, {
      orderId: orderIdStr,
      action,
      message,
      metadata,
      performedBy: performedByStr,
      performedAt: doc.performedAt
    });
    return doc;
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
