import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { catalogService } from '../services/catalogService'

export const ServiceCatalog = () => {
  const { data: catalogs, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: catalogService.getServices,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-300 rounded-lg h-48 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        Failed to load services. Please try again later.
      </div>
    )
  }

  if (!catalogs || catalogs.length === 0) {
    return (
      <div className="text-center text-gray-600 py-8">
        No services available at the moment.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {catalogs.map((catalog, index) => (
        <motion.div
          key={catalog._id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
          viewport={{ once: true }}
          className="group h-full"
        >
          <Link
            to={`/services/${catalog._id}`}
            className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            {catalog.heroImage ? (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={catalog.heroImage}
                  alt={catalog.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg font-semibold text-white">
                    {catalog.name}
                  </h3>
                </div>
              </div>
            ) : (
              <div className="relative h-48 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {catalog.name}
                  </h3>
                </div>
              </div>
            )}

            <div className="p-4 flex flex-col flex-grow">
              <p className="text-sm text-gray-600 line-clamp-2 flex-grow">
                {catalog.description || 'Professional service solutions'}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {catalog.services?.length || 0} services
                </span>
                <span className="text-primary-600 text-sm font-medium group-hover:text-primary-700">
                  View →
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
