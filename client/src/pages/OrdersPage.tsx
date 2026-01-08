import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { orderService } from '../services/orderService'
import { format } from 'date-fns'
import { useAuthStore } from '../store/authStore'
import {
  ClockIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ShoppingBagIcon,
  CalendarIcon,
  MapPinIcon,
  ChevronRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

interface StatusConfig {
  color: string
  bg: string
  icon: any
  label: string
}

export const OrdersPage = () => {
  const { user, token } = useAuthStore()

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: orderService.getOrders,
    enabled: !!token,
  })

  const getStatusConfig = (status: string): StatusConfig => {
    const configs: Record<string, StatusConfig> = {
      pending: {
        color: 'text-yellow-700',
        bg: 'bg-yellow-50 border-yellow-200',
        icon: ClockIcon,
        label: 'Pending',
      },
      confirmed: {
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
        icon: CheckCircleIcon,
        label: 'Confirmed',
      },
      'in-progress': {
        color: 'text-purple-700',
        bg: 'bg-purple-50 border-purple-200',
        icon: ArrowPathIcon,
        label: 'In Progress',
      },
      completed: {
        color: 'text-green-700',
        bg: 'bg-green-50 border-green-200',
        icon: CheckCircleIcon,
        label: 'Completed',
      },
      cancelled: {
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
        icon: XCircleIcon,
        label: 'Cancelled',
      },
    }
    return (
      configs[status] || {
        color: 'text-gray-700',
        bg: 'bg-gray-50 border-gray-200',
        icon: ClockIcon,
        label: status,
      }
    )
  }

  // Not logged in - show login prompt
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-md p-12 text-center"
          >
            <UserCircleIcon className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Login Required</h3>
            <p className="text-gray-500 mb-6">Please log in to view your orders</p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md"
            >
              Go to Homepage
              <ChevronRightIcon className="h-5 w-5 ml-2" />
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-6 w-64 bg-gray-200 rounded mt-3 animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-64 bg-white rounded-xl shadow-sm animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to load orders</h3>
            <p className="text-gray-500 mb-4">
              {error instanceof Error ? error.message : 'Please try again later'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main content - orders list
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage your service bookings</p>
        </motion.div>

        {/* Empty state - no orders */}
        {!orders || orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-md p-12 text-center"
          >
            <ShoppingBagIcon className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">Start booking amazing services today!</p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md"
            >
              Browse Services
              <ChevronRightIcon className="h-5 w-5 ml-2" />
            </Link>
          </motion.div>
        ) : (
          /* Orders list */
          <div className="space-y-5">
            {orders.map((order, index) => {
              const statusConfig = getStatusConfig(order.status)
              const StatusIcon = statusConfig.icon

              return (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={`/orders/${order._id}`}
                    className="block bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-primary-200 group"
                  >
                    {/* Status Bar */}
                    <div className={`px-6 py-3 border-b ${statusConfig.bg}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                          <span className={`font-semibold ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <span className="text-sm font-mono text-gray-600">#{order.orderCode}</span>
                      </div>
                    </div>

                    {/* Order Content */}
                    <div className="p-6">
                      {/* Services List */}
                      <div className="mb-5">
                        <h4 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
                          Services Booked
                        </h4>
                        <div className="space-y-2">
                          {order.services.map((service, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{service.serviceName}</p>
                                <p className="text-sm text-gray-500">Quantity: {service.quantity}</p>
                              </div>
                              <span className="font-semibold text-gray-900">
                                ₹{service?.estimatedCost?.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Order Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 border-t border-gray-100">
                        {/* Scheduled Date */}
                        <div className="flex items-start space-x-3">
                          <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Scheduled
                            </p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {format(new Date(order.scheduledAt), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {format(new Date(order.scheduledAt), 'hh:mm a')}
                            </p>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="flex items-start space-x-3">
                          <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Address
                            </p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {order.customer.city}, {order.customer.state}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {order.customer.postalCode}
                            </p>
                          </div>
                        </div>

                        {/* Total Amount */}
                        <div className="flex items-start space-x-3 md:justify-end">
                          <CurrencyRupeeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="md:text-right">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Total Amount
                            </p>
                            <p className="text-2xl font-bold text-primary-600 mt-1">
                              ₹{order?.estimatedCost?.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer - Order placement date and view details */}
                      <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Placed on {format(new Date(order.createdAt), 'MMM dd, yyyy - hh:mm a')}
                        </p>
                        <div className="flex items-center text-primary-600 font-medium text-sm group-hover:text-primary-700">
                          View Details
                          <ChevronRightIcon className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
