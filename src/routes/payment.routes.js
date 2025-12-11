import { Router } from 'express';
import { body } from 'express-validator';
import { createPayment, paymentWebhook } from '../controllers/payment.controller.js';
import { authenticate, allowAdminOnly } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { PAYMENT_METHODS } from '../constants/index.js';

const router = Router();

router.post(
  '/',
  authenticate,
  allowAdminOnly,
  validate([
    body('orderId').isMongoId(),
    body('jobCardId').isMongoId(),
    body('method').isIn(Object.values(PAYMENT_METHODS)),
    body('amount').isFloat({ min: 0 }),
    body('transactionRef').optional().isString()
  ]),
  createPayment
);

router.post('/webhook', paymentWebhook);

export default router;
