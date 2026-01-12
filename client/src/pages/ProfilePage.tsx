import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { authService } from '../services/authService'
import { addressService, type Address } from '../services/addressService'
import { AddressModal } from '../components/address/AddressModal'
import { PencilIcon, TrashIcon, StarIcon, EnvelopeIcon, PhoneIcon, UserCircleIcon, MapPinIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { LoginModal } from '../components/common/LoginModal'
import { SignupModal } from '../components/common/SignupModal'

export const ProfilePage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showEditAddressModal, setShowEditAddressModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const { token, user: storedUser, setAuth, clearAuth } = useAuthStore()
  // removed inline editing; using modal instead
  const [profileForm, setProfileForm] = useState<{ name: string; phone: string }>({ name: '', phone: '' })
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [profileErrors, setProfileErrors] = useState<{ name?: string; phone?: string }>({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)

  const { data: user, isLoading: loadingUser, error: userError } = useQuery({
    queryKey: ['me'],
    queryFn: authService.getCurrentUser,
  })

  const { data: addresses, isLoading: loadingAddresses, error: addrError } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressService.getAddresses,
  })

  const markPreferredMutation = useMutation({
    mutationFn: (addressId: string) => addressService.markPreferred(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('Default address updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update default address')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (addressId: string) => addressService.deleteAddress(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('Address removed')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to remove address')
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<{ name: string; phone: string }>) => authService.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      if (token) setAuth(token, updated as any)
      toast.success('Profile updated')
      // close modal handled below
      setProfileErrors({})
      setShowEditModal(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update profile')
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: () => authService.deactivateAccount(),
    onSuccess: () => {
      toast.success('Account deactivated temporarily')
      authService.logout().catch(() => {})
      clearAuth()
      setShowDeactivateModal(false)
      navigate('/')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to deactivate account')
    },
  })

  const validateProfile = () => {
    const errors: { name?: string; phone?: string } = {}
    if (!profileForm.name.trim()) {
      errors.name = 'Name is required'
    }
    if (profileForm.phone && !/^\+?[0-9\-\s()]{6,}$/.test(profileForm.phone.trim())) {
      errors.phone = 'Enter a valid phone number'
    }
    setProfileErrors(errors)
    return Object.keys(errors).length === 0
  }

  const triggerForgotPassword = async () => {
    try {
      const identifier = (user?.email || storedUser?.email)
      if (!identifier) {
        toast.error('Email not available for reset')
        return
      }
      await authService.forgotPassword(identifier)
      toast.success('Reset link sent to your email')
      setShowPwdModal(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send reset email')
    }
  }

  if (loadingUser || loadingAddresses) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="h-6 w-40 bg-gray-200 rounded mx-auto animate-pulse" />
          <div className="h-5 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to view your profile.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowLoginModal(true)} className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Sign In</button>
              <button onClick={() => setShowSignupModal(true)} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Create Account</button>
            </div>
          </div>
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSwitchToSignup={() => { setShowLoginModal(false); setShowSignupModal(true) }} />
          <SignupModal isOpen={showSignupModal} onClose={() => setShowSignupModal(false)} onSwitchToLogin={() => { setShowSignupModal(false); setShowLoginModal(true) }} />
        </div>
      </div>
    )
  }

  if (userError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">Failed to load profile. Please try again.</p>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['me'] })} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Retry</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-2xl"
        >
          <div className="relative bg-gradient-to-r from-gray-900 to-gray-700">
            <div className="px-6 py-8 sm:px-8 sm:py-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <UserCircleIcon className="w-10 h-10 text-white/80" />
                </div>
                <div className="text-white">
                  <h1 className="text-2xl sm:text-3xl font-bold">My Profile</h1>
                  <p className="text-sm sm:text-base text-white/80">Manage your account and addresses</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xl border border-gray-200">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <EnvelopeIcon className="w-4 h-4" />
                    <span>{user?.email}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <PhoneIcon className="w-4 h-4" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => {
                  setProfileErrors({})
                  setProfileForm({ name: user?.name || '', phone: user?.phone || '' })
                  setShowEditModal(true)
                }}
              >
                <PencilIcon className="w-5 h-5 inline mr-2" /> Edit Profile
              </button>
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setShowPwdModal(true)}
              >
                Change Password
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                onClick={() => setShowDeactivateModal(true)}
              >
                <TrashIcon className="w-5 h-5 inline mr-2" /> Delete Account (Temporary)
              </button>
            </div>
          </motion.div>

          {/* Addresses */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">My Addresses</h2>
                {addresses && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs">{addresses.length}</span>
                )}
              </div>
              <button onClick={() => setShowAddressModal(true)} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors">
                Add Address
              </button>
            </div>

            {addrError && (
              <p className="text-red-600 text-sm mb-3">Failed to load addresses</p>
            )}

            {!addresses || addresses.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">No addresses yet. Add one to speed up checkout.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr: Address) => (
                  <div
                    key={addr._id}
                    className={`group rounded-xl border ${addr.isDefault ? 'border-gray-300 bg-gray-50' : 'border-gray-200'} p-4 sm:p-5 hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
                          <MapPinIcon className="w-3.5 h-3.5" /> {addr.label}
                        </span>
                        {addr.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black text-white text-xs font-semibold">
                            <StarIcon className="w-3.5 h-3.5" /> Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!addr.isDefault && (
                          <button
                            onClick={() => markPreferredMutation.mutate(addr._id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
                          >
                            Make Default
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingAddress(addr); setShowEditAddressModal(true) }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
                        >
                          <PencilIcon className="w-4 h-4 inline mr-1" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(addr._id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4 inline mr-1" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <p className="text-sm font-semibold text-gray-900">{addr.contactName} • {addr.phone}</p>
                      <p className="text-sm text-gray-700">{addr.line1}</p>
                      {addr.line2 && <p className="text-sm text-gray-700">{addr.line2}</p>}
                      <p className="text-sm text-gray-700">{addr.city}, {addr.state} {addr.postalCode}</p>
                      {addr.notes && <p className="text-xs text-gray-500 mt-1 italic">{addr.notes}</p>}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 sm:hidden">
                      {!addr.isDefault && (
                        <button
                          onClick={() => markPreferredMutation.mutate(addr._id)}
                          className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingAddress(addr); setShowEditAddressModal(true) }}
                        className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
                      >
                       <PencilIcon className="w-4 h-4 inline mr-1" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(addr._id)}
                        className="px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4 inline mr-1" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Address Modal */}
        <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} />
        {showEditAddressModal && editingAddress && (
          <AddressModal isOpen={showEditAddressModal} onClose={() => { setShowEditAddressModal(false); setEditingAddress(null) }} address={editingAddress} />
        )}
      </div>
      {/* Change Password Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-4">We will send a reset link to your registered email.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={user?.email || ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" onClick={() => setShowPwdModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900" onClick={triggerForgotPassword}>Send Link</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Edit Profile</h3>
            <p className="text-sm text-gray-600 mb-4">Update your personal details below.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="John Doe"
                  className={`w-full px-3 py-2 border ${profileErrors.name ? 'border-red-300 focus:ring-red-300' : 'border-gray-300 focus:ring-gray-300'} rounded-lg focus:outline-none focus:ring-2`}
                />
                {profileErrors.name && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><ExclamationCircleIcon className="w-4 h-4" /> {profileErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="555-123-4567"
                  className={`w-full px-3 py-2 border ${profileErrors.phone ? 'border-red-300 focus:ring-red-300' : 'border-gray-300 focus:ring-gray-300'} rounded-lg focus:outline-none focus:ring-2`}
                />
                {profileErrors.phone && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><ExclamationCircleIcon className="w-4 h-4" /> {profileErrors.phone}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" onClick={() => { setShowEditModal(false); setProfileErrors({}) }}>Cancel</button>
              <button
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
                onClick={() => {
                  if (!validateProfile()) {
                    toast.error('Please fix the highlighted fields')
                    return
                  }
                  updateProfileMutation.mutate({ name: profileForm.name, phone: profileForm.phone })
                }}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Account Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Temporarily Delete Account</h3>
            <p className="text-sm text-gray-600 mb-4">This will deactivate your account. You won’t be able to place orders or access your profile until reactivated.</p>
            <div className="flex items-center justify-end gap-2">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" onClick={() => setShowDeactivateModal(false)}>Cancel</button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
