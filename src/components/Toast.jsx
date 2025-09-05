// src/components/Toast.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const toastIcons = {
  success: Check,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const toastStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
};

const iconStyles = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600'
};

function Toast({ toast, onClose }) {
  const Icon = toastIcons[toast.type];
  
  return (
    <div className={`
      w-full shadow-lg rounded-lg pointer-events-auto border
      transform transition-all duration-300 ease-in-out
      ${toastStyles[toast.type]}
      ${toast.isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
    `}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${iconStyles[toast.type]}`} />
          </div>
          <div className="ml-3 flex-1 pt-0.5 min-w-0">
            {toast.title && (
              <p className="text-sm font-medium break-words">{toast.title}</p>
            )}
            <p className={`text-sm break-words ${toast.title ? 'mt-1' : ''}`}>
              {toast.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className={`
                rounded-md inline-flex hover:opacity-75 focus:outline-none 
                focus:ring-2 focus:ring-offset-2 transition-opacity
                ${iconStyles[toast.type]}
              `}
              onClick={() => onClose(toast.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id 
          ? { ...toast, isLeaving: true }
          : toast
      )
    );

    // Remove from DOM after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 300);
  }, []);

  // Convenience methods
  const toast = useCallback({
    success: (message, options = {}) => addToast({ ...options, message, type: 'success' }),
    error: (message, options = {}) => addToast({ ...options, message, type: 'error' }),
    warning: (message, options = {}) => addToast({ ...options, message, type: 'warning' }),
    info: (message, options = {}) => addToast({ ...options, message, type: 'info' })
  }, [addToast]);

  const value = {
    toast,
    addToast,
    removeToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-96">
        {toasts.map(toastItem => (
          <Toast
            key={toastItem.id}
            toast={toastItem}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}