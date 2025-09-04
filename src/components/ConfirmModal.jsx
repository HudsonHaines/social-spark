// src/components/ConfirmModal.jsx
import React from "react";
import { AlertTriangle, CheckCircle, Info, XCircle, X } from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

const iconMap = {
  success: CheckCircle,
  warning: AlertTriangle, 
  error: XCircle,
  info: Info
};

const colorMap = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200", 
    icon: "text-green-500",
    button: "bg-green-500 hover:bg-green-600"
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    icon: "text-yellow-500", 
    button: "bg-yellow-500 hover:bg-yellow-600"
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-500",
    button: "bg-red-500 hover:bg-red-600"
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-500",
    button: "bg-blue-500 hover:bg-blue-600"
  }
};

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  type = "info", // success, warning, error, info
  confirmText = "Confirm",
  cancelText = "Cancel",
  showCancel = true,
  isLoading = false
}) {
  if (!open) return null;

  const Icon = iconMap[type];
  const colors = colorMap[type];

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={showCancel ? onClose : undefined}
      />
      
      {/* Modal */}
      <div 
        className={cx(
          "relative w-full max-w-md mx-4 rounded-xl shadow-xl",
          "bg-white border transform transition-all",
          colors.bg,
          colors.border
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Close button - only show if cancellable */}
        {showCancel && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-6">
          {/* Icon & Title */}
          <div className="flex items-start gap-3 mb-4">
            <Icon className={cx("w-6 h-6 flex-shrink-0 mt-0.5", colors.icon)} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className={cx(
            "flex gap-3 justify-end",
            showCancel ? "flex-row" : "justify-center"
          )}>
            {showCancel && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={cx(
                "px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                colors.button,
                isLoading && "cursor-wait"
              )}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Working...
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for easier usage
export function useConfirmModal() {
  const [modalState, setModalState] = React.useState({
    open: false,
    title: "",
    message: "", 
    type: "info",
    onConfirm: null,
    confirmText: "Confirm",
    cancelText: "Cancel",
    showCancel: true
  });

  const showModal = (options) => {
    setModalState({
      open: true,
      title: "Confirm Action",
      message: "Are you sure?", 
      type: "info",
      confirmText: "Confirm",
      cancelText: "Cancel", 
      showCancel: true,
      ...options
    });
  };

  const hideModal = () => {
    setModalState(prev => ({ ...prev, open: false }));
  };

  const confirm = (options) => {
    return new Promise((resolve) => {
      showModal({
        ...options,
        onConfirm: () => {
          resolve(true);
          hideModal();
        }
      });
    });
  };

  const alert = (options) => {
    return new Promise((resolve) => {
      showModal({
        showCancel: false,
        confirmText: "OK",
        ...options,
        onConfirm: () => {
          resolve(true);
          hideModal();
        }
      });
    });
  };

  return {
    modalState,
    showModal,
    hideModal,
    confirm,
    alert,
    ConfirmModal: (props) => (
      <ConfirmModal
        {...modalState}
        {...props}
        onClose={hideModal}
      />
    )
  };
}