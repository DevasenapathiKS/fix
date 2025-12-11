import { Outlet } from 'react-router-dom';
import { LayoutDashboard, CalendarPlus, FolderClock, MapPinned, CreditCard } from 'lucide-react';
import { AppShell, type NavLink } from './AppShell';
import { useCustomerSession } from '../../hooks/useCustomerSession';

const navLinks: NavLink[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Services', href: '/services', icon: MapPinned },
  { label: 'Book visit', href: '/booking', icon: CalendarPlus },
  { label: 'Orders', href: '/orders', icon: FolderClock },
  { label: 'Payments', href: '/payments', icon: CreditCard }
];

const footerLinks: NavLink[] = [
  { label: 'Addresses', href: '/profile/addresses', icon: MapPinned }
];

export const PortalLayout = () => {
  const { logout } = useCustomerSession();
  return (
    <AppShell links={navLinks} footerLinks={footerLinks} onLogout={logout}>
      <Outlet />
    </AppShell>
  );
};
