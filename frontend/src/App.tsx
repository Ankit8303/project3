import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProtectedRoute from "./components/protectedRote";
import PublicRoute from "./components/publicRoute";
import SelectRole from "./pages/SelectRole";
import Navbar from "./components/navbar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import Restaurant from "./pages/Restaurant";
import RestaurantPage from "./pages/RestaurantPage";
import Cart from "./pages/Cart";
import AddAddressPage from "./pages/Address";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import OrderPage from "./pages/OrderPage";
import RiderDashboard from "./pages/RiderDashboard";
import Admin from "./pages/Admin";

import Favorites from "./pages/Favorites";

const App = () => {
  const { user, isAuth, loading } = useAppData();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E23744] text-3xl shadow-lg shadow-red-500/30 animate-bounce">
          🍅
        </div>
        <h1 className="text-xl font-bold text-slate-800">
          Loading Tomato...
        </h1>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* If authenticated as seller, render Restaurant Dashboard */}
      {isAuth && user && user.role === "seller" ? (
        <Routes>
          <Route path="/select-role" element={<SelectRole />} />
          <Route path="*" element={<Restaurant />} />
        </Routes>
      ) : isAuth && user && user.role === "rider" ? (
        /* If authenticated as rider, render Rider Dashboard */
        <Routes>
          <Route path="/select-role" element={<SelectRole />} />
          <Route path="*" element={<RiderDashboard />} />
        </Routes>
      ) : isAuth && user && user.role === "admin" ? (
        /* If authenticated as admin, render Admin Dashboard */
        <Routes>
          <Route path="/select-role" element={<SelectRole />} />
          <Route path="*" element={<Admin />} />
        </Routes>
      ) : (
        /* Customer & Guest Flow */
        <>
          {isAuth && <Navbar />}
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/select-role" element={<SelectRole />} />
              <Route
                path="/paymentsuccess/:paymentId"
                element={<PaymentSuccess />}
              />
              <Route path="/orders" element={<Orders />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/order/:id" element={<OrderPage />} />
              <Route path="/ordersuccess" element={<OrderSuccess />} />
              <Route path="/address" element={<AddAddressPage />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/restaurant/:id" element={<RestaurantPage />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/account" element={<Account />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </>
      )}
    </BrowserRouter>
  );
};

export default App;
