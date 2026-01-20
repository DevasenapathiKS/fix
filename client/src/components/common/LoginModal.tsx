import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import type { LoginCredentials } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToSignup: () => void
}

export const LoginModal = ({ isOpen, onClose, onSwitchToSignup }: LoginModalProps) => {
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginCredentials>()

  const onSubmit = async (data: LoginCredentials) => {
    setLoading(true)
    try {
      console.log('Submitting login with:', data)
      const response = await authService.login(data)
      console.log('Auth response received:', response)
      setAuth(response.token, response.user)
      toast.success('Login successful!')
      reset()
      onClose()
    } catch (error: any) {
      console.error('Full login error:', error)
      console.error('Error response:', error.response)
      const message = error.response?.data?.message || 'Login failed. Please try again.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-gray-900 mb-6">
                      Sign in to your account
                    </Dialog.Title>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <div>
                        <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
                          Email or Phone
                        </label>
                        <input
                          id="identifier"
                          type="text"
                          autoComplete="username"
                          {...register('identifier', {
                            required: 'Email or phone is required',
                          })}
                          className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="Email or phone number"
                        />
                        {errors.identifier && (
                          <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <input
                          id="password"
                          type="password"
                          autoComplete="current-password"
                          {...register('password', {
                            required: 'Password is required',
                            minLength: {
                              value: 6,
                              message: 'Password must be at least 6 characters',
                            },
                          })}
                          className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="Password"
                        />
                        {errors.password && (
                          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                            Remember me
                          </label>
                        </div>

                        <div className="text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              onClose()
                              navigate('/reset-password')
                            }}
                            className="font-medium text-primary-600 hover:text-primary-500"
                          >
                            Forgot password?
                          </button>
                        </div>
                      </div>

                      <div className="mt-6">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                      </div>

                      <div className="text-center text-sm text-gray-600 mt-4">
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={onSwitchToSignup}
                          className="font-medium text-primary-600 hover:text-primary-500"
                        >
                          Sign up
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
