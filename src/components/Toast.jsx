// src/components/Toast.jsx
import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

const colorMap = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200", 
    icon: "text-green-500",
    text: "text-green-800"
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-500",
    text: "text-red-800"
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    icon: "text-yellow-500",
    text: "text-yellow-800"
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-500",
    text: "text-blue-800"
  }
};

export default function Toast({ 
  open, 
  onClose, 
  message, 
  type = "info",
  duration = 3000,
  position = "top-right" // top-right, top-left, bottom-right, bottom-left
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsLeaving(false);
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [open, duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 150); // Animation duration
  };

  if (!open && !isVisible) return null;

  const Icon = iconMap[type];
  const colors = colorMap[type];
  
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4", 
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4"
  };

  return (
    <div
      className={cx(
        "fixed z-[400] max-w-sm pointer-events-auto",
        positionClasses[position]
      )}
    >
      <div
        className={cx(
          "flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-150 ease-out",
          colors.bg,
          colors.border,
          isLeaving 
            ? "transform translate-x-full opacity-0" 
            : "transform translate-x-0 opacity-100"
        )}
      >
        <Icon className={cx("w-5 h-5 flex-shrink-0 mt-0.5", colors.icon)} />
        <div className="flex-1 min-w-0">
          <p className={cx("text-sm font-medium", colors.text)}>
            {message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Hook for easier usage
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after duration
    const duration = toast.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (message, options = {}) => {
    addToast({ message, type: "success", ...options });
  };

  const error = (message, options = {}) => {
    addToast({ message, type: "error", ...options });
  };

  const warning = (message, options = {}) => {
    addToast({ message, type: "warning", ...options });
  };

  const info = (message, options = {}) => {
    addToast({ message, type: "info", ...options });
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[400] space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          open={true}
          message={toast.message}
          type={toast.type}
          duration={0} // Handle duration in the hook
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  return {
    success,
    error,
    warning,
    info,
    ToastContainer
  };
}