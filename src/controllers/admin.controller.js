import asyncHandler from '../utils/async-handler.js';
import { AssignmentService } from '../services/assignment.service.js';
import { AdminService } from '../services/admin.service.js';
import { successResponse } from '../utils/response.js';

export const assignTechnician = asyncHandler(async (req, res) => {
  const { technicianId } = req.body;
  const order = await AssignmentService.assignTechnician({
    orderId: req.params.orderId,
    technicianId,
    adminId: req.user.id
  });
  return successResponse(res, { data: order, message: 'Technician assigned' });
});

export const upsertCategory = asyncHandler(async (req, res) => {
  const category = await AdminService.upsertCategory(req.body);
  return successResponse(res, { data: category, message: 'Category saved' });
});

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await AdminService.listCategories();
  return successResponse(res, { data: categories });
});

export const upsertServiceItem = asyncHandler(async (req, res) => {
  const serviceItem = await AdminService.upsertServiceItem(req.body);
  return successResponse(res, { data: serviceItem, message: 'Service item saved' });
});

export const listServiceItems = asyncHandler(async (req, res) => {
  const items = await AdminService.listServiceItems(req.query.categoryId);
  return successResponse(res, { data: items });
});

export const listTechnicians = asyncHandler(async (_req, res) => {
  const technicians = await AdminService.listTechnicians();
  return successResponse(res, { data: technicians });
});

export const listSpareParts = asyncHandler(async (req, res) => {
  const parts = await AdminService.listSpareParts();
  return successResponse(res, { data: parts });
});

export const upsertSparePart = asyncHandler(async (req, res) => {
  const part = await AdminService.upsertSparePart(req.body);
  return successResponse(res, { data: part, message: 'Spare part saved' });
});

export const listTechnicianSkills = asyncHandler(async (_req, res) => {
  const skills = await AdminService.listTechnicianSkills();
  return successResponse(res, { data: skills });
});

export const createTechnicianSkill = asyncHandler(async (req, res) => {
  const skill = await AdminService.createTechnicianSkill(req.body);
  return successResponse(res, { status: 201, data: skill, message: 'Skill saved' });
});

export const technicianAvailability = asyncHandler(async (req, res) => {
  const data = await AdminService.viewTechnicianAvailability(req.params.technicianId);
  return successResponse(res, { data });
});

export const technicianSchedule = asyncHandler(async (req, res) => {
  const data = await AdminService.viewTechnicianSchedule(req.params.technicianId, {
    startDate: req.query.start,
    endDate: req.query.end
  });
  return successResponse(res, { data });
});

export const listTimeSlots = asyncHandler(async (_req, res) => {
  const slots = await AdminService.listTimeSlots();
  return successResponse(res, { data: slots });
});

export const listTechnicianAttendance = asyncHandler(async (req, res) => {
  const attendance = await AdminService.listTechnicianAttendance(req.params.technicianId, {
    from: req.query.from,
    to: req.query.to
  });
  return successResponse(res, { data: attendance });
});

export const markTechnicianAttendance = asyncHandler(async (req, res) => {
  const attendance = await AdminService.saveTechnicianAttendance(req.params.technicianId, req.body);
  return successResponse(res, { data: attendance, message: 'Attendance updated' });
});

export const listCustomers = asyncHandler(async (_req, res) => {
  const customers = await AdminService.listCustomers();
  return successResponse(res, { data: customers });
});

export const findCustomerByPhone = asyncHandler(async (req, res) => {
  const customer = await AdminService.findCustomerByPhone(req.params.phone);
  return successResponse(res, { data: customer });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await AdminService.createCustomer(req.body);
  return successResponse(res, { status: 201, data: customer, message: 'Customer created successfully' });
});

export const updateCustomerAddress = asyncHandler(async (req, res) => {
  const customer = await AdminService.updateCustomerAddress(req.params.customerId, req.body);
  return successResponse(res, { data: customer, message: 'Address updated successfully' });
});

