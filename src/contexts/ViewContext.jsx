// src/contexts/ViewContext.jsx
import React, { createContext, useContext, useState } from 'react';

const ViewContext = createContext();

export const VIEW_TYPES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile'
};

export function ViewProvider({ children }) {
  const [viewType, setViewType] = useState(VIEW_TYPES.DESKTOP);

  const toggleView = () => {
    setViewType(prev => prev === VIEW_TYPES.DESKTOP ? VIEW_TYPES.MOBILE : VIEW_TYPES.DESKTOP);
  };

  const setDesktopView = () => setViewType(VIEW_TYPES.DESKTOP);
  const setMobileView = () => setViewType(VIEW_TYPES.MOBILE);

  const value = {
    viewType,
    isMobile: viewType === VIEW_TYPES.MOBILE,
    isDesktop: viewType === VIEW_TYPES.DESKTOP,
    toggleView,
    setDesktopView,
    setMobileView
  };

  return (
    <ViewContext.Provider value={value}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}