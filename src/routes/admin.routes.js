import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  adminOrders,
  assignTechnician,
  createTimeSlot,
  createUser,
  deleteTimeSlot,
  listCategories,
  listServiceItems,
  listSpareParts,
  listTechnicianSkills,
  createTechnicianSkill,
  listTechnicians,
  listTechnicianAttendance,
  listTimeSlots,
  markTechnicianAttendance,
  orderTechnicianCandidates,
  orderJobCard,
  technicianAvailability,
  technicianSchedule,
  updateTimeSlot,
  upsertCategory,
  upsertServiceItem,
  upsertSparePart,
  updateOrderStatus,
  uploadOrderMedia,
  deleteOrderMedia,
  updateOrderPaymentStatus,
  addOrderHistoryNote,
  addOrderSparePart,
  addOrderAdditionalService,
  removeOrderSparePart,
  removeOrderAdditionalService,
  listCustomers,
  findCustomerByPhone,
  createCustomer,
  createOrderFromAdmin
} from '../controllers/admin.controller.js';
import { authenticate, allowAdminOnly } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ORDER_STATUS, USER_ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticate, allowAdminOnly);

router.get('/orders', adminOrders);

router.post(
  '/orders/:orderId/assign',
  validate([param('orderId').isMongoId(), body('technicianId').isMongoId()]),
  assignTechnician
);

router.get('/orders/:orderId/technicians', validate([param('orderId').isMongoId()]), orderTechnicianCandidates);
router.get('/orders/:orderId/jobcard', validate([param('orderId').isMongoId()]), orderJobCard);
router.post(
  '/orders/:orderId/status',
  validate([
    param('orderId').isMongoId(),
    body('status').isIn(Object.values(ORDER_STATUS)),
    body('reason')
      .if(body('status').equals(ORDER_STATUS.FOLLOW_UP))
      .isString()
      .withMessage('Follow up reason is required'),
    // body('attachments')
    //   .if(body('status').equals(ORDER_STATUS.FOLLOW_UP))
    //   .isArray({ min: 1 })
    //   .withMessage('Add at least one attachment for follow up'),
    // body('attachments').optional().isArray(),
    // body('attachments.*.url').optional().isString(),
    // body('attachments.*.kind').optional().isIn(['image', 'video']),
    // body('attachments.*.name').optional().isString()
  ]),
  updateOrderStatus
);

router.post(
  '/orders/:orderId/media',
  validate([
    param('orderId').isMongoId(),
    body('media').isArray({ min: 1 }),
    body('media.*.url').isString().notEmpty(),
    body('media.*.kind').optional().isIn(['image', 'video', 'document']),
    body('media.*.name').optional().isString()
  ]),
  uploadOrderMedia
);

router.delete(
  '/orders/:orderId/media/:mediaId',
  validate([param('orderId').isMongoId(), param('mediaId').isMongoId()]),
  deleteOrderMedia
);

router.post(
  '/orders/:orderId/payment-status',
  validate([
    param('orderId').isMongoId(),
    body('status').isIn(['pending', 'partial', 'paid'])
  ]),
  updateOrderPaymentStatus
);

router.post(
  '/orders/:orderId/history',
  validate([
    param('orderId').isMongoId(),
    body('message').isString().trim().isLength({ min: 1, max: 1000 })
  ]),
  addOrderHistoryNote
);

router.post(
  '/orders/:orderId/spare-parts',
  validate([
    param('orderId').isMongoId(),
    body('sparePartId').isMongoId(),
    body('quantity').isFloat({ min: 0.01 }),
    body('unitPrice').isFloat({ min: 0 })
  ]),
  addOrderSparePart
);

router.post(
  '/orders/:orderId/additional-services',
  validate([
    param('orderId').isMongoId(),
    // body('description').isString().trim().notEmpty(),
    body('amount').isFloat({ min: 0 }),
    body('serviceItemId').optional().isMongoId()
  ]),
  addOrderAdditionalService
);

router.delete(
  '/orders/:orderId/spare-parts/:index',
  validate([
    param('orderId').isMongoId(),
    param('index').isInt({ min: 0 })
  ]),
  removeOrderSparePart
);

router.delete(
  '/orders/:orderId/additional-services/:index',
  validate([
    param('orderId').isMongoId(),
    param('index').isInt({ min: 0 })
  ]),
  removeOrderAdditionalService
);

