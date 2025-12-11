import asyncHandler from '../utils/async-handler.js';
import { PaymentService } from '../services/payment.service.js';
import { successResponse } from '../utils/response.js';

export const createPayment = asyncHandler(async (req, res) => {
  const payment = await PaymentService.recordPayment(req.body);
  return successResponse(res, { status: 201, data: payment, message: 'Payment recorded' });
});

export const paymentWebhook = asyncHandler(async (req, res) => {
  const payload = await PaymentService.webhook(req.body);
  return successResponse(res, { data: payload, message: 'Webhook acknowledged' });
});
