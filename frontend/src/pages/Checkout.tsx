import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useWallet } from "../context/WalletContext";
import axios from "axios";
import { restaurantService, utilsService } from "../main";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import toast from "react-hot-toast";
import { BiCreditCard, BiLoader, BiLock, BiMapPin, BiPhone, BiPlus, BiTag, BiCheck, BiHeart, BiWallet } from "react-icons/bi";
import { BsCheckCircleFill, BsLightningChargeFill, BsShieldCheck } from "react-icons/bs";
import { loadStripe } from "@stripe/stripe-js";
import { getAuthToken } from "../auth/tokenStore";

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

interface Coupon {
  code: string;
  title: string;
  description: string;
  minOrder: number;
}

const AVAILABLE_COUPONS: Coupon[] = [
  {
    code: "WELCOME50",
    title: "50% OFF (up to ₹100)",
    description: "Special discount for all food lovers",
    minOrder: 150,
  },
  {
    code: "FREEDEL",
    title: "FREE DELIVERY",
    description: "Waives 100% of standard delivery fee",
    minOrder: 0,
  },
  {
    code: "FLAT30",
    title: "FLAT ₹30 OFF",
    description: "Instant cash discount on orders above ₹100",
    minOrder: 100,
  },
];

const Checkout = () => {
  const { cart, subTotal, quauntity, location } = useAppData();

  const navigate = useNavigate();
  const { walletBalance, tomatoCoins, payWithWallet, redeemCoins } = useWallet();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "stripe">("wallet");
  const [useCoins, setUseCoins] = useState(false);
  const [payingWithWallet, setPayingWithWallet] = useState(false);

  // Inline address creation state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newMobile, setNewMobile] = useState("");
  const [newAddressText, setNewAddressText] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");

  // Rider Tip state
  const [tipAmount, setTipAmount] = useState<number>(0);

  // Instructions state
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([]);
  const [customInstruction, setCustomInstruction] = useState("");

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!cart || cart.length === 0) {
        setLoadingAddress(false);
        return;
      }

      try {
        const { data } = await axios.get(
          `${restaurantService}/api/address/all`,
          {
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
            },
          }
        );

        setAddresses(data || []);
        if (data && data.length > 0 && !selectedAddressId) {
          setSelectedAddressId(data[0]._id);
        } else if (!data || data.length === 0) {
          setShowAddAddress(true);
          if (location?.formattedAddress) {
            setNewAddressText(location.formattedAddress);
          }
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchAddresses();
  }, [cart, location]);

  const handleSaveAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMobile.trim()) {
      toast.error("Please enter a contact phone number");
      return;
    }

    const addr = newAddressText.trim() || location?.formattedAddress || "Connaught Place, New Delhi";
    const lat = location?.latitude || 28.6139;
    const lng = location?.longitude || 77.2090;

    try {
      setSavingAddress(true);
      const { data } = await axios.post(
        `${restaurantService}/api/address/new`,
        {
          mobile: Number(newMobile.trim()),
          formattedAddress: addr,
          latitude: lat,
          longitude: lng,
        },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      toast.success("Delivery address added! 📍");
      const savedAddr = data.address;
      setAddresses((prev) => [savedAddr, ...prev]);
      setSelectedAddressId(savedAddr._id);
      setShowAddAddress(false);
      setNewMobile("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add address");
    } finally {
      setSavingAddress(false);
    }
  };

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <p className="text-slate-500 text-lg font-medium">Your cart is empty</p>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;
  let deliveryFee = subTotal < 250 ? 49 : 0;
  const platformFee = 7;

  // Coupon calculations
  let discount = 0;
  if (appliedCoupon === "WELCOME50") {
    discount = Math.min(100, Math.round(subTotal * 0.5));
  } else if (appliedCoupon === "FREEDEL") {
    discount = deliveryFee;
    deliveryFee = 0;
  } else if (appliedCoupon === "FLAT30") {
    discount = Math.min(subTotal, 30);
  }

  const grandTotal = Math.max(0, subTotal - discount) + deliveryFee + platformFee + tipAmount;
  const coinDiscount = useCoins ? Math.min(50, tomatoCoins, grandTotal) : 0;
  const finalTotal = Math.max(0, grandTotal - coinDiscount);

  const handleApplyCoupon = (code: string) => {
    const coupon = AVAILABLE_COUPONS.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (!coupon) {
      toast.error("Invalid coupon code");
      return;
    }
    if (subTotal < coupon.minOrder) {
      toast.error(`Order min ₹${coupon.minOrder} required for ${coupon.code}`);
      return;
    }
    setAppliedCoupon(coupon.code);
    setCouponInput("");
    toast.success(`Coupon ${coupon.code} applied! 🎉`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast("Coupon removed");
  };

  const handleWalletPay = async () => {
    if (!selectedAddressId) {
      toast.error("Please select or add a delivery address first");
      return;
    }
    if (walletBalance < finalTotal) {
      toast.error(`Insufficient wallet balance (₹${walletBalance}). Please use Card/Stripe.`);
      return;
    }

    try {
      setPayingWithWallet(true);
      if (useCoins && coinDiscount > 0) {
        redeemCoins(coinDiscount);
      }
      const order = await createOrder();
      if (!order || !order.orderId) {
        setPayingWithWallet(false);
        return;
      }

      const sessionId = await payWithWallet(finalTotal, order.orderId);
      if (sessionId) {
        navigate(`/ordersuccess?session_id=${encodeURIComponent(sessionId)}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Wallet payment failed");
    } finally {
      setPayingWithWallet(false);
    }
  };

  const createOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select or add a delivery address first");
      return null;
    }

    const combinedInstructions = [
      ...selectedInstructions,
      customInstruction.trim(),
    ].filter(Boolean).join(" • ");

    setCreatingOrder(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/order/new`,
        {
          paymentMethod: "stripe",
          addressId: selectedAddressId,
          couponCode: appliedCoupon,
          tipAmount,
          deliveryInstructions: combinedInstructions || null,
        },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      return data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create Order");
      return null;
    } finally {
      setCreatingOrder(false);
    }
  };

  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

  const payWithStripe = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }

    try {
      setLoadingStripe(true);
      const order = await createOrder();
      if (!order || !order.orderId) {
        setLoadingStripe(false);
        return;
      }

      const { orderId } = order;

      await stripePromise;

      const { data } = await axios.post(
        `${utilsService}/api/payment/stripe/create`,
        {
          orderId,
        }
      );

      if (data && data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to create Stripe payment session");
        setLoadingStripe(false);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Payment initiation failed");
      setLoadingStripe(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
            Secure Checkout
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review delivery address, apply coupons & complete payment
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <BsShieldCheck size={16} />
          <span>256-Bit SSL Secured</span>
        </div>
      </div>

      {/* Restaurant Header */}
      <div className="rounded-3xl bg-white p-5 shadow-xs border border-slate-200/70 flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-base font-extrabold text-slate-900">{restaurant.name}</h2>
          <p className="text-xs text-slate-500">
            {restaurant.autoLocation?.formattedAddress || "Express Kitchen"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 text-orange-700 text-xs font-bold border border-orange-100">
          <BsLightningChargeFill size={12} />
          <span>30-40 min ETA</span>
        </div>
      </div>

      {/* Delivery Address Card */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/70 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base font-heading">Delivery Address</h3>
            <p className="text-xs text-slate-500">Where should we drop off your food?</p>
          </div>
          {addresses.length > 0 && !showAddAddress && (
            <button
              onClick={() => {
                setShowAddAddress(true);
                if (location?.formattedAddress) setNewAddressText(location.formattedAddress);
              }}
              className="text-xs font-bold text-[#e23744] hover:text-[#c42533] bg-red-50 hover:bg-red-100/60 border border-red-100 px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
            >
              <BiPlus size={16} /> Add New Address
            </button>
          )}
        </div>

        {loadingAddress ? (
          <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
            <BiLoader className="animate-spin text-[#e23744]" size={20} />
            <span>Fetching saved addresses...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((add) => {
              const isSelected = selectedAddressId === add._id;

              return (
                <label
                  key={add._id}
                  className={`flex items-start gap-3.5 rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-[#e23744] bg-red-50/40 shadow-xs ring-1 ring-[#e23744]/20"
                      : "hover:bg-slate-50/60 border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={isSelected}
                    onChange={() => setSelectedAddressId(add._id)}
                    className="accent-[#e23744] mt-1 h-4 w-4"
                  />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">{add.formattedAddress}</p>
                      {isSelected && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-[#e23744] text-white px-2 py-0.5 rounded-md">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      <BiPhone size={13} className="text-slate-400" /> +91 {add.mobile}
                    </p>
                  </div>
                  {isSelected && (
                    <BsCheckCircleFill className="text-[#e23744] shrink-0 mt-0.5" size={18} />
                  )}
                </label>
              );
            })}

            {/* Inline Add Address Form */}
            {(showAddAddress || addresses.length === 0) && (
              <form
                onSubmit={handleSaveAddress}
                className="rounded-2xl border border-red-200 bg-red-50/30 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BiMapPin className="text-[#e23744]" size={18} /> Enter Delivery Details
                  </span>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddAddress(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Contact Phone Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#e23744] focus:ring-2 focus:ring-red-100 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Complete Address / House / Flat / Street *
                    </label>
                    <textarea
                      placeholder="House/Flat No, Street, Landmark, City..."
                      value={newAddressText}
                      onChange={(e) => setNewAddressText(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#e23744] focus:ring-2 focus:ring-red-100 transition resize-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingAddress}
                  className="w-full rounded-xl bg-gradient-to-r from-[#e23744] to-[#f04452] py-3 text-xs font-bold text-white hover:shadow-md hover:shadow-red-500/20 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {savingAddress ? "Saving Address..." : "Save & Deliver Here"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Delivery & Cooking Instructions Section */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/70 space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm font-heading">Delivery & Cooking Notes</h3>
          <p className="text-[11px] text-slate-500">Add instructions for your rider and kitchen</p>
        </div>

        {/* Instruction Chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "nobell", label: "🔔 Don't ring bell" },
            { id: "door", label: "🚪 Leave at door" },
            { id: "guard", label: "🛡️ Leave with guard" },
            { id: "nocall", label: "📞 Avoid calling" },
            { id: "spicy", label: "🌶️ Less spicy" },
            { id: "nocutlery", label: "🍴 No cutlery" },
          ].map((chip) => {
            const isSelected = selectedInstructions.includes(chip.label);
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setSelectedInstructions((prev) =>
                    isSelected ? prev.filter((i) => i !== chip.label) : [...prev, chip.label]
                  );
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="Any custom instructions? (e.g. gate passcode, extra sauce)"
          value={customInstruction}
          onChange={(e) => setCustomInstruction(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:bg-white focus:border-[#e23744] transition"
        />
      </div>

      {/* Coupons & Promo Codes Section */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/70 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-[#e23744]">
              <BiTag size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm font-heading">Offers & Coupons</h3>
              <p className="text-[11px] text-slate-500">Apply promo codes to save big</p>
            </div>
          </div>
          {appliedCoupon && (
            <button
              onClick={handleRemoveCoupon}
              className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>

        {/* Input box */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter promo code (e.g. WELCOME50)"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider outline-none focus:bg-white focus:border-[#e23744] transition"
          />
          <button
            onClick={() => handleApplyCoupon(couponInput)}
            disabled={!couponInput.trim()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
          >
            Apply
          </button>
        </div>

        {/* Available coupon pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {AVAILABLE_COUPONS.map((coupon) => {
            const isApplied = appliedCoupon === coupon.code;

            return (
              <div
                key={coupon.code}
                className={`flex flex-col justify-between p-3 rounded-2xl border transition ${
                  isApplied
                    ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/20"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 tracking-wider">
                      {coupon.code}
                    </span>
                    {isApplied && (
                      <span className="flex items-center gap-0.5 text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                        <BiCheck size={14} /> Applied
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-[#e23744] mt-0.5">{coupon.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{coupon.description}</p>
                </div>

                {!isApplied && (
                  <button
                    onClick={() => handleApplyCoupon(coupon.code)}
                    className="mt-2 w-full rounded-lg bg-slate-100 hover:bg-red-50 hover:text-[#e23744] py-1 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                  >
                    Apply Coupon
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tip Delivery Partner Card */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <BiHeart size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm font-heading">Tip Your Delivery Partner</h3>
              <p className="text-[11px] text-slate-500">100% of tips go directly to your rider 🛵</p>
            </div>
          </div>
          {tipAmount > 0 && (
            <span className="text-xs font-bold text-emerald-600">₹{tipAmount} Added</span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          {[20, 30, 50].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setTipAmount(tipAmount === amount ? 0 : amount)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                tipAmount === amount
                  ? "bg-[#e23744] text-white shadow-xs"
                  : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
              }`}
            >
              ₹{amount}
            </button>
          ))}
          {tipAmount > 0 && (
            <button
              type="button"
              onClick={() => setTipAmount(0)}
              className="px-3 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Order Summary */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/70 space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base font-heading">Order Breakdown</h3>

        <div className="divide-y divide-slate-100">
          {cart.map((cartItem: ICart) => {
            const item = cartItem.itemId as IMenuItem;

            return (
              <div className="flex justify-between py-2.5 text-sm" key={cartItem._id}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{item.name}</span>
                  <span className="text-xs font-bold text-slate-400">× {cartItem.quauntity}</span>
                </div>
                <span className="font-bold text-slate-900">₹{item.price * cartItem.quauntity}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Items Subtotal ({quauntity})</span>
            <span className="font-semibold text-slate-800">₹{subTotal}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Coupon Discount ({appliedCoupon})</span>
              <span>-₹{discount}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-600">
            <span>Delivery Fee</span>
            <span className={deliveryFee === 0 ? "text-emerald-600 font-bold" : "font-semibold text-slate-800"}>
              {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
            </span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>Platform Fee</span>
            <span className="font-semibold text-slate-800">₹{platformFee}</span>
          </div>

          {tipAmount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span className="flex items-center gap-1">Delivery Partner Tip ❤️</span>
              <span className="font-bold text-slate-800">₹{tipAmount}</span>
            </div>
          )}

          {useCoins && coinDiscount > 0 && (
            <div className="flex justify-between text-amber-600 font-bold">
              <span>Tomato Coins Redeemed 🪙</span>
              <span>-₹{coinDiscount}</span>
            </div>
          )}

          <div className="flex justify-between text-lg font-black border-t border-slate-100 pt-3 text-slate-900">
            <span>Total to Pay</span>
            <span className="text-[#e23744]">₹{finalTotal}</span>
          </div>
        </div>
      </div>

      {/* Tomato Coins Redemption Card */}
      {tomatoCoins > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-white border border-amber-300 p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-3xl shrink-0">🪙</span>
            <div>
              <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                Tomato Loyalty Coins ({tomatoCoins} Available)
              </p>
              <p className="text-xs text-amber-800 font-medium">
                Redeem 50 coins to save ₹50 instantly on this order!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUseCoins(!useCoins)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shrink-0 ${
              useCoins
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-white text-amber-900 border border-amber-300 hover:bg-amber-100/50"
            }`}
          >
            {useCoins ? "Applied ✓" : "Redeem"}
          </button>
        </div>
      )}

      {/* Payment Method Selector & Action */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/70 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base font-heading">Choose Payment Method</h3>
          <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <BiLock size={15} className="text-emerald-600" /> 100% Safe & Instant
          </span>
        </div>

        {/* Method Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Wallet Option */}
          <div
            onClick={() => setPaymentMethod("wallet")}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
              paymentMethod === "wallet"
                ? "border-[#E23744] bg-red-50/20 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className={`p-2 rounded-xl text-lg ${paymentMethod === "wallet" ? "bg-red-100 text-[#E23744]" : "bg-slate-100 text-slate-500"}`}>
              <BiWallet />
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">Tomato Wallet</span>
                {paymentMethod === "wallet" && (
                  <span className="h-2 w-2 rounded-full bg-[#E23744]" />
                )}
              </div>
              <p className="text-xs font-bold text-slate-600">
                Balance: <strong className="text-slate-900 font-black">₹{walletBalance}</strong>
              </p>
              <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                + Earn {Math.floor(finalTotal * 0.05)} Coins Cashback
              </span>
            </div>
          </div>

          {/* Stripe Option */}
          <div
            onClick={() => setPaymentMethod("stripe")}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
              paymentMethod === "stripe"
                ? "border-[#635BFF] bg-indigo-50/20 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className={`p-2 rounded-xl text-lg ${paymentMethod === "stripe" ? "bg-indigo-100 text-[#635BFF]" : "bg-slate-100 text-slate-500"}`}>
              <BiCreditCard />
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">Online Card / UPI</span>
                {paymentMethod === "stripe" && (
                  <span className="h-2 w-2 rounded-full bg-[#635BFF]" />
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Via Stripe Checkout
              </p>
              <span className="inline-block text-[10px] font-semibold text-slate-400">
                Visa, Mastercard, UPI, RuPay
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {paymentMethod === "wallet" ? (
          <button
            disabled={!selectedAddressId || payingWithWallet || creatingOrder || walletBalance < finalTotal}
            onClick={handleWalletPay}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl brand-gradient py-4 text-base font-bold text-white hover:shadow-lg hover:shadow-red-500/30 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {payingWithWallet || creatingOrder ? (
              <>
                <BiLoader size={20} className="animate-spin" />
                <span>Processing Wallet Order...</span>
              </>
            ) : !selectedAddressId ? (
              <span>Please Select Delivery Address Above</span>
            ) : walletBalance < finalTotal ? (
              <span>Insufficient Wallet Balance (₹{walletBalance})</span>
            ) : (
              <>
                <BiWallet size={22} />
                <span>⚡ 1-Click Pay ₹{finalTotal} with Tomato Wallet</span>
              </>
            )}
          </button>
        ) : (
          <button
            disabled={!selectedAddressId || loadingStripe || creatingOrder}
            onClick={payWithStripe}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#635BFF] to-[#7B73FF] py-4 text-base font-bold text-white hover:shadow-lg hover:shadow-[#635bff]/30 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loadingStripe || creatingOrder ? (
              <>
                <BiLoader size={20} className="animate-spin" />
                <span>Initiating Stripe Payment...</span>
              </>
            ) : !selectedAddressId ? (
              <span>Please Select Delivery Address Above</span>
            ) : (
              <>
                <BiCreditCard size={22} />
                <span>Pay ₹{finalTotal} with Stripe</span>
              </>
            )}
          </button>
        )}

        <p className="text-center text-[11px] text-slate-400 font-medium">
          By proceeding, you agree to our Terms of Service & Privacy Policy. Safe and encrypted transactions.
        </p>
      </div>
    </div>
  );
};

export default Checkout;
