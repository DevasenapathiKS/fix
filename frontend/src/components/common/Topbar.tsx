import { Bars3Icon, BellIcon, WifiIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { useSidebarStore } from '../../store/uiStore';
import { useSocket } from '../../context/SocketContext';
import { useElectron } from '../../hooks/useElectron';

export const Topbar = () => {
  const { user, logout } = useAuth();
  const toggleSidebar = useSidebarStore((state) => state.toggle);
  const { isConnected, unreadCount, soundEnabled } = useSocket();
  const { isElectron } = useElectron();

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
      <div className="flex items-center gap-4">
        {/* Desktop app indicator */}
        {isElectron && (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1" title="Running as Desktop App">
            <ComputerDesktopIcon className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-slate-600">Desktop</span>
          </div>
        )}

        {/* Connection status indicator */}
        <div className="flex items-center gap-1.5" title={isConnected ? 'Connected - Real-time updates active' : 'Disconnected - Reconnecting...'}>
          <WifiIcon className={`h-4 w-4 ${isConnected ? 'text-emerald-500' : 'text-slate-300'}`} />
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
        </div>

        {/* Sound status indicator */}
        <div 
          className="flex items-center" 
          title={soundEnabled ? 'Sound notifications enabled' : 'Click anywhere to enable sound notifications'}
        >
          {soundEnabled ? (
            <SpeakerWaveIcon className="h-4 w-4 text-emerald-500" />
          ) : (
            <SpeakerXMarkIcon className="h-4 w-4 text-amber-500 animate-pulse" />
          )}
        </div>

        {/* Notification indicator */}
        <div className="relative">
          <BellIcon className="h-5 w-5 text-slate-500" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        <button
          onClick={logout}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900"
        >
          Logout
        </button>
      </div>
    </header>
  );
};
