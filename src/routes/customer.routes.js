import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  approveAdditionalItems,
  checkTimeSlot,
  confirmPayment,
  createAddress,
  deleteAddress,
  forgotPassword,
  getAdditionalItems,
  getHistory,
  getInvoice,
  getOrder,
  getPaymentStatus,
  getProfile,
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
  updateAddress,
  updateProfile
} from '../controllers/customer.controller.js';
import { authenticate, allowCustomerOnly } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  addressCreateValidator,
  addressUpdateValidator,
  approvalDecisionValidator,
  forgotPasswordValidator,
  loginValidator,
  orderCreateValidator,
  orderHistoryQueryValidator,
  orderIdValidator,
  paymentConfirmValidator,
  paymentInitializeValidator,
  paymentStatusValidator,
  preferredAddressValidator,
  profileUpdateValidator,
  registerValidator,
  timeSlotCheckValidator
} from '../validators/customer.validators.js';

const router = Router();

router.post('/auth/register', registerCustomer);
router.post('/auth/login', loginValidator, loginCustomer);
router.post('/auth/forgot-password', forgotPasswordValidator, forgotPassword);

router.use(authenticate, allowCustomerOnly);

router.get('/profile', getProfile);
router.put('/profile', profileUpdateValidator, updateProfile);

router.get('/addresses', listAddresses);
router.post('/addresses', addressCreateValidator, createAddress);
router.put('/addresses/:addressId', addressUpdateValidator, updateAddress);
router.delete(
  '/addresses/:addressId',
  validate([param('addressId').isMongoId().withMessage('Invalid address id')]),
  deleteAddress
);
router.post('/addresses/:addressId/preferred', preferredAddressValidator, markPreferredAddress);

router.get('/services', listServices);
router.get(
  '/services/search',
  validate([query('keyword').optional().isString().withMessage('Keyword must be a string')]),
  searchServices
);
router.get('/services/:serviceId', validate([param('serviceId').isMongoId()]), getServiceDetail);

router.get(
  '/time-slots',
  validate([
    query('startDate').optional().isISO8601().withMessage('startDate must be ISO8601'),
    query('days').optional().isInt({ min: 1, max: 30 }).withMessage('days must be between 1-30')
  ]),
  listTimeSlots
);
router.post('/time-slots/check', timeSlotCheckValidator, checkTimeSlot);

router.post('/orders', orderCreateValidator, placeOrder);
router.get('/orders', orderHistoryQueryValidator, listOrders);
router.get('/orders/:orderId', orderIdValidator, getOrder);
router.get('/orders/:orderId/technician', orderIdValidator, getTechnicianStatus);
router.get('/orders/:orderId/additional', orderIdValidator, getAdditionalItems);
router.post('/orders/:orderId/approve', approvalDecisionValidator, approveAdditionalItems);
router.post('/orders/:orderId/reject', approvalDecisionValidator, rejectAdditionalItems);
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

router.post('/payments', paymentInitializeValidator, initializePayment);
router.post('/payments/confirm', paymentConfirmValidator, confirmPayment);
router.get('/payments/:paymentId', paymentStatusValidator, getPaymentStatus);

router.get('/history', orderHistoryQueryValidator, getHistory);

export default router;
