// src/main.jsx
import React, { Suspense, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import App from "./App.jsx";
import AuthProvider from "./auth/AuthProvider.jsx";
import AuthGate from "./auth/AuthGate.jsx";
import ProfileProvider from "./profile/ProfileProvider.jsx";
import { OrganizationProvider } from "./organizations/OrganizationProvider.jsx";
import { ViewProvider } from "./contexts/ViewContext.jsx";

// Lazy load ShareViewer for /s/:token and DeliveryPage for /delivery/:deckId
const ShareViewer = React.lazy(() => import("./share/ShareViewer.jsx"));
const DeliveryPage = React.lazy(() => import("./delivery/DeliveryPage.jsx"));

import { supabase } from "./lib/supabaseClient";
import { ToastProvider } from "./components/Toast.jsx";
if (import.meta.env.DEV) window.supabase = supabase;

// Simple client router: handles /s/:token and default app
const useRoute = () => {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const shareToken = useMemo(() => {
    const match = path.match(/^\/s\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [path]);

  const deliveryToken = useMemo(() => {
    const match = path.match(/^\/delivery\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [path]);

  return { shareToken, deliveryToken };
};

function Router() {
  const { shareToken, deliveryToken } = useRoute();

  if (shareToken) {
    return (
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<div className="p-6 text-sm text-app-muted">Loading…</div>}>
            <ShareViewer token={shareToken} />
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    );
  }

  if (deliveryToken) {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-app-muted">Loading delivery page…</div>}>
        <DeliveryPage />
      </Suspense>
    );
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <ProfileProvider>
          <OrganizationProvider>
            <ViewProvider>
              <AuthGate>
                <App />
              </AuthGate>
            </ViewProvider>
          </OrganizationProvider>
        </ProfileProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
