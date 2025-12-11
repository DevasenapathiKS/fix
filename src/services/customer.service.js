import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/api-error.js';
import User from '../models/user.model.js';
import CustomerProfile from '../models/customer-profile.model.js';
import CustomerAddress from '../models/customer-address.model.js';
import ServiceCategory from '../models/service-category.model.js';
import ServiceItem from '../models/service-item.model.js';
import TimeSlotTemplate from '../models/time-slot.model.js';
import TechnicianProfile from '../models/technician-profile.model.js';
import TechnicianCalendar from '../models/calendar.model.js';
import Order from '../models/order.model.js';
import JobCard from '../models/jobcard.model.js';
import Payment from '../models/payment.model.js';
import { USER_ROLES, ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';
import { notificationService, NOTIFICATION_EVENTS } from './notification.service.js';
import { PaymentService } from './payment.service.js';
import { orderHistoryService } from './order-history.service.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault(env.timezone);

const buildToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, name: user.name }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.mobile,
  role: user.role
});

const addHistoryEntry = async ({ orderId, action, message, metadata, performedBy }) =>
  orderHistoryService.recordEntry({ orderId, action, message, metadata, performedBy });

export const CustomerService = {
  async register(payload) {
    const exists = await User.findOne({ $or: [{ email: payload.email.toLowerCase() }, { mobile: payload.phone }] });
    if (exists) {
      throw new ApiError(409, 'Account already exists. Please login');
    }

    const user = await User.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      mobile: payload.phone,
      password: payload.password,
      role: USER_ROLES.CUSTOMER
    });

    await CustomerProfile.create({
      user: user._id,
      displayName: user.name,
      email: user.email,
      phone: user.mobile
    });

    await notificationService.notifyCustomer(user._id, NOTIFICATION_EVENTS.CUSTOMER_ORDER_PLACED, {
      recipient: user._id,
      message: 'Welcome to Fixzep!'
    });

    const token = buildToken(user);
    return { token, user: sanitizeUser(user) };
  },

  async login({ identifier, password }) {
    const query = identifier.includes('@')
      ? { email: identifier.toLowerCase(), role: USER_ROLES.CUSTOMER }
      : { mobile: identifier, role: USER_ROLES.CUSTOMER };
    const user = await User.findOne(query).select('+password');
    if (!user) throw new ApiError(401, 'Invalid credentials');
    const match = await user.comparePassword(password);
    if (!match) throw new ApiError(401, 'Invalid credentials');
    const token = buildToken(user);
    return { token, user: sanitizeUser(user) };
  },

  async forgotPassword({ identifier }) {
    const user = await User.findOne(
      identifier.includes('@') ? { email: identifier.toLowerCase(), role: USER_ROLES.CUSTOMER } : { mobile: identifier, role: USER_ROLES.CUSTOMER }
    );
    if (!user) throw new ApiError(404, 'Customer not found');
    const otp = Math.floor(100000 + Math.random() * 900000);
    await notificationService.notifyCustomer(user._id, NOTIFICATION_EVENTS.CUSTOMER_ORDER_PLACED, {
      recipient: user._id,
      otp
    });
    return { otp, expiresIn: 300 };
  },

  async getProfile(customerId) {
    const [user, profile] = await Promise.all([
      User.findById(customerId),
      CustomerProfile.findOne({ user: customerId })
    ]);
    if (!user) throw new ApiError(404, 'Customer not found');
    let profileDoc = profile;
    if (!profileDoc) {
      profileDoc = await CustomerProfile.findOneAndUpdate(
        { user: customerId },
        {
          $setOnInsert: {
            displayName: user.name,
            email: user.email,
            phone: user.mobile
          }
        },
        { new: true, upsert: true }
      );
    }
    const response = sanitizeUser(user);
    if (profileDoc) {
      response.profile = {
          loyaltyTier: profileDoc.loyaltyTier,
          communicationPreference: profileDoc.preferences?.communication
      };
    }
    return response;
  },

  async updateProfile(customerId, payload) {
    const updates = {};
    if (payload.name) updates.name = payload.name;
    if (payload.email) updates.email = payload.email.toLowerCase();
    if (payload.phone) updates.mobile = payload.phone;
    const user = await User.findByIdAndUpdate(customerId, updates, { new: true });
    if (!user) throw new ApiError(404, 'Customer not found');

    const profileUpdates = {};
    if (payload.name) profileUpdates.displayName = payload.name;
    if (payload.email) profileUpdates.email = payload.email.toLowerCase();
    if (payload.phone) profileUpdates.phone = payload.phone;
    if (payload.communicationPreference) {
      profileUpdates['preferences.communication'] = payload.communicationPreference;
    }
    if (Object.keys(profileUpdates).length) {
      await CustomerProfile.findOneAndUpdate(
        { user: customerId },
        { $set: profileUpdates },
        { new: true, upsert: true }
      );
    }
    return sanitizeUser(user);
  },

  async listAddresses(customerId) {
    return CustomerAddress.find({ customer: customerId }).sort({ isDefault: -1, createdAt: -1 });
  },

  async createAddress(customerId, payload) {
    if (payload.isDefault) {
      await CustomerAddress.updateMany({ customer: customerId }, { isDefault: false });
    }
    const address = await CustomerAddress.create({ ...payload, customer: customerId });
    return address;
  },

  async updateAddress(customerId, addressId, payload) {
    const address = await CustomerAddress.findOneAndUpdate({ _id: addressId, customer: customerId }, payload, { new: true });
    if (!address) throw new ApiError(404, 'Address not found');
    if (payload.isDefault) {
      await CustomerAddress.updateMany({ customer: customerId, _id: { $ne: addressId } }, { isDefault: false });
    }
    return address;
  },

  async deleteAddress(customerId, addressId) {
    const address = await CustomerAddress.findOneAndDelete({ _id: addressId, customer: customerId });
    if (!address) throw new ApiError(404, 'Address not found');
    return true;
  },

  async markPreferred(customerId, addressId) {
    const address = await CustomerAddress.findOne({ _id: addressId, customer: customerId });
    if (!address) throw new ApiError(404, 'Address not found');
    await CustomerAddress.updateMany({ customer: customerId }, { isDefault: false });
    address.isDefault = true;
    await address.save();
    return address;
  },

  async listServices() {
    const categories = await ServiceCategory.find({ isActive: { $ne: false } }).sort({ name: 1 });
    const serviceItems = await ServiceItem.find({}).populate('category', 'name');
    return categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      description: cat.description,
      services: serviceItems.filter((item) => String(item.category?._id || item.category) === String(cat._id))
    }));
  },

  async getServiceDetail(serviceItemId) {
    const service = await ServiceItem.findById(serviceItemId).populate('category', 'name description');
    if (!service) throw new ApiError(404, 'Service not found');
    return service;
  },

  async searchServices(keyword) {
    if (!keyword) return [];
    return ServiceItem.find({ name: { $regex: keyword, $options: 'i' } }).limit(20);
  },

  async listTimeSlots({ startDate, days = 7 }) {
    const start = dayjs(startDate || dayjs()).startOf('day');
    const templates = await TimeSlotTemplate.find({ isActive: true }).sort({ dayOfWeek: 1, startTime: 1 });
    const response = [];
    for (let i = 0; i < days; i += 1) {
      const date = start.add(i, 'day');
      const daySlots = templates.filter((tpl) => tpl.dayOfWeek === date.day()).map((tpl) => ({
        label: tpl.label,
        start: date.set('hour', Number(tpl.startTime.split(':')[0])).set('minute', Number(tpl.startTime.split(':')[1] || 0)).toDate(),
        end: date.set('hour', Number(tpl.endTime.split(':')[0])).set('minute', Number(tpl.endTime.split(':')[1] || 0)).toDate(),
        capacity: tpl.capacity,
        templateId: tpl._id
      }));
      response.push({ date: date.toISOString(), slots: daySlots });
    }
    return response;
  },

  async checkTimeSlotAvailability({ serviceItem, start, end }) {
    const startDate = dayjs(start);
    const template = await TimeSlotTemplate.findOne({
      dayOfWeek: startDate.day(),
      startTime: { $lte: startDate.format('HH:mm') },
      endTime: { $gte: dayjs(end).format('HH:mm') },
      isActive: true
    });
    if (!template) {
      return { available: false, reason: 'No template matches that window' };
    }

    const technicianProfiles = await TechnicianProfile.find({ serviceItems: serviceItem }).select('user');
    if (technicianProfiles.length === 0) {
      return { available: false, reason: 'No technicians for this service' };
    }
    const technicianIds = technicianProfiles.map((profile) => profile.user);

    const overlapping = await TechnicianCalendar.find({
      technician: { $in: technicianIds },
      start: { $lt: new Date(end) },
      end: { $gt: new Date(start) }
    }).select('technician');
    const busyIds = new Set(overlapping.map((entry) => String(entry.technician)));
    const availableTechnician = technicianIds.find((id) => !busyIds.has(String(id)));
    return {
      available: Boolean(availableTechnician),
      candidateTechnician: availableTechnician || null,
      capacity: template.capacity
    };
  },

  async placeOrder(customerId, payload) {
    const [customer, serviceItem, address] = await Promise.all([
      User.findById(customerId),
      ServiceItem.findById(payload.serviceItem).populate('category'),
      CustomerAddress.findOne({ _id: payload.customerAddressId, customer: customerId })
    ]);
    if (!customer) throw new ApiError(404, 'Customer not found');
    if (!serviceItem) throw new ApiError(404, 'Service item not found');
    if (!address) throw new ApiError(404, 'Address not found');

    const availability = await this.checkTimeSlotAvailability({ serviceItem: payload.serviceItem, start: payload.preferredStart, end: payload.preferredEnd });
    if (!availability.available) {
      throw new ApiError(400, availability.reason || 'Slot unavailable');
    }

    const order = await Order.create({
      customer: {
        name: customer.name,
        phone: customer.mobile,
        addressLine1: address.line1,
        addressLine2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode
      },
      customerUser: customerId,
      customerAddress: address._id,
      serviceCategory: serviceItem.category?._id || serviceItem.category,
      serviceItem: serviceItem._id,
      scheduledAt: payload.preferredStart,
      timeWindowStart: payload.preferredStart,
      timeWindowEnd: payload.preferredEnd,
      status: ORDER_STATUS.PENDING_ASSIGNMENT,
      preferredSlot: {
        label: payload.preferredLabel || availability.label,
        start: payload.preferredStart,
        end: payload.preferredEnd
      },
      issueDescription: payload.issueDescription,
      media: (payload.attachments || []).map((url) => ({ url, kind: 'image' })),
      estimatedCost: payload.estimatedCost,
      notes: payload.issueDescription,
      history: [
        {
          action: NOTIFICATION_EVENTS.CUSTOMER_ORDER_PLACED,
          message: 'Order placed by customer',
          metadata: { slot: payload.preferredStart }
        }
      ]
    });

    await addHistoryEntry({
          orderId: order._id,
          action: NOTIFICATION_EVENTS.ORDER_CREATED,
          message: `Order created by customer(${customer.name})`,
          metadata: { scheduledAt: payload.scheduledAt }
        });

    await notificationService.notifyAdmin(NOTIFICATION_EVENTS.CUSTOMER_ORDER_PLACED, {
      orderId: order._id,
      serviceItem: serviceItem.name,
      scheduledAt: payload.preferredStart
    });

    await notificationService.notifyCustomer(customerId, NOTIFICATION_EVENTS.CUSTOMER_ORDER_PLACED, {
      recipient: customerId,
      orderId: order._id
    });

    return order;
  },

  async listOrders(customerId, filters = {}) {
    const query = { customerUser: customerId };
    if (filters.status) query.status = filters.status;
    return Order.find(query)
      .sort({ createdAt: -1 })
      .populate('serviceItem', 'name')
      .populate('assignedTechnician', 'name mobile');
  },

  async getOrderById(customerId, orderId) {
    const order = await Order.findOne({ _id: orderId, customerUser: customerId })
      .populate('serviceItem serviceCategory assignedTechnician', 'name email mobile')
      .populate('customerAddress');
    if (!order) throw new ApiError(404, 'Order not found');
    return order;
  },

  async getTechnicianStatus(customerId, orderId) {
    const order = await this.getOrderById(customerId, orderId);
    const jobCard = await JobCard.findOne({ order: orderId }).populate('technician', 'name mobile');
    return {
      status: order.status,
      technician: jobCard?.technician || null,
      lastCheckInAt: order.technicianTracking?.lastCheckInAt,
      location: order.technicianTracking?.location
    };
  },

  async getAdditionalItems(customerId, orderId) {
    const order = await this.getOrderById(customerId, orderId);
    return order.customerApproval || { status: 'not_required', requestedItems: [] };
  },

  async approveAdditionalItems(customerId, orderId, note) {
    const order = await this.getOrderById(customerId, orderId);
    if (order.customerApproval?.status !== 'pending') {
      throw new ApiError(400, 'No pending approvals');
    }
    order.customerApproval.status = 'approved';
    order.customerApproval.history.push({ status: 'approved', note, performedAt: new Date() });
    await order.save();

    if (order.assignedTechnician) {
      await notificationService.notifyTechnician(order.assignedTechnician, NOTIFICATION_EVENTS.CUSTOMER_APPROVAL_UPDATED, {
        orderId: order._id,
        status: 'approved'
      });
    }
    return order.customerApproval;
  },

  async rejectAdditionalItems(customerId, orderId, note) {
    const order = await this.getOrderById(customerId, orderId);
    if (order.customerApproval?.status !== 'pending') {
      throw new ApiError(400, 'No pending approvals');
    }
    order.customerApproval.status = 'rejected';
    order.customerApproval.history.push({ status: 'rejected', note, performedAt: new Date() });
    await order.save();

    if (order.assignedTechnician) {
      await notificationService.notifyTechnician(order.assignedTechnician, NOTIFICATION_EVENTS.CUSTOMER_APPROVAL_UPDATED, {
        orderId: order._id,
        status: 'rejected'
      });
    }
    return order.customerApproval;
  },

  async initializePayment(customerId, payload) {
    const order = await this.getOrderById(customerId, payload.orderId);
    const payment = await PaymentService.initializeCustomerPayment({
      orderId: order._id,
      customerId,
      method: payload.method,
      amount: payload.amount
    });
    return payment;
  },

  async confirmPayment(customerId, payload) {
    const payment = await PaymentService.confirmCustomerPayment({
      paymentId: payload.paymentId,
      customerId,
      transactionRef: payload.transactionRef
    });
    await notificationService.notifyCustomer(customerId, NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
      recipient: customerId,
      paymentId: payment._id,
      orderId: payment.order
    });
    return payment;
  },

  async getPaymentStatus(customerId, paymentId) {
    const payment = await Payment.findOne({ _id: paymentId, customer: customerId });
    if (!payment) throw new ApiError(404, 'Payment not found');
    return payment;
  },

  async getHistory(customerId, filters = {}) {
    const orders = await this.listOrders(customerId, filters);
    const completedOrders = orders.filter((order) => order.status === ORDER_STATUS.COMPLETED);
    return completedOrders;
  },

  async getInvoice(customerId, orderId) {
    const order = await this.getOrderById(customerId, orderId);
    const payment = await Payment.findOne({ order: orderId, customer: customerId, status: PAYMENT_STATUS.SUCCESS });
    const jobCard = await JobCard.findOne({ order: orderId });
    return {
      order,
      payment,
      jobCard,
      totals: {
        estimate: jobCard?.estimateAmount || order.estimatedCost,
        additional: jobCard?.additionalCharges || 0,
        final: jobCard?.finalAmount || payment?.amount || order.estimatedCost
      }
    };
  },

  async rateOrder(customerId, orderId, payload) {
    const order = await this.getOrderById(customerId, orderId);
    order.customerExperience = {
      rating: payload.rating,
      comment: payload.comment,
      ratedAt: new Date()
    };
    await order.save();
    return order.customerExperience;
  }
};
