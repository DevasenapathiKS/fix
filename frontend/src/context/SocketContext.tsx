import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { BellIcon } from '@heroicons/react/24/outline';

// Notification sound URL (from public folder)
const NOTIFICATION_SOUND_URL = '/notification.wav';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron === true;

// Socket events from backend - must match backend NOTIFICATION_EVENTS
export const SOCKET_EVENTS = {
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_RESCHEDULED: 'ORDER_RESCHEDULED',
  TECHNICIAN_ASSIGNED: 'TECHNICIAN_ASSIGNED',
  JOB_UPDATED: 'JOB_UPDATED',
  CUSTOMER_ORDER_PLACED: 'CUSTOMER_ORDER_PLACED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  TECHNICIAN_CHECKED_IN: 'TECHNICIAN_CHECKED_IN',
  CUSTOMER_APPROVAL_REQUIRED: 'CUSTOMER_APPROVAL_REQUIRED',
  CUSTOMER_APPROVAL_UPDATED: 'CUSTOMER_APPROVAL_UPDATED',
  TECHNICIAN_UNASSIGNED: 'TECHNICIAN_UNASSIGNED'
} as const;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationItem[];
  clearNotifications: () => void;
  unreadCount: number;
  soundEnabled: boolean;
}

interface NotificationItem {
  id: string;
  event: string;
  payload: any;
  timestamp: Date;
  read: boolean;
}

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5; // Set volume to 50%
    
    // Preload the audio
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Unlock audio on first user interaction (required by browsers)
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current && !audioUnlocked) {
        // Play a silent/very short sound to unlock audio context
        const audio = audioRef.current;
        audio.volume = 0;
        audio.play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 0.5; // Restore volume
            setAudioUnlocked(true);
            console.log('[Sound] Audio unlocked - notifications will play');
          })
          .catch(() => {
            // Still blocked, will try again on next interaction
          });
      }
    };

    // Listen for user interactions to unlock audio
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach((event) => {
      document.addEventListener(event, unlockAudio, { once: false, passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, [audioUnlocked]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (audioRef.current && audioUnlocked) {
      // Reset audio to start if it's already playing
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.log('[Sound] Could not play notification sound:', error.message);
      });
    } else if (!audioUnlocked) {
      console.log('[Sound] Audio not yet unlocked - click anywhere to enable notification sounds');
    }
  }, [audioUnlocked]);

  const addNotification = useCallback((event: string, payload: any) => {
    const notification: NotificationItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      payload,
      timestamp: new Date(),
      read: false
    };
    setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const showToastNotification = useCallback((event: string, payload: any) => {
    let message = '';
    let icon = <BellIcon className="h-5 w-5 text-blue-500" />;

    switch (event) {
      case SOCKET_EVENTS.ORDER_CREATED:
      case SOCKET_EVENTS.CUSTOMER_ORDER_PLACED:
        message = `New order received${payload.orderCode ? `: #${payload.orderCode}` : ''}`;
        icon = <span className="text-xl">🛒</span>;
        break;
      case SOCKET_EVENTS.TECHNICIAN_ASSIGNED:
        message = `Technician assigned to order${payload.orderCode ? ` #${payload.orderCode}` : ''}`;
        icon = <span className="text-xl">👷</span>;
        break;
      case SOCKET_EVENTS.ORDER_RESCHEDULED:
        message = `Order rescheduled${payload.orderCode ? `: #${payload.orderCode}` : ''}`;
        icon = <span className="text-xl">📅</span>;
        break;
      case SOCKET_EVENTS.PAYMENT_RECEIVED:
        message = `Payment received${payload.amount ? `: ₹${payload.amount}` : ''}`;
        icon = <span className="text-xl">💰</span>;
        break;
      case SOCKET_EVENTS.TECHNICIAN_CHECKED_IN:
        message = 'Technician checked in';
        icon = <span className="text-xl">✅</span>;
        break;
      case SOCKET_EVENTS.CUSTOMER_APPROVAL_REQUIRED:
        message = 'Customer approval required';
        icon = <span className="text-xl">⏳</span>;
        break;
      case SOCKET_EVENTS.CUSTOMER_APPROVAL_UPDATED:
        message = 'Customer approval updated';
        icon = <span className="text-xl">✔️</span>;
        break;
      case SOCKET_EVENTS.JOB_UPDATED:
        message = 'Job card updated';
        icon = <span className="text-xl">🔧</span>;
        break;
      case SOCKET_EVENTS.TECHNICIAN_UNASSIGNED:
        message = 'Technician unassigned from order';
        icon = <span className="text-xl">🔄</span>;
        break;
      default:
        message = 'New notification received';
    }

    toast(message, {
      icon,
      duration: 5000,
      position: 'top-right',
      style: {
        borderRadius: '12px',
        background: '#1e293b',
        color: '#fff',
        padding: '12px 16px'
      }
    });

    // Show native notification in Electron
    if (isElectron && window.electronAPI) {
      window.electronAPI.showNotification('Fixzep Admin', message);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('fixzep_token');
    const userStr = localStorage.getItem('fixzep_user');
    
    if (!token || !userStr) {
      return;
    }

    let user: { id?: string; role?: string } = {};
    try {
      user = JSON.parse(userStr);
    } catch {
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
      setIsConnected(true);

      // Join appropriate room based on user role
      if (user.role === 'admin') {
        socketInstance.emit('admin:join', { userId: user.id });
      } else if (user.role === 'technician') {
        socketInstance.emit('technician:join', { userId: user.id });
      } else {
        socketInstance.emit('customer:join', { userId: user.id });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      setIsConnected(false);
    });

    // Listen for all notification events
    Object.values(SOCKET_EVENTS).forEach((event) => {
      socketInstance.on(event, (payload) => {
        console.log(`[Socket] Received ${event}:`, payload);
        addNotification(event, payload);
        showToastNotification(event, payload);

        // Play notification sound for new orders
        if (event === SOCKET_EVENTS.ORDER_CREATED || event === SOCKET_EVENTS.CUSTOMER_ORDER_PLACED) {
          playNotificationSound();
        }

        // Invalidate relevant queries to refresh data
        if (event === SOCKET_EVENTS.ORDER_CREATED || event === SOCKET_EVENTS.CUSTOMER_ORDER_PLACED) {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        } else if (event === SOCKET_EVENTS.TECHNICIAN_ASSIGNED || event === SOCKET_EVENTS.TECHNICIAN_UNASSIGNED) {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['technicians'] });
          if (payload?.orderId) {
            queryClient.invalidateQueries({ queryKey: ['order-jobcard', payload.orderId] });
          }
        } else if (event === SOCKET_EVENTS.JOB_UPDATED) {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          if (payload?.orderId) {
            queryClient.invalidateQueries({ queryKey: ['order-jobcard', payload.orderId] });
          }
        } else if (event === SOCKET_EVENTS.ORDER_RESCHEDULED) {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          if (payload?.orderId) {
            queryClient.invalidateQueries({ queryKey: ['order-jobcard', payload.orderId] });
          }
        } else if (event === SOCKET_EVENTS.PAYMENT_RECEIVED) {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          if (payload?.orderId) {
            queryClient.invalidateQueries({ queryKey: ['order-jobcard', payload.orderId] });
          }
        }
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [addNotification, showToastNotification, playNotificationSound, queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SocketContext.Provider value={{ socket, isConnected, notifications, clearNotifications, unreadCount, soundEnabled: audioUnlocked }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

