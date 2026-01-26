import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
// import { formatInTimeZone } from "date-fns-tz";
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

declare global {
  interface Window {
    Razorpay: any
  }
}
import { orderService } from '../services/orderService'
import { paymentService, type PaymentMethod } from '../services/paymentService'
import { format } from 'date-fns'
import { useState, useMemo } from 'react'
import { formatDateTime } from '../utils/helpers'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

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

  const { data: paymentBalance } = useQuery({
    queryKey: ['orderPaymentBalance', orderId],
    queryFn: () => paymentService.getPaymentBalance(orderId!),
    enabled: !!orderId && !!jobCard,
  })

  const { data: orderPayments = [] } = useQuery({
    queryKey: ['orderPayments', orderId],
    queryFn: () => paymentService.getOrderPayments(orderId!),
    enabled: !!orderId,
  })

  const { user } = useAuthStore()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>('razorpay')
  const [processingPayment, setProcessingPayment] = useState(false)

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => orderService.postMessage(orderId!, message),
    onSuccess: () => {
      setChatInput('')
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    },
  })

  const cancelOrderMutation = useMutation({
    mutationFn: (reason?: string) => orderService.cancelOrder(orderId!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orderJobCard', orderId] })
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
      'cancellation_requested': {
        color: 'text-orange-700',
        bg: 'bg-orange-50',
        text: 'Cancellation Requested',
        border: 'border-orange-200',
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
      'cancellation_requested': {
        title: 'Cancellation Requested',
        description: 'We have received your cancellation request. Our team will review and update the status shortly.',
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
  const extraWorksTotal = useMemo(() => {
    const extra = Array.isArray(jobCard?.extraWork) ? jobCard!.extraWork : []
    return extra.reduce((sum: number, w: any) => sum + Number(w?.amount ?? 0), 0)
  }, [jobCard?.extraWork])
  const sparePartsList = useMemo(() => {
    // Currently client jobCard shape provides 'spareParts'
    return (jobCard?.spareParts ?? []) as any[]
  }, [jobCard?.spareParts])
  const sparePartsTotal = useMemo(() => {
    return sparePartsList.reduce((sum: number, p: any) => {
      const qty = Number(p?.quantity ?? 0)
      const unitPrice = Number(
        p?.unitPrice ?? (typeof p?.part === 'object' ? p?.part?.unitPrice ?? 0 : 0)
      )
      return sum + qty * unitPrice
    }, 0)
  }, [sparePartsList])
  const subtotal = useMemo(() => {
    const jcFinal = Number(jobCard?.finalAmount ?? 0)
    if (jcFinal > 0) return jcFinal
    const base = Number(jobCard?.estimateAmount ?? 0) + Number(jobCard?.additionalCharges ?? 0)
    return base + extraWorksTotal + sparePartsTotal
  }, [jobCard?.finalAmount, jobCard?.estimateAmount, jobCard?.additionalCharges, extraWorksTotal, sparePartsTotal])
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
              <div className="inline-flex items-center space-x-4 bg-white px-6 py-3 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Order ID:</span>
                  <span className="text-sm font-mono font-bold text-gray-900">{order.orderCode}</span>
                </div>
                {jobCard?.otp && (
                  <div className="flex items-center space-x-1 text-sm">
                    <span className="text-gray-500">OTP:</span>
                    <span className="font-mono font-semibold tracking-widest text-gray-900">{jobCard.otp}</span>
                  </div>
                )}
              </div>
              <span
                className={`${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border px-6 py-3 rounded-lg font-bold text-sm shadow-sm`}
              >
                {statusConfig.text.toUpperCase()}
              </span>
              {['cancelled', 'completed'].includes(order.status.toLowerCase()) || order.status.toLowerCase() === 'cancellation_requested' ? null : (
                <button
                  onClick={() => {
                    const proceed = window.confirm('Do you want to request cancellation for this order?')
                    if (!proceed) return
                    const reason = window.prompt('Optional: Provide a reason for cancellation') || undefined
                    cancelOrderMutation.mutate(reason?.trim() ? reason.trim() : undefined)
                  }}
                  disabled={cancelOrderMutation.isPending}
                  className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all shadow-sm disabled:opacity-50"
                >
                  {cancelOrderMutation.isPending ? 'Submitting…' : 'Request Cancellation'}
                </button>
              )}
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
                    {/* {format(new Date(order.createdAt), 'MMM dd, yyyy')} */}
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Scheduled Service</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-gray-900">
                    {formatDateTime(order.timeWindowStart)}
                  </p>
                  <span className="mx-1 text-black/50">→</span>
                  <p className="text-sm text-gray-600">
                    {formatDateTime(order.timeWindowEnd)}
                  </p>
                  </div>
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
                          {entry.createdAt && (
                            <p className="text-xs text-gray-500">{formatDateTime(entry.createdAt)}</p>
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

            {/* Documents & Photos (read-only, mirrors admin job sheet) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-white rounded-2xl shadow-md p-6 sm:p-8"
            >
              <div className="flex items-center mb-4">
                <DocumentTextIcon className="w-6 h-6 text-primary-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Documents &amp; Photos</h2>
              </div>

              {order.media && order.media.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {order.media.map((doc: any, idx: number) => (
                    <div
                      key={doc._id ?? `${doc.url}-${idx}`}
                      className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden"
                    >
                      {doc.kind === 'image' ? (
                        <img
                          src={doc.url}
                          alt={doc.name || `Image ${idx + 1}`}
                          className="w-full h-32 object-cover"
                        />
                      ) : doc.kind === 'video' ? (
                        <div className="bg-black">
                          <video src={doc.url} className="w-full h-32 object-cover" controls />
                        </div>
                      ) : (
                        <div className="h-32 flex flex-col items-center justify-center px-3 text-center text-xs text-gray-600">
                          <span className="font-semibold mb-1">Document</span>
                          <span className="line-clamp-2 break-all">{doc.name || 'File'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No documents uploaded for this order.</p>
              )}
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
                {(jobCard.extraWork?.length > 0 || jobCard.spareParts?.length > 0) && (
                  <div className="mb-4">
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
                <div className="space-y-2 text-sm">
                  {order.services.map((service: any) => (
                    <div className="flex justify-between"><span className="text-gray-600">{service.serviceName}</span><span className="text-gray-600">₹{jobCard.estimateAmount.toFixed(2)}</span></div>
                  ))}
                  {/* <div className="flex justify-between"><span className="text-gray-600">Estimate</span><span className="font-semibold">₹{jobCard.estimateAmount.toFixed(2)}</span></div> */}
                  {/* <div className="flex justify-between"><span className="text-gray-600">Additional</span><span className="font-semibold">₹{jobCard.additionalCharges.toFixed(2)}</span></div> */}
                  <div className="border-t pt-2 flex justify-between"><span className="text-gray-900 font-medium">Subtotal</span><span className="text-gray-900 font-bold">₹{subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">GST (18%)</span><span className="font-semibold">₹{gstAmount.toFixed(2)}</span></div>
                  <div className="border-t pt-2 flex justify-between"><span className="text-gray-900 font-medium">Grand Total</span><span className="text-primary-600 font-bold">₹{grandTotal.toFixed(2)}</span></div>
                  
                  {/* Payment Balance Information */}
                  {paymentBalance && (
                    <>
                      <div className="border-t pt-2 mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Paid</span>
                          <span className="text-green-600 font-semibold">₹{paymentBalance.totalPaid.toFixed(2)}</span>
                        </div>
                        {paymentBalance.remainingBalance > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Remaining Balance</span>
                            <span className="text-red-600 font-semibold">₹{paymentBalance.remainingBalance.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Payment Status: <span className={`font-semibold ${
                            paymentBalance.isFullyPaid ? 'text-green-600' : 
                            paymentBalance.isPartiallyPaid ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {paymentBalance.isFullyPaid ? 'Fully Paid' : 
                             paymentBalance.isPartiallyPaid ? 'Partially Paid' : 
                             'Pending Payment'}
                          </span>
                        </div>
                        {orderPayments.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {orderPayments.length} payment{orderPayments.length > 1 ? 's' : ''} received
                          </div>
                        )}
                      </div>
                      
                      {/* Pay Remaining Amount Button */}
                      {jobCard?.paymentStatus !== 'paid' && paymentBalance.remainingBalance > 0 && (
                        <button
                          onClick={() => {
                            setSelectedPaymentMethod('razorpay')
                            setShowPaymentModal(true)
                          }}
                          className="w-full mt-3 bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                        >
                          Pay Remaining ₹{paymentBalance.remainingBalance.toFixed(2)}
                        </button>
                      )}
                    </>
                  )}
                </div>
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

        {/* Payment Modal for Remaining Balance */}
        {showPaymentModal && paymentBalance && paymentBalance.remainingBalance > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Pay Remaining Amount</h3>
              <p className="text-gray-600 mb-4">
                Remaining balance: <span className="font-bold text-primary-600">₹{paymentBalance.remainingBalance.toFixed(2)}</span>
              </p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setSelectedPaymentMethod('razorpay')}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    selectedPaymentMethod === 'razorpay'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">Online Payment</h4>
                      <p className="text-sm text-gray-600">Card, UPI, Netbanking & Wallets</p>
                    </div>
                    {selectedPaymentMethod === 'razorpay' && (
                      <CheckCircleIcon className="w-6 h-6 text-primary-600" />
                    )}
                  </div>
                </button>
              </div>

              <div className="flex gap-3">
                {/* <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setSelectedPaymentMethod(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button> */}
                <button
                  onClick={async () => {
                    if (!selectedPaymentMethod || !user || !orderId) return

                    setProcessingPayment(true)
                    try {
                      if (selectedPaymentMethod === 'razorpay') {
                        const paymentInit = await paymentService.initializeRemainingPayment(orderId, 'razorpay')

                        if (!paymentInit.razorpayOrder) {
                          throw new Error('Failed to initialize Razorpay payment')
                        }

                        const options = {
                          key: paymentInit.razorpayOrder.key,
                          amount: paymentInit.razorpayOrder.amount * 100,
                          currency: paymentInit.razorpayOrder.currency,
                          name: 'Fixzep',
                          description: `Payment for remaining balance - Order #${orderId}`,
                          order_id: paymentInit.razorpayOrder.id,
                          handler: async (response: any) => {
                            try {
                              await paymentService.confirmPayment({
                                paymentId: paymentInit._id,
                                orderId,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpaySignature: response.razorpay_signature
                              })
                              toast.success('Payment successful!')
                              setShowPaymentModal(false)
                              queryClient.invalidateQueries({ queryKey: ['orderPaymentBalance', orderId] })
                              queryClient.invalidateQueries({ queryKey: ['orderPayments', orderId] })
                              queryClient.invalidateQueries({ queryKey: ['orderJobCard', orderId] })
                            } catch (error: any) {
                              toast.error(error?.response?.data?.message || 'Payment confirmation failed')
                            } finally {
                              setProcessingPayment(false)
                            }
                          },
                          prefill: {
                            name: user?.name || '',
                            email: user?.email || '',
                            contact: user?.phone || ''
                          },
                          theme: {
                            color: '#0f172a'
                          },
                          modal: {
                            ondismiss: () => {
                              toast.error('Payment cancelled')
                              setProcessingPayment(false)
                            }
                          }
                        }

                        const razorpay = new window.Razorpay(options)
                        razorpay.on('payment.failed', (response: any) => {
                          toast.error(`Payment failed: ${response.error.description || 'Unknown error'}`)
                          setProcessingPayment(false)
                        })
                        razorpay.open()
                      }
                    } catch (error: any) {
                      toast.error(error?.response?.data?.message || 'Payment processing failed')
                      setProcessingPayment(false)
                    }
                  }}
                  disabled={!selectedPaymentMethod || processingPayment}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processingPayment ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
