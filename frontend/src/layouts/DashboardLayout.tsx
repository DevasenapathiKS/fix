import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Topbar } from '../components/common/Topbar';
import { useSidebarStore } from '../store/uiStore';
import clsx from 'clsx';

export const DashboardLayout = () => {
  const { isOpen, close } = useSidebarStore();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* mobile sidebar */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0'
        )}
        onClick={close}
      >
        <div
          className={clsx(
            'absolute inset-y-0 left-0 w-72 transform bg-white shadow-xl transition-transform',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar />
        </div>
      </div>
    </div>
  );
};
