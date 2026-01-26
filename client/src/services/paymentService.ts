import { apiClient } from '../lib/api-client'
import type { CreateOrderData } from './orderService'

export type PaymentMethod = 'cash' | 'razorpay' | 'razorpay_card' | 'razorpay_upi' | 'razorpay_netbanking' | 'razorpay_wallet'

export interface PaymentInitResponse {
  _id: string
  order?: string
  customer: string
  method: PaymentMethod
  amount: number
  status: 'initiated' | 'success' | 'failed'
  razorpayOrder?: {
    id: string
    amount: number
    currency: string
    key: string
  }
}

export interface PaymentConfirmRequest {
  paymentId: string
  orderId?: string
  transactionRef?: string
  razorpayPaymentId?: string
  razorpayOrderId?: string
  razorpaySignature?: string
}

export interface PaymentInitWithOrderData {
  orderData: CreateOrderData[]
  customerId: string
  method: PaymentMethod
  amount: number
}

export interface Payment {
  _id: string
  order?: string
  customer: string
  method: PaymentMethod
  amount: number
  status: 'initiated' | 'success' | 'failed'
  transactionRef?: string
  paidAt?: string
  metadata?: Record<string, any>
}

export const paymentService = {
  /**
   * Initialize a payment with order ID (for existing orders)
   * @param orderId - Order ID
   * @param method - Payment method
   * @param amount - Payment amount
   * @returns Payment initialization response
   */
  async initializePayment(orderId: string, method: PaymentMethod, amount: number): Promise<PaymentInitResponse> {
    const response = await apiClient.post('/customer/payments', {
      orderId,
      method,
      amount
    })
    return response.data.data
  },

  /**
   * Initialize a payment with order data (for new orders - payment first)
   * @param data - Payment initialization data with order details
   * @returns Payment initialization response
   */
  async initializePaymentWithOrderData(data: PaymentInitWithOrderData): Promise<PaymentInitResponse> {
    const response = await apiClient.post('/customer/payments/init-with-orders', data)
    return response.data.data
  },

  /**
   * Confirm a payment
   * @param data - Payment confirmation data
   * @returns Confirmed payment
   */
  async confirmPayment(data: PaymentConfirmRequest): Promise<Payment> {
    const response = await apiClient.post('/customer/payments/confirm', data)
    return response.data.data
  },

  /**
   * Get payment status
   * @param paymentId - Payment ID
   * @returns Payment details
   */
  async getPaymentStatus(paymentId: string): Promise<Payment> {
    const response = await apiClient.get(`/customer/payments/${paymentId}`)
    return response.data.data
  },

  /**
   * Get payment balance for an order
   * @param orderId - Order ID
   * @returns Payment balance details
   */
  async getPaymentBalance(orderId: string): Promise<{
    totalDue: number
    totalPaid: number
    remainingBalance: number
    isFullyPaid: boolean
    isPartiallyPaid: boolean
    paymentCount: number
  }> {
    const response = await apiClient.get(`/customer/orders/${orderId}/payment-balance`)
    return response.data.data
  },

  /**
   * Get all payments for an order
   * @param orderId - Order ID
   * @returns Array of payments
   */
  async getOrderPayments(orderId: string): Promise<Payment[]> {
    const response = await apiClient.get(`/customer/orders/${orderId}/payments`)
    return response.data.data
  },

  /**
   * Initialize payment for remaining balance
   * @param orderId - Order ID
   * @param method - Payment method
   * @returns Payment initialization response
   */
  async initializeRemainingPayment(orderId: string, method: PaymentMethod): Promise<PaymentInitResponse> {
    const response = await apiClient.post(`/customer/orders/${orderId}/payments/remaining`, { method })
    return response.data.data
  },
}
