import Order from '../models/order.model.js';
import JobCard from '../models/jobcard.model.js';
import TechnicianProfile from '../models/technician-profile.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/api-error.js';
import { TechnicianService } from './technician.service.js';
import { notificationService, NOTIFICATION_EVENTS } from './notification.service.js';
import { sendTechnicianAssignedEmail } from './email.service.js';
import { ORDER_STATUS, JOB_STATUS } from '../constants/index.js';
import { isTechnicianAvailable } from '../utils/availability.js';
import TechnicianCalendar from '../models/calendar.model.js';
import { addHistoryEntry } from './order.service.js';

const generateSixDigitOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateUniqueJobCardOtp = async () => {
  // Try a few times to avoid rare collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    const otp = generateSixDigitOtp();
    const existing = await JobCard.findOne({ otp }).select('_id').lean();
    if (!existing) return otp;
  }
  throw new ApiError(500, 'Unable to generate unique OTP for job card');
};

export const AssignmentService = {
  async assignTechnician({ orderId, technicianId, adminId }) {
    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(order.status)) {
      throw new ApiError(400, 'Order can no longer be assigned');
    }

    const profile = await TechnicianProfile.findOne({ user: technicianId });
    if (!profile) throw new ApiError(404, 'Technician profile missing');

    // if (!profile.serviceItems.map(String).includes(String(order.serviceItem))) {
    //   throw new ApiError(400, 'Technician skill mismatch');
    // }

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
      { order: order._id, technician: technicianId, status: JOB_STATUS.OPEN, estimateAmount: order.estimatedCost },
      { upsert: true, new: true }
    ).then(async (jobCard) => {
      if (jobCard && !jobCard.otp) {
        jobCard.otp = await generateUniqueJobCardOtp();
        await jobCard.save();
      }
    });

    await notificationService.notifyTechnician(technicianId, NOTIFICATION_EVENTS.TECHNICIAN_ASSIGNED, {
      orderId: order._id,
      scheduledAt: order.scheduledAt
    });

    await notificationService.notifyAdmin(NOTIFICATION_EVENTS.TECHNICIAN_ASSIGNED, {
      orderId: order._id,
      technicianId
    });

    // Send email notification to customer
    const [customer, technician] = await Promise.all([
      User.findById(order.customerUser).lean(),
      User.findById(technicianId).lean()
    ]);

    if (customer?.email) {
      const populatedOrder = await Order.findById(order._id).populate('serviceItem', 'name').lean();
      sendTechnicianAssignedEmail({
        order: populatedOrder,
        technician,
        customerName: customer.name || order.customer?.name,
        customerEmail: customer.email || order.customer?.email
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[Email] Failed to send technician assigned email', err);
      });
    }

    return order;
  }
};
