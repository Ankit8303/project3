import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authService, restaurantService } from "../main";
import type { AppContextType, ICart, LocationData, User } from "../types";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, useUser, useAuth } from "@clerk/clerk-react";
import { getAuthToken, setAuthToken, clearAuthToken } from "../auth/tokenStore";

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

const DEFAULT_LOCATION: LocationData = {
  latitude: 28.6139,
  longitude: 77.2090,
  formattedAddress: "Connaught Place, New Delhi, Delhi, India",
};

export const AppProvider = ({ children }: AppProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [city, setCity] = useState("New Delhi");

  const clerk = useClerk();
  const { getToken } = useAuth();
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();

  async function fetchUser() {
    try {
      const token = getAuthToken();
      if (!token) {
        if (!clerkLoaded || !isSignedIn || !clerkUser) {
          setUser(null);
          setIsAuth(false);
          setLoading(false);
          return;
        }

        // If no backend token but Clerk is signed in, sync automatically
        const clerkToken = await getToken();
        if (!clerkToken) {
          throw new Error("Clerk session token is unavailable");
        }

        const { data } = await axios.post(
          `${authService}/api/auth/login-clerk`,
          {},
          { headers: { Authorization: `Bearer ${clerkToken}` } },
        );

        setAuthToken(data.token);
        setUser(data.user);
        setIsAuth(true);
        return;
      }

      const { data } = await axios.get(`${authService}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data && data._id) {
        setUser(data);
        setIsAuth(true);
      } else {
        clearAuthToken();
        setUser(null);
        setIsAuth(false);
      }
    } catch (error) {
      console.log("Fetch user error:", error);
      clearAuthToken();
      setUser(null);
      setIsAuth(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (clerkLoaded) {
      fetchUser();
    }
  }, [clerkLoaded, isSignedIn, getToken]);

  async function logout() {
    try {
      if (clerk && clerk.signOut) {
        await clerk.signOut();
      }
    } catch (e) {
      console.log("Clerk signOut note:", e);
    }
    clearAuthToken();
    setUser(null);
    setIsAuth(false);
    setCart([]);
    setSubTotal(0);
    setQuauntity(0);
    toast.success("Logged out successfully");
  }

  const [cart, setCart] = useState<ICart[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [quauntity, setQuauntity] = useState(0);

  async function fetchCart() {
    if (!user || user.role !== "customer") return;
    try {
      const { data } = await axios.get(`${restaurantService}/api/cart/all`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      setCart(data.cart || []);
      setSubTotal(data.subtotal || 0);
      setQuauntity(data.cartLength || (data.cart ? data.cart.length : 0));
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && user.role === "customer") {
      fetchCart();
    }
  }, [user]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();

          setLocation({
            latitude,
            longitude,
            formattedAddress: data.display_name || "Current Location",
          });

          setCity(
            data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              "Your Location"
          );
        } catch (error) {
          setLocation({
            latitude,
            longitude,
            formattedAddress: "Current Location",
          });
          setCity("Your Location");
        } finally {
          setLoadingLocation(false);
        }
      },
      () => {
        setCity("New Delhi");
        setLocation({
          latitude: 28.6139,
          longitude: 77.2090,
          formattedAddress: "Connaught Place, New Delhi, Delhi, India",
        });
        setLoadingLocation(false);
      },
      { timeout: 8000 }
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        isAuth,
        loading,
        setIsAuth,
        setLoading,
        setUser,
        user,
        location,
        loadingLocation,
        city,
        cart,
        fetchCart,
        quauntity,
        subTotal,
        logout,
      }}
    >
      {children}
      <Toaster position="top-center" />
    </AppContext.Provider>
  );
};

export const useAppData = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within AppProvider");
  }
  return context;
};
