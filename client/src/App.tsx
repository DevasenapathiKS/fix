import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Topbar } from './components/common/Topbar'
import { LocationBanner } from './components/LocationBanner'
import { HomePage } from './pages/HomePage'
import { BannerPage } from './pages/BannerPage'
import { ServiceDetailPage } from './pages/ServiceDetailPage'
import { ServiceItemDetailPage } from './pages/ServiceItemDetailPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import './App.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <div className="min-h-screen bg-gray-50">
          <LocationBanner />
          <Topbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/banners" element={<BannerPage />} />
            <Route path="/services/:categoryId" element={<ServiceDetailPage />} />
            <Route path="/service/:serviceId" element={<ServiceItemDetailPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
