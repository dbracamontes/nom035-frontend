import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './i18n/i18n'; // Initialize i18n
import { UserProvider } from "./context/UserContext";
import { BrowserRouter } from 'react-router-dom';
// Attach network logger (safe no-op unless enabled)
import './api/networkLogger';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);