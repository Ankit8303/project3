import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useState } from "react";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { VscLoading } from "react-icons/vsc";
import { BiMinus, BiPlus, BiShoppingBag } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";
import { BsArrowRight, BsLightningChargeFill, BsShieldCheck } from "react-icons/bs";
import { getAuthToken } from "../auth/tokenStore";

const Cart = () => {
  const { cart, subTotal, quauntity, fetchCart } = useAppData();
  const navigate = useNavigate();

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 text-center">
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-xl animate-pulse" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-xl shadow-red-500/10 border border-red-100 text-[#E23744]">
            <BiShoppingBag size={46} />
          </div>
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight font-heading">
            Your Cart is Empty
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Looks like you haven't added any mouth-watering dishes yet. Explore our top restaurants to get started!
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-2xl bg-gradient-to-r from-[#E23744] to-[#f04452] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
        >
          Explore Restaurants
        </button>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;
  const deliveryThreshold = 250;
  const deliveryFee = subTotal < deliveryThreshold ? 49 : 0;
  const platformFee = 7;
  const grandTotal = subTotal + deliveryFee + platformFee;
  const progressPercent = Math.min(100, Math.round((subTotal / deliveryThreshold) * 100));

  const increaseQty = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/inc`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      await fetchCart();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const decreaseQty = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/dec`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      await fetchCart();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const clearCart = async () => {
    const confirm = window.confirm("Are you sure you want to clear your cart?");
    if (!confirm) return;
    try {
      setClearingCart(true);
      await axios.delete(`${restaurantService}/api/cart/clear`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      await fetchCart();
      toast.success("Cart cleared");
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setClearingCart(false);
    }
  };

  const checkout = () => {
    navigate("/checkout");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
            Your Order Cart
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review items from <span className="font-semibold text-slate-700">{restaurant.name}</span>
          </p>
        </div>
        <button
          onClick={clearCart}
          disabled={clearingCart}
          className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/70 border border-red-100 px-3.5 py-2 rounded-xl transition cursor-pointer disabled:opacity-50"
        >
          <TbTrash size={16} />
          <span>Clear Cart</span>
        </button>
      </div>

      {/* Free Delivery Meter */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-orange-200/60 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-orange-950">
            <BsLightningChargeFill className="text-amber-500" />
            {deliveryFee === 0 ? (
              <span className="text-emerald-700 font-extrabold">🎉 You unlocked FREE Delivery!</span>
            ) : (
              <span>Add ₹{deliveryThreshold - subTotal} more to get <strong className="text-orange-600 font-black">FREE Delivery</strong></span>
            )}
          </span>
          <span className="text-orange-700">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-orange-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#E23744] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Restaurant Header */}
      <div className="rounded-3xl bg-white p-5 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-slate-900">{restaurant.name}</h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                restaurant.isOpen ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {restaurant.isOpen ? "Accepting Orders" : "Closed"}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate max-w-md">
            {restaurant.autoLocation?.formattedAddress || "Standard Delivery"}
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
          {quauntity} {quauntity === 1 ? "Item" : "Items"}
        </span>
      </div>

      {/* Cart Items List */}
      <div className="space-y-3">
        {cart.map((cartItem: ICart) => {
          const item = cartItem.itemId as IMenuItem;
          const isLoading = loadingItemId === item._id;

          return (
            <div
              key={item._id}
              className="flex items-center gap-3 sm:gap-4 rounded-3xl bg-white p-3.5 sm:p-4 border border-slate-200/70 shadow-xs hover:border-slate-300 hover:shadow-md transition-all duration-200"
            >
              <img
                src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80"}
                alt={item.name}
                className="h-18 w-18 sm:h-20 sm:w-20 rounded-2xl object-cover bg-slate-100 shrink-0 shadow-inner"
              />

              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base truncate">{item.name}</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">₹{item.price}</p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                <button
                  className="rounded-xl p-1.5 text-slate-600 hover:bg-white hover:text-red-600 hover:shadow-xs active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  disabled={isLoading}
                  onClick={() => decreaseQty(item._id)}
                  title="Decrease quantity"
                >
                  {isLoading ? <VscLoading size={14} className="animate-spin" /> : <BiMinus size={14} />}
                </button>
                <span className="min-w-6 text-center text-xs sm:text-sm font-black text-slate-800">
                  {cartItem.quauntity}
                </span>
                <button
                  className="rounded-xl p-1.5 text-slate-600 hover:bg-white hover:text-emerald-600 hover:shadow-xs active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  disabled={isLoading}
                  onClick={() => increaseQty(item._id)}
                  title="Increase quantity"
                >
                  {isLoading ? <VscLoading size={14} className="animate-spin" /> : <BiPlus size={14} />}
                </button>
              </div>

              {/* Line item price */}
              <p className="w-20 text-right font-black text-slate-900 text-sm sm:text-base">
                ₹{item.price * cartItem.quauntity}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bill Details Card */}
      <div className="rounded-3xl bg-white p-6 border border-slate-200/70 shadow-sm space-y-5">
        <h3 className="font-black text-slate-900 text-base tracking-tight font-heading">
          Bill Details
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Item Total</span>
            <span className="font-bold text-slate-900">₹{subTotal}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Delivery Partner Fee</span>
            <span className={deliveryFee === 0 ? "text-emerald-600 font-bold" : "font-bold text-slate-900"}>
              {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Platform Fee</span>
            <span className="font-bold text-slate-900">₹{platformFee}</span>
          </div>

          <div className="flex justify-between text-lg font-black border-t border-slate-100 pt-4 text-slate-900">
            <span>To Pay</span>
            <span className="text-[#E23744]">₹{grandTotal}</span>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-6 pt-2 pb-1 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <BsShieldCheck size={16} className="text-emerald-500" />
            <span>100% Secure Checkout</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BsLightningChargeFill size={13} className="text-amber-500" />
            <span>30-40 mins Express Delivery</span>
          </div>
        </div>

        <button
          onClick={checkout}
          disabled={!restaurant.isOpen}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white shadow-lg transition active:scale-[0.99] cursor-pointer ${
            !restaurant.isOpen
              ? "bg-slate-300 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-[#E23744] to-[#f04452] hover:shadow-red-500/30"
          }`}
        >
          <span>{!restaurant.isOpen ? "Restaurant Currently Closed" : "Proceed to Checkout"}</span>
          {restaurant.isOpen && <BsArrowRight size={18} />}
        </button>
      </div>
    </div>
  );
};

export default Cart;
