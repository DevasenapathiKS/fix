import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { authService } from '../services/authService'

export const ResetPasswordPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const token = searchParams.get('token') || ''

  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setEmailError(null)

    if (!email.trim()) {
      const message = 'Please enter your email address'
      setEmailError(message)
      toast.error(message)
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email.trim())) {
      const message = 'Please enter a valid email address'
      setEmailError(message)
      toast.error(message)
      return
    }

    setLoading(true)
    try {
      const res = await authService.forgotPassword(email.trim())
      if (!res.data?.sent) {
        const message = 'Email ID not found'
        setEmailError(message)
        // toast.error(message)
        setEmailSent(false)
        return
      }
      toast.success(res?.message || 'If an account exists, a reset link has been sent')
      setEmailSent(true)
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to send reset email'
      toast.error(message)
      setEmailError(message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error('Invalid or missing reset link')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await authService.resetPassword(token, password)
      toast.success(res?.message || 'Password updated successfully')
      navigate('/?from=reset-password')
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Invalid or expired reset link'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            {emailSent ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
                <p className="text-sm text-gray-600 mb-6">
                  If an account exists for <span className="font-medium">{email}</span>, a password reset link has been sent.
                  Please check your inbox and follow the instructions.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full mt-2 text-sm text-white bg-black hover:bg-gray-900 rounded-lg py-2.5 px-4 transition-colors"
                >
                  Back to homepage
                </button>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot your password?</h1>
                <p className="text-sm text-gray-600 mb-6">
                  Enter the email associated with your account and we&apos;ll send you a link to reset your password.
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                      placeholder="you@example.com"
                    />
                    {emailError && (
                      <p className="mt-1 text-sm text-red-600">{emailError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Sending link...' : 'Send reset link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="w-full mt-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Back to homepage
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Set a new password</h1>
          <p className="text-sm text-gray-600 mb-6">
            Choose a strong password that you don&apos;t use elsewhere.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
