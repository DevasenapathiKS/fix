import Banner from '../models/banner.model.js'
import ApiError from '../utils/api-error.js'

export const BannerService = {
  async createBanner(payload) {
    const banner = await Banner.create(payload)
    return banner
  },

  async listBanners(filters = {}) {
    const query = {}
    if (filters.isActive !== undefined) query.isActive = filters.isActive
    const banners = await Banner.find(query).populate('createdBy', 'name email').sort({ order: 1, createdAt: -1 })
    return banners
  },

  async getBannerById(bannerId) {
    const banner = await Banner.findById(bannerId).populate('createdBy', 'name email')
    if (!banner) throw new ApiError(404, 'Banner not found')
    return banner
  },

  async updateBanner(bannerId, payload) {
    const banner = await Banner.findByIdAndUpdate(bannerId, payload, { new: true }).populate('createdBy', 'name email')
    if (!banner) throw new ApiError(404, 'Banner not found')
    return banner
  },

  async deleteBanner(bannerId) {
    const banner = await Banner.findByIdAndDelete(bannerId)
    if (!banner) throw new ApiError(404, 'Banner not found')
    return { deleted: true }
  },

  async toggleBannerStatus(bannerId) {
    const banner = await Banner.findById(bannerId)
    if (!banner) throw new ApiError(404, 'Banner not found')
    banner.isActive = !banner.isActive
    await banner.save()
    return banner
  },

  async reorderBanners(banners) {
    const updates = banners.map((item, index) =>
      Banner.findByIdAndUpdate(item.id, { order: index }, { new: true })
    )
    const result = await Promise.all(updates)
    return result
  },
}
