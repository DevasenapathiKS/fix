import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { catalogService } from '../services/catalogService'
import {
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useCartStore } from '../store/cartStore'
import { toast } from 'react-hot-toast'

export const TopRatedServices = () => {
  const { addItem, items, updateQuantity } = useCartStore()

  const { data: categories, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: catalogService.getServices,
  })

  // Define the type for a service with optional imageUrl
  type TopRatedService = {
    _id: string
    name: string
    description?: string
    basePrice: number
    duration?: number
    category: { _id: string; name: string }
    imageUrl?: string
    categoryName: string
    categoryId: string
  }

  // Get top rated services (select 6 services with variety from different categories)
  const topRatedServices: TopRatedService[] | undefined = categories
    ?.flatMap((category) =>
      category.services.map((service: any) => ({
        ...service,
        categoryName: category.name,
        categoryId: category._id,
        imageUrl: service.imageUrl,
      }))
    )
    .reverse() // Show different services than FrequentlyOrderedServices
    .slice(0, 6)

  const handleAddToCart = (service: any) => {
    addItem({
      serviceId: service._id,
      serviceName: service.name,
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      price: service.basePrice,
      duration: service.duration,
      imageUrl: service.imageUrl,
    })
    toast.success(`${service.name} added to cart!`)
  }

  const getQuantity = (serviceId: string) => {
    const found = items.find((i) => i.serviceId === serviceId)
    return found?.quantity || 0
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-300 rounded-lg h-48 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!topRatedServices || topRatedServices.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {topRatedServices.map((service, index) => (
        <motion.div
          key={service._id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
          viewport={{ once: true }}
          className="group h-full relative"
        >
          {/* Top Rated Badge */}
          <div className="absolute top-3 right-3 z-10">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center">
              <StarIconSolid className="w-3 h-3 mr-1" />
              Top Rated
            </span>
          </div>

          <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
            {/* Service Image with Overlay */}
            {service.imageUrl ? (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const fallback = target.nextElementSibling as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg font-semibold text-white">
                    {service.name}
                  </h3>
                </div>
              </div>
            ) : (
              <div className="relative h-48 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                    <PhotoIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {service.name}
                  </h3>
                </div>
              </div>
            )}

            {/* Service Info */}
            <div className="p-4 flex flex-col flex-grow">
              <p className="text-sm text-gray-600 line-clamp-2 flex-grow">
                {service.description || 'Top rated professional service'}
              </p>

              {/* Rating and Price Row */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIconSolid
                        key={star}
                        className="w-3.5 h-3.5 text-amber-400"
                      />
                    ))}
                  </div>
                  <span className="ml-1 text-xs text-gray-600">5.0</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{service.basePrice}
                </span>
              </div>

              {/* Add to Cart or Quantity Controls */}
              {getQuantity(service._id) === 0 ? (
                <button
                  onClick={() => handleAddToCart(service)}
                  className="mt-3 w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm flex items-center justify-center"
                >
                  Add to Cart
                </button>
              ) : (
                <div className="mt-3 flex items-center justify-center">
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(service._id, getQuantity(service._id) - 1)}
                      className="px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="px-4 py-2 text-sm font-semibold text-gray-900 bg-white">
                      {getQuantity(service._id)}
                    </span>
                    <button
                      onClick={() => updateQuantity(service._id, getQuantity(service._id) + 1)}
                      className="px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
