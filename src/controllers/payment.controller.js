import asyncHandler from '../utils/async-handler.js';
import { PaymentService } from '../services/payment.service.js';
import { RazorpayService } from '../services/razorpay.service.js';
import { successResponse } from '../utils/response.js';
import crypto from 'crypto';
import env from '../config/env.js';

export const createPayment = asyncHandler(async (req, res) => {
  const payment = await PaymentService.recordPayment(req.body);
  return successResponse(res, { status: 201, data: payment, message: 'Payment recorded' });
});

export const paymentWebhook = asyncHandler(async (req, res) => {
  // Verify Razorpay webhook signature
  const razorpaySignature = req.headers['x-razorpay-signature'];
  if (razorpaySignature) {
    const webhookSecret = env.razorpayWebhookSecret;
    if (webhookSecret) {
      const generatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        return successResponse(res, { data: { error: 'Invalid signature' }, message: 'Webhook signature verification failed' }, 400);
      }
    }
  }

  const payload = await PaymentService.webhook(req.body);
  return successResponse(res, { data: payload, message: 'Webhook acknowledged' });
});
