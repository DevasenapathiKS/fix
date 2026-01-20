import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validate.middleware.js';

export const registerValidator = validate([
  body('name').notEmpty(),
  body('email').isEmail(),
  body('phone').isString().isLength({ min: 6 }),
  body('password').isLength({ min: 6 })
]);

export const loginValidator = validate([
  body('identifier').notEmpty().withMessage('Email or phone is required'),
  body('password').isLength({ min: 6 })
]);

export const forgotPasswordValidator = validate([
  body('identifier').notEmpty()
]);

export const resetPasswordValidator = validate([
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
]);

export const profileUpdateValidator = validate([
  body('name').optional().isString(),
  body('phone').optional().isString(),
  body('email').optional().isEmail()
]);

export const addressCreateValidator = validate([
  body('label').optional().isString(),
  body('contactName').notEmpty(),
  body('phone').notEmpty(),
  body('line1').notEmpty(),
  body('city').notEmpty(),
  body('state').notEmpty(),
  body('postalCode').notEmpty(),
  body('isDefault').optional().isBoolean()
]);

export const addressUpdateValidator = validate([
  param('addressId').isMongoId(),
  body('label').optional().isString(),
  body('contactName').optional().isString(),
  body('phone').optional().isString(),
  body('line1').optional().isString(),
  body('city').optional().isString(),
  body('state').optional().isString(),
  body('postalCode').optional().isString(),
  body('isDefault').optional().isBoolean()
]);

export const preferredAddressValidator = validate([
  param('addressId').isMongoId()
]);

export const timeSlotCheckValidator = validate([
  body('serviceItem').isMongoId(),
  body('start').isISO8601(),
  body('end').isISO8601()
]);

export const orderCreateValidator = validate([
  // For single service orders (optional if services array is provided)
  body('serviceCategory').optional().isMongoId(),
  body('serviceItem').optional().isMongoId(),
  body('issueDescription').optional().isString(),
  // Required fields
  body('customerAddressId').isMongoId(),
  body('preferredStart').isISO8601(),
  body('preferredEnd').isISO8601(),
  body('estimatedCost').optional().isFloat({ min: 0 }),
  body('attachments').optional().isArray(),
  // For cart orders with multiple services
  body('services').optional().isArray(),
  body('services.*.serviceItem').optional().isMongoId(),
  body('services.*.serviceCategory').optional().isMongoId(),
  body('services.*.quantity').optional().isInt({ min: 1 }),
  body('services.*.issueDescription').optional().isString()
]);

export const orderIdValidator = validate([
  param('orderId').isMongoId()
]);

export const approvalDecisionValidator = validate([
  param('orderId').isMongoId(),
  body('note').optional().isString()
]);

export const paymentInitializeValidator = validate([
  body('orderId').optional().isMongoId(),
  body('orderData').optional().isArray(),
  body('method').isIn(['cash', 'upi', 'razorpay', 'razorpay_card', 'razorpay_upi', 'razorpay_netbanking', 'razorpay_wallet']),
  body('amount').isFloat({ min: 0 })
]);

export const paymentConfirmValidator = validate([
  body('paymentId').isMongoId(),
  body('orderId').optional().isMongoId(),
  body('transactionRef').optional().isString(),
  body('razorpayPaymentId').optional().isString(),
  body('razorpayOrderId').optional().isString(),
  body('razorpaySignature').optional().isString()
]);

export const paymentStatusValidator = validate([
  param('paymentId').isMongoId()
]);

export const orderHistoryQueryValidator = validate([
  query('status').optional().isString()
]);

export const orderMessageValidator = validate([
  param('orderId').isMongoId(),
  body('message').isString().trim().isLength({ min: 1, max: 1000 })
]);
