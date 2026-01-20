import Order from '../models/order.model.js';
import TechnicianCalendar from '../models/calendar.model.js';
import { ORDER_STATUS } from '../constants/index.js';
import ApiError from '../utils/api-error.js';
import { notificationService, NOTIFICATION_EVENTS } from './notification.service.js';
import { orderHistoryService } from './order-history.service.js';
import { sendOrderRescheduledEmail } from './email.service.js';
import User from '../models/user.model.js';

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
    const previousTechnicianId = order.assignedTechnician;
    
    // Update order with new schedule
    order.timeWindowStart = start;
    order.timeWindowEnd = end;
    order.scheduledAt = start;
    order.rescheduleCount += 1;
    
    // Remove technician assignment and set status to pending
    if (previousTechnicianId) {
      // Delete the calendar entry for this order
      await TechnicianCalendar.deleteOne({ order: orderId });
      
      order.assignedTechnician = null;
      order.status = ORDER_STATUS.PENDING_ASSIGNMENT;
      
      // Notify the technician they've been unassigned
      await notificationService.notifyTechnician(previousTechnicianId, NOTIFICATION_EVENTS.ORDER_RESCHEDULED, {
        orderId: order._id,
        newStart: start,
        newEnd: end,
        message: 'You have been unassigned from this order due to rescheduling'
      });
    } else {
      order.status = ORDER_STATUS.RESCHEDULED;
    }

    await order.save();

    await addHistoryEntry({
      orderId: order._id,
      action: NOTIFICATION_EVENTS.ORDER_RESCHEDULED,
      message: previousTechnicianId 
        ? 'Order rescheduled by admin - technician unassigned' 
        : 'Order rescheduled by admin',
      metadata: { 
        newStart: start, 
        newEnd: end,
        previousTechnician: previousTechnicianId || null
      },
      performedBy: adminId
    });

    await notificationService.notifyAdmin(NOTIFICATION_EVENTS.ORDER_RESCHEDULED, {
      orderId: order._id,
      newStart: start,
      newEnd: end
    });

    // Send email notification to customer
    const customer = await User.findById(order.customerUser).lean();
    if (customer?.email) {
      sendOrderRescheduledEmail({
        order: await Order.findById(order._id).populate('serviceItem', 'name').lean(),
        newStart: start,
        newEnd: end,
        customerName: customer.name || order.customer?.name,
        customerEmail: customer.email || order.customer?.email,
        reason: 'Order rescheduled by admin'
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[Email] Failed to send order rescheduled email', err);
      });
    }

    return shapeOrderWithHistory(order);
  }
};
