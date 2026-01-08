import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { bannerService } from '../services/bannerService'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export const BannerPage = () => {
  const [currentIndex, setCurrentIndex] = useState(0)

  const { data: banners, isLoading, error } = useQuery({
    queryKey: ['banners', true],
    queryFn: () => bannerService.getBanners(true),
  })

  const activeBanners = banners || []

  useEffect(() => {
    if (activeBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activeBanners.length)
      }, 5000) // Auto-advance every 5 seconds

      return () => clearInterval(timer)
    }
  }, [activeBanners.length])

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading banners...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load banners</p>
        </div>
      </div>
    )
  }

  if (!activeBanners.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No active banners available</p>
        </div>
      </div>
    )
  }

  const currentBanner = activeBanners[currentIndex]

  return (
    <div className="bg-gray-50">
      {/* Hero Banner Section */}
      <div className="relative h-[600px] overflow-hidden bg-gray-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative h-full"
          >
            <img
              src={currentBanner.imageUrl}
              alt={currentBanner.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
                <div className="max-w-2xl text-white">
                  <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-5xl md:text-6xl font-bold mb-4"
                  >
                    {currentBanner.title}
                  </motion.h1>
                  {currentBanner.subtitle && (
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl md:text-2xl mb-8 text-gray-200"
                    >
                      {currentBanner.subtitle}
                    </motion.p>
                  )}
                  {currentBanner.link && (
                    <motion.a
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      href={currentBanner.link}
                      className="inline-block px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Learn More
                    </motion.a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition-all"
              aria-label="Previous banner"
            >
              <ChevronLeftIcon className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition-all"
              aria-label="Next banner"
            >
              <ChevronRightIcon className="h-6 w-6 text-white" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
            {activeBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* All Banners Grid */}
      {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">All Promotions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeBanners.map((banner) => (
            <motion.div
              key={banner._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
            >
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-gray-600 mb-4">{banner.subtitle}</p>
                )}
                {banner.link && (
                  <a
                    href={banner.link}
                    className="inline-block px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    View Details
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div> */}
    </div>
  )
}
