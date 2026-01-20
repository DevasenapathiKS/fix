export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TECHNICIAN: 'technician',
  CUSTOMER: 'customer'
};

export const ORDER_STATUS = {
  NEW: 'new',
  PENDING_ASSIGNMENT: 'pending_assignment',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  CANCELLATION_REQUESTED: 'cancellation_requested',
  RESCHEDULED: 'rescheduled',
  AWAITING_APPROVAL: 'awaiting_customer_approval',
  FOLLOW_UP: 'follow_up',
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid'
};

export const JOB_STATUS = {
  OPEN: 'open',
  CHECKED_IN: 'checked_in',
  COMPLETED: 'completed',
  LOCKED: 'locked',
  FOLLOW_UP: 'follow_up',
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid'
};

export const PAYMENT_STATUS = {
  INITIATED: 'initiated',
  SUCCESS: 'success',
  FAILED: 'failed'
};

export const PAYMENT_METHODS = {
  CASH: 'cash',
  UPI: 'upi',
  RAZORPAY: 'razorpay',
  RAZORPAY_CARD: 'razorpay_card',
  RAZORPAY_UPI: 'razorpay_upi',
  RAZORPAY_NETBANKING: 'razorpay_netbanking',
  RAZORPAY_WALLET: 'razorpay_wallet'
};

export const NOTIFICATION_EVENTS = {
  ORDER_CREATED: 'ORDER_CREATED',
  TECHNICIAN_ASSIGNED: 'TECHNICIAN_ASSIGNED',
  ORDER_RESCHEDULED: 'ORDER_RESCHEDULED',
  JOB_UPDATED: 'JOB_UPDATED',
  CUSTOMER_ORDER_PLACED: 'CUSTOMER_ORDER_PLACED',
  CUSTOMER_APPROVAL_REQUIRED: 'CUSTOMER_APPROVAL_REQUIRED',
  CUSTOMER_APPROVAL_UPDATED: 'CUSTOMER_APPROVAL_UPDATED',
  TECHNICIAN_CHECKED_IN: 'TECHNICIAN_CHECKED_IN',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  ORDER_CANCELLATION_REQUESTED: 'ORDER_CANCELLATION_REQUESTED',
  ORDER_CANCELLED: 'ORDER_CANCELLED'
};
