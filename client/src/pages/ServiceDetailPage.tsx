import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, PlusIcon, CheckIcon, ClockIcon, CurrencyRupeeIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { catalogService } from '../services/catalogService'
import { useCartStore } from '../store/cartStore'
import { toast } from 'react-hot-toast'

export const ServiceDetailPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const highlightedId = searchParams.get('serviceId') || ''
  const { addItem, items, updateQuantity } = useCartStore()

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: catalogService.getServices,
  })

  const category = categories?.find((cat) => cat._id === categoryId)

  const isInCart = (serviceId: string) => {
    return items.some((item) => item.serviceId === serviceId)
  }

  const getQuantity = (serviceId: string) => {
    const found = items.find((i) => i.serviceId === serviceId)
    return found?.quantity || 0
  }

  const handleAddToCart = (service: any) => {
    addItem({
      serviceId: service._id,
      serviceName: service.name,
      categoryId: category!._id,
      categoryName: category!.name,
      price: service.basePrice || 0,
      duration: service.duration,
      imageUrl: service.imageUrl,
    })
    toast.success(`${service.name} added to cart!`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-48 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Service category not found
          </h2>
          <button
            onClick={() => navigate('/')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    )
  }
  // Scroll to highlighted service when available
  useEffect(() => {
    if (!highlightedId) return
    const el = document.getElementById(`svc-${highlightedId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedId])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section with Category Info */}
      <div className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/')}
            className="flex items-center text-white hover:text-primary-100 mb-8 transition-colors group"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Services
          </motion.button>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Category Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-lg text-primary-100 mb-6">
                  {category.description}
                </p>
              )}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-primary-100">Available</p>
                    <p className="font-semibold">{category.services?.length || 0} Services</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-primary-100">Service</p>
                    <p className="font-semibold">Same Day</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Category Image */}
            {category.heroImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative h-64 md:h-80 rounded-2xl overflow-hidden shadow-2xl"
              >
                <img
                  src={category.heroImage}
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="white"
            />
          </svg>
        </div>
      </div>

      {/* Services Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Choose Your Service
          </h2>
          <p className="text-lg text-gray-600">
            Select from our range of professional services
          </p>
        </motion.div>

        {!category.services || category.services.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Services Available</h3>
            <p className="text-gray-500">Check back soon for new services in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.services.map((service, index) => (
              <motion.div
                key={service._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                id={`svc-${service._id}`}
                className={`group h-full relative ${highlightedId === service._id ? 'ring-2 ring-primary-600 rounded-lg' : ''}`}
                onClick={() => navigate(`/service/${service._id}`)}
              >
                {/* In Cart Badge */}
                {isInCart(service._id) && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center">
                      <CheckIcon className="w-3.5 h-3.5 mr-1" />
                      In Cart
                    </span>
                  </div>
                )}

                <div className={`flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${highlightedId === service._id ? 'bg-primary-50' : ''}`}>
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-48 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                      <div className="text-center p-4">
                        <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                          <PhotoIcon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                      </div>
                    </div>
                  )}

                  {/* Service Info */}
                  <div className="p-4 flex flex-col flex-grow">
                    <p className="text-sm text-gray-600 line-clamp-2 flex-grow mb-3">
                      {service.description || 'Professional service'}
                    </p>

                    {/* Price and Duration Row */}
                    <div className="flex items-center justify-between mb-3 text-sm">
                      <div className="flex items-center gap-1">
                        <CurrencyRupeeIcon className="w-4 h-4 text-primary-600" />
                        <span className="font-bold text-primary-600">₹{service.basePrice}</span>
                      </div>
                      {service.duration && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <ClockIcon className="w-4 h-4" />
                          <span>{service.duration}m</span>
                        </div>
                      )}
                    </div>

                    {/* Add to Cart or Quantity Controls */}
                    {getQuantity(service._id) === 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToCart(service)
                        }}
                        className="w-full py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center bg-primary-600 text-white hover:bg-primary-700"
                      >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add to Cart
                      </button>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateQuantity(service._id, getQuantity(service._id) - 1)
                            }}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="px-5 py-2 text-sm font-semibold text-gray-900 bg-white">
                            {getQuantity(service._id)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateQuantity(service._id, getQuantity(service._id) + 1)
                            }}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded">
                          In cart
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
