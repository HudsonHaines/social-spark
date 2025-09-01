// src/main.jsx
import React, { Suspense, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthProvider.jsx";
import AuthGate from "./auth/AuthGate.jsx";
import { ProfileProvider } from "./profile/ProfileProvider.jsx";

// Lazy load ShareViewer for /s/:token
const ShareViewer = React.lazy(() => import("./share/ShareViewer.jsx"));

import { supabase } from "./lib/supabaseClient";
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

  return { shareToken };
};

function Router() {
  const { shareToken } = useRoute();

  if (shareToken) {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-app-muted">Loading…</div>}>
        <ShareViewer token={shareToken} />
      </Suspense>
    );
  }

  return (
    <AuthProvider>
      <ProfileProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </ProfileProvider>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
