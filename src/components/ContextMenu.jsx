// src/components/ContextMenu.jsx
import React, { useEffect, useRef, useState } from "react";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function ContextMenu({ 
  visible, 
  x, 
  y, 
  onClose, 
  items = [],
  className = ""
}) {
  const menuRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (visible && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      let adjustedX = x;
      let adjustedY = y;

      // Adjust X position if menu would go off screen
      if (x + rect.width > viewport.width) {
        adjustedX = viewport.width - rect.width - 10;
      }
      if (adjustedX < 10) {
        adjustedX = 10;
      }

      // Adjust Y position if menu would go off screen
      if (y + rect.height > viewport.height) {
        adjustedY = viewport.height - rect.height - 10;
      }
      if (adjustedY < 10) {
        adjustedY = 10;
      }

      setAdjustedPosition({ x: adjustedX, y: adjustedY });
    }
  }, [visible, x, y]);

  // Close menu on outside click
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className={cx(
        "fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px]",
        className
      )}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {items.map((item, index) => {
        if (item.type === 'separator') {
          return (
            <div
              key={`separator-${index}`}
              className="h-px bg-gray-200 my-1"
            />
          );
        }

        return (
          <button
            key={item.key || index}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              item.onClick?.(e);
            }}
            disabled={item.disabled}
            className={cx(
              "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
              item.disabled 
                ? "text-gray-400 cursor-not-allowed" 
                : "text-gray-700 hover:bg-gray-100",
              item.danger && !item.disabled && "text-red-600 hover:bg-red-50"
            )}
          >
            {item.icon && (
              <span className="flex-shrink-0">
                {item.icon}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-gray-400 font-mono">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Hook for managing context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    items: []
  });

  const showContextMenu = (event, items) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      items
    });
  };

  const hideContextMenu = () => {
    setContextMenu(prev => ({
      ...prev,
      visible: false
    }));
  };

  const ContextMenuComponent = () => (
    <ContextMenu
      visible={contextMenu.visible}
      x={contextMenu.x}
      y={contextMenu.y}
      items={contextMenu.items}
      onClose={hideContextMenu}
    />
  );

  return {
    showContextMenu,
    hideContextMenu,
    ContextMenuComponent
  };
}