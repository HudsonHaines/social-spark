// src/components/ViewToggle.jsx
import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { useView, VIEW_TYPES } from '../contexts/ViewContext';

const cx = (...a) => a.filter(Boolean).join(" ");

export default function ViewToggle({ 
  size = "default", // default, small
  className = "",
  showLabels = true 
}) {
  const { viewType, setDesktopView, setMobileView } = useView();
  
  const isSmall = size === "small";
  const iconSize = isSmall ? 14 : 16;
  const buttonClass = isSmall ? "p-1.5" : "p-2";
  const textSize = isSmall ? "text-xs" : "text-sm";

  return (
    <div className={cx("flex items-center", className)}>
      {showLabels && (
        <span className={cx("font-medium text-gray-700 mr-3", textSize)}>
          View:
        </span>
      )}
      
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={setDesktopView}
          className={cx(
            "flex items-center gap-1 rounded-md transition-all font-medium",
            buttonClass,
            textSize,
            viewType === VIEW_TYPES.DESKTOP
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Monitor size={iconSize} />
          {!isSmall && "Desktop"}
        </button>
        
        <button
          onClick={setMobileView}
          className={cx(
            "flex items-center gap-1 rounded-md transition-all font-medium",
            buttonClass,
            textSize,
            viewType === VIEW_TYPES.MOBILE
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Smartphone size={iconSize} />
          {!isSmall && "Mobile"}
        </button>
      </div>
    </div>
  );
}