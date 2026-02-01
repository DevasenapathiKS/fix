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
  async assignTechnician({ orderId, technicianId, technicianIds, slots, adminId }) {
    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(order.status)) {
      throw new ApiError(400, 'Order can no longer be assigned');
    }

    const ids = Array.isArray(technicianIds) && technicianIds.length
      ? technicianIds
      : technicianId
        ? [technicianId]
        : [];
    if (!ids.length) throw new ApiError(400, 'At least one technician is required');
    const primaryId = ids[0];

    for (const tid of ids) {
      const profile = await TechnicianProfile.findOne({ user: tid });
      if (!profile) throw new ApiError(404, `Technician profile missing for ${tid}`);
    }

    await TechnicianCalendar.deleteMany({ order: orderId });

    const slotsToBlock = Array.isArray(slots) && slots.length > 0
      ? slots.map((s) => ({ start: new Date(s.start), end: new Date(s.end) }))
      : order.timeWindowStart && order.timeWindowEnd
        ? [{ start: order.timeWindowStart, end: order.timeWindowEnd }]
        : [];
    if (!slotsToBlock.length) {
      throw new ApiError(400, 'Order has no time window and no slots provided');
    }

    for (const tid of ids) {
      const calendarEntries = await TechnicianCalendar.find({ technician: tid });
      for (const slot of slotsToBlock) {
        const available = isTechnicianAvailable({
          calendarEntries,
          requestedStart: slot.start,
          requestedEnd: slot.end
        });
        if (!available) {
          throw new ApiError(400, `Technician not available in one or more selected slots`);
        }
      }
      await TechnicianService.blockCalendar({
        technicianId: tid,
        orderId: order._id,
        slots: slotsToBlock
      });
    }

    order.assignedTechnician = primaryId;
    order.assignedTechnicians = ids;
    order.status = ORDER_STATUS.ASSIGNED;
    await order.save();

    await addHistoryEntry({
      orderId: order._id,
      action: NOTIFICATION_EVENTS.TECHNICIAN_ASSIGNED,
      message: ids.length > 1 ? `${ids.length} technicians assigned` : 'Technician assigned',
      metadata: { primaryTechnicianId: primaryId, technicianIds: ids },
      performedBy: adminId
    });

    let jobCard = await JobCard.findOneAndUpdate(
      { order: order._id },
      { order: order._id, technician: primaryId, status: JOB_STATUS.OPEN, estimateAmount: order.estimatedCost ?? 0 },
      { upsert: true, new: true }
    );
    if (jobCard && !jobCard.otp) {
      jobCard.otp = await generateUniqueJobCardOtp();
      await jobCard.save();
    }

    for (const tid of ids) {
      await notificationService.notifyTechnician(tid, NOTIFICATION_EVENTS.TECHNICIAN_ASSIGNED, {
        orderId: order._id,
        scheduledAt: order.scheduledAt
      });
    }

    await notificationService.notifyAdmin(NOTIFICATION_EVENTS.TECHNICIAN_ASSIGNED, {
      orderId: order._id,
      technicianId: primaryId,
      technicianIds: ids
    });

    const [customer, technician] = await Promise.all([
      User.findById(order.customerUser).lean(),
      User.findById(primaryId).lean()
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
