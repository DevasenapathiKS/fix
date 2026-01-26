import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, TrashIcon, MinusIcon, PlusIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface CartSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const CartSidebar = ({ isOpen, onClose }: CartSidebarProps) => {
  const navigate = useNavigate()
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const totalPrice = getTotalPrice()

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please login to proceed to checkout')
      onClose()
      navigate('/login')
      return
    }
    onClose()
    navigate('/checkout')
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-6 border-b">
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        Shopping Cart
                      </Dialog.Title>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto px-4 py-6">
                      {items.length === 0 ? (
                        <div className="text-center py-12">
                          <ShoppingCartIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                          <p className="text-gray-500">Your cart is empty</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {items.map((item) => (
                            <div
                              key={item.serviceId}
                              className="flex items-start space-x-4 border-b pb-4"
                            >
                              <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.serviceName} className="w-full h-full object-cover" />
                                ) : (
                                  <PhotoIcon className="w-6 h-6 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {item.serviceName}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.categoryName}
                                </p>
                                <p className="text-sm font-semibold text-primary-600 mt-2">
                                  ₹{item.price}
                                </p>
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() =>
                                    updateQuantity(item.serviceId, item.quantity - 1)
                                  }
                                  className="p-1 rounded-md border border-gray-300 hover:bg-gray-50"
                                >
                                  <MinusIcon className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-medium w-8 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(item.serviceId, item.quantity + 1)
                                  }
                                  className="p-1 rounded-md border border-gray-300 hover:bg-gray-50"
                                >
                                  <PlusIcon className="w-4 h-4" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeItem(item.serviceId)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && (
                      <div className="border-t px-4 py-6">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-base font-medium text-gray-900">
                            Total
                          </span>
                          <span className="text-2xl font-bold text-primary-600">
                            ₹{totalPrice.toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={handleCheckout}
                          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors mb-2"
                        >
                          Proceed to Checkout
                        </button>

                        <button
                          onClick={clearCart}
                          className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          Clear Cart
                        </button>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

const ShoppingCartIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
)
