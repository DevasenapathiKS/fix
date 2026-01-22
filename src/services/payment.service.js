import Payment from '../models/payment.model.js';
import Order from '../models/order.model.js';
import { JobcardService } from './jobcard.service.js';
import { PAYMENT_STATUS, ORDER_STATUS, PAYMENT_METHODS } from '../constants/index.js';
import { RazorpayService } from './razorpay.service.js';
import env from '../config/env.js';
import ApiError from '../utils/api-error.js';

export const PaymentService = {
  /**
   * Calculate payment balance for an order
   * Returns total paid, total due, and remaining balance
   */
  async calculatePaymentBalance(orderId) {
    const order = await Order.findById(orderId).lean();
    if (!order) throw new ApiError(404, 'Order not found');

    // Get all successful payments for this order
    const successfulPayments = await Payment.find({
      order: orderId,
      status: PAYMENT_STATUS.SUCCESS
    }).lean();

    const totalPaid = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate total due (include GST)
    const jobCard = await JobcardService.getJobCardByOrder(orderId).catch(() => null);
    let subtotal = order.estimatedCost || 0;

    if (jobCard) {
      // If job card exists, use finalAmount (includes additional charges)
      subtotal = jobCard.finalAmount || subtotal;
    }

    // Add 18% GST to subtotal for total due
    const gstRate = 0.18;
    const gstAmount = subtotal * gstRate;
    const totalDue = subtotal + gstAmount;

    const remainingBalance = Math.max(0, totalDue - totalPaid);
    const isFullyPaid = remainingBalance === 0;
    const isPartiallyPaid = totalPaid > 0 && remainingBalance > 0;

    return {
      totalDue,
      totalPaid,
      remainingBalance,
      isFullyPaid,
      isPartiallyPaid,
      paymentCount: successfulPayments.length
    };
  },

  /**
   * Get all payments for an order
   */
  async getOrderPayments(orderId) {
    return Payment.find({ order: orderId })
      .sort({ createdAt: -1 })
      .lean();
  },

  /**
   * Update job card payment status based on payment balance
   */
  async updateJobCardPaymentStatus(orderId) {
    const jobCard = await JobcardService.getJobCardByOrder(orderId).catch(() => null);
    if (!jobCard) return;

    const balance = await this.calculatePaymentBalance(orderId);

    if (balance.isFullyPaid) {
      jobCard.paymentStatus = 'paid';
    } else if (balance.isPartiallyPaid) {
      jobCard.paymentStatus = 'partial';
    } else {
      jobCard.paymentStatus = 'pending';
    }

    await jobCard.save();
    return jobCard.paymentStatus;
  },

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

    // Update payment status on job card
    await this.updateJobCardPaymentStatus(orderId);

    // Only lock and complete if fully paid
    const balance = await this.calculatePaymentBalance(orderId);
    if (balance.isFullyPaid) {
      await JobcardService.lockJobCard(jobCardId);
      await Order.findByIdAndUpdate(orderId, { status: ORDER_STATUS.COMPLETED });
    }

    return payment;
  },

  async initializeCustomerPayment({ orderId, customerId, method, amount }) {
    if (!Object.values(PAYMENT_METHODS).includes(method)) {
      throw new ApiError(400, 'Unsupported payment method');
    }

    // Handle cash payment - no gateway needed
    if (method === PAYMENT_METHODS.CASH) {
      const payment = await Payment.create({
        order: orderId,
        customer: customerId,
        method,
        amount,
        status: PAYMENT_STATUS.INITIATED,
        metadata: { paymentMode: 'cash_on_delivery', confirmedAt: null }
      });
      return payment;
    }

    // Handle Razorpay payment - create Razorpay order
    if (method.startsWith('razorpay')) {
      const order = await Order.findById(orderId).lean();
      if (!order) throw new ApiError(404, 'Order not found');

      const razorpayOrder = await RazorpayService.createOrder({
        amount,
        currency: 'INR',
        receipt: `order_${orderId}_${Date.now()}`,
        notes: {
          orderId: String(orderId),
          customerId: String(customerId),
          orderCode: order.orderCode || ''
        }
      });

      const payment = await Payment.create({
        order: orderId,
        customer: customerId,
        method,
        amount,
        status: PAYMENT_STATUS.INITIATED,
        transactionRef: razorpayOrder.id,
        metadata: {
          razorpayOrderId: razorpayOrder.id,
          razorpayOrderStatus: razorpayOrder.status,
          paymentMethod: method
        }
      });

      return {
        ...payment.toObject(),
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount / 100, // Convert back from paise
          currency: razorpayOrder.currency,
          key: env.razorpayKeyId // Frontend needs this for checkout
        }
      };
    }

    // Legacy UPI handling
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

  async initializePaymentWithOrderData({ orderData, customerId, method, amount }) {
    if (!Object.values(PAYMENT_METHODS).includes(method)) {
      throw new ApiError(400, 'Unsupported payment method');
    }

    // Store order data in payment metadata (orders will be created after payment)
    if (method.startsWith('razorpay')) {
      const razorpayOrder = await RazorpayService.createOrder({
        amount,
        currency: 'INR',
        receipt: `payment_${Date.now()}`,
        notes: {
          customerId: String(customerId),
          orderCount: String(orderData.length)
        }
      });

      const payment = await Payment.create({
        customer: customerId,
        method,
        amount,
        status: PAYMENT_STATUS.INITIATED,
        transactionRef: razorpayOrder.id,
        metadata: {
          razorpayOrderId: razorpayOrder.id,
          razorpayOrderStatus: razorpayOrder.status,
          paymentMethod: method,
          orderData, // Store order data to create orders after payment
          ordersCreated: false
        }
      });

      return {
        ...payment.toObject(),
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount / 100, // Convert back from paise
          currency: razorpayOrder.currency,
          key: env.razorpayKeyId
        }
      };
    }

    // For cash, still create payment record with order data
    const payment = await Payment.create({
      customer: customerId,
      method,
      amount,
      status: PAYMENT_STATUS.INITIATED,
      metadata: {
        paymentMode: 'cash_on_delivery',
        orderData, // Store order data to create orders after payment
        ordersCreated: false
      }
    });
    return payment;
  },

  async confirmCustomerPayment({ paymentId, customerId, orderId, transactionRef, razorpayPaymentId, razorpaySignature }) {
    const payment = await Payment.findOne({ _id: paymentId, customer: customerId });
    if (!payment) throw new ApiError(404, 'Payment not found');
    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      return payment;
    }

    // Check if orders need to be created (payment-first flow)
    const orderData = payment.metadata?.orderData;
    const ordersCreated = payment.metadata?.ordersCreated;

    // Handle cash payment confirmation
    if (payment.method === PAYMENT_METHODS.CASH) {
      payment.transactionRef = transactionRef || `cash_${Date.now()}`;
      payment.status = PAYMENT_STATUS.SUCCESS;
      payment.paidAt = new Date();
      payment.metadata = {
        ...payment.metadata,
        confirmedAt: new Date().toISOString()
      };

      // If orders not created yet and order data exists, create orders first
      if (orderData && !ordersCreated && orderId) {
        // Update payment with order ID
        payment.order = orderId;
      }

      await payment.save();

        // Update payment status on job card and check if order should be completed
        if (payment.order) {
          // Update job card payment status (pending/partial/paid)
          await this.updateJobCardPaymentStatus(payment.order);
          
          const jobCard = await JobcardService.getJobCardByOrder(payment.order).catch(() => null);
          if (jobCard) {
            // Only lock and complete if fully paid
            const balance = await this.calculatePaymentBalance(payment.order);
            if (balance.isFullyPaid) {
              await JobcardService.lockJobCard(jobCard._id);
              await Order.findByIdAndUpdate(payment.order, { status: ORDER_STATUS.COMPLETED });
            }
          }
        }

      return payment;
    }

    // Handle Razorpay payment verification
    if (payment.method.startsWith('razorpay') && razorpayPaymentId && razorpaySignature) {
      const razorpayOrderId = payment.metadata?.razorpayOrderId || payment.transactionRef;
      
      // Verify Razorpay signature
      const isValid = RazorpayService.verifyPayment(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        payment.status = PAYMENT_STATUS.FAILED;
        await payment.save();
        throw new ApiError(400, 'Invalid payment signature');
      }

      // Fetch payment details from Razorpay
      try {
        const razorpayPayment = await RazorpayService.getPayment(razorpayPaymentId);
        if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
          payment.status = PAYMENT_STATUS.FAILED;
          await payment.save();
          throw new ApiError(400, `Payment not successful. Status: ${razorpayPayment.status}`);
        }

        payment.transactionRef = razorpayPaymentId;
        payment.status = PAYMENT_STATUS.SUCCESS;
        payment.paidAt = new Date(razorpayPayment.created_at * 1000);
        
        // If orders not created yet and order ID provided, link payment to order
        if (orderId && !payment.order) {
          payment.order = orderId;
        }

        payment.metadata = {
          ...payment.metadata,
          razorpayPaymentId,
          razorpayPaymentStatus: razorpayPayment.status,
          razorpayPaymentMethod: razorpayPayment.method,
          razorpayBank: razorpayPayment.bank || null,
          razorpayWallet: razorpayPayment.wallet || null,
          razorpayVpa: razorpayPayment.vpa || null,
          razorpayContact: razorpayPayment.contact || null,
          razorpayEmail: razorpayPayment.email || null,
          ordersCreated: orderId ? true : payment.metadata?.ordersCreated
        };
        await payment.save();

        // Update payment status on job card and check if order should be completed
        if (payment.order) {
          // Update job card payment status (pending/partial/paid)
          await this.updateJobCardPaymentStatus(payment.order);
          
          const jobCard = await JobcardService.getJobCardByOrder(payment.order).catch(() => null);
          if (jobCard) {
            // Only lock and complete if fully paid
            const balance = await this.calculatePaymentBalance(payment.order);
            if (balance.isFullyPaid) {
              await JobcardService.lockJobCard(jobCard._id);
              await Order.findByIdAndUpdate(payment.order, { status: ORDER_STATUS.COMPLETED });
            }
          }
        }

        return payment;
      } catch (error) {
        payment.status = PAYMENT_STATUS.FAILED;
        await payment.save();
        throw error;
      }
    }

    // Legacy payment confirmation
    payment.transactionRef = transactionRef;
    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.paidAt = new Date();
    
    if (orderId && !payment.order) {
      payment.order = orderId;
    }
    
    await payment.save();

        // Update payment status on job card and check if order should be completed
        if (payment.order) {
          // Update job card payment status (pending/partial/paid)
          await this.updateJobCardPaymentStatus(payment.order);
          
          const jobCard = await JobcardService.getJobCardByOrder(payment.order).catch(() => null);
          if (jobCard) {
            // Only lock and complete if fully paid
            const balance = await this.calculatePaymentBalance(payment.order);
            if (balance.isFullyPaid) {
              await JobcardService.lockJobCard(jobCard._id);
              await Order.findByIdAndUpdate(payment.order, { status: ORDER_STATUS.COMPLETED });
            }
          }
        }
    return payment;
  },

  async webhook(payload) {
    // Handle Razorpay webhook
    if (payload.event && payload.payload) {
      const event = payload.event;
      const paymentEntity = payload.payload?.payment?.entity;

      if (event === 'payment.captured' || event === 'payment.authorized') {
        if (!paymentEntity) {
          throw new ApiError(400, 'Payment entity not found in webhook');
        }

        // Find payment by Razorpay order ID
        const payment = await Payment.findOne({
          'metadata.razorpayOrderId': paymentEntity.order_id,
          status: { $ne: PAYMENT_STATUS.SUCCESS }
        });

        if (payment) {
          payment.transactionRef = paymentEntity.id;
          payment.status = PAYMENT_STATUS.SUCCESS;
          payment.paidAt = new Date(paymentEntity.created_at * 1000);
          payment.metadata = {
            ...payment.metadata,
            razorpayPaymentId: paymentEntity.id,
            razorpayPaymentStatus: paymentEntity.status,
            razorpayPaymentMethod: paymentEntity.method,
            webhookReceived: true
          };
          await payment.save();

          // Update payment status on job card and check if order should be completed
          if (payment.order) {
            // Update job card payment status (pending/partial/paid)
            await this.updateJobCardPaymentStatus(payment.order);
            
            const jobCard = await JobcardService.getJobCardByOrder(payment.order).catch(() => null);
            if (jobCard) {
              // Only lock and complete if fully paid
              const balance = await this.calculatePaymentBalance(payment.order);
              if (balance.isFullyPaid) {
                await JobcardService.lockJobCard(jobCard._id);
                await Order.findByIdAndUpdate(payment.order, { status: ORDER_STATUS.COMPLETED });
              }
            }
          }
        }
      }

      return { processed: true, event };
    }

    return payload;
  }
};
