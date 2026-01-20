import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  addExtraWork,
  addSpareParts,
  checkIn,
  checkOut,
  completeJob,
  deleteJobMedia,
  getAvailability,
  getJobCardDetail,
  getProfile,
  listActiveJobsToday,
  listJobCards,
  listSpareParts,
  listServiceCatalog,
  listNotifications,
  markNotificationRead,
  removeExtraWork,
  removeSparePart,
  updateAvailability,
  updateEstimate,
  uploadJobMedia
} from '../controllers/technician.controller.js';
import { authenticate, allowTechnicianOnly } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

const router = Router();

router.use(authenticate, allowTechnicianOnly);

router.get('/profile', getProfile);

router.post(
  '/availability',
  validate([
    body('entries').isArray({ min: 1 }),
    body('entries.*.dayOfWeek').isInt({ min: 0, max: 6 }),
    body('entries.*.startTime').notEmpty(),
    body('entries.*.endTime').notEmpty()
  ]),
  updateAvailability
);

router.get('/availability', getAvailability);

router.get('/jobcards', listJobCards);
router.get('/jobcards/active-today', listActiveJobsToday);
router.get('/jobcards/:jobCardId', validate([param('jobCardId').isMongoId()]), getJobCardDetail);

router.post(
  '/jobcards/:jobCardId/check-in',
  validate([
    param('jobCardId').isMongoId(),
    body('lat').isFloat(),
    body('lng').isFloat()
  ]),
  checkIn
);

router.post(
  '/jobcards/:jobCardId/checkout',
  validate([
    param('jobCardId').isMongoId(),
    body('otp').isString().isLength({ min: 6, max: 6 })
  ]),
  checkOut
);

router.post(
  '/jobcards/:jobCardId/extra-work',
  validate([
    param('jobCardId').isMongoId(),
    body('items').isArray({ min: 1 }),
    body('items.*.description').optional().notEmpty(),
    body('items.*.serviceCategory').isMongoId(),
    body('items.*.serviceItem').isMongoId(),
    body('items.*.amount').optional().isFloat({ min: 0 })
  ]),
  addExtraWork
);

router.delete(
  '/jobcards/:jobCardId/extra-work/:itemIndex',
  validate([param('jobCardId').isMongoId(), param('itemIndex').isInt({ min: 0 })]),
  removeExtraWork
);

router.post(
  '/jobcards/:jobCardId/spare-parts',
  validate([
    param('jobCardId').isMongoId(),
    body('parts').isArray({ min: 1 }),
    body('parts.*.part').isMongoId(),
    body('parts.*.quantity').isFloat({ min: 1 }),
    body('parts.*.unitPrice').isFloat({ min: 0 })
  ]),
  addSpareParts
);

router.delete(
  '/jobcards/:jobCardId/spare-parts/:itemIndex',
  validate([param('jobCardId').isMongoId(), param('itemIndex').isInt({ min: 0 })]),
  removeSparePart
);

router.post(
  '/jobcards/:jobCardId/estimate',
  validate([param('jobCardId').isMongoId(), body('estimateAmount').isFloat({ min: 0 })]),
  updateEstimate
);

router.post(
  '/jobcards/:jobCardId/complete',
  validate([
    param('jobCardId').isMongoId(),
    body('resolution').optional().isIn(['completed', 'follow_up']),
    body('paymentStatus').optional().isIn(['paid', 'pending', 'partial']),
    body('followUpNote').optional().isString()
  ]),
  completeJob
);

router.post(
  '/jobcards/:jobCardId/media',
  validate([
    param('jobCardId').isMongoId(),
    body('media').isArray({ min: 1 }),
    body('media.*.url').isString().notEmpty(),
    body('media.*.kind').optional().isIn(['image', 'video', 'document']),
    body('media.*.name').optional().isString()
  ]),
  uploadJobMedia
);

router.delete(
  '/jobcards/:jobCardId/media/:mediaId',
  validate([
    param('jobCardId').isMongoId(),
    param('mediaId').isMongoId()
  ]),
  deleteJobMedia
);

router.get('/notifications', listNotifications);
router.post(
  '/notifications/:notificationId/read',
  validate([param('notificationId').isMongoId()]),
  markNotificationRead
);

router.get('/spare-parts', listSpareParts);
router.get('/services/catalog', listServiceCatalog);

export default router;
