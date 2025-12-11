import asyncHandler from '../utils/async-handler.js';
import { OrderService } from '../services/order.service.js';
import { successResponse } from '../utils/response.js';

export const createOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.createOrder(req.body);
  return successResponse(res, { status: 201, data: order, message: 'Order created' });
});

export const listOrders = asyncHandler(async (req, res) => {
  const { status, fromDate, toDate } = req.query;
  const orders = await OrderService.listOrders({
    status,
    fromDate,
    toDate
  });
  return successResponse(res, { data: orders });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.getOrder(req.params.id);
  return successResponse(res, { data: order });
});

export const rescheduleOrder = asyncHandler(async (req, res) => {
  const { newStart, newEnd } = req.body;
  const order = await OrderService.rescheduleOrder({
    orderId: req.params.id,
    newStart,
    newEnd,
    adminId: req.user.id
  });
  return successResponse(res, { data: order, message: 'Order rescheduled' });
});
