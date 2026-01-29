import asyncHandler from '../utils/async-handler.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { CustomerService } from '../services/customer.service.js';
import { uploadFileToS3 } from '../middlewares/upload.middleware.js';

export const registerCustomer = asyncHandler(async (req, res) => {
  const result = await CustomerService.register(req.body);
  return successResponse(res, { status: 201, data: result, message: 'Account created successfully' });
});

export const loginCustomer = asyncHandler(async (req, res) => {
  const result = await CustomerService.login(req.body);
  return successResponse(res, { data: result, message: 'Login successful' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await CustomerService.forgotPassword(req.body);
  return successResponse(res, { data: result, message: 'If an account exists, a reset link has been sent to the email on file.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await CustomerService.resetPassword(req.body);
  return successResponse(res, { data: result, message: 'Password updated successfully' });
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await CustomerService.getProfile(req.user.id);
  return successResponse(res, { data: profile });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await CustomerService.updateProfile(req.user.id, req.body);
  return successResponse(res, { data: profile, message: 'Profile updated' });
});

export const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await CustomerService.listAddresses(req.user.id);
  return successResponse(res, { data: addresses });
});

export const createAddress = asyncHandler(async (req, res) => {
  const address = await CustomerService.createAddress(req.user.id, req.body);
  return successResponse(res, { status: 201, data: address, message: 'Address saved' });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await CustomerService.updateAddress(req.user.id, req.params.addressId, req.body);
  return successResponse(res, { data: address, message: 'Address updated' });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  await CustomerService.deleteAddress(req.user.id, req.params.addressId);
  return successResponse(res, { data: { deleted: true }, message: 'Address removed' });
});

export const markPreferredAddress = asyncHandler(async (req, res) => {
  const address = await CustomerService.markPreferred(req.user.id, req.params.addressId);
  return successResponse(res, { data: address, message: 'Address marked as preferred' });
});

export const listServices = asyncHandler(async (req, res) => {
  const services = await CustomerService.listServices();
  return successResponse(res, { data: services });
});

export const getServiceDetail = asyncHandler(async (req, res) => {
  const service = await CustomerService.getServiceDetail(req.params.serviceId);
  return successResponse(res, { data: service });
});

export const searchServices = asyncHandler(async (req, res) => {
  const services = await CustomerService.searchServices(req.query.keyword);
  return successResponse(res, { data: services });
});

export const listTimeSlots = asyncHandler(async (req, res) => {
  const slots = await CustomerService.listTimeSlots({
    startDate: req.query.startDate,
    days: req.query.days ? Number(req.query.days) : undefined
  });
  return successResponse(res, { data: slots });
});

export const checkTimeSlot = asyncHandler(async (req, res) => {
  const result = await CustomerService.checkTimeSlotAvailability(req.body);
  return successResponse(res, { data: result });
});

export const placeOrder = asyncHandler(async (req, res) => {
  const order = await CustomerService.placeOrder(req.user.id, req.body);
  return successResponse(res, { status: 201, data: order, message: 'Order placed successfully' });
});

export const listOrders = asyncHandler(async (req, res) => {
  const orders = await CustomerService.listOrders(req.user.id, { status: req.query.status });
  return successResponse(res, { data: orders });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await CustomerService.getOrderById(req.user.id, req.params.orderId);
  return successResponse(res, { data: order });
});

export const getTechnicianStatus = asyncHandler(async (req, res) => {
  const status = await CustomerService.getTechnicianStatus(req.user.id, req.params.orderId);
  return successResponse(res, { data: status });
});

export const getAdditionalItems = asyncHandler(async (req, res) => {
  const approval = await CustomerService.getAdditionalItems(req.user.id, req.params.orderId);
  return successResponse(res, { data: approval });
});

export const approveAdditionalItems = asyncHandler(async (req, res) => {
  const approval = await CustomerService.approveAdditionalItems(req.user.id, req.params.orderId, req.body.note);
  return successResponse(res, { data: approval, message: 'Additional items approved' });
});

export const rejectAdditionalItems = asyncHandler(async (req, res) => {
  const approval = await CustomerService.rejectAdditionalItems(req.user.id, req.params.orderId, req.body.note);
  return successResponse(res, { data: approval, message: 'Additional items rejected' });
});

export const rateOrder = asyncHandler(async (req, res) => {
  const experience = await CustomerService.rateOrder(req.user.id, req.params.orderId, req.body);
  return successResponse(res, { data: experience, message: 'Thank you for the feedback' });
});

export const initializePayment = asyncHandler(async (req, res) => {
  const payment = await CustomerService.initializePayment(req.user.id, req.body);
  return successResponse(res, { status: 201, data: payment, message: 'Payment initiated' });
});

export const confirmPayment = asyncHandler(async (req, res) => {
  const payment = await CustomerService.confirmPayment(req.user.id, req.body);
  return successResponse(res, { data: payment, message: 'Payment captured' });
});

export const getPaymentStatus = asyncHandler(async (req, res) => {
  const payment = await CustomerService.getPaymentStatus(req.user.id, req.params.paymentId);
  return successResponse(res, { data: payment });
});

export const getPaymentBalance = asyncHandler(async (req, res) => {
  const balance = await CustomerService.getPaymentBalance(req.user.id, req.params.orderId);
  return successResponse(res, { data: balance });
});

export const getOrderPayments = asyncHandler(async (req, res) => {
  const payments = await CustomerService.getOrderPayments(req.user.id, req.params.orderId);
  return successResponse(res, { data: payments });
});

export const initializeRemainingPayment = asyncHandler(async (req, res) => {
  const payment = await CustomerService.initializeRemainingPayment(req.user.id, req.params.orderId, req.body.method);
  return successResponse(res, { status: 201, data: payment, message: 'Payment for remaining balance initiated' });
});

export const getHistory = asyncHandler(async (req, res) => {
  const history = await CustomerService.getHistory(req.user.id, { status: req.query.status });
  return successResponse(res, { data: history });
});

export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await CustomerService.getInvoice(req.user.id, req.params.orderId);
  return successResponse(res, { data: invoice });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await CustomerService.cancelOrder(req.user.id, req.params.orderId, req.body.reason);
  return successResponse(res, { data: order, message: 'Cancellation request submitted for admin review' });
});

export const getJobCard = asyncHandler(async (req, res) => {
  const data = await CustomerService.getJobCardForCustomer(req.user.id, req.params.orderId);
  return successResponse(res, { data });
});

export const postOrderMessage = asyncHandler(async (req, res) => {
  const result = await CustomerService.sendOrderMessage(req.user.id, req.params.orderId, req.body.message);
  return successResponse(res, { status: 201, data: result, message: 'Message sent' });
});

export const uploadOrderMedia = asyncHandler(async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : (req.files ? [req.files] : []);
  if (!files.length) {
    return errorResponse(res, { status: 400, message: 'No images uploaded' });
  }
  const folder = 'customer-orders';
  const mediaItems = [];
  for (const file of files) {
    const url = await uploadFileToS3(file, folder);
    mediaItems.push({ url, kind: 'image', name: file.originalname });
  }
  const order = await CustomerService.addOrderMedia(req.user.id, req.params.orderId, mediaItems);
  return successResponse(res, {
    status: 201,
    data: { media: order.media },
    message: `${mediaItems.length} image${mediaItems.length > 1 ? 's' : ''} uploaded successfully`
  });
});

export const deactivateAccount = asyncHandler(async (req, res) => {
  const result = await CustomerService.deactivateAccount(req.user.id);
  return successResponse(res, { data: result, message: 'Account deactivated temporarily' });
});
