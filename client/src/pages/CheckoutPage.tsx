import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { formatInTimeZone } from "date-fns-tz";
import { PlusIcon, CheckCircleIcon, CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { useCartStore } from '../store/cartStore'
import { orderService, type Order } from '../services/orderService'
import type { CreateOrderData } from '../services/orderService'
import { paymentService, type PaymentMethod } from '../services/paymentService'
import { useAuthStore } from '../store/authStore'
import { addressService, timeSlotService, type Address, type TimeSlot } from '../services/addressService'
import { validateAddress } from '../services/serviceAreaService'
import { AddressModal } from '../components/address/AddressModal'
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, isBefore, isAfter } from 'date-fns'

interface CheckoutFormData {
  selectedAddressId: string
  selectedDate: string
  selectedSlotStart: string
  selectedSlotEnd: string
  notes?: string
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export const CheckoutPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { items, getTotalPrice, clearCart } = useCartStore()
  const totalPrice = getTotalPrice()
  const gstRate = 0.18
  const gstAmount = +(totalPrice * gstRate)
  const serviceCharges = 0
  const totalWithGST = +(totalPrice + gstAmount + serviceCharges)

  const [showAddressModal, setShowAddressModal] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [serviceability, setServiceability] = useState<Record<string, boolean>>({})
  const [validatingAddresses, setValidatingAddresses] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; slot: TimeSlot } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
  } = useForm<CheckoutFormData>()

  // Fetch addresses
  const { data: addresses, isLoading: loadingAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressService.getAddresses,
    enabled: !!user,
  })

  // Fetch time slots for the next 7 days
  const today = new Date()
  const maxBookingDate = addDays(today, 365)
  const { data: timeSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['timeSlots', format(today, 'yyyy-MM-dd')],
    queryFn: () => timeSlotService.getTimeSlots(format(today, 'yyyy-MM-dd'), 365),
  })

  const [calendarMonth, setCalendarMonth] = useState<Date>(today)
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null)

  // Set default address
  useEffect(() => {
    const runValidation = async () => {
      if (!addresses || addresses.length === 0) return
      setValidatingAddresses(true)
      const results: Record<string, boolean> = {}
      await Promise.all(
        addresses.map(async (addr) => {
          try {
            const res = await validateAddress(addr)
            results[addr._id] = res.serviceable
          } catch {
            results[addr._id] = true // fail-open
          }
        })
      )
      setServiceability(results)

      const firstServiceable = addresses.find((a) => results[a._id])
      if (firstServiceable) {
        setSelectedAddress(firstServiceable)
        setValue('selectedAddressId', firstServiceable._id)
      } else {
        setSelectedAddress(null)
        toast.error('No addresses are in our service area. Please add a valid address.')
      }
      setValidatingAddresses(false)
    }
    runValidation()
  }, [addresses, setValue])

  // Order placement and payment flow - payment first, then create orders
  const [orderPayloads, setOrderPayloads] = useState<CreateOrderData[]>([])
  const [placingOrders, setPlacingOrders] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)

  const onSubmit = async (data: CheckoutFormData) => {
    if (!user) {
      toast.error('Please login to place an order')
      navigate('/')
      return
    }

    if (items.length === 0) {
      toast.error('Your cart is empty')
      navigate('/')
      return
    }

    if (!selectedAddress) {
      toast.error('Please select a service address')
      return
    }

    if (!selectedSlot) {
      toast.error('Please select a time slot')
      return
    }

    // Prepare order data (but don't create orders yet)
    const payloads: CreateOrderData[] = items.map((item) => {
      const subtotal = item.price * item.quantity
      const gst = subtotal * gstRate
      const estimatedCost = +(subtotal + gst + serviceCharges)
      return {
        services: [{
          serviceItem: item.serviceId,
          serviceCategory: item.categoryId,
          quantity: item.quantity,
          issueDescription: data.notes,
        }],
        customerAddressId: selectedAddress._id,
        preferredStart: selectedSlot.slot.start,
        preferredEnd: selectedSlot.slot.end,
        estimatedCost,
      }
    })

    // Store order data and show payment modal
    setOrderPayloads(payloads)
    setShowPaymentModal(true)
  }

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method)
  }

  const processPayment = async () => {
    if (!selectedPaymentMethod || orderPayloads.length === 0 || !user) return

    setProcessingPayment(true)
    try {
      // Calculate total amount for all orders
      const totalAmount = orderPayloads.reduce((sum, payload) => sum + (payload.estimatedCost || 0), 0)

      if (selectedPaymentMethod === 'cash') {
        // For cash on delivery, just create orders without marking payment as received.
        // This keeps the order as "unpaid" so the customer can later pay online from the job card.
        setPlacingOrders(true)

        try {
          const results = await Promise.allSettled(
            orderPayloads.map((p) => orderService.createOrder(p))
          )
          const fulfilled = results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => (r as PromiseFulfilledResult<Order>).value)

          if (fulfilled.length === 0) {
            throw new Error('Failed to create orders')
          }

          toast.success(`Orders placed successfully! ${fulfilled.length} order${fulfilled.length > 1 ? 's' : ''} created. You selected Cash on Delivery, but you can also pay online later from your job card.`)
          clearCart()
          setShowPaymentModal(false)
          navigate('/orders')
        } catch (error: any) {
          toast.error(error?.response?.data?.message || 'Failed to place order with Cash on Delivery')
        } finally {
          setPlacingOrders(false)
          setProcessingPayment(false)
        }
      } else {
        // For Razorpay, initialize payment first (without order ID)
        // We'll create orders after payment is captured
        const paymentInit = await paymentService.initializePaymentWithOrderData({
          orderData: orderPayloads,
          customerId: user.id,
          method: selectedPaymentMethod,
          amount: totalAmount
        })

        if (!paymentInit.razorpayOrder) {
          throw new Error('Failed to initialize Razorpay payment')
        }

        // Open Razorpay checkout
        const options = {
          key: paymentInit.razorpayOrder.key,
          amount: paymentInit.razorpayOrder.amount * 100, // Convert to paise
          currency: paymentInit.razorpayOrder.currency,
          name: 'Fixzep',
          description: `Payment for ${orderPayloads.length} order(s)`,
          order_id: paymentInit.razorpayOrder.id,
          handler: async (response: any) => {
            try {
              // After payment success, create orders and confirm payment
              setPlacingOrders(true)
              
              // Create orders after payment
              const results = await Promise.allSettled(
                orderPayloads.map((p) => orderService.createOrder(p))
              )
              const fulfilled = results
                .filter((r) => r.status === 'fulfilled')
                .map((r) => (r as PromiseFulfilledResult<Order>).value)

              if (fulfilled.length === 0) {
                throw new Error('Failed to create orders after payment')
              }

              // Confirm payment with first order
              const firstOrder = fulfilled[0]
              await paymentService.confirmPayment({
                paymentId: paymentInit._id,
                orderId: firstOrder._id, // Update payment with order ID
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              })

              toast.success(`Payment successful! ${fulfilled.length} order${fulfilled.length > 1 ? 's' : ''} placed.`)
              clearCart()
              setShowPaymentModal(false)
              navigate('/orders')
            } catch (error: any) {
              toast.error(error?.response?.data?.message || 'Failed to process payment')
              setProcessingPayment(false)
            } finally {
              setPlacingOrders(false)
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
  }

  const handleAddressSelect = async (address: Address) => {
    const cached = serviceability[address._id]
    if (cached === false) {
      toast.error('We currently do not serve this area. Please pick another address.')
      return
    }
    if (cached === undefined) {
      const res = await validateAddress(address)
      setServiceability((m) => ({ ...m, [address._id]: res.serviceable }))
      if (!res.serviceable) {
        toast.error('We currently do not serve this area. Please pick another address.')
        return
      }
    }
    setSelectedAddress(address)
    setValue('selectedAddressId', address._id)
  }

  const handleSlotSelect = (date: string, slot: TimeSlot) => {
    setSelectedSlot({ date, slot })
    setValue('selectedDate', date)
    setValue('selectedSlotStart', slot.start)
    setValue('selectedSlotEnd', slot.end)
  }

  // Build a map of date -> slots for quick access
  const slotsByDate = (timeSlots || []).reduce<Record<string, TimeSlot[]>>((acc, day) => {
    const key = format(new Date(day.date), 'yyyy-MM-dd')
    acc[key] = day.slots || []
    return acc
  }, {})

  // Auto-select earliest available date on load
  useEffect(() => {
    if (!timeSlots || timeSlots.length === 0) return
    const firstWithSlots = timeSlots.find((d) => d.slots && d.slots.length > 0)
    if (firstWithSlots) {
      const d = new Date(firstWithSlots.date)
      setSelectedDateObj(d)
    }
  }, [timeSlots])

  const onPrevMonth = () => {
    const prev = subMonths(calendarMonth, 1)
    // Prevent navigating before today
    if (isBefore(endOfMonth(prev), today)) return
    setCalendarMonth(prev)
  }

  const onNextMonth = () => {
    const next = addMonths(calendarMonth, 1)
    // Prevent navigating beyond maxBookingDate window
    if (isAfter(startOfMonth(next), maxBookingDate)) return
    setCalendarMonth(next)
  }

  const renderCalendar = () => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 })
    const days: Date[] = []
    let cur = start
    while (cur <= end) {
      days.push(cur)
      cur = addDays(cur, 1)
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={onPrevMonth}
            className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            disabled={isBefore(endOfMonth(subMonths(calendarMonth, 1)), today)}
          >
            ←
          </button>
          <div className="font-semibold text-gray-900">{format(calendarMonth, 'MMMM yyyy')}</div>
          <button
            type="button"
            onClick={onNextMonth}
            className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            disabled={isAfter(startOfMonth(addMonths(calendarMonth, 1)), maxBookingDate)}
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mb-1">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <div key={d} className="text-center py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const inRange = !isBefore(day, today) && !isAfter(day, maxBookingDate)
            const inMonth = isSameMonth(day, calendarMonth)
            const hasSlots = Boolean(slotsByDate[dayKey]?.length)
            const disabled = !inRange || !hasSlots
            const isSelected = selectedDateObj && isSameDay(day, selectedDateObj)
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  if (disabled) return
                  setSelectedDateObj(day)
                  setSelectedSlot(null)
                }}
                className={
                  `h-10 rounded-md text-sm transition-colors ` +
                  `${disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-800 hover:bg-primary-50'} ` +
                  `${!inMonth ? 'opacity-50' : ''} ` +
                  `${isSelected ? 'bg-primary-100 text-primary-900 font-semibold' : ''}`
                }
                aria-disabled={disabled}
              >
                <div>{format(day, 'd')}</div>
                {hasSlots && <div className="mx-auto mt-0.5 h-1.5 w-1.5 rounded-full bg-primary-500" />}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <button
            onClick={() => navigate('/')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Browse Services →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Service Address</h2>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  <PlusIcon className="w-5 h-5 mr-1" />
                  Add New
                </button>
              </div>

              {loadingAddresses ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : !addresses || addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No addresses saved</p>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Add your first address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address._id}
                      onClick={() => handleAddressSelect(address)}
                      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedAddress?._id === address._id
                          ? 'border-primary-600 bg-primary-50'
                          : serviceability[address._id] === false
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${serviceability[address._id] === false ? 'opacity-70' : ''}`}
                    >
                      {selectedAddress?._id === address._id && (
                        <CheckCircleIcon className="absolute top-4 right-4 w-6 h-6 text-primary-600" />
                      )}
                      {serviceability[address._id] === false && (
                        <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">Out of service area</span>
                      )}
                      <div className="pr-8">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-primary-600 bg-primary-100 px-2 py-1 rounded">
                            {address.label}
                          </span>
                          {address.isDefault && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-gray-900">{address.contactName}</p>
                        <p className="text-sm text-gray-600">{address.phone}</p>
                        <p className="text-sm text-gray-700 mt-1">
                          {address.line1}
                          {address.line2 && `, ${address.line2}`}
                        </p>
                        <p className="text-sm text-gray-700">
                          {address.city}, {address.state} - {address.postalCode}
                        </p>
                        {address.notes && (
                          <p className="text-xs text-gray-500 mt-1">Note: {address.notes}</p>
                        )}
                        {validatingAddresses && serviceability[address._id] === undefined && (
                          <p className="text-xs text-gray-500 mt-2">Validating service area…</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time Slot Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Date & Time Slot</h2>
              {loadingSlots ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-40 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ) : !timeSlots || timeSlots.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No time slots available</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>{renderCalendar()}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {selectedDateObj ? format(selectedDateObj, 'EEEE, MMMM dd, yyyy') : 'Select a date'}
                    </h3>
                    {(() => {
                      const hasAnySlots = (timeSlots || []).some((d) => d.slots && d.slots.length > 0)
                      if (!hasAnySlots) {
                        return (
                          <div className="text-center py-8">
                            <p className="text-sm text-amber-600">No time slots are configured for the next 31 days.</p>
                            <p className="text-xs text-gray-500 mt-1">Please try again later or contact support.</p>
                          </div>
                        )
                      }

                      if (!selectedDateObj) {
                        return <p className="text-sm text-gray-500">Choose a date to view available slots.</p>
                      }

                      const key = format(selectedDateObj, 'yyyy-MM-dd')
                      const slots = slotsByDate[key] || []

                      if (slots.length === 0) {
                        const findNextAvailable = () => {
                          const from = selectedDateObj
                          let next: Date | null = null
                          for (const d of timeSlots || []) {
                            const dDate = new Date(d.date)
                            if (isAfter(dDate, from) && d.slots && d.slots.length > 0) {
                              next = dDate
                              break
                            }
                          }
                          return next
                        }
                        const nextAvailable = findNextAvailable()
                        return (
                          <div>
                            <p className="text-sm text-gray-500 mb-3">No slots available on this day.</p>
                            {nextAvailable && (
                              <button
                                type="button"
                                className="text-sm font-medium text-primary-600 hover:text-primary-700 underline"
                                onClick={() => { setSelectedDateObj(nextAvailable); setSelectedSlot(null) }}
                              >
                                Jump to next available date
                              </button>
                            )}
                          </div>
                        )
                      }

                      return (
                        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {slots.map((slot, idx) => {
                            const dateStr = selectedDateObj.toISOString()
                            const isSelected = selectedSlot?.date === dateStr && selectedSlot?.slot.start === slot.start
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSlotSelect(dateStr, slot)}
                                className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                                  isSelected
                                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 hover:border-primary-300 text-gray-700'
                                }`}
                              >
                                {/* <div className="font-semibold">{slot.label}</div> */}
                                <div className="text-xs mt-1">
                                  {formatInTimeZone(slot.start,"UTC","hh:mm a")} - {formatInTimeZone(slot.end,"UTC", 'hh:mm a')}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Notes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Additional Notes (Optional)
              </h2>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Any special instructions or requirements..."
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.serviceId} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{item.serviceName}</p>
                      <p className="text-gray-500 text-xs">{item.categoryName}</p>
                      <p className="text-gray-600 text-xs">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-gray-900 font-medium">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">₹{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST (18%)</span>
                  <span className="text-gray-900">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Charges</span>
                  <span className="text-gray-900">₹{serviceCharges.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-primary-600">
                    ₹{totalWithGST.toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedAddress && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold text-gray-900 mb-2">Delivering to:</h3>
                  <p className="text-sm text-gray-700">
                    {selectedAddress.line1}
                    {selectedAddress.line2 && `, ${selectedAddress.line2}`}
                  </p>
                  <p className="text-sm text-gray-700">
                    {selectedAddress.city}, {selectedAddress.state}
                  </p>
                </div>
              )}

              {selectedSlot && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-semibold text-gray-900 mb-2">Scheduled for:</h3>
                  <p className="text-sm text-gray-700">
                    {format(new Date(selectedSlot.date), 'EEEE, MMM dd, yyyy')}
                  </p>
                  <p className="text-sm text-gray-700">
                    {selectedSlot.slot.label} (
                    {format(new Date(selectedSlot.slot.start), 'hh:mm a')} -{' '}
                    {format(new Date(selectedSlot.slot.end), 'hh:mm a')})
                  </p>
                </div>
              )}

              <button
                onClick={handleSubmit(onSubmit)}
                disabled={placingOrders || !selectedAddress || !selectedSlot}
                className="w-full mt-6 bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {placingOrders ? 'Placing Orders...' : 'Place Orders'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Select Payment Method</h2>
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    clearCart()
                    navigate('/orders')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Order Summary</p>
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-semibold">
                    {orderPayloads.length} order{orderPayloads.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-2xl font-bold text-primary-600">
                    ₹{totalWithGST.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Cash Payment Option */}
                <button
                  onClick={() => handlePaymentMethodSelect('cash')}
                  className={`p-6 border-2 rounded-lg text-left transition-all ${
                    selectedPaymentMethod === 'cash'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      selectedPaymentMethod === 'cash' ? 'bg-primary-600' : 'bg-gray-100'
                    }`}>
                      <BanknotesIcon className={`w-8 h-8 ${
                        selectedPaymentMethod === 'cash' ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Cash on Delivery</h3>
                      <p className="text-sm text-gray-600">Pay when service is completed</p>
                      {selectedPaymentMethod === 'cash' && (
                        <CheckCircleIcon className="w-5 h-5 text-primary-600 mt-2" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Razorpay Payment Options */}
                <button
                  onClick={() => handlePaymentMethodSelect('razorpay')}
                  className={`p-6 border-2 rounded-lg text-left transition-all ${
                    selectedPaymentMethod === 'razorpay'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      selectedPaymentMethod === 'razorpay' ? 'bg-primary-600' : 'bg-gray-100'
                    }`}>
                      <CreditCardIcon className={`w-8 h-8 ${
                        selectedPaymentMethod === 'razorpay' ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Online Payment</h3>
                      <p className="text-sm text-gray-600">Card, UPI, Netbanking & Wallets</p>
                      {selectedPaymentMethod === 'razorpay' && (
                        <CheckCircleIcon className="w-5 h-5 text-primary-600 mt-2" />
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {selectedPaymentMethod === 'razorpay' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💳 You'll be redirected to a secure Razorpay payment page. All major payment methods are accepted.
                  </p>
                </div>
              )}

              {selectedPaymentMethod === 'cash' && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    💵 You will pay cash when the technician completes the service. Payment confirmation will be done by the technician.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                {/* <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    clearCart()
                    navigate('/orders')
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Pay Later
                </button> */}
                <button
                  onClick={processPayment}
                  disabled={!selectedPaymentMethod || processingPayment}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processingPayment ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} />
    </div>
  )
}
