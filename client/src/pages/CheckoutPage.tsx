import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useCartStore } from '../store/cartStore'
import { orderService } from '../services/orderService'
import type { CreateOrderData } from '../services/orderService'
import { useAuthStore } from '../store/authStore'
import { addressService, timeSlotService, type Address, type TimeSlot } from '../services/addressService'
import { validateAddress } from '../services/serviceAreaService'
import { AddressModal } from '../components/address/AddressModal'
import { format } from 'date-fns'

interface CheckoutFormData {
  selectedAddressId: string
  selectedDate: string
  selectedSlotStart: string
  selectedSlotEnd: string
  notes?: string
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
  const { data: timeSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['timeSlots'],
    queryFn: () => timeSlotService.getTimeSlots(undefined, 7),
  })

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

  const createOrderMutation = useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: (order) => {
      clearCart()
      toast.success('Order placed successfully!')
      navigate(`/orders/${order._id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to place order')
    },
  })

  const onSubmit = (data: CheckoutFormData) => {
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

    const orderData: CreateOrderData = {
      services: items.map((item) => ({
        serviceItem: item.serviceId,
        serviceCategory: item.categoryId,
        quantity: item.quantity,
        issueDescription: data.notes,
      })),
      customerAddressId: selectedAddress._id,
      preferredStart: selectedSlot.slot.start,
      preferredEnd: selectedSlot.slot.end,
      estimatedCost: totalWithGST,
    }

    createOrderMutation.mutate(orderData)
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Select Date & Time Slot
              </h2>

              {loadingSlots ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : !timeSlots || timeSlots.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No time slots available</p>
              ) : (
                <div className="space-y-6">
                  {timeSlots.map((daySlot) => (
                    <div key={daySlot.date} className="border-b pb-4 last:border-b-0">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        {format(new Date(daySlot.date), 'EEEE, MMMM dd, yyyy')}
                      </h3>
                      {daySlot.slots.length === 0 ? (
                        <p className="text-sm text-gray-500">No slots available</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {daySlot.slots.map((slot, idx) => {
                            const isSelected =
                              selectedSlot?.date === daySlot.date &&
                              selectedSlot?.slot.start === slot.start
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSlotSelect(daySlot.date, slot)}
                                className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                                  isSelected
                                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 hover:border-primary-300 text-gray-700'
                                }`}
                              >
                                <div className="font-semibold">{slot.label}</div>
                                <div className="text-xs mt-1">
                                  {format(new Date(slot.start), 'hh:mm a')} -{' '}
                                  {format(new Date(slot.end), 'hh:mm a')}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
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
                disabled={createOrderMutation.isPending || !selectedAddress || !selectedSlot}
                className="w-full mt-6 bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {createOrderMutation.isPending ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} />
    </div>
  )
}
