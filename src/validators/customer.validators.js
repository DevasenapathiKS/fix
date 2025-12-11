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
  body('serviceCategory').isMongoId(),
  body('serviceItem').isMongoId(),
  body('customerAddressId').isMongoId(),
  body('preferredStart').isISO8601(),
  body('preferredEnd').isISO8601(),
  body('issueDescription').isString(),
  body('estimatedCost').optional().isFloat({ min: 0 }),
  body('attachments').optional().isArray()
]);

export const orderIdValidator = validate([
  param('orderId').isMongoId()
]);

export const approvalDecisionValidator = validate([
  param('orderId').isMongoId(),
  body('note').optional().isString()
]);

export const paymentInitializeValidator = validate([
  body('orderId').isMongoId(),
  body('method').isIn(['cash', 'upi']),
  body('amount').isFloat({ min: 0 })
]);

export const paymentConfirmValidator = validate([
  body('paymentId').isMongoId(),
  body('transactionRef').notEmpty()
]);

export const paymentStatusValidator = validate([
  param('paymentId').isMongoId()
]);

export const orderHistoryQueryValidator = validate([
  query('status').optional().isString()
]);
