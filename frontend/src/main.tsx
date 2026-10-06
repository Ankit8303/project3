import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ClerkProvider } from "@clerk/clerk-react";
import { AppProvider } from "./context/AppContext.tsx";
import "leaflet/dist/leaflet.css";
import { SocketProvider } from "./context/SocketContext.tsx";

import { FavoritesProvider } from "./context/FavoritesContext.tsx";
import { WalletProvider } from "./context/WalletContext.tsx";

const serviceUrl = (name: string, fallback: string) => {
  const configured = import.meta.env[name];
  if (configured) return configured.replace(/\/$/, "");
  if (import.meta.env.DEV) return fallback;
  throw new Error(`${name} is required for production builds`);
};

export const authService = serviceUrl("VITE_AUTH_SERVICE_URL", "http://localhost:5000");
export const restaurantService = serviceUrl("VITE_RESTAURANT_SERVICE_URL", "http://localhost:5001");
export const utilsService = serviceUrl("VITE_UTILS_SERVICE_URL", "http://localhost:5002");
export const realtimeService = serviceUrl("VITE_REALTIME_SERVICE_URL", "http://localhost:5004");
export const riderService = serviceUrl("VITE_RIDER_SERVICE_URL", "http://localhost:5005");
export const adminService = serviceUrl("VITE_ADMIN_SERVICE_URL", "http://localhost:5006");

const clerkPublishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  "pk_test_dG9tYXRvLmNsZXJrLmFjY291bnRzLmRldiQ=";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <AppProvider>
        <SocketProvider>
          <FavoritesProvider>
            <WalletProvider>
              <App />
            </WalletProvider>
          </FavoritesProvider>
        </SocketProvider>
      </AppProvider>
    </ClerkProvider>
  </StrictMode>
);
