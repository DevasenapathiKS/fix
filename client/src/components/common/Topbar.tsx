import { useState, useEffect, useRef, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import { LoginModal } from './LoginModal'
import { SignupModal } from './SignupModal'
import { CartButton } from '../cart/CartButton'
import toast from 'react-hot-toast'
import { catalogService, type ServiceItem } from '../../services/catalogService'

export const Topbar = () => {
  const navigate = useNavigate()
  const { user, token, clearAuth } = useAuthStore()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ServiceItem[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<number | undefined>(undefined)
  const deriveCategoryId = (svc: any): string | undefined => {
    if (!svc) return undefined
    // common shapes: svc.category._id, svc.categoryId, svc.category (string id)
    if (svc.category && typeof svc.category === 'object' && svc.category._id) return svc.category._id
    if (svc.category && typeof svc.category === 'string') return svc.category
    if (svc.categoryId) return svc.categoryId
    return undefined
  }

  const navigateToService = async (svc: ServiceItem) => {
    let catId = deriveCategoryId(svc)
    if (!catId) {
      try {
        const detail = await catalogService.getServiceDetail(svc._id)
        catId = deriveCategoryId(detail) || (detail?.category?._id as any)
      } catch (e) {
        console.warn('Failed to fetch service detail for navigation', e)
      }
    }
    if (catId) {
      setShowResults(false)
      setSearchQuery('')
      setSearchResults([])
      navigate(`/services/${catId}?serviceId=${svc._id}`)
    } else {
      toast.error('Unable to open service. Please try from Services page.')
      navigate('/services')
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
      clearAuth()
      toast.success('Logged out successfully')
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
      clearAuth()
      navigate('/')
    }
  }

  const handleSwitchToSignup = () => {
    setShowLoginModal(false)
    setShowSignupModal(true)
  }

  const handleSwitchToLogin = () => {
    setShowSignupModal(false)
    setShowLoginModal(true)
  }

  const runSearch = async (q: string) => {
    const query = q.trim()
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    try {
      setSearching(true)
      const results = await catalogService.searchServices(query)
      setSearchResults(results || [])
      setShowResults(true)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    // debounce
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      runSearch(searchQuery)
    }, 300)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <h1 className="text-2xl font-bold text-primary-600">Fixzep</h1>
          </Link>

          {/* Search */}
          <div className="hidden md:block relative w-full max-w-xl">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowResults(true)}
              placeholder="Search services (e.g., AC repair)"
              className="w-full px-4 py-2.5 rounded-full border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-500"
            />
            {/* Results dropdown */}
            {showResults && (searchResults.length > 0 || searching) && (
              <div className="absolute left-0 right-0 mt-2 rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-80 overflow-auto">
                {searching && (
                  <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
                )}
                {!searching && searchResults.map((svc) => (
                  <button
                    key={svc._id}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => navigateToService(svc)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{svc.name}</p>
                      <p className="text-xs text-gray-500">{svc.category?.name}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-700">₹{svc.basePrice}</span>
                  </button>
                ))}
                {!searching && searchResults.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">No results</div>
                )}
              </div>
            )}
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {/* Cart Button */}
            <CartButton />
            
            {token && user ? (
              <Menu as="div" className="relative inline-block text-left">
                <div>
                  <Menu.Button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-900 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg transition-colors">
                    <span>Welcome, {user.name}</span>
                    <ChevronDownIcon
                      className="w-5 h-5 ml-2 -mr-1"
                      aria-hidden="true"
                    />
                  </Menu.Button>
                </div>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`${
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            } group flex items-center px-4 py-2 text-sm`}
                          >
                            <svg
                              className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            Profile
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/orders"
                            className={`${
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            } group flex items-center px-4 py-2 text-sm`}
                          >
                            <svg
                              className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            My Orders
                          </Link>
                        )}
                      </Menu.Item>
                    </div>
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleLogout}
                            className={`${
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            } group flex w-full items-center px-4 py-2 text-sm`}
                          >
                            <svg
                              className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                            Logout
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => setShowSignupModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={handleSwitchToSignup}
      />
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </header>
  )
}
