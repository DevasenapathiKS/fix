import { Link, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import HomeServices from './Components/Home/Home';
import './App.css';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import ProfilePage from './pages/Profile/Profile';
import BookingPage from './pages/Booking/Booking';
import OrdersPage from './pages/Orders/Orders';
import OrderDetailPage from './pages/Orders/OrderDetail';
import PaymentsPage from './pages/Payments/Payments';
import ServicesPage from './pages/Services/Services';
import AddressesPage from './pages/Addresses/Addresses';
import CartPage from './pages/Cart/Cart';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';
import { ToastContainer } from './Components/Toast/Toast';

const Layout = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const cartItemCount = useCartStore((state) => state.getItemCount());

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brandmark">
          Fixzep
        </Link>

        <nav className="top-links">
          <Link to="/">Home</Link>
          <Link to="/services">Services</Link>
          <Link to="/booking">Book</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/contact">Contact</Link>
        </nav>

        <div className="top-actions">
          <Link to="/cart" className="cart-icon-link">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            {cartItemCount > 0 && (
              <span className="cart-badge">{cartItemCount}</span>
            )}
          </Link>
          {isAuthenticated() && user ? (
            <>
              <Link to="/profile" className="user-pill">
                {user.name ?? 'Profile'}
              </Link>
              <button className="ghost" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ghost">
                Login
              </Link>
              <Link to="/register" className="solid">
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
};

const ContactPage = () => <section className="hero">Contact page placeholder.</section>;

function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomeServices />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:orderId" element={<OrderDetailPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
