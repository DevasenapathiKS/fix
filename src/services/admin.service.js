import dayjs from 'dayjs';
import mongoose from 'mongoose';
import ServiceCategory from '../models/service-category.model.js';
import ServiceItem from '../models/service-item.model.js';
import SparePart from '../models/spare-part.model.js';
import TechnicianAvailability from '../models/availability.model.js';
import Order from '../models/order.model.js';
import ApiError from '../utils/api-error.js';
import User from '../models/user.model.js';
import TechnicianProfile from '../models/technician-profile.model.js';
import TechnicianCalendar from '../models/calendar.model.js';
import TimeSlotTemplate from '../models/time-slot.model.js';
import JobCard from '../models/jobcard.model.js';
import { JOB_STATUS, ORDER_STATUS, USER_ROLES, NOTIFICATION_EVENTS } from '../constants/index.js';
import TechnicianAttendance from '../models/technician-attendance.model.js';
import TechnicianSkill from '../models/technician-skill.model.js';
import { notificationService } from './notification.service.js';
import Payment from '../models/payment.model.js';
import { orderHistoryService } from './order-history.service.js';

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

export const AdminService = {
  async upsertCategory(payload) {
    const category = await ServiceCategory.findOneAndUpdate({ name: payload.name }, payload, {
      new: true,
      upsert: true
    });
    return category;
  },

  async listCategories() {
    return ServiceCategory.find({}).sort({ name: 1 });
  },

  async upsertServiceItem(payload) {
    if (!payload.category) throw new ApiError(400, 'Category is required');
    const serviceItem = await ServiceItem.findOneAndUpdate(
      { category: payload.category, name: payload.name },
      payload,
      { new: true, upsert: true }
    );
    return serviceItem;
  },

  async listServiceItems(categoryId) {
    const query = {};
    if (categoryId) query.category = categoryId;
    return ServiceItem.find(query).populate('category', 'name');
  },

  async listSpareParts() {
    return SparePart.find({ isActive: true }).sort({ name: 1 });
  },

  async listTechnicianSkills() {
    return TechnicianSkill.find({ isActive: { $ne: false } }).sort({ name: 1 });
  },

  async createTechnicianSkill(payload) {
    if (!payload.name) {
      throw new ApiError(400, 'Skill name is required');
    }
    const existing = await TechnicianSkill.findOne({ name: new RegExp(`^${payload.name}$`, 'i') });
    if (existing) {
      return existing;
    }
    return TechnicianSkill.create({
      name: payload.name,
      description: payload.description,
      isActive: payload.isActive !== undefined ? payload.isActive : true
    });
  },

  async listTechnicians() {
    const profiles = await TechnicianProfile.find({})
      .populate('user', 'name email mobile status')
      .populate('serviceItems', 'name')
      .populate('serviceCategories', 'name')
      .populate('skills', 'name')
      .lean();

    if (!profiles.length) return [];

    const technicianIds = profiles.map((profile) => profile.user?._id || profile.user);
    const todayStart = normalizeDate(new Date());
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await TechnicianAttendance.find({
      technician: { $in: technicianIds },
      date: { $gte: todayStart, $lte: todayEnd }
    })
      .select('technician status checkInAt checkOutAt note date')
      .lean();

    const attendanceMap = todayAttendance.reduce((acc, entry) => {
      acc[String(entry.technician)] = entry;
      return acc;
    }, {});

    return profiles.map((profile) => {
      const techUser = profile.user || {};
      const id = techUser._id?.toString() || String(profile.user);
      return {
        id,
        name: techUser.name,
        email: techUser.email,
        phone: techUser.mobile,
        status: techUser.status,
        experienceYears: profile.experienceYears,
        averageRating: profile.averageRating,
        skills: (profile.skills || [])
          .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
          .filter(Boolean),
        workingHours: profile.workingHours,
        serviceItems: (profile.serviceItems || []).map((item) => ({ id: item._id, name: item.name })),
        serviceCategories: (profile.serviceCategories || []).map((category) => ({ id: category._id, name: category.name })),
        todayAttendance: attendanceMap[id]
          ? {
              status: attendanceMap[id].status,
              checkInAt: attendanceMap[id].checkInAt,
              checkOutAt: attendanceMap[id].checkOutAt,
              note: attendanceMap[id].note
            }
          : null
      };
    });
  },

  async upsertSparePart(payload) {
    const part = await SparePart.findOneAndUpdate({ sku: payload.sku }, payload, {
      new: true,
      upsert: true
    });
    return part;
  },

  async viewTechnicianAvailability(technicianId) {
    return TechnicianAvailability.find({ technician: technicianId }).sort({ dayOfWeek: 1 });
  },

  async createTimeSlot(payload) {
    return TimeSlotTemplate.create(payload);
  },

  async listTimeSlots() {
    return TimeSlotTemplate.find({}).sort({ dayOfWeek: 1, startTime: 1 });
  },

  async updateTimeSlot(timeSlotId, payload) {
    const slot = await TimeSlotTemplate.findByIdAndUpdate(timeSlotId, payload, { new: true });
    if (!slot) throw new ApiError(404, 'Time slot not found');
    return slot;
  },

  async deleteTimeSlot(timeSlotId) {
    const slot = await TimeSlotTemplate.findByIdAndDelete(timeSlotId);
    if (!slot) throw new ApiError(404, 'Time slot not found');
    return slot;
  },

  async getOrdersForAdmin(filters = {}) {
    const { status } = filters;
    const query = {};
    if (status) query.status = status;
    return Order.find(query)
      .populate('serviceCategory serviceItem assignedTechnician', 'name')
      .sort({ createdAt: -1 });
  },

  async listTechniciansForOrder(orderId) {
    const order = await Order.findById(orderId).select('serviceItem timeWindowStart timeWindowEnd scheduledAt');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const profiles = await TechnicianProfile.find({ serviceItems: order.serviceItem })
      .populate('user', 'name email mobile status')
      .populate('serviceItems', 'name')
      .populate('skills', 'name')
      .lean();

    if (!profiles.length) {
      return [];
    }

    const technicianIds = profiles.map((profile) => profile.user?._id?.toString() || String(profile.user));
    const windowStart = order.timeWindowStart || order.scheduledAt;
    const windowEnd = order.timeWindowEnd || order.scheduledAt;

    const busyEntries = await TechnicianCalendar.find({
      technician: { $in: technicianIds },
      status: "blocked",
      ...(windowStart && windowEnd
        ? {
            start: { $lt: windowEnd },
            end: { $gt: windowStart }
          }
        : {})
    })
      .select('technician start end')
      .lean();

    const busyMap = busyEntries.reduce((acc, entry) => {
      const key = entry.technician.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push({ start: entry.start, end: entry.end });
      return acc;
    }, {});

    return profiles.map((profile) => {
      const techUser = profile.user || {};
      const id = techUser._id?.toString() || String(profile.user);
      return {
        id,
        name: techUser.name,
        phone: techUser.mobile,
        experienceYears: profile.experienceYears,
        averageRating: profile.averageRating,
        skills: (profile.skills || [])
          .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
          .filter(Boolean),
        workingHours: profile.workingHours,
        serviceItems: (profile.serviceItems || []).map((item) => ({ id: item._id, name: item.name })),
        isAvailable: !(busyMap[id] && busyMap[id].length)
      };
    });
  },

  async viewTechnicianSchedule(technicianId, options = {}) {
    const startDate = options.startDate ? new Date(options.startDate) : new Date();
    const endDate = options.endDate ? new Date(options.endDate) : dayjs(startDate).add(7, 'day').toDate();

    const entries = await TechnicianCalendar.find({
      technician: technicianId,
      start: { $gte: startDate },
      end: { $lte: endDate }
    })
      .sort({ start: 1 })
      .populate('order', 'orderCode serviceItem customer status timeWindowStart timeWindowEnd')
      .lean();

    return entries.map((entry) => ({
      id: entry._id,
      start: entry.start,
      end: entry.end,
      status: entry.status,
      order: entry.order
        ? {
            id: entry.order._id,
            code: entry.order.orderCode,
            status: entry.order.status,
            serviceItem: entry.order.serviceItem,
            customer: entry.order.customer,
            timeWindowStart: entry.order.timeWindowStart,
            timeWindowEnd: entry.order.timeWindowEnd
          }
        : null
    }));
  },

  async getJobCardDetail(orderId) {
    const order = await Order.findById(orderId)
      .populate('serviceItem', 'name description basePrice')
      .populate('serviceCategory', 'name')
      .populate('assignedTechnician', 'name mobile email')
      .populate({ path: 'followUp.createdBy', select: 'name role' })
      .lean();
    if (!order) throw new ApiError(404, 'Order not found');

    const history = await orderHistoryService.listEntries(orderId);

    const jobCard = await JobCard.findOne({ order: orderId })
      .populate('technician', 'name mobile email')
      .populate('sparePartsUsed.part', 'name sku unitPrice')
      .lean();

    const payments = await Payment.find({ order: orderId }).sort({ createdAt: 1 }).lean();

    return {
      order: {
        id: order._id,
        code: order.orderCode,
        customer: order.customer,
        customerAddress: order.customerAddress,
        serviceCategory: order.serviceCategory,
        serviceItem: order.serviceItem,
        issueDescription: order.issueDescription,
        preferredSlot: order.preferredSlot,
        scheduledAt: order.scheduledAt,
        timeWindowStart: order.timeWindowStart,
        timeWindowEnd: order.timeWindowEnd,
        estimatedCost: order.estimatedCost,
        media: order.media,
        createdAt: order.createdAt,
        status: order.status,
        assignedTechnician: order.assignedTechnician,
        history,
        followUp: order.followUp
      },
      jobCard: jobCard
        ? {
            id: jobCard._id,
            status: jobCard.status,
            paymentStatus: jobCard.paymentStatus,
            estimateAmount: jobCard.estimateAmount,
            additionalCharges: jobCard.additionalCharges,
            finalAmount: jobCard.finalAmount,
            technician: jobCard.technician,
            checkIns: jobCard.checkIns,
            extraWork: jobCard.extraWork,
            sparePartsUsed: jobCard.sparePartsUsed,
            createdAt: jobCard.createdAt,
            updatedAt: jobCard.updatedAt
          }
        : null,
      payments: payments.map((payment) => ({
        id: payment._id,
        method: payment.method,
        amount: payment.amount,
        status: payment.status,
        transactionRef: payment.transactionRef,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }))
    };
  },

  async addOrderMedia(orderId, mediaItems = [], adminId) {
    if (!Array.isArray(mediaItems) || !mediaItems.length) {
      throw new ApiError(400, 'Provide at least one media file');
    }

    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new ApiError(400, 'Completed jobs are read-only');
    }

    const allowedKinds = ['image', 'video', 'document'];
    const normalized = mediaItems
      .filter((item) => item && item.url)
      .map((item) => ({
        url: item.url,
        kind: allowedKinds.includes(item.kind) ? item.kind : 'image',
        name: item.name,
        uploadedBy: adminId,
        uploadedAt: new Date()
      }));

    if (!normalized.length) {
      throw new ApiError(400, 'Valid media payload is required');
    }

    order.media = [...(order.media || []), ...normalized];
    await order.save();

    await orderHistoryService.recordEntry({
      orderId,
      action: 'ORDER_MEDIA_UPLOADED',
      message: `${normalized.length} file${normalized.length > 1 ? 's' : ''} uploaded`,
      metadata: {
        count: normalized.length,
        media: normalized.map((item) => ({ url: item.url, kind: item.kind, name: item.name }))
      },
      performedBy: adminId
    });

    return this.getJobCardDetail(orderId);
  },

  async removeOrderMedia(orderId, mediaId, adminId) {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      throw new ApiError(400, 'Invalid media reference');
    }

    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new ApiError(400, 'Completed jobs are read-only');
    }

    const mediaItem = order.media?.id(mediaId);
    if (!mediaItem) {
      throw new ApiError(404, 'Media file not found');
    }

    const removed = mediaItem.toObject();
    mediaItem.deleteOne();
    await order.save();

    await orderHistoryService.recordEntry({
      orderId,
      action: 'ORDER_MEDIA_DELETED',
      message: `${removed.name || removed.kind || 'File'} deleted`,
      metadata: {
        mediaId,
        name: removed.name,
        kind: removed.kind
      },
      performedBy: adminId
    });

    return this.getJobCardDetail(orderId);
  },

  async updateOrderAndJobStatus(orderId, { status, reason, attachments = [], adminId }) {
    if (!Object.values(ORDER_STATUS).includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status === ORDER_STATUS.COMPLETED && status !== ORDER_STATUS.COMPLETED) {
      throw new ApiError(400, 'Completed jobs are read-only');
    }

    const normalizedAttachments = Array.isArray(attachments)
      ? attachments
          .filter((item) => item && item.url)
          .map((item) => ({
            url: item.url,
            kind: item.kind === 'video' ? 'video' : 'image',
            name: item.name
          }))
      : [];

    if (status === ORDER_STATUS.FOLLOW_UP) {
      if (!reason) {
        throw new ApiError(400, 'Follow up reason is required');
      }
      if (!normalizedAttachments.length) {
        throw new ApiError(400, 'Attach at least one image or video for follow up');
      }
      order.assignedTechnician = null;
      order.followUp = {
        reason,
        attachments: normalizedAttachments,
        createdAt: new Date(),
        createdBy: adminId
      };
    } else if (order.followUp && (order.followUp.reason || order.followUp.attachments?.length)) {
      order.followUp = {
        ...order.followUp,
        resolvedAt: new Date()
      };
    }

    order.status = status;
    await order.save();

    await orderHistoryService.recordEntry({
      orderId,
      action: NOTIFICATION_EVENTS.JOB_UPDATED,
      message: `Admin updated order to ${status}`,
      metadata: { status, reason, attachments: normalizedAttachments },
      performedBy: adminId
    });

    const jobCard = await JobCard.findOne({ order: orderId });
    if (jobCard) {
      const jobStatuses = Object.values(JOB_STATUS);
      const nextJobStatus = jobStatuses.includes(status) ? status : status === ORDER_STATUS.COMPLETED ? JOB_STATUS.COMPLETED : jobCard.status;
      if (jobStatuses.includes(nextJobStatus)) {
        jobCard.status = nextJobStatus;
        await jobCard.save();
      }
    }

    await notificationService.notifyAdmin(NOTIFICATION_EVENTS.JOB_UPDATED, {
      orderId,
      status
    });

    if (order.assignedTechnician) {
      await notificationService.notifyTechnician(order.assignedTechnician, NOTIFICATION_EVENTS.JOB_UPDATED, {
        orderId,
        status
      });
    }

    return this.getJobCardDetail(orderId);
  },

  async updateJobPaymentStatus(orderId, paymentStatus, adminId) {
    const allowedStatuses = ['pending', 'partial', 'paid'];
    if (!allowedStatuses.includes(paymentStatus)) {
      throw new ApiError(400, 'Invalid payment status');
    }

    const order = await Order.findById(orderId).select('status');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new ApiError(400, 'Completed jobs are read-only');
    }

    const jobCard = await JobCard.findOne({ order: orderId });
    if (!jobCard) {
      throw new ApiError(404, 'Job card not found for this order');
    }

    jobCard.paymentStatus = paymentStatus;
    await jobCard.save();

    await orderHistoryService.recordEntry({
      orderId,
      action: 'JOB_PAYMENT_STATUS_UPDATED',
      message: `Payment marked as ${paymentStatus}`,
      metadata: { paymentStatus },
      performedBy: adminId
    });

    return this.getJobCardDetail(orderId);
  },

  async addOrderHistoryNote(orderId, message, adminId) {
    if (!message || !message.trim()) {
      throw new ApiError(400, 'Note message is required');
    }

    const order = await Order.findById(orderId).select('status');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new ApiError(400, 'Completed jobs are read-only');
    }

    const trimmed = message.trim().slice(0, 1000);

    await orderHistoryService.recordEntry({
      orderId,
      action: 'ADMIN_NOTE',
      message: trimmed,
      performedBy: adminId
    });

    return this.getJobCardDetail(orderId);
  },

  async listTechnicianAttendance(technicianId, filters = {}) {
    const { from, to } = filters;
    const query = { technician: technicianId };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = normalizeDate(from);
      if (to) {
        const toDate = normalizeDate(to);
        if (toDate) {
          toDate.setHours(23, 59, 59, 999);
          query.date.$lte = toDate;
        }
      }
    }

    return TechnicianAttendance.find(query).sort({ date: -1 }).lean();
  },

  async saveTechnicianAttendance(technicianId, payload) {
    const technician = await User.findOne({ _id: technicianId, role: USER_ROLES.TECHNICIAN });
    if (!technician) throw new ApiError(404, 'Technician not found');

    const date = normalizeDate(payload.date || new Date());
    if (!date) throw new ApiError(400, 'Invalid attendance date');

    const update = {
      status: payload.status,
      note: payload.note || undefined
    };

    if (payload.checkInAt) update.checkInAt = new Date(payload.checkInAt);
    else update.checkInAt = undefined;
    if (payload.checkOutAt) update.checkOutAt = new Date(payload.checkOutAt);
    else update.checkOutAt = undefined;

    const attendance = await TechnicianAttendance.findOneAndUpdate(
      { technician: technicianId, date },
      {
        technician: technicianId,
        date,
        ...update
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return attendance;
  },

  async createUser(payload) {
    const existing = await User.findOne({ email: payload.email.toLowerCase() });
    if (existing) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const user = await User.create({
      name: payload.name,
      email: payload.email,
      mobile: payload.phone,
      password: payload.password,
      role: payload.role
    });

    if (payload.role === USER_ROLES.TECHNICIAN) {
      const itemIds = payload.serviceItems || [];
      let categoryIds = payload.serviceCategories || [];
      if (!categoryIds.length && itemIds.length) {
        const items = await ServiceItem.find({ _id: { $in: itemIds } }, 'category');
        categoryIds = [...new Set(items.map((item) => String(item.category)))];
      }

      let skillRefs = [];
      if (payload.skills?.length) {
        const validIds = payload.skills.filter((value) => mongoose.Types.ObjectId.isValid(value));
        if (validIds.length) {
          const skills = await TechnicianSkill.find({ _id: { $in: validIds } }, '_id');
          skillRefs = skills.map((skill) => skill._id);
        }

        const namedSkills = payload.skills.filter((value) => !mongoose.Types.ObjectId.isValid(value));
        for (const skillName of namedSkills) {
          if (!skillName) continue;
          const skill = await this.createTechnicianSkill({ name: skillName });
          if (skill?._id) {
            skillRefs.push(skill._id);
          }
        }
      }

      await TechnicianProfile.create({
        user: user._id,
        serviceItems: itemIds,
        serviceCategories: categoryIds,
        skills: skillRefs,
        experienceYears: payload.experienceYears || 0,
        workingHours: payload.workingHours,
        baseLocation: payload.baseLocation
      });
    }

    const sanitized = user.toObject({ virtuals: true });
    delete sanitized.password;
    delete sanitized.mobile;
    return sanitized;
  }
};
