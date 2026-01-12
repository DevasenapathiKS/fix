import { useState } from 'react'
import { Footer } from '../components/Footer'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { MapPinIcon, PhoneIcon, EnvelopeIcon, ClockIcon } from '@heroicons/react/24/outline'

export const ContactPage = () => {
  const { user } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('General Inquiry')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    if (!name.trim()) { toast.error('Please enter your name'); return false }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Please enter a valid email'); return false }
    if (!message.trim()) { toast.error('Please enter your message'); return false }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const mailtoSubject = encodeURIComponent(`[Fixzep] ${subject}`)
      const bodyLines = [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : undefined,
        '',
        message
      ].filter(Boolean).join('\n')
      const mailtoBody = encodeURIComponent(bodyLines)
      const url = `mailto:support@fixzep.com?subject=${mailtoSubject}&body=${mailtoBody}`
      toast.success('Opening your email app…')
      window.location.href = url
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Contact Us</h1>
          <p className="text-primary-100 text-lg">We’re here to help with bookings, support, and partnerships.</p>
          <div className="mt-6 flex flex-wrap gap-4 text-primary-100">
            <div className="flex items-center gap-2">
              <PhoneIcon className="w-5 h-5" />
              <span>+91 98765 43210</span>
            </div>
            <div className="flex items-center gap-2">
              <EnvelopeIcon className="w-5 h-5" />
              <span>support@fixzep.com</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-5 h-5" />
              <span>OMR, Chennai</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Send us a message</h2>
                <p className="text-gray-600 mb-6">Fill in the form and our team will get back to you within 24 hours.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option>General Inquiry</option>
                        <option>Booking Support</option>
                        <option>Payment & Billing</option>
                        <option>Partnerships</option>
                        <option>Careers</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Tell us how we can help…"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">We typically respond within 24 hours.</p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                    >
                      {submitting ? 'Submitting…' : 'Send Message'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Contact Cards */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Support</h3>
                <div className="space-y-3 text-gray-700">
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="w-5 h-5 text-primary-600" />
                    <span>Call us: +91 9585571110</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="w-5 h-5 text-primary-600" />
                    <span>Email: info@fixzep.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ClockIcon className="w-5 h-5 text-primary-600" />
                    <span>Hours: 9:00 AM – 7:00 PM (IST)</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Office</h3>
                <p className="text-gray-600">2nd floor, No 11 Amma nana kudil,</p>
                <p className='text-gray-600'>Gandhi nagar cooperative socity main road,</p>
                <p className='text-gray-600'>Perumbakkam village, Tambaram taluk,</p>
                <p className='text-gray-600'>Chennai - 600100, Tamil Nadu, India.</p>
                <div className="mt-3 flex items-center gap-2 text-primary-700">
                  <MapPinIcon className="w-5 h-5" />
                  <span>Serving OMR and nearby areas</span>
                </div>
                <div className="mt-4">
                  <a
                    href="https://maps.google.com/?q=12.8921697,80.1993344"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 underline"
                  >
                    Get directions on Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Find Us on the Map</h3>
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
            <iframe
              title="Fixzep Office Location"
              src="https://www.google.com/maps?q=12.8921697,80.1993344&output=embed"
              width="100%"
              height="420"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            If the map doesn’t load,{' '}
            <a
              href="https://maps.google.com/?q=12.8921697,80.1993344"
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 underline"
            >
              open in Google Maps
            </a>
            .
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
