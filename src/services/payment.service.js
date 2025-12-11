import Payment from '../models/payment.model.js';
import Order from '../models/order.model.js';
import { JobcardService } from './jobcard.service.js';
import { PAYMENT_STATUS, ORDER_STATUS, PAYMENT_METHODS } from '../constants/index.js';
import ApiError from '../utils/api-error.js';

export const PaymentService = {
  async recordPayment({ orderId, jobCardId, method, amount, transactionRef }) {
    const payment = await Payment.create({
      order: orderId,
      jobCard: jobCardId,
      method,
      amount,
      transactionRef,
      status: PAYMENT_STATUS.SUCCESS,
      paidAt: new Date()
    });

    await JobcardService.lockJobCard(jobCardId);
    await Order.findByIdAndUpdate(orderId, { status: ORDER_STATUS.COMPLETED });
    return payment;
  },

  async initializeCustomerPayment({ orderId, customerId, method, amount }) {
    if (!Object.values(PAYMENT_METHODS).includes(method)) {
      throw new ApiError(400, 'Unsupported payment method');
    }
    const payment = await Payment.create({
      order: orderId,
      customer: customerId,
      method,
      amount,
      status: PAYMENT_STATUS.INITIATED,
      metadata: method === PAYMENT_METHODS.UPI ? { qrPayload: `upi://pay?pa=fixzep@upi&am=${amount}` } : {}
    });
    return payment;
  },

  async confirmCustomerPayment({ paymentId, customerId, transactionRef }) {
    const payment = await Payment.findOne({ _id: paymentId, customer: customerId });
    if (!payment) throw new ApiError(404, 'Payment not found');
    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      return payment;
    }
    payment.transactionRef = transactionRef;
    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.paidAt = new Date();
    await payment.save();

    const jobCard = await JobcardService.getJobCardByOrder(payment.order).catch(() => null);
    if (jobCard) {
      await JobcardService.lockJobCard(jobCard._id);
    }
    await Order.findByIdAndUpdate(payment.order, { status: ORDER_STATUS.COMPLETED });
    return payment;
  },

  async webhook(payload) {
    // placeholder for payment provider callbacks
    return payload;
  }
};
