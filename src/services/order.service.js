import Order from '../models/order.model.js';
import { ORDER_STATUS } from '../constants/index.js';
import ApiError from '../utils/api-error.js';
import { notificationService, NOTIFICATION_EVENTS } from './notification.service.js';
import { orderHistoryService } from './order-history.service.js';

export const addHistoryEntry = async ({ orderId, action, message, metadata, performedBy }) =>
  orderHistoryService.recordEntry({ orderId, action, message, metadata, performedBy });

const shapeOrderWithHistory = async (order) => {
  if (!order) return order;
  const plainOrder = typeof order.toObject === 'function' ? order.toObject() : order;
  const history = await orderHistoryService.listEntries(plainOrder._id);
  return { ...plainOrder, history };
};

export const OrderService = {
  async createOrder(payload) {
    const order = await Order.create({
      ...payload,
      status: ORDER_STATUS.PENDING_ASSIGNMENT
    });

    await addHistoryEntry({
      orderId: order._id,
      action: NOTIFICATION_EVENTS.ORDER_CREATED,
      message: 'Order created by customer',
      metadata: { scheduledAt: payload.scheduledAt }
    });

    await notificationService.notifyAdmin(NOTIFICATION_EVENTS.ORDER_CREATED, {
      orderId: order._id,
      serviceItem: payload.serviceItem,
      scheduledAt: payload.scheduledAt
    });

    return shapeOrderWithHistory(order);
  },

  async listOrders({ status, fromDate, toDate }) {
    const query = {};
    if (status) query.status = status;
    if (fromDate || toDate) {
      query.scheduledAt = {};
      if (fromDate) query.scheduledAt.$gte = new Date(fromDate);
      if (toDate) query.scheduledAt.$lte = new Date(toDate);
    }

    return Order.find(query)
      .populate('serviceCategory serviceItem assignedTechnician', 'name')
      .sort({ createdAt: -1 });
  },

  async getOrder(orderId) {
    const order = await Order.findById(orderId)
      .populate('serviceCategory serviceItem assignedTechnician', 'name phone')
      .lean();
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    const history = await orderHistoryService.listEntries(order._id);
    return { ...order, history };
  },

  async rescheduleOrder({ orderId, newStart, newEnd, adminId }) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    const start = new Date(newStart);
    const end = new Date(newEnd);
    order.timeWindowStart = start;
    order.timeWindowEnd = end;
    order.scheduledAt = start;
    order.status = ORDER_STATUS.RESCHEDULED;
    order.rescheduleCount += 1;

    await order.save();

    await addHistoryEntry({
      orderId: order._id,
      action: NOTIFICATION_EVENTS.ORDER_RESCHEDULED,
      message: 'Order rescheduled by admin',
      metadata: { newStart: start, newEnd: end },
      performedBy: adminId
    });

    await notificationService.notifyAdmin(NOTIFICATION_EVENTS.ORDER_RESCHEDULED, {
      orderId: order._id,
      newStart: start,
      newEnd: end
    });

    if (order.assignedTechnician) {
      await notificationService.notifyTechnician(order.assignedTechnician, NOTIFICATION_EVENTS.ORDER_RESCHEDULED, {
        orderId: order._id,
        newStart: start,
        newEnd: end
      });
    }

    return shapeOrderWithHistory(order);
  }
};
