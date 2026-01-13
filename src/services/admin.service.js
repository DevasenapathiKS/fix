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
import CustomerProfile from '../models/customer-profile.model.js';
import CustomerAddress from '../models/customer-address.model.js';
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

  async updateCategory(categoryId, payload) {
    const category = await ServiceCategory.findById(categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Check if name is being changed and if new name already exists
    if (payload.name && payload.name !== category.name) {
      const existingCategory = await ServiceCategory.findOne({ name: payload.name, _id: { $ne: categoryId } });
      if (existingCategory) {
        throw new ApiError(409, 'A category with this name already exists');
      }
    }

    if (payload.name !== undefined) category.name = payload.name;
    if (payload.description !== undefined) category.description = payload.description;
    if (payload.imageUrl !== undefined) category.imageUrl = payload.imageUrl;
    if (payload.isActive !== undefined) category.isActive = payload.isActive;

    await category.save();
    return category;
  },

  async deleteCategory(categoryId) {
    const category = await ServiceCategory.findById(categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Check if there are service items in this category
    const serviceItemCount = await ServiceItem.countDocuments({ category: categoryId });
    if (serviceItemCount > 0) {
      throw new ApiError(400, `Cannot delete category with ${serviceItemCount} service item(s). Delete or move the items first.`);
    }

    // Check if there are orders using this category
    const orderCount = await Order.countDocuments({ serviceCategory: categoryId });
    if (orderCount > 0) {
      throw new ApiError(400, `Cannot delete category with ${orderCount} existing order(s).`);
    }

    await ServiceCategory.deleteOne({ _id: categoryId });
    return { message: 'Category deleted successfully' };
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

  async updateServiceItem(serviceItemId, payload) {
    const serviceItem = await ServiceItem.findById(serviceItemId);
    if (!serviceItem) {
      throw new ApiError(404, 'Service item not found');
    }

    // Check if name is being changed and if new name already exists in the same category
    if (payload.name && payload.name !== serviceItem.name) {
      const existingItem = await ServiceItem.findOne({
        category: serviceItem.category,
        name: payload.name,
        _id: { $ne: serviceItemId }
      });
      if (existingItem) {
        throw new ApiError(409, 'A service item with this name already exists in this category');
      }
    }

    if (payload.name !== undefined) serviceItem.name = payload.name;
    if (payload.description !== undefined) serviceItem.description = payload.description;
    if (payload.imageUrl !== undefined) serviceItem.imageUrl = payload.imageUrl;
    if (payload.basePrice !== undefined) serviceItem.basePrice = payload.basePrice;
    if (payload.category !== undefined) serviceItem.category = payload.category;

    await serviceItem.save();
    return serviceItem.populate('category', 'name');
  },

  async deleteServiceItem(serviceItemId) {
    const serviceItem = await ServiceItem.findById(serviceItemId);
    if (!serviceItem) {
      throw new ApiError(404, 'Service item not found');
    }

    // Check if there are orders using this service item
    const orderCount = await Order.countDocuments({ serviceItem: serviceItemId });
    if (orderCount > 0) {
      throw new ApiError(400, `Cannot delete service item with ${orderCount} existing order(s).`);
    }

    await ServiceItem.deleteOne({ _id: serviceItemId });
    return { message: 'Service item deleted successfully' };
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

  async getTechnician(technicianId) {
    const profile = await TechnicianProfile.findOne({ user: technicianId })
      .populate('user', 'name email mobile status')
      .populate('serviceItems', '_id name')
      .populate('serviceCategories', '_id name')
      .populate('skills', '_id name')
      .lean();

    if (!profile) {
      throw new ApiError(404, 'Technician not found');
    }

    const techUser = profile.user || {};
    return {
      id: techUser._id?.toString() || String(profile.user),
      name: techUser.name,
      email: techUser.email,
      phone: techUser.mobile,
      status: techUser.status,
      experienceYears: profile.experienceYears,
      averageRating: profile.averageRating,
      skills: (profile.skills || []).map((skill) => ({
        id: skill._id?.toString(),
        name: skill.name
      })),
      workingHours: profile.workingHours,
      serviceItems: (profile.serviceItems || []).map((item) => ({
        id: item._id?.toString(),
        name: item.name
      })),
      serviceCategories: (profile.serviceCategories || []).map((cat) => ({
        id: cat._id?.toString(),
        name: cat.name
      }))
    };
  },

  async updateTechnician(technicianId, payload) {
    const user = await User.findById(technicianId);
    if (!user || user.role !== USER_ROLES.TECHNICIAN) {
      throw new ApiError(404, 'Technician not found');
    }

    const profile = await TechnicianProfile.findOne({ user: technicianId });
    if (!profile) {
      throw new ApiError(404, 'Technician profile not found');
    }

    // Update user fields
    if (payload.name !== undefined) user.name = payload.name;
    if (payload.email !== undefined) user.email = payload.email;
    if (payload.phone !== undefined) {
      // Check if phone is already in use
      const existingUser = await User.findOne({ mobile: payload.phone, _id: { $ne: technicianId } });
      if (existingUser) {
        throw new ApiError(409, 'Phone number already in use');
      }
      user.mobile = payload.phone;
    }
    if (payload.status !== undefined) user.status = payload.status;
    await user.save();

    // Update profile fields
    if (payload.experienceYears !== undefined) profile.experienceYears = payload.experienceYears;
    if (payload.workingHours !== undefined) profile.workingHours = payload.workingHours;

    // Update skills
    if (payload.skills !== undefined) {
      const skillIds = [];
      for (const skillInput of payload.skills) {
        if (mongoose.Types.ObjectId.isValid(skillInput)) {
          skillIds.push(skillInput);
        } else if (typeof skillInput === 'string' && skillInput.trim()) {
          // Create new skill if it doesn't exist
          let skill = await TechnicianSkill.findOne({ name: new RegExp(`^${skillInput.trim()}$`, 'i') });
          if (!skill) {
            skill = await TechnicianSkill.create({ name: skillInput.trim() });
          }
          skillIds.push(skill._id);
        }
      }
      profile.skills = skillIds;
    }

    // Update service items
    if (payload.serviceItems !== undefined) {
      const validItemIds = payload.serviceItems.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (validItemIds.length) {
        const items = await ServiceItem.find({ _id: { $in: validItemIds } }, '_id');
        profile.serviceItems = items.map((item) => item._id);
      } else {
        profile.serviceItems = [];
      }
    }

    // Update service categories
    if (payload.serviceCategories !== undefined) {
      const validCatIds = payload.serviceCategories.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (validCatIds.length) {
        const cats = await ServiceCategory.find({ _id: { $in: validCatIds } }, '_id');
        profile.serviceCategories = cats.map((cat) => cat._id);
      } else {
        profile.serviceCategories = [];
      }
    }

    await profile.save();

    return this.getTechnician(technicianId);
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
    const { status, customerId } = filters;
    const query = {};
    if (status) query.status = status;
    if (customerId) query.customerUser = customerId;
    return Order.find(query)
      .populate('serviceCategory serviceItem assignedTechnician', 'name')
      .sort({ createdAt: -1 });
  },

  async listCustomers() {
    const profiles = await CustomerProfile.find({}).populate('user', 'name email mobile status').lean();
    if (!profiles.length) return [];
    const userIds = profiles.map((p) => (p.user?._id ? String(p.user._id) : String(p.user)));
    const addresses = await CustomerAddress.find({ customer: { $in: userIds } }).lean();
    const addressMap = addresses.reduce((acc, a) => {
      const key = String(a.customer);
      if (!acc[key]) acc[key] = a;
      if (a.isDefault) acc[key] = a;
      return acc;
    }, {});

    return profiles.map((p) => {
      const user = p.user || {};
      const id = user._id ? String(user._id) : String(user);
      const addr = addressMap[id];
      return {
        id,
        name: p.displayName || user.name,
        email: p.email || user.email,
        phone: p.phone || user.mobile,
        city: addr?.city || '',
        addressLine1: addr?.line1 || '',
        addressLine2: addr?.line2 || '',
        postalCode: addr?.postalCode || '',
        loyaltyTier: p.loyaltyTier || 'standard',
        createdAt: p.createdAt
      };
    });
  },

  async findCustomerByPhone(phone) {
    const user = await User.findOne({ mobile: phone, role: USER_ROLES.CUSTOMER }).lean();
    if (!user) return null;

    const profile = await CustomerProfile.findOne({ user: user._id }).lean();
    const addresses = await CustomerAddress.find({ customer: user._id }).lean();
    const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

    return {
      id: String(user._id),
      name: profile?.displayName || user.name,
      email: profile?.email || user.email,
      phone: user.mobile,
      city: defaultAddress?.city || '',
      addressLine1: defaultAddress?.line1 || '',
      addressLine2: defaultAddress?.line2 || '',
      postalCode: defaultAddress?.postalCode || '',
      addresses: addresses.map((a) => ({
        id: String(a._id),
        label: a.label,
        contactName: a.contactName,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        state: a.state,
        postalCode: a.postalCode,
        isDefault: a.isDefault
      }))
    };
  },

  async createCustomer(payload) {
    const exists = await User.findOne({ mobile: payload.phone });
    if (exists) {
      throw new ApiError(409, 'Customer with this phone number already exists');
    }

    const user = await User.create({
      name: payload.name,
      email: payload.email || `${payload.phone}@customer.local`,
      mobile: payload.phone,
      password: payload.password || 'Customer@123',
      role: USER_ROLES.CUSTOMER
    });

    await CustomerProfile.create({
      user: user._id,
      displayName: user.name,
      email: user.email,
      phone: user.mobile
    });

    if (payload.address) {
      await CustomerAddress.create({
        customer: user._id,
        contactName: payload.name,
        phone: payload.phone,
        line1: payload.address.line1,
        line2: payload.address.line2,
        city: payload.address.city,
        state: payload.address.state,
        postalCode: payload.address.postalCode,
        isDefault: true
      });
    }

    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.mobile
    };
  },

  async updateCustomerAddress(customerId, payload) {
    const user = await User.findById(customerId);
    if (!user) {
      throw new ApiError(404, 'Customer not found');
    }

    if (payload.addressId) {
      // Update existing address
      const address = await CustomerAddress.findOne({ _id: payload.addressId, customer: customerId });
      if (!address) {
        throw new ApiError(404, 'Address not found');
      }
      
      address.line1 = payload.line1;
      address.line2 = payload.line2 || '';
      address.city = payload.city;
      address.state = payload.state;
      address.postalCode = payload.postalCode || '';
      await address.save();
    } else {
      // Create new address
      await CustomerAddress.create({
        customer: customerId,
        contactName: user.name,
        phone: user.mobile,
        line1: payload.line1,
        line2: payload.line2,
        city: payload.city,
        state: payload.state,
        postalCode: payload.postalCode,
        isDefault: false
      });
    }

    return this.findCustomerByPhone(user.mobile);
  },

  async updateCustomerAddress(customerId, addressData) {
    const user = await User.findById(customerId);
    if (!user) {
      throw new ApiError(404, 'Customer not found');
    }

    // Find default address or create new one
    let address = await CustomerAddress.findOne({ customer: customerId, isDefault: true });
    
    if (address) {
      // Update existing default address
      address.line1 = addressData.line1;
      address.line2 = addressData.line2 || '';
      address.city = addressData.city;
      address.state = addressData.state;
      address.postalCode = addressData.postalCode || '';
      await address.save();
    } else {
      // Create new default address
      address = await CustomerAddress.create({
        customer: customerId,
        contactName: user.name,
        phone: user.mobile,
        line1: addressData.line1,
        line2: addressData.line2,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        isDefault: true
      });
    }

    // Return customer summary with updated address
    const addresses = await CustomerAddress.find({ customer: customerId });
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.mobile,
      addressLine1: address.line1,
      addressLine2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      addresses: addresses.map(addr => ({
        id: String(addr._id),
        label: addr.label || 'Address',
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        isDefault: addr.isDefault
      }))
    };
  },

  async updateCustomer(customerId, payload) {
    const user = await User.findById(customerId);
    if (!user) {
      throw new ApiError(404, 'Customer not found');
    }

    // Check if phone is being changed and if new phone already exists
    if (payload.phone && payload.phone !== user.mobile) {
      const existingUser = await User.findOne({ mobile: payload.phone, _id: { $ne: customerId } });
      if (existingUser) {
        throw new ApiError(409, 'Phone number already in use by another customer');
      }
      user.mobile = payload.phone;
    }

    // Update user fields
    if (payload.name) user.name = payload.name;
    if (payload.email) user.email = payload.email;
    await user.save();

    // Update customer profile
    const profile = await CustomerProfile.findOne({ user: customerId });
    if (profile) {
      if (payload.name) profile.displayName = payload.name;
      if (payload.email) profile.email = payload.email;
      if (payload.phone) profile.phone = payload.phone;
      await profile.save();
    }

    return this.findCustomerByPhone(user.mobile);
  },

  async deleteCustomerAddress(customerId, addressId) {
    const user = await User.findById(customerId);
    if (!user) {
      throw new ApiError(404, 'Customer not found');
    }

    const address = await CustomerAddress.findOne({ _id: addressId, customer: customerId });
    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    // Don't allow deleting the only address
    const addressCount = await CustomerAddress.countDocuments({ customer: customerId });
    if (addressCount <= 1) {
      throw new ApiError(400, 'Cannot delete the only address');
    }

    // If deleting default address, make another one default
    if (address.isDefault) {
      const nextDefault = await CustomerAddress.findOne({ customer: customerId, _id: { $ne: addressId } });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    await CustomerAddress.deleteOne({ _id: addressId });

    return this.findCustomerByPhone(user.mobile);
  },

  async createOrderFromAdmin(payload, adminId) {
    const [serviceItem, customer] = await Promise.all([
      ServiceItem.findById(payload.serviceItem).populate('category'),
      User.findById(payload.customerId)
    ]);

    if (!serviceItem) throw new ApiError(404, 'Service item not found');
    if (!customer) throw new ApiError(404, 'Customer not found');

    let address = null;
    
    // If addressId is provided and not empty, try to find it
    if (payload.addressId && payload.addressId.trim()) {
      address = await CustomerAddress.findOne({ _id: payload.addressId, customer: payload.customerId });
    }
    
    // If address object is provided, create new address
    if (!address && payload.address && payload.address.line1) {
      address = await CustomerAddress.create({
        customer: payload.customerId,
        contactName: customer.name,
        phone: customer.mobile,
        line1: payload.address.line1,
        line2: payload.address.line2,
        city: payload.address.city,
        state: payload.address.state,
        postalCode: payload.address.postalCode,
        isDefault: false
      });
    }
    
    if (!address) {
      // Try to find default address
      address = await CustomerAddress.findOne({ customer: payload.customerId, isDefault: true });
    }
    
    if (!address) {
      // Try to find any address
      address = await CustomerAddress.findOne({ customer: payload.customerId });
    }

    if (!address) {
      throw new ApiError(400, 'Customer address is required. Please provide address details or ensure customer has a saved address.');
    }

    const order = await Order.create({
      customer: {
        name: customer.name,
        phone: customer.mobile,
        email: customer.email,
        addressLine1: address.line1,
        addressLine2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode
      },
      customerUser: payload.customerId,
      customerAddress: address._id,
      serviceCategory: serviceItem.category?._id || serviceItem.category,
      serviceItem: serviceItem._id,
      scheduledAt: payload.scheduledAt,
      timeWindowStart: payload.timeWindowStart,
      timeWindowEnd: payload.timeWindowEnd,
      status: ORDER_STATUS.PENDING_ASSIGNMENT,
      preferredSlot: {
        label: payload.slotLabel || 'Custom',
        start: payload.timeWindowStart,
        end: payload.timeWindowEnd
      },
      issueDescription: payload.issueDescription || '',
      estimatedCost: payload.estimatedCost || serviceItem.basePrice,
      notes: payload.notes
    });

    await orderHistoryService.recordEntry({
      orderId: order._id,
      action: NOTIFICATION_EVENTS.ORDER_CREATED,
      message: `Order created by admin for customer ${customer.name}`,
      metadata: { scheduledAt: payload.scheduledAt },
      performedBy: adminId
    });

    await notificationService.notifyCustomer(payload.customerId, NOTIFICATION_EVENTS.CUSTOMER_ORDER_PLACED, {
      recipient: payload.customerId,
      orderId: order._id
    });

    return order.populate('serviceItem serviceCategory', 'name');
  },

  async listTechniciansForOrder(orderId) {
    const order = await Order.findById(orderId).select('serviceItem timeWindowStart timeWindowEnd scheduledAt');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const profiles = await TechnicianProfile.find()
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
    const { startDate, endDate } = options;
    
    // Build query - filter by date range if provided
    const query = { technician: technicianId };
    
    if (startDate && endDate) {
      // Use proper overlap logic: entry.start < endDate AND entry.end > startDate
      query.start = { $lt: new Date(endDate) };
      query.end = { $gt: new Date(startDate) };
    }
    
    const entries = await TechnicianCalendar.find(query)
      .sort({ start: 1 }) // Sort by start time ascending
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

    // Notify customer when cancellation is approved
    if (status === ORDER_STATUS.CANCELLED && order.customerUser) {
      await notificationService.notifyCustomer(order.customerUser, NOTIFICATION_EVENTS.ORDER_CANCELLED, {
        recipient: order.customerUser,
        orderId,
        reason
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

  async addJobSparePart(orderId, payload, adminId) {
    const { sparePartId, quantity, unitPrice } = payload;
    
    if (!sparePartId) {
      throw new ApiError(400, 'Spare part ID is required');
    }
    if (quantity <= 0) {
      throw new ApiError(400, 'Quantity must be greater than 0');
    }
    if (unitPrice < 0) {
      throw new ApiError(400, 'Unit price cannot be negative');
    }

    // Verify spare part exists
    const sparePart = await SparePart.findById(sparePartId);
    if (!sparePart) {
      throw new ApiError(404, 'Spare part not found');
    }

    const order = await Order.findById(orderId).select('status assignedTechnician');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new ApiError(400, 'Cannot modify completed jobs');
    }

    let jobCard = await JobCard.findOne({ order: orderId });
    if (!jobCard) {
      // Create job card if it doesn't exist
      if (!order.assignedTechnician) {
        throw new ApiError(400, 'Order must have an assigned technician before adding spare parts');
      }
      jobCard = await JobCard.create({
        order: orderId,
        technician: order.assignedTechnician,
        status: JOB_STATUS.PENDING,
        sparePartsUsed: []
      });
    }

    jobCard.sparePartsUsed.push({
      part: sparePartId,
      quantity: parseFloat(quantity),
      unitPrice: parseFloat(unitPrice)
    });

    await jobCard.save();

    await orderHistoryService.recordEntry({
      orderId,
      action: 'SPARE_PART_ADDED',
      message: `Added spare part: ${sparePart.name} (Qty: ${quantity})`,
      performedBy: adminId
    });

    return this.getJobCardDetail(orderId);
  },

  async addJobAdditionalService(orderId, payload, adminId) {
    const { description, amount, serviceItemId } = payload;
    
    if (!description || !description.trim()) {
      throw new ApiError(400, 'Service description is required');
    }
    if (amount < 0) {
      throw new ApiError(400, 'Amount cannot be negative');
    }

    const order = await Order.findById(orderId)
      .select('status assignedTechnician serviceCategory serviceItem')
      .populate('serviceItem');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new ApiError(400, 'Cannot modify completed jobs');
    }

    // Get service item for category reference
    let serviceItem = null;
    let serviceCategory = null;
    
    if (serviceItemId) {
      serviceItem = await ServiceItem.findById(serviceItemId);
      if (!serviceItem) {
        throw new ApiError(404, 'Service item not found');
      }
      serviceCategory = serviceItem.category;
    } else {
      // Use the order's service item and category as defaults
      if (order.serviceItem && typeof order.serviceItem === 'object') {
        serviceItem = order.serviceItem._id;
        serviceCategory = order.serviceItem.category;
      } else if (order.serviceItem) {
        serviceItem = order.serviceItem;
        serviceCategory = order.serviceCategory;
      } else {
        throw new ApiError(400, 'Service item is required for additional services');
      }
    }

    let jobCard = await JobCard.findOne({ order: orderId });
    if (!jobCard) {
      // Create job card if it doesn't exist
      if (!order.assignedTechnician) {
        throw new ApiError(400, 'Order must have an assigned technician before adding services');
      }
      jobCard = await JobCard.create({
        order: orderId,
        technician: order.assignedTechnician,
        status: JOB_STATUS.PENDING,
        extraWork: []
      });
    }

    if (!jobCard.extraWork) {
      jobCard.extraWork = [];
    }

    jobCard.extraWork.push({
      description: description.trim(),
      amount: parseFloat(amount),
      serviceCategory: serviceCategory,
      serviceItem: serviceItem
    });

    await jobCard.save();

    await orderHistoryService.recordEntry({
      orderId,
      action: 'SERVICE_ADDED',
      message: `Added additional service: ${description}`,
      performedBy: adminId
    });

    return this.getJobCardDetail(orderId);
  },

  async removeJobSparePart(orderId, index, adminId) {
    const order = await Order.findById(orderId).select('status');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new ApiError(400, 'Cannot modify completed jobs');
    }

    const jobCard = await JobCard.findOne({ order: orderId });
    if (!jobCard) {
      throw new ApiError(404, 'Job card not found');
    }

    if (!jobCard.sparePartsUsed || index < 0 || index >= jobCard.sparePartsUsed.length) {
      throw new ApiError(400, 'Invalid spare part index');
    }

    const removedPart = jobCard.sparePartsUsed[index];
    jobCard.sparePartsUsed.splice(index, 1);
    await jobCard.save();

    const partInfo = typeof removedPart.part === 'object' ? removedPart.part : await SparePart.findById(removedPart.part);
    const partName = partInfo?.name || partInfo?.sku || 'Spare part';

    await orderHistoryService.recordEntry({
      orderId,
      action: 'SPARE_PART_REMOVED',
      message: `Removed spare part: ${partName}`,
      performedBy: adminId
    });

    return this.getJobCardDetail(orderId);
  },

  async removeJobAdditionalService(orderId, index, adminId) {
    const order = await Order.findById(orderId).select('status');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new ApiError(400, 'Cannot modify completed jobs');
    }

    const jobCard = await JobCard.findOne({ order: orderId });
    if (!jobCard) {
      throw new ApiError(404, 'Job card not found');
    }

    if (!jobCard.extraWork || index < 0 || index >= jobCard.extraWork.length) {
      throw new ApiError(400, 'Invalid service index');
    }

    const removedService = jobCard.extraWork[index];
    jobCard.extraWork.splice(index, 1);
    await jobCard.save();

    await orderHistoryService.recordEntry({
      orderId,
      action: 'SERVICE_REMOVED',
      message: `Removed additional service: ${removedService.description}`,
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
