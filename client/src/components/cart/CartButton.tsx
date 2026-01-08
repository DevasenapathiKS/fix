import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useCartStore } from '../../store/cartStore'
import { useState } from 'react'
import { CartSidebar } from './CartSidebar'

export const CartButton = () => {
  const [isOpen, setIsOpen] = useState(false)
  const totalItems = useCartStore((state) => state.getTotalItems())

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
      >
        <ShoppingCartIcon className="w-6 h-6" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalItems}
          </span>
        )}
      </button>

      <CartSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
