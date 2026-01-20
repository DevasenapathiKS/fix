import TechnicianAvailability from '../models/availability.model.js';
import TechnicianCalendar from '../models/calendar.model.js';
import TechnicianProfile from '../models/technician-profile.model.js';
import JobCard from '../models/jobcard.model.js';
import Order from '../models/order.model.js';
import Payment from '../models/payment.model.js';
import Notification from '../models/notification.model.js';
import SparePart from '../models/spare-part.model.js';
import ServiceCategory from '../models/service-category.model.js';
import ServiceItem from '../models/service-item.model.js';
import ApiError from '../utils/api-error.js';
import { ORDER_STATUS, JOB_STATUS, USER_ROLES } from '../constants/index.js';
import User from '../models/user.model.js';
import { orderHistoryService } from './order-history.service.js';
import { AdminService } from './admin.service.js';

const shapeRef = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return { id: value };
  return { id: value._id || value.id || value, name: value.name, description: value.description };
};

const shapeOrderSummary = (order) => {
  if (!order) return null;
  return {
    id: order._id,
    code: order.orderCode,
    status: order.status,
    customer: order.customer,
    customerAddress: order.customerAddress,
    scheduledAt: order.scheduledAt,
    timeWindowStart: order.timeWindowStart,
    timeWindowEnd: order.timeWindowEnd,
    serviceItem: shapeRef(order.serviceItem),
    serviceCategory: shapeRef(order.serviceCategory),
    issueDescription: order.issueDescription,
    preferredSlot: order.preferredSlot,
    estimatedCost: order.estimatedCost,
    media: order.media
  };
};

const shapeJobCardDetail = (jobCard) => {
  if (!jobCard) return null;
  return {
    id: jobCard._id,
    status: jobCard.status,
    estimateAmount: jobCard.estimateAmount,
    additionalCharges: jobCard.additionalCharges,
    finalAmount: jobCard.finalAmount,
    paymentStatus: jobCard.paymentStatus,
    checkIns: jobCard.checkIns,
    extraWork: (jobCard.extraWork || []).map((item) => ({
      description: item.description,
      amount: item.amount,
      serviceCategory: shapeRef(item.serviceCategory),
      serviceItem: shapeRef(item.serviceItem)
    })),
    sparePartsUsed: jobCard.sparePartsUsed,
    createdAt: jobCard.createdAt,
    updatedAt: jobCard.updatedAt
  };
};

