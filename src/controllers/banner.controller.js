import asyncHandler from '../utils/async-handler.js'
import { BannerService } from '../services/banner.service.js'
import { successResponse } from '../utils/response.js'
import { uploadFileToS3 } from '../middlewares/upload.middleware.js'

export const createBanner = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user.id }
  const banner = await BannerService.createBanner(payload)
  return successResponse(res, { status: 201, data: banner, message: 'Banner created successfully' })
})

export const listBanners = asyncHandler(async (req, res) => {
  const banners = await BannerService.listBanners({ isActive: req.query.isActive })
  return successResponse(res, { data: banners })
})

export const getBanner = asyncHandler(async (req, res) => {
  const banner = await BannerService.getBannerById(req.params.bannerId)
  return successResponse(res, { data: banner })
})

export const updateBanner = asyncHandler(async (req, res) => {
  const banner = await BannerService.updateBanner(req.params.bannerId, req.body)
  return successResponse(res, { data: banner, message: 'Banner updated successfully' })
})

export const deleteBanner = asyncHandler(async (req, res) => {
  const result = await BannerService.deleteBanner(req.params.bannerId)
  return successResponse(res, { data: result, message: 'Banner deleted successfully' })
})

export const toggleBannerStatus = asyncHandler(async (req, res) => {
  const banner = await BannerService.toggleBannerStatus(req.params.bannerId)
  return successResponse(res, { data: banner, message: `Banner ${banner.isActive ? 'activated' : 'deactivated'}` })
})

export const reorderBanners = asyncHandler(async (req, res) => {
  const banners = await BannerService.reorderBanners(req.body.banners)
  return successResponse(res, { data: banners, message: 'Banners reordered successfully' })
})

export const uploadBannerImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return successResponse(res, { status: 400, data: {}, message: 'No file uploaded' })
  }
  
  // Upload to S3 and get the public URL
  const imageUrl = await uploadFileToS3(req.file, 'banners')
  return successResponse(res, { status: 201, data: { imageUrl }, message: 'Image uploaded successfully' })
})

