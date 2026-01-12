import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  CheckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { orderService } from '../services/orderService'
import { format } from 'date-fns'
import { useState, useMemo } from 'react'

export const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [chatInput, setChatInput] = useState('')

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrderById(orderId!),
    enabled: !!orderId,
  })

  const { data: jobCard } = useQuery({
    queryKey: ['orderJobCard', orderId],
    queryFn: () => orderService.getJobCard(orderId!),
    enabled: !!orderId,
  })

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => orderService.postMessage(orderId!, message),
    onSuccess: () => {
      setChatInput('')
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    },
  })

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon className="w-20 h-20 text-green-500" />
      case 'cancelled':
        return <XCircleIcon className="w-20 h-20 text-red-500" />
      case 'confirmed':
        return <CheckIcon className="w-20 h-20 text-blue-500" />
      case 'in-progress':
        return <WrenchScrewdriverIcon className="w-20 h-20 text-purple-500" />
      default:
        return <ClockIcon className="w-20 h-20 text-yellow-500" />
    }
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; text: string; border: string }> = {
      pending: {
        color: 'text-yellow-700',
        bg: 'bg-yellow-50',
        text: 'Pending',
        border: 'border-yellow-200',
      },
      confirmed: {
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        text: 'Confirmed',
        border: 'border-blue-200',
      },
      'in-progress': {
        color: 'text-purple-700',
        bg: 'bg-purple-50',
        text: 'In Progress',
        border: 'border-purple-200',
      },
      completed: {
        color: 'text-green-700',
        bg: 'bg-green-50',
        text: 'Completed',
        border: 'border-green-200',
      },
      cancelled: {
        color: 'text-red-700',
        bg: 'bg-red-50',
        text: 'Cancelled',
        border: 'border-red-200',
      },
    }
    return (
      configs[status.toLowerCase()] || {
        color: 'text-gray-700',
        bg: 'bg-gray-50',
        text: status,
        border: 'border-gray-200',
      }
    )
  }

  const getStatusMessage = (status: string) => {
    const messages: Record<string, { title: string; description: string }> = {
      pending: {
        title: 'Order Placed Successfully!',
        description: 'Your order has been received and is awaiting confirmation. We will notify you once it is confirmed.',
      },
      confirmed: {
        title: 'Order Confirmed!',
        description: 'Great news! Your order has been confirmed. A skilled technician will be assigned to your service shortly.',
      },
      'in-progress': {
        title: 'Service In Progress',
        description: 'Our expert technician is currently working on your service. You will be notified upon completion.',
      },
      completed: {
        title: 'Service Completed Successfully!',
        description: 'Your service has been completed. Thank you for choosing our services. We hope to serve you again!',
      },
      cancelled: {
        title: 'Order Cancelled',
        description: 'This order has been cancelled. If you have any questions, please contact our support team.',
      },
    }
    return (
      messages[status.toLowerCase()] || {
        title: 'Order Status',
        description: 'Your order is being processed.',
      }
    )
  }

  // Timeline removed per request

  const activity = useMemo(() => {
    const entries = (order?.history || []).slice().sort((a: any, b: any) => {
      const ta = new Date(a.performedAt || a.createdAt || 0).getTime()
      const tb = new Date(b.performedAt || b.createdAt || 0).getTime()
      return ta - tb
    })
    return entries
  }, [order?.history])

  const chatMessages = useMemo(() => {
    return (order?.history || []).filter((e: any) => (e.action || '').toLowerCase() === 'chat_message')
  }, [order?.history])

  // Derived totals for Job Summary with safe fallbacks
  const gstRate = 0.18
  const subtotal = useMemo(() => {
    const jcFinal = Number(jobCard?.finalAmount ?? 0)
    const derived = Number(jobCard?.estimateAmount ?? 0) + Number(jobCard?.additionalCharges ?? 0)
    const orderEst = Number(order?.estimatedCost ?? 0)
    // Prefer job card final, else derived from job card fields, else order estimate
    if (jcFinal > 0) return jcFinal
    if (derived > 0) return derived
    return orderEst
  }, [jobCard?.finalAmount, jobCard?.estimateAmount, jobCard?.additionalCharges, order?.estimatedCost])
  const gstAmount = useMemo(() => subtotal * gstRate, [subtotal])
  const grandTotal = useMemo(() => subtotal + gstAmount, [subtotal, gstAmount])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-700">Loading order details...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-12 text-center"
          >
            <XCircleIcon className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Order Not Found</h2>
            <p className="text-gray-600 mb-8 text-lg">
              We couldn't find the order you're looking for. It may have been removed or the link is incorrect.
            </p>
            <Link
              to="/orders"
              className="inline-flex items-center px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              View All Orders
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(order.status)
  const statusMessage = getStatusMessage(order.status)
  // Timeline removed

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/orders')}
          className="flex items-center text-gray-600 hover:text-primary-600 mb-8 transition-colors group"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Orders</span>
        </motion.button>

        {/* Status Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${statusConfig.bg} ${statusConfig.border} border-2 rounded-2xl shadow-lg p-8 sm:p-12 mb-8`}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-6">{getStatusIcon(order.status)}</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              {statusMessage.title}
            </h1>
            <p className="text-gray-600 text-lg mb-6 max-w-2xl">{statusMessage.description}</p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="inline-flex items-center space-x-2 bg-white px-6 py-3 rounded-lg shadow-sm">
                <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Order ID:</span>
                <span className="text-sm font-mono font-bold text-gray-900">{order.orderCode}</span>
              </div>
              <span
                className={`${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border px-6 py-3 rounded-lg font-bold text-sm shadow-sm`}
              >
                {statusConfig.text.toUpperCase()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Timeline removed per request */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Order Details & Services */}
          <div className="lg:col-span-2 space-y-6">
            {/* Services List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-md p-6 sm:p-8"
            >
              <div className="flex items-center mb-6">
                <ShoppingBagIcon className="w-6 h-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Services Booked</h2>
              </div>

              <div className="space-y-4">
                {order.services.map((service: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {service.serviceName || 'Service'}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Quantity: {service.quantity}</span>
                        {service.issueDescription && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            Custom Request
                          </span>
                        )}
                      </div>
                      {service.issueDescription && (
                        <p className="mt-2 text-sm text-gray-600 italic">
                          "{service.issueDescription}"
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{service.estimatedCost.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">per service</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-6 pt-6 border-t-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CurrencyRupeeIcon className="w-6 h-6 text-primary-600 mr-2" />
                    <span className="text-xl font-bold text-gray-900">Total Amount</span>
                  </div>
                  <span className="text-3xl font-bold text-primary-600">
                    ₹{order.estimatedCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Order Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-md p-6 sm:p-8"
            >
              <div className="flex items-center mb-6">
                <CalendarIcon className="w-6 h-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Schedule Information</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Order Placed</p>
                  <p className="text-base font-semibold text-gray-900">
                    {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(order.createdAt), 'hh:mm a')}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Scheduled Service</p>
                  <p className="text-base font-semibold text-gray-900">
                    {format(new Date(order.scheduledAt), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(order.scheduledAt), 'hh:mm a')}
                  </p>
                </div>
              </div>

              {order.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-500 mb-2">Additional Notes</p>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{order.notes}</p>
                </div>
              )}
            </motion.div>

            {/* Activity & Chat - Combined Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl shadow-md p-6 sm:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Activity & Chat</h2>
                <span className="text-xs text-gray-500">Stay updated and message support</span>
              </div>

              {/* Activity Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
                {activity.length === 0 ? (
                  <p className="text-sm text-gray-500">No activity yet.</p>
                ) : (
                  <div className="space-y-4 max-h-56 overflow-auto pr-1">
                    {activity.map((entry: any, idx: number) => (
                      <div key={entry._id || idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-2 rounded-full bg-primary-600" />
                        <div>
                          <p className="text-sm text-gray-900">{entry.message || entry.action}</p>
                          {entry.performedAt && (
                            <p className="text-xs text-gray-500">{format(new Date(entry.performedAt), 'MMM dd, yyyy hh:mm a')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="my-6 border-t border-gray-200" />

              {/* Chat Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Chat</h3>
                <div className="max-h-56 overflow-auto space-y-3 mb-4 pr-1">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-gray-500">No messages yet. Start the conversation.</p>
                  ) : (
                    chatMessages.map((m: any, idx: number) => (
                      <div key={m._id || idx} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-900">{m.message}</p>
                        {m.performedAt && (
                          <p className="text-xs text-gray-500 mt-1">{format(new Date(m.performedAt), 'MMM dd, yyyy hh:mm a')}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                  <button
                    onClick={() => chatInput.trim() && sendMessageMutation.mutate(chatInput)}
                    disabled={sendMessageMutation.isPending || !chatInput.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:bg-gray-300"
                  >
                    {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Address & Customer Info */}
          <div className="space-y-6">
            {/* Service Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-md p-6 sm:p-8"
            >
              <div className="flex items-center mb-6">
                <MapPinIcon className="w-6 h-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Service Location</h2>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="font-semibold text-gray-900 mb-3">{order.customer.name}</p>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>{order.customer.addressLine1}</p>
                    {order.customer.addressLine2 && <p>{order.customer.addressLine2}</p>}
                    <p className="font-medium text-gray-900">
                      {order.customer.city}, {order.customer.state}
                    </p>
                    <p className="font-medium text-gray-900">{order.customer.postalCode}</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex items-center text-sm">
                    <PhoneIcon className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-gray-900 font-medium">{order.customer.phone}</span>
                  </div>
                  {order.customer.email && (
                    <div className="flex items-center text-sm">
                      <EnvelopeIcon className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{order.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl shadow-md p-6 border border-primary-200"
            >
              <h3 className="font-bold text-gray-900 mb-4">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Have questions about your order? Our support team is here to help.
              </p>
              <button className="w-full bg-white text-primary-600 font-semibold py-3 px-4 rounded-lg hover:bg-primary-600 hover:text-white transition-colors shadow-sm">
                Contact Support
              </button>
            </motion.div>

            {/* Job Card Summary */}
            {jobCard && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="bg-white rounded-2xl shadow-md p-6 sm:p-8"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">Job Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Estimate</span><span className="font-semibold">₹{jobCard.estimateAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Additional</span><span className="font-semibold">₹{jobCard.additionalCharges.toFixed(2)}</span></div>
                  <div className="border-t pt-2 flex justify-between"><span className="text-gray-900 font-medium">Subtotal</span><span className="text-gray-900 font-bold">₹{subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">GST (18%)</span><span className="font-semibold">₹{gstAmount.toFixed(2)}</span></div>
                  <div className="border-t pt-2 flex justify-between"><span className="text-gray-900 font-medium">Grand Total</span><span className="text-primary-600 font-bold">₹{grandTotal.toFixed(2)}</span></div>
                  <div className="text-xs text-gray-500">Payment: {jobCard.paymentStatus}</div>
                </div>
                {(jobCard.extraWork?.length > 0 || jobCard.spareParts?.length > 0) && (
                  <div className="mt-4">
                    {jobCard.extraWork?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-900 mb-1">Extra Work</p>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {jobCard.extraWork.map((w, i) => (
                            <li key={i} className="flex justify-between"><span>{w.description}</span><span>₹{w.amount.toFixed(2)}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {jobCard.spareParts?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">Spare Parts</p>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {jobCard.spareParts.map((p, i) => (
                            <li key={i} className="flex justify-between"><span>Qty {p.quantity}</span><span>₹{(p.quantity * p.unitPrice).toFixed(2)}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Chat moved into combined card above */}
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-col sm:flex-row gap-4"
        >
          <Link
            to="/"
            className="flex-1 bg-primary-600 text-white py-4 px-8 rounded-xl font-bold hover:bg-primary-700 transition-all text-center shadow-md hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Browse More Services
          </Link>
          <Link
            to="/orders"
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-4 px-8 rounded-xl font-bold hover:border-primary-600 hover:text-primary-600 transition-all text-center shadow-sm hover:shadow-md"
          >
            View All Orders
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
