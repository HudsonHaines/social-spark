// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthProvider.jsx";
import AuthGate from "./auth/AuthGate.jsx";
import { ProfileProvider } from "./profile/ProfileProvider.jsx";

import ShareViewer from "./share/ShareViewer.jsx";

import { supabase } from "./lib/supabaseClient";
if (import.meta.env.DEV) window.supabase = supabase;

function Root() {
  const path = window.location.pathname;
  if (path.startsWith("/s/")) {
    const token = decodeURIComponent(path.slice(3));
    return <ShareViewer token={token} />;
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
    <Root />
  </React.StrictMode>
);
