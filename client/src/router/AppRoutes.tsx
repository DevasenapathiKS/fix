import { Navigate, useRoutes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { PortalLayout } from '../components/layout';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ServicesPage } from '../pages/services/ServicesPage';
import { BookingPage } from '../pages/booking/BookingPage';
import { OrdersPage } from '../pages/orders/OrdersPage';
import { OrderDetailPage } from '../pages/orders/OrderDetailPage';
import { PaymentsPage } from '../pages/payments/PaymentsPage';
import { AddressesPage } from '../pages/profile/AddressesPage';

export const AppRoutes = () =>
  useRoutes([
    {
      path: '/auth/login',
      element: (
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      )
    },
    {
      path: '/auth/register',
      element: (
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      )
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <PortalLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'services', element: <ServicesPage /> },
        { path: 'booking', element: <BookingPage /> },
        { path: 'orders', element: <OrdersPage /> },
        { path: 'orders/:orderId', element: <OrderDetailPage /> },
        { path: 'payments', element: <PaymentsPage /> },
        { path: 'profile/addresses', element: <AddressesPage /> }
      ]
    },
    { path: '*', element: <Navigate to="/dashboard" replace /> }
  ]);