export const TechnicianService = {
  async getProfile(technicianId) {
    const user = await User.findById(technicianId);
    if (!user || user.role !== USER_ROLES.TECHNICIAN) {
      throw new ApiError(404, 'Technician not found');
    }

    const profileDoc = await TechnicianProfile.findOne({ user: technicianId })
      .populate('serviceCategories', 'name description')
      .populate('serviceItems', 'name description')
      .lean();

    const response = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.mobile,
      role: user.role
    };

    if (profileDoc) {
      response.profile = {
        experienceYears: profileDoc.experienceYears,
        averageRating: profileDoc.averageRating,
        workingHours: profileDoc.workingHours,
        baseLocation: profileDoc.baseLocation,
        serviceCategories: (profileDoc.serviceCategories || []).map((category) => ({
          id: category._id,
          name: category.name,
          description: category.description
        })),
        serviceItems: (profileDoc.serviceItems || []).map((item) => ({
          id: item._id,
          name: item.name,
          description: item.description
        }))
      };
    }

    return response;
  },

  async updateAvailability(technicianId, entries) {
    const bulkOps = entries.map((entry) => ({
      updateOne: {
        filter: { technician: technicianId, dayOfWeek: entry.dayOfWeek },
        update: { $set: { ...entry, technician: technicianId } },
        upsert: true
      }
    }));

    if (bulkOps.length) {
      await TechnicianAvailability.bulkWrite(bulkOps);
    }
    return this.getAvailability(technicianId);
  },

  async getAvailability(technicianId) {
    return TechnicianAvailability.find({ technician: technicianId }).sort({ dayOfWeek: 1 });
  },

  async getTechniciansBySkill(serviceItemId) {
    return TechnicianProfile.find({ serviceItems: serviceItemId })
      .populate({ path: 'user', select: 'name phone role status' })
      .lean();
  },

  async getCalendar(technicianId, { start, end }) {
    const query = { technician: technicianId };
    if (start || end) {
      query.start = {};
      if (start) query.start.$gte = start;
      if (end) query.start.$lte = end;
    }
    return TechnicianCalendar.find(query).sort({ start: 1 });
  },

  async blockCalendar({ technicianId, orderId, start, end }) {
    const slotStart = start || end || new Date();
    const slotEnd = end || start || slotStart;
    // Idempotent upsert to avoid duplicate key on (technician, order)
    return TechnicianCalendar.findOneAndUpdate(
      { technician: technicianId, order: orderId },
      {
        $set: {
          technician: technicianId,
          order: orderId,
          date: slotStart,
          start: slotStart,
          end: slotEnd,
          status: 'blocked'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  },

  async listJobCards(technicianId, filters = {}) {
    const { status } = filters;
    const query = { technician: technicianId };
    if (status) query.status = status;

    const jobCards = await JobCard.find(query)
      .sort({ updatedAt: -1 })
      .populate({
        path: 'order',
        select:
          'orderCode status customer customerAddress serviceCategory serviceItem issueDescription preferredSlot scheduledAt timeWindowStart timeWindowEnd estimatedCost media',
        populate: [
          { path: 'serviceItem', select: 'name description' },
          { path: 'serviceCategory', select: 'name description' }
        ]
      })
      .lean();

    return jobCards.map((card) => ({
      id: card._id,
      status: card.status,
      estimateAmount: card.estimateAmount ?? card.order?.estimatedCost ?? 0,
      finalAmount: card.finalAmount,
      order: shapeOrderSummary(card.order),
      lastCheckInAt: card.checkIns?.length ? card.checkIns[card.checkIns.length - 1].timestamp : null,
      updatedAt: card.updatedAt,
      createdAt: card.createdAt
    }));
  },

  async listActiveJobsToday(technicianId) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Find today's orders assigned to this technician with active order statuses
    const orders = await Order.find({
      assignedTechnician: technicianId,
      timeWindowStart: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: [ORDER_STATUS.ASSIGNED, ORDER_STATUS.IN_PROGRESS] }
    })
      .select(
        'orderCode status customer customerAddress serviceCategory serviceItem issueDescription preferredSlot scheduledAt timeWindowStart timeWindowEnd estimatedCost media'
      )
      .populate('serviceItem', 'name description')
      .populate('serviceCategory', 'name description')
      .lean();

    if (!orders.length) return [];

    const orderIdList = orders.map((o) => o._id);
    const orderMap = orders.reduce((acc, order) => {
      acc[String(order._id)] = order;
      return acc;
    }, {});

    // From those orders, return job cards that are still active for the technician
    const jobCards = await JobCard.find({
      technician: technicianId,
      order: { $in: orderIdList },
      status: { $in: [JOB_STATUS.OPEN, JOB_STATUS.CHECKED_IN] }
    })
      .sort({ updatedAt: -1 })
      .lean();

    return jobCards.map((card) => {
      const order = orderMap[String(card.order)];
      return {
        id: card._id,
        status: card.status,
        estimateAmount: card.estimateAmount ?? order?.estimatedCost ?? 0,
        finalAmount: card.finalAmount,
        order: shapeOrderSummary(order),
        lastCheckInAt: card.checkIns?.length ? card.checkIns[card.checkIns.length - 1].timestamp : null,
        updatedAt: card.updatedAt,
        createdAt: card.createdAt
      };
    });
  },

  async getJobCardDetailForTechnician(jobCardId, technicianId) {
    const jobCard = await JobCard.findOne({ _id: jobCardId, technician: technicianId })
      .populate('sparePartsUsed.part', 'name sku unitPrice')
      .populate('extraWork.serviceCategory', 'name description')
      .populate('extraWork.serviceItem', 'name description basePrice')
      .lean();
    if (!jobCard) throw new ApiError(404, 'Job card not found');

    const order = await Order.findById(jobCard.order)
      .populate('serviceItem', 'name description')
      .populate('serviceCategory', 'name description')
      .populate('assignedTechnician', 'name mobile email')
      .lean();
    if (!order) throw new ApiError(404, 'Order not found for this job');

    const payments = await Payment.find({ order: order._id }).sort({ createdAt: 1 }).lean();
    const history = await orderHistoryService.listEntries(order._id);

    const jobCardDetail = shapeJobCardDetail(jobCard);
    if (jobCardDetail) {
      jobCardDetail.estimateAmount = jobCardDetail.estimateAmount ?? order?.estimatedCost ?? 0;
    }

    return {
      order: {
        ...shapeOrderSummary(order),
        assignedTechnician: order.assignedTechnician,
        history,
        followUp: order.followUp
      },
      jobCard: jobCardDetail,
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

  async addOrderMediaForTechnician(jobCardId, technicianId, mediaItems) {
    const jobCard = await JobCard.findOne({ _id: jobCardId, technician: technicianId });
    if (!jobCard) {
      throw new ApiError(404, 'Job card not found');
    }

    await AdminService.addOrderMedia(jobCard.order, mediaItems, technicianId);

    return this.getJobCardDetailForTechnician(jobCardId, technicianId);
  },

  async removeOrderMediaForTechnician(jobCardId, technicianId, mediaId) {
    const jobCard = await JobCard.findOne({ _id: jobCardId, technician: technicianId });
    if (!jobCard) {
      throw new ApiError(404, 'Job card not found');
    }

    await AdminService.removeOrderMedia(jobCard.order, mediaId, technicianId);

    return this.getJobCardDetailForTechnician(jobCardId, technicianId);
  },

  async listSpareParts() {
    const parts = await SparePart.find({ isActive: { $ne: false } })
      .sort({ name: 1 })
      .select('name sku unitPrice _id')
      .lean();
    return parts.map((part) => ({
      id: part._id,
      name: part.name,
      sku: part.sku,
      unitPrice: part.unitPrice
    }));
  },

  async listServiceCatalog() {
    const [categories, items] = await Promise.all([
      ServiceCategory.find({ isActive: { $ne: false } })
        .sort({ name: 1 })
        .select('name description _id')
        .lean(),
      ServiceItem.find({ isActive: { $ne: false } })
        .sort({ name: 1 })
        .select('name description basePrice category _id')
        .lean()
    ]);

    const itemsByCategory = items.reduce((acc, item) => {
      const key = String(item.category);
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});

    return categories.map((category) => ({
      id: category._id,
      name: category.name,
      description: category.description,
      items: (itemsByCategory[String(category._id)] || []).map((item) => ({
        id: item._id,
        name: item.name,
        description: item.description,
        basePrice: item.basePrice
      }))
    }));
  },

  async listNotifications(technicianId, filters = {}) {
    const limit = Math.min(Number(filters.limit) || 25, 100);
    const query = { recipient: technicianId };
    if (filters.unreadOnly === 'true' || filters.unreadOnly === true) {
      query.$or = [{ readAt: { $exists: false } }, { readAt: null }];
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return notifications.map((item) => ({
      id: item._id,
      event: item.event,
      payload: item.payload,
      readAt: item.readAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
  },

  async markNotificationRead(notificationId, technicianId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: technicianId },
      { readAt: new Date() },
      { new: true }
    );
    if (!notification) throw new ApiError(404, 'Notification not found');
    return {
      id: notification._id,
      event: notification.event,
      payload: notification.payload,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt
    };
  }
};
