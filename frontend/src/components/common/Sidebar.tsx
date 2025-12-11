import { NavLink } from 'react-router-dom';
import { ClipboardDocumentListIcon, Squares2X2Icon, WrenchIcon, UsersIcon, ClockIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const links = [
  { to: '/', label: 'Overview', icon: Squares2X2Icon },
  { to: '/orders', label: 'Orders', icon: ClipboardDocumentListIcon },
  { to: '/catalog', label: 'Catalog', icon: WrenchIcon },
  { to: '/technicians', label: 'Technicians', icon: UsersIcon },
  { to: '/spare-parts', label: 'Spare Parts', icon: WrenchIcon },
  { to: '/time-slots', label: 'Time Slots', icon: ClockIcon },
  { to: '/users/new', label: 'Create User', icon: UsersIcon }
];

export const Sidebar = () => {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white/90 backdrop-blur">
      <div className="px-6 py-5 border-b border-slate-200">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Fixzep Admin</p>
        <p className="mt-2 text-xl font-semibold text-slate-900">Control Room</p>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                isActive ? 'bg-slate-900 text-white shadow-card' : 'text-slate-500 hover:bg-slate-100'
              )
            }
          >
            <link.icon className="h-5 w-5" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
