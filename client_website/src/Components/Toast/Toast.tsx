import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem = ({ toast, onRemove }: ToastItemProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`toast-item toast-${toast.type}`}>
      <div className="toast-icon">{icons[toast.type]}</div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        ×
      </button>
    </div>
  );
};

// Global toast state
let toastListeners: ((toasts: ToastMessage[]) => void)[] = [];
let toasts: ToastMessage[] = [];

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toasts]));
};

export const toast = {
  show: (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    toasts = [...toasts, { id, type, title, message, duration }];
    notifyListeners();
    return id;
  },
  success: (title: string, message?: string) => toast.show('success', title, message),
  error: (title: string, message?: string) => toast.show('error', title, message),
  warning: (title: string, message?: string) => toast.show('warning', title, message),
  info: (title: string, message?: string) => toast.show('info', title, message),
  remove: (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  },
  clear: () => {
    toasts = [];
    notifyListeners();
  }
};

export const ToastContainer = () => {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastMessage[]) => setItems(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  if (items.length === 0) return null;

  return createPortal(
    <div className="toast-container">
      {items.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={toast.remove} />
      ))}
    </div>,
    document.body
  );
};

export default toast;
