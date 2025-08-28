import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { AuthProvider } from "./auth/AuthProvider.jsx";
import AuthGate from "./auth/AuthGate.jsx";
import { ProfileProvider } from "./profile/ProfileProvider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ProfileProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </ProfileProvider>
    </AuthProvider>
  </React.StrictMode>
);
