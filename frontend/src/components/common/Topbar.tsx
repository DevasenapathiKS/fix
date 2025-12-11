import { Bars3Icon } from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { useSidebarStore } from '../../store/uiStore';

export const Topbar = () => {
  const { user, logout } = useAuth();
  const toggleSidebar = useSidebarStore((state) => state.toggle);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="lg:hidden rounded-full border border-slate-200 p-2 text-slate-600">
          <Bars3Icon className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Admin</p>
          <h2 className="text-lg font-semibold text-slate-900">Welcome, {user?.name}</h2>
        </div>
      </div>
      <button
        onClick={logout}
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900"
      >
        Logout
      </button>
    </header>
  );
};
