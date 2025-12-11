import { Router } from 'express';
import { body, query } from 'express-validator';
import { createOrder, getOrder, listOrders, rescheduleOrder } from '../controllers/order.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate, allowAdminOnly } from '../middlewares/auth.middleware.js';

const router = Router();

router.post(
  '/',
  validate([
    body('customer.name').notEmpty(),
    body('customer.phone').notEmpty(),
    body('customer.addressLine1').notEmpty(),
    body('customer.city').notEmpty(),
    body('customer.state').notEmpty(),
    body('customer.postalCode').notEmpty(),
    body('serviceCategory').isMongoId(),
    body('serviceItem').isMongoId(),
    body('scheduledAt').isISO8601(),
    body('timeWindowStart').isISO8601(),
    body('timeWindowEnd').isISO8601()
  ]),
  createOrder
);

router.get(
  '/',
  authenticate,
  allowAdminOnly,
  validate([
    query('status').optional().isString(),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601()
  ]),
  listOrders
);

router.get('/:id', authenticate, allowAdminOnly, getOrder);

router.post(
  '/:id/reschedule',
  authenticate,
  allowAdminOnly,
  validate([
    body('newStart').isISO8601(),
    body('newEnd').isISO8601()
  ]),
  rescheduleOrder
);

export default router;