export const createOrderFromAdmin = asyncHandler(async (req, res) => {
  const order = await AdminService.createOrderFromAdmin(req.body, req.user.id);
  return successResponse(res, { status: 201, data: order, message: 'Order created successfully' });
});

export const createTimeSlot = asyncHandler(async (req, res) => {
  const slot = await AdminService.createTimeSlot(req.body);
  return successResponse(res, { status: 201, data: slot, message: 'Time slot created' });
});

export const updateTimeSlot = asyncHandler(async (req, res) => {
  const slot = await AdminService.updateTimeSlot(req.params.timeSlotId, req.body);
  return successResponse(res, { data: slot, message: 'Time slot updated' });
});

export const deleteTimeSlot = asyncHandler(async (req, res) => {
  await AdminService.deleteTimeSlot(req.params.timeSlotId);
  return successResponse(res, { message: 'Time slot deleted' });
});

export const adminOrders = asyncHandler(async (req, res) => {
  const orders = await AdminService.getOrdersForAdmin(req.query);
  return successResponse(res, { data: orders });
});

export const orderTechnicianCandidates = asyncHandler(async (req, res) => {
  const technicians = await AdminService.listTechniciansForOrder(req.params.orderId);
  return successResponse(res, { data: technicians });
});

export const orderJobCard = asyncHandler(async (req, res) => {
  const payload = await AdminService.getJobCardDetail(req.params.orderId);
  return successResponse(res, { data: payload });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await AdminService.createUser(req.body);
  return successResponse(res, { status: 201, data: user, message: 'User created successfully' });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const payload = await AdminService.updateOrderAndJobStatus(req.params.orderId, {
    status: req.body.status,
    reason: req.body.reason,
    attachments: req.body.attachments,
    adminId: req.user.id
  });
  return successResponse(res, { data: payload, message: 'Status updated successfully' });
});

export const uploadOrderMedia = asyncHandler(async (req, res) => {
  const payload = await AdminService.addOrderMedia(req.params.orderId, req.body.media, req.user.id);
  return successResponse(res, { data: payload, message: 'Media uploaded successfully' });
});

export const deleteOrderMedia = asyncHandler(async (req, res) => {
  const payload = await AdminService.removeOrderMedia(req.params.orderId, req.params.mediaId, req.user.id);
  return successResponse(res, { data: payload, message: 'Media deleted successfully' });
});

export const updateOrderPaymentStatus = asyncHandler(async (req, res) => {
  const payload = await AdminService.updateJobPaymentStatus(req.params.orderId, req.body.status, req.user.id);
  return successResponse(res, { data: payload, message: 'Payment status updated successfully' });
});

export const addOrderHistoryNote = asyncHandler(async (req, res) => {
  const payload = await AdminService.addOrderHistoryNote(req.params.orderId, req.body.message, req.user.id);
  return successResponse(res, { data: payload, message: 'Activity note recorded' });
});

export const addOrderSparePart = asyncHandler(async (req, res) => {
  const payload = await AdminService.addJobSparePart(req.params.orderId, req.body, req.user.id);
  return successResponse(res, { data: payload, message: 'Spare part added successfully' });
});

export const addOrderAdditionalService = asyncHandler(async (req, res) => {
  const payload = await AdminService.addJobAdditionalService(req.params.orderId, req.body, req.user.id);
  return successResponse(res, { data: payload, message: 'Additional service added successfully' });
});

export const removeOrderSparePart = asyncHandler(async (req, res) => {
  const payload = await AdminService.removeJobSparePart(req.params.orderId, parseInt(req.params.index), req.user.id);
  return successResponse(res, { data: payload, message: 'Spare part removed successfully' });
});

export const removeOrderAdditionalService = asyncHandler(async (req, res) => {
  const payload = await AdminService.removeJobAdditionalService(req.params.orderId, parseInt(req.params.index), req.user.id);
  return successResponse(res, { data: payload, message: 'Additional service removed successfully' });
});
