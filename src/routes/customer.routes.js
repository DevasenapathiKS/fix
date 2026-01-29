import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  approveAdditionalItems,
  cancelOrder,
  checkTimeSlot,
  confirmPayment,
  createAddress,
  deleteAddress,
  forgotPassword,
  resetPassword,
  getAdditionalItems,
  getHistory,
  getInvoice,
  getOrder,
  getPaymentStatus,
  getPaymentBalance,
  getOrderPayments,
  initializeRemainingPayment,
  getProfile,
  getJobCard,
  getServiceDetail,
  getTechnicianStatus,
  initializePayment,
  listAddresses,
  listOrders,
  listServices,
  listTimeSlots,
  loginCustomer,
  markPreferredAddress,
  placeOrder,
  rateOrder,
  registerCustomer,
  rejectAdditionalItems,
  searchServices,
  postOrderMessage,
  uploadOrderMedia,
  updateAddress,
  updateProfile,
  deactivateAccount
} from '../controllers/customer.controller.js';
import { authenticate, allowCustomerOnly } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  addressCreateValidator,
  addressUpdateValidator,
  approvalDecisionValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  loginValidator,
  orderCreateValidator,
  orderHistoryQueryValidator,
  orderIdValidator,
  paymentConfirmValidator,
  paymentInitializeValidator,
  paymentStatusValidator,
  orderMessageValidator,
  preferredAddressValidator,
  profileUpdateValidator,
  registerValidator,
  timeSlotCheckValidator
} from '../validators/customer.validators.js';

const router = Router();

router.post('/auth/register', registerCustomer);
router.post('/auth/login', loginValidator, loginCustomer);
router.post('/auth/forgot-password', forgotPasswordValidator, forgotPassword);
router.post('/auth/reset-password', resetPasswordValidator, resetPassword);

// Public routes - no authentication required
router.get('/services', listServices);
router.get(
  '/services/search',
  validate([query('keyword').optional().isString().withMessage('Keyword must be a string')]),
  searchServices
);
router.get('/services/:serviceId', validate([param('serviceId').isMongoId()]), getServiceDetail);

// Protected routes - authentication required
router.use(authenticate, allowCustomerOnly);

router.get('/profile', getProfile);
router.put('/profile', profileUpdateValidator, updateProfile);
router.post('/profile/deactivate', deactivateAccount);

router.get('/addresses', listAddresses);
router.post('/addresses', addressCreateValidator, createAddress);
router.put('/addresses/:addressId', addressUpdateValidator, updateAddress);
router.delete(
  '/addresses/:addressId',
  validate([param('addressId').isMongoId().withMessage('Invalid address id')]),
  deleteAddress
);
router.post('/addresses/:addressId/preferred', preferredAddressValidator, markPreferredAddress);

router.get(
  '/time-slots',
  validate([
    query('startDate').optional().isISO8601().withMessage('startDate must be ISO8601'),
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('days must be between 1-365')
  ]),
  listTimeSlots
);
router.post('/time-slots/check', timeSlotCheckValidator, checkTimeSlot);

router.post('/orders', orderCreateValidator, placeOrder);
router.get('/orders', orderHistoryQueryValidator, listOrders);
router.get('/orders/:orderId', orderIdValidator, getOrder);
router.get('/orders/:orderId/jobcard', orderIdValidator, getJobCard);
router.get('/orders/:orderId/technician', orderIdValidator, getTechnicianStatus);
router.get('/orders/:orderId/additional', orderIdValidator, getAdditionalItems);
router.post('/orders/:orderId/approve', approvalDecisionValidator, approveAdditionalItems);
router.post('/orders/:orderId/reject', approvalDecisionValidator, rejectAdditionalItems);
router.post('/orders/:orderId/messages', orderMessageValidator, postOrderMessage);
router.post(
  '/orders/:orderId/media',
  validate([param('orderId').isMongoId().withMessage('Invalid order id')]),
  upload.array('images', 10),
  uploadOrderMedia
);
router.post(
  '/orders/:orderId/rating',
  validate([
    param('orderId').isMongoId(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString()
  ]),
  rateOrder
);
router.get('/orders/:orderId/invoice', orderIdValidator, getInvoice);
router.post(
  '/orders/:orderId/cancel',
  validate([
    param('orderId').isMongoId(),
    body('reason').optional().isString().isLength({ max: 500 })
  ]),
  cancelOrder
);

router.post('/payments', paymentInitializeValidator, initializePayment);
router.post('/payments/init-with-orders', 
  validate([
    body('orderData').isArray().withMessage('Order data is required'),
    body('orderData.*.customerAddressId').isMongoId(),
    body('orderData.*.preferredStart').isISO8601(),
    body('orderData.*.preferredEnd').isISO8601(),
    body('method').isIn(['cash', 'razorpay', 'razorpay_card', 'razorpay_upi', 'razorpay_netbanking', 'razorpay_wallet']),
    body('amount').isFloat({ min: 0 })
  ]),
  initializePayment
);
router.post('/payments/confirm', paymentConfirmValidator, confirmPayment);
router.get('/payments/:paymentId', paymentStatusValidator, getPaymentStatus);
router.get('/orders/:orderId/payment-balance', authenticate, getPaymentBalance);
router.get('/orders/:orderId/payments', authenticate, getOrderPayments);
router.post('/orders/:orderId/payments/remaining', 
  authenticate,
  validate([
    body('method').isIn(['cash', 'razorpay', 'razorpay_card', 'razorpay_upi', 'razorpay_netbanking', 'razorpay_wallet'])
  ]),
  initializeRemainingPayment
);

router.get('/history', orderHistoryQueryValidator, getHistory);

export default router;