router.get('/technicians', listTechnicians);
router.get('/technicians/:technicianId/availability', validate([param('technicianId').isMongoId()]), technicianAvailability);
router.get(
  '/technicians/:technicianId/schedule',
  validate([
    param('technicianId').isMongoId(),
    query('start').optional().isISO8601(),
    query('end').optional().isISO8601()
  ]),
  technicianSchedule
);
router.get(
  '/technicians/:technicianId/attendance',
  validate([
    param('technicianId').isMongoId(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601()
  ]),
  listTechnicianAttendance
);
router.post(
  '/technicians/:technicianId/attendance',
  validate([
    param('technicianId').isMongoId(),
    body('date').isISO8601(),
    body('status').isIn(['present', 'absent', 'on_leave']),
    body('checkInAt').optional().isISO8601(),
    body('checkOutAt').optional().isISO8601(),
    body('note').optional().isString()
  ]),
  markTechnicianAttendance
);

router.post('/categories', validate([body('name').notEmpty()]), upsertCategory);
router.get('/categories', listCategories);

router.post(
  '/service-items',
  validate([body('category').isMongoId(), body('name').notEmpty(), body('basePrice').optional().isFloat({ min: 0 })]),
  upsertServiceItem
);
router.get('/service-items', listServiceItems);

router.get('/spare-parts', listSpareParts);
router.post(
  '/spare-parts',
  validate([body('name').notEmpty(), body('sku').notEmpty(), body('unitPrice').isFloat({ min: 0 })]),
  upsertSparePart
);

router.get('/technician-skills', listTechnicianSkills);
router.post(
  '/technician-skills',
  validate([body('name').notEmpty(), body('description').optional().isString(), body('isActive').optional().isBoolean()]),
  createTechnicianSkill
);

router.get('/time-slots', listTimeSlots);

router.get('/customers', listCustomers);
router.get(
  '/customers/phone/:phone',
  validate([param('phone').notEmpty().withMessage('Phone number is required')]),
  findCustomerByPhone
);
router.post(
  '/customers',
  validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('email').optional().isEmail(),
    body('address.line1').optional().notEmpty(),
    body('address.city').optional().notEmpty(),
    body('address.state').optional().notEmpty(),
    body('address.postalCode').optional().notEmpty()
  ]),
  createCustomer
);

router.post(
  '/orders',
  validate([
    body('customerId').isMongoId().withMessage('Valid customer ID is required'),
    body('serviceItem').isMongoId().withMessage('Valid service item is required'),
    body('scheduledAt').isISO8601().withMessage('Valid scheduled date is required'),
    body('timeWindowStart').isISO8601().withMessage('Valid time window start is required'),
    body('timeWindowEnd').isISO8601().withMessage('Valid time window end is required'),
    body('addressId').optional().isMongoId(),
    body('address').optional().isObject(),
    body('address.line1').optional().notEmpty(),
    body('address.city').optional().notEmpty(),
    body('address.state').optional().notEmpty(),
    body('issueDescription').optional().isString(),
    body('estimatedCost').optional().isFloat({ min: 0 })
  ]),
  createOrderFromAdmin
);

router.post(
  '/time-slots',
  validate([
    body('dayOfWeek').isInt({ min: 0, max: 6 }),
    body('startTime').notEmpty(),
    body('endTime').notEmpty(),
    body('intervalMinutes').optional().isInt({ min: 15 }),
    body('capacity').optional().isInt({ min: 1 }),
    body('isActive').optional().isBoolean()
  ]),
  createTimeSlot
);

router.put(
  '/time-slots/:timeSlotId',
  validate([
    param('timeSlotId').isMongoId(),
    body('dayOfWeek').optional().isInt({ min: 0, max: 6 }),
    body('startTime').optional().notEmpty(),
    body('endTime').optional().notEmpty(),
    body('intervalMinutes').optional().isInt({ min: 15 }),
    body('capacity').optional().isInt({ min: 1 }),
    body('isActive').optional().isBoolean()
  ]),
  updateTimeSlot
);

router.delete(
  '/time-slots/:timeSlotId',
  validate([param('timeSlotId').isMongoId()]),
  deleteTimeSlot
);

router.post(
  '/users',
  validate([
    body('name').notEmpty(),
    body('email').isEmail(),
    body('phone').notEmpty(),
    body('password').isLength({ min: 6 }),
    // body('role').isIn(Object.values(USER_ROLES)),
    // body('serviceItems')
    //   .if(body('role').equals(USER_ROLES.TECHNICIAN))
    //   .isArray()
    //   .withMessage('Technician must include serviceItems array'),
    // body('serviceItems.*').optional().isMongoId(),
    // body('serviceCategories.*').optional().isMongoId(),
    // body('experienceYears').optional().isFloat({ min: 0 })
  ]),
  createUser
);

export default router;
