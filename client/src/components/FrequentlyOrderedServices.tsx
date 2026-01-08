import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { catalogService } from '../services/catalogService'
import {
  SparklesIcon,
  ArrowRightIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { useCartStore } from '../store/cartStore'
import { toast } from 'react-hot-toast'

export const FrequentlyOrderedServices = () => {
  const { addItem } = useCartStore()

  const { data: categories, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: catalogService.getServices,
  })

  // Define the type for a service with optional imageUrl
  type FrequentService = {
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

  // Get frequently ordered services (first 6 services from all categories)
  const frequentServices: FrequentService[] | undefined = categories
    ?.flatMap((category) =>
      category.services.map((service: any) => ({
        ...service,
        categoryName: category.name,
        categoryId: category._id,
        imageUrl: service.imageUrl,
      }))
    )
    .slice(0, 6)

  const handleAddToCart = (service: any) => {
    addItem({
      serviceId: service._id,
      serviceName: service.name,
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      price: service.basePrice,
      duration: service.duration,
    })
    toast.success(`${service.name} added to cart!`)
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

  if (!frequentServices || frequentServices.length === 0) {
    return null
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {frequentServices.map((service, index) => (
          <motion.div
            key={service._id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            viewport={{ once: true }}
            className="group h-full relative"
          >
            {/* Popular Badge */}
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center">
                <SparklesIcon className="w-3 h-3 mr-1" />
                Popular
              </span>
            </div>

            <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              {/* Service Image */}
              {service.imageUrl ? (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={service.imageUrl}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `
                          <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                            <svg class="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        `
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-semibold text-white line-clamp-2">
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
                    <h3 className="text-lg font-semibold text-white line-clamp-2">
                      {service.name}
                    </h3>
                  </div>
                </div>
              )}

              {/* Card Content */}
              <div className="p-4 flex flex-col flex-grow">
                <p className="text-sm text-gray-600 line-clamp-2 flex-grow mb-3">
                  {service.description || 'Professional service solution'}
                </p>

                {/* Service Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{service.categoryName}</span>
                    {service.duration && (
                      <div className="flex items-center text-gray-500">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        <span>{service.duration} min</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center text-xl font-bold text-primary-600">
                    <CurrencyRupeeIcon className="w-5 h-5" />
                    <span>{service.basePrice}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      handleAddToCart(service)
                    }}
                    className="flex-1 bg-primary-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
                  >
                    Add to Cart
                  </button>
                  <Link
                    to={`/services/${service.categoryId}`}
                    className="flex items-center justify-center bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors"
                    title="View Details"
                  >
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* View All Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center mt-8"
      >
        <Link
          to="/"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 font-semibold text-lg group"
        >
          View All Services
          <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </div>
  )
}
