import Order from '../models/order.model.js';
import JobCard from '../models/jobcard.model.js';
import TechnicianProfile from '../models/technician-profile.model.js';
import ApiError from '../utils/api-error.js';
import { TechnicianService } from './technician.service.js';
import { notificationService, NOTIFICATION_EVENTS } from './notification.service.js';
import { ORDER_STATUS, JOB_STATUS } from '../constants/index.js';
import { isTechnicianAvailable } from '../utils/availability.js';
import TechnicianCalendar from '../models/calendar.model.js';
import { addHistoryEntry } from './order.service.js';

export const AssignmentService = {
  async assignTechnician({ orderId, technicianId, adminId }) {
    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(order.status)) {
      throw new ApiError(400, 'Order can no longer be assigned');
    }

    const profile = await TechnicianProfile.findOne({ user: technicianId });
    if (!profile) throw new ApiError(404, 'Technician profile missing');

    if (!profile.serviceItems.map(String).includes(String(order.serviceItem))) {
      throw new ApiError(400, 'Technician skill mismatch');
    }

    const calendarEntries = await TechnicianCalendar.find({ technician: technicianId });
    const available = isTechnicianAvailable({
      calendarEntries,
      requestedStart: order.timeWindowStart,
      requestedEnd: order.timeWindowEnd
    });
    if (!available) {
      throw new ApiError(400, 'Technician not available in the requested slot');
    }

    await TechnicianService.blockCalendar({
      technicianId,
      orderId: order._id,
      start: order.timeWindowStart,
      end: order.timeWindowEnd
    });

    order.assignedTechnician = technicianId;
    order.status = ORDER_STATUS.ASSIGNED;
    await order.save();

    await addHistoryEntry({
          orderId: order._id,
          action: NOTIFICATION_EVENTS.TECHNICIAN_ASSIGNED,
          message: `Technician assigned to order`,
          metadata: { technicianId },
          performedBy: adminId
        });
    

    await JobCard.findOneAndUpdate(
      { order: order._id },
      { order: order._id, technician: technicianId, status: JOB_STATUS.OPEN },
      { upsert: true, new: true }
    );

    await notificationService.notifyTechnician(technicianId, NOTIFICATION_EVENTS.TECHNICIAN_ASSIGNED, {
      orderId: order._id,
      scheduledAt: order.scheduledAt
    });

    await notificationService.notifyAdmin(NOTIFICATION_EVENTS.TECHNICIAN_ASSIGNED, {
      orderId: order._id,
      technicianId
    });

    return order;
  }
};
