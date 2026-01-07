import { Router } from 'express'
import { body, param, query } from 'express-validator'
import {
  createBanner,
  listBanners,
  getBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
  uploadBannerImage,
} from '../controllers/banner.controller.js'
import { authenticate, allowAdminOnly } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { upload } from '../middlewares/upload.middleware.js'

const router = Router()

// Public routes
router.get('/', listBanners)
router.get('/:bannerId', getBanner)

// File upload route (protected but before general auth middleware to avoid validation conflicts)
router.post(
  '/upload/image',
  authenticate,
  upload.single('image'),
  uploadBannerImage
)

// Protected routes - admin only
router.use(authenticate, allowAdminOnly)

router.post(
  '/',
  validate([
    body('title').notEmpty().withMessage('Title is required'),
    body('imageUrl').notEmpty().withMessage('Image URL is required'),
    body('subtitle').optional().isString(),
    body('link').optional().isString(),
    body('order').optional().isInt(),
    body('isActive').optional().isBoolean(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ]),
  createBanner
)

router.put(
  '/:bannerId',
  validate([
    param('bannerId').isMongoId().withMessage('Invalid banner ID'),
    body('title').optional().notEmpty(),
    body('subtitle').optional().isString(),
    body('imageUrl').optional().notEmpty(),
    body('link').optional().isString(),
    body('order').optional().isInt(),
    body('isActive').optional().isBoolean(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ]),
  updateBanner
)

router.delete(
  '/:bannerId',
  validate([param('bannerId').isMongoId().withMessage('Invalid banner ID')]),
  deleteBanner
)

router.patch(
  '/:bannerId/toggle',
  validate([param('bannerId').isMongoId().withMessage('Invalid banner ID')]),
  toggleBannerStatus
)

router.post(
  '/reorder',
  validate([
    body('banners').isArray().withMessage('Banners must be an array'),
    body('banners.*.id').isMongoId().withMessage('Invalid banner ID'),
  ]),
  reorderBanners
)

export default router
