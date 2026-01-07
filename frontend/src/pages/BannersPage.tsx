import { useState, useEffect } from 'react'
import { bannerService } from '../services/bannerService'
import type { Banner } from '../services/bannerService'

export const BannersPage = () => {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      setLoading(true)
      const data = await bannerService.listBanners()
      setBanners(data)
      setError('')
    } catch (err) {
      setError('Failed to load banners')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (bannerId: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return

    try {
      await bannerService.deleteBanner(bannerId)
      setBanners(banners.filter((b) => b._id !== bannerId))
    } catch (err) {
      setError('Failed to delete banner')
      console.error(err)
    }
  }

  const handleToggle = async (bannerId: string) => {
    try {
      const updated = await bannerService.toggleBannerStatus(bannerId)
      setBanners(banners.map((b) => (b._id === bannerId ? updated : b)))
    } catch (err) {
      setError('Failed to toggle banner status')
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Banners</h1>
        <a
          href="/banners/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          + Create Banner
        </a>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600 mb-4">No banners yet</p>
          <a
            href="/banners/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Create your first banner
          </a>
        </div>
      ) : (
        <div className="grid gap-6">
          {banners.map((banner) => (
            <div
              key={banner._id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="grid grid-cols-4 gap-6">
                {/* Image */}
                <div className="col-span-1">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="rounded-lg w-full h-32 object-cover"
                  />
                </div>

                {/* Content */}
                <div className="col-span-2 space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">{banner.title}</h3>
                  {banner.subtitle && <p className="text-sm text-gray-600">{banner.subtitle}</p>}
                  {banner.link && (
                    <p className="text-sm text-blue-600 truncate">
                      <a href={banner.link} target="_blank" rel="noopener noreferrer">
                        {banner.link}
                      </a>
                    </p>
                  )}
                  {banner.startDate && banner.endDate && (
                    <p className="text-xs text-gray-500">
                      {new Date(banner.startDate).toLocaleDateString()} -{' '}
                      {new Date(banner.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex flex-col gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        banner.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggle(banner._id)}
                      className="flex-1 rounded-lg text-xs font-medium px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {banner.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <a
                      href={`/banners/${banner._id}`}
                      className="flex-1 rounded-lg text-xs font-medium px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => handleDelete(banner._id)}
                      className="flex-1 rounded-lg text-xs font-medium px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
