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
import { orderHistoryService } from './order-history.service.js';

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
    const slotStart = start || end;
    return TechnicianCalendar.create({
      technician: technicianId,
      order: orderId,
      date: slotStart || new Date(),
      start: slotStart || new Date(),
      end: end || start || new Date()
    });
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
