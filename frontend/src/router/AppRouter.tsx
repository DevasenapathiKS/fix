import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { OrdersPage } from '../pages/OrdersPage';
import { CatalogPage } from '../pages/CatalogPage';
import { CategoryDetailPage } from '../pages/CategoryDetailPage';
import { SparePartsPage } from '../pages/SparePartsPage';
import { CreateUserPage } from '../pages/CreateUserPage';
import { TimeSlotsPage } from '../pages/TimeSlotsPage';
import { TechniciansPage } from '../pages/TechniciansPage';
import { CustomersPage } from '../pages/CustomersPage';
import { BannersPage } from '../pages/BannersPage';
import { BannerFormPage } from '../pages/BannerFormPage';

const AppRouter = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/" element={<DashboardPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/catalog/:categoryId" element={<CategoryDetailPage />} />
      <Route path="/technicians" element={<TechniciansPage />} />
      <Route path="/spare-parts" element={<SparePartsPage />} />
      <Route path="/time-slots" element={<TimeSlotsPage />} />
      <Route path="/users/new" element={<CreateUserPage />} />
      <Route path="/banners" element={<BannersPage />} />
      <Route path="/banners/new" element={<BannerFormPage />} />
      <Route path="/banners/:bannerId" element={<BannerFormPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;
