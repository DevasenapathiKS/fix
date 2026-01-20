import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, ClockIcon, CurrencyRupeeIcon, PhotoIcon } from '@heroicons/react/24/outline'

import { catalogService } from '../services/catalogService'
import { useCartStore } from '../store/cartStore'

export const ServiceItemDetailPage = () => {
  const { serviceId } = useParams<{ serviceId: string }>()
  const navigate = useNavigate()
  const { addItem, items, updateQuantity } = useCartStore()

  const {
    data: service,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['service-detail', serviceId],
    queryFn: () => catalogService.getServiceDetail(serviceId || ''),
    enabled: !!serviceId,
  })

  const quantity = service ? items.find((i) => i.serviceId === service._id)?.quantity || 0 : 0

  const handleAddToCart = () => {
    if (!service) return
    addItem({
      serviceId: service._id,
      serviceName: service.name,
      categoryId: service.category._id,
      categoryName: service.category.name,
      price: service.basePrice || 0,
      duration: service.duration,
      imageUrl: service.imageUrl,
    })
  }

  if (!serviceId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Service not found</h2>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/3" />
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-80 bg-gray-300 rounded-xl" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Service not available</h2>
          <p className="text-gray-600 mb-6">
            This service might have been removed or is temporarily unavailable.
          </p>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center text-white hover:text-primary-100 mb-6 transition-colors group"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back
          </motion.button>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-sm uppercase tracking-[0.2em] text-primary-100 mb-2">
                {service.category?.name || 'Service'}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{service.name}</h1>
              {/* {service.description && (
                <p className="text-primary-100 text-base leading-relaxed mb-4 max-w-xl">
                  {service.description}
                </p>
              )} */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CurrencyRupeeIcon className="w-5 h-5 text-white" />
                  <span className="text-xl font-semibold">₹{service.basePrice}</span>
                </div>
                {service.duration && (
                  <div className="flex items-center gap-2 text-primary-100">
                    <ClockIcon className="w-5 h-5" />
                    <span>{service.duration} mins</span>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative h-64 md:h-80 rounded-2xl overflow-hidden shadow-2xl bg-black/10"
            >
              {service.imageUrl ? (
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
                  <div className="text-center p-4">
                    <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                      <PhotoIcon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 80L60 68.75C120 57.5 240 35 360 28.75C480 22.5 600 32.5 720 38.75C840 45 960 47.5 1080 45C1200 42.5 1320 35 1380 31.25L1440 27.5V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z"
              fill="white"
            />
          </svg>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-[2fr,1fr] gap-8 items-start">
          <div className="space-y-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900">What's included</h2>
            <p className="text-gray-600 leading-relaxed">
              {service.description}
            </p>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">Service details</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Category: {service.category?.name}</li>
                  <li>Base price: ₹{service.basePrice}</li>
                  {service.duration && <li>Estimated time: {service.duration} minutes</li>}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">Good to know</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Final amount may vary based on on-site diagnosis.</li>
                  <li>You can add multiple services to the same booking.</li>
                  <li>Technicians are background-verified and trained.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking summary</h3>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-gray-600">Base price</span>
              <span className="font-semibold text-gray-900">₹{service.basePrice}</span>
            </div>
            {service.duration && (
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-600">Estimated duration</span>
                <span className="font-medium text-gray-900">{service.duration} mins</span>
              </div>
            )}

            {quantity === 0 ? (
              <button
                onClick={handleAddToCart}
                className="w-full py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center bg-primary-600 text-white hover:bg-primary-700"
              >
                Add to Cart
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(service._id, quantity - 1)}
                      className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="px-5 py-2 text-sm font-semibold text-gray-900 bg-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(service._id, quantity + 1)}
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
              </div>
            )}

            {quantity > 0 && (
              <p className="text-xs text-gray-500">
                You can review this service and adjust quantities at checkout.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
