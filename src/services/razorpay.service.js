import Razorpay from 'razorpay';
import crypto from 'crypto';
import env from '../config/env.js';
import ApiError from '../utils/api-error.js';

let razorpayInstance = null;

function getRazorpayInstance() {
  if (!razorpayInstance) {
    if (!env.razorpayKeyId || !env.razorpayKeySecret) {
      throw new ApiError(500, 'Razorpay credentials not configured');
    }
    razorpayInstance = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret
    });
  }
  return razorpayInstance;
}

export const RazorpayService = {
  /**
   * Create a Razorpay order
   * @param {Object} params - Order parameters
   * @param {Number} params.amount - Amount in paise (smallest currency unit)
   * @param {String} params.currency - Currency code (default: INR)
   * @param {String} params.receipt - Receipt identifier
   * @param {Object} params.notes - Optional notes
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    try {
      const razorpay = getRazorpayInstance();
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        // Razorpay requires receipt length <= 40 characters
        receipt: receipt && receipt.length > 40 ? receipt.slice(0, 40) : receipt,
        notes: {
          ...notes,
          created_by: 'fixzep'
        }
      };

      const order = await razorpay.orders.create(options);
      return {
        id: order.id,
        entity: order.entity,
        amount: order.amount,
        amount_paid: order.amount_paid,
        amount_due: order.amount_due,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        attempts: order.attempts,
        notes: order.notes,
        created_at: order.created_at
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Razorpay] Error creating order:', error);

      // Razorpay SDK often nests details under error.error.description
      const message =
        (error && (error.error?.description || error.message)) ||
        'Unknown error while creating Razorpay order';

      throw new ApiError(500, `Failed to create Razorpay order: ${message}`);
    }
  },

  /**
   * Verify Razorpay payment signature
   * @param {String} razorpayOrderId - Razorpay order ID
   * @param {String} razorpayPaymentId - Razorpay payment ID
   * @param {String} razorpaySignature - Razorpay signature
   * @returns {Boolean} True if signature is valid
   */
  verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const secret = env.razorpayKeySecret;
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      return generatedSignature === razorpaySignature;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Razorpay] Error verifying signature:', error);
      return false;
    }
  },

  /**
   * Fetch payment details from Razorpay
   * @param {String} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getPayment(paymentId) {
    try {
      const razorpay = getRazorpayInstance();
      const payment = await razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Razorpay] Error fetching payment:', error);
      throw new ApiError(500, `Failed to fetch payment: ${error.message}`);
    }
  },

  /**
   * Refund a payment
   * @param {String} paymentId - Razorpay payment ID
   * @param {Number} amount - Amount to refund (optional, full refund if not provided)
   * @param {Object} notes - Optional refund notes
   * @returns {Promise<Object>} Refund details
   */
  async refundPayment(paymentId, amount = null, notes = {}) {
    try {
      const razorpay = getRazorpayInstance();
      const refundOptions = {
        payment_id: paymentId,
        notes: {
          ...notes,
          refunded_by: 'fixzep'
        }
      };

      if (amount) {
        refundOptions.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await razorpay.payments.refund(paymentId, refundOptions);
      return refund;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Razorpay] Error processing refund:', error);
      throw new ApiError(500, `Failed to process refund: ${error.message}`);
    }
  }
};
