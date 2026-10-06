import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import UserOrderMap from "../components/UserOrderMap";
import OrderChatDrawer from "../components/OrderChatDrawer";
import OrderInvoiceModal from "../components/OrderInvoiceModal";
import toast from "react-hot-toast";
import { BiLoader, BiMapPin, BiPhone, BiCheckCircle } from "react-icons/bi";
import { BsArrowLeft, BsChatDots, BsStarFill, BsStar } from "react-icons/bs";
import { getAuthToken } from "../auth/tokenStore";

const TRACKING_STEPS = [
  { step: 1, label: "Placed", icon: "📝" },
  { step: 2, label: "Kitchen", icon: "🍳" },
  { step: 3, label: "Packed", icon: "📦" },
  { step: 4, label: "On The Way", icon: "🛵" },
  { step: 5, label: "Delivered", icon: "🎉" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "placed":
      return { label: "Order Placed", bg: "bg-blue-50 text-blue-700 border-blue-200", step: 1, eta: "30–40 mins" };
    case "accepted":
    case "preparing":
      return { label: "Preparing in Kitchen", bg: "bg-amber-50 text-amber-700 border-amber-200", step: 2, eta: "20–25 mins" };
    case "ready_for_rider":
      return { label: "Food Packed & Ready", bg: "bg-purple-50 text-purple-700 border-purple-200", step: 3, eta: "15–20 mins" };
    case "rider_assigned":
    case "picked_up":
      return { label: "Rider On Route", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", step: 4, eta: "10–15 mins" };
    case "delivered":
      return { label: "Delivered Successfully", bg: "bg-emerald-100 text-emerald-800 border-emerald-300", step: 5, eta: "Delivered" };
    case "cancelled":
      return { label: "Order Cancelled", bg: "bg-red-50 text-red-600 border-red-200", step: 0, eta: "Cancelled" };
    default:
      return { label: status, bg: "bg-slate-50 text-slate-600 border-slate-200", step: 1, eta: "30 mins" };
  }
};

const OrderPage = () => {
  const { id } = useParams();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);

  // Feature states
  const [chatOpen, setChatOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [cancelSecondsLeft, setCancelSecondsLeft] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const fetchOrder = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/${id}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      setOrder(data);

      if (data?.riderLocation?.latitude && data?.riderLocation?.longitude) {
        setRiderLocation([data.riderLocation.latitude, data.riderLocation.longitude]);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Keep live tracking fresh while order is on the way
  useEffect(() => {
    if (order && (order.status === "rider_assigned" || order.status === "picked_up")) {
      const interval = setInterval(fetchOrder, 6000);
      return () => clearInterval(interval);
    }
  }, [order?.status]);

  // Fallback initial location if rider assigned
  useEffect(() => {
    if (order?.riderLocation?.latitude && order?.riderLocation?.longitude) {
      setRiderLocation([order.riderLocation.latitude, order.riderLocation.longitude]);
    } else if (order?.deliveryAddress?.latitude && order?.deliveryAddress?.longitude) {
      if (order.status === "rider_assigned" || order.status === "picked_up") {
        setRiderLocation([
          order.deliveryAddress.latitude - 0.006,
          order.deliveryAddress.longitude - 0.006,
        ]);
      }
    }
  }, [order?.status, order?.riderLocation, order?.deliveryAddress]);

  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = () => {
      fetchOrder();
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !order) return;

    socket.emit("join", `order:${order._id}`);
    socket.emit("join", `user:${order.userId}`);

    return () => {
      socket.emit("leave", `order:${order._id}`);
      socket.emit("leave", `user:${order.userId}`);
    };
  }, [socket, order?._id, order?.userId]);

  useEffect(() => {
    if (!socket) return;

    const onRiderLocation = ({ latitude, longitude }: any) => {
      if (latitude != null && longitude != null) {
        setRiderLocation([latitude, longitude]);
      }
    };

    socket.on("rider:location", onRiderLocation);

    return () => {
      socket.off("rider:location", onRiderLocation);
    };
  }, [socket]);

  // Grace period 60-second cancellation timer
  useEffect(() => {
    if (!order || order.status !== "placed") {
      setCancelSecondsLeft(null);
      return;
    }

    const updateRemaining = () => {
      const created = new Date(order.createdAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - created) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setCancelSecondsLeft(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [order?.status, order?.createdAt]);

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order? It will be cancelled immediately.")) return;
    try {
      setCancelling(true);
      await axios.put(`${restaurantService}/api/order/cancel/${order?._id}`, {}, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      toast.success("Order cancelled successfully");
      fetchOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setSubmittingReview(true);
      await axios.post(
        `${restaurantService}/api/order/review/${order?._id}`,
        { rating, comment: reviewComment },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      toast.success("Thank you for your rating! ⭐");
      setReviewSubmitted(true);
      fetchOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <BiLoader size={40} className="animate-spin text-[#E23744]" />
        <p className="text-slate-500 font-medium">Fetching live order status...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">
        <h2 className="text-2xl font-bold text-slate-800">Order Not Found</h2>
        <p className="text-sm text-slate-500">We could not find the details for this order.</p>
        <button
          onClick={() => navigate("/orders")}
          className="rounded-full bg-[#E23744] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#cf2b38]"
        >
          View All Orders
        </button>
      </div>
    );
  }

  const statusInfo = getStatusBadge(order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/orders")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs"
        >
          <BsArrowLeft size={14} />
          <span>Back to Orders</span>
        </button>

        <button
          onClick={() => setInvoiceOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#E23744] bg-white border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
        >
          <span>🧾</span>
          <span>Download Invoice (PDF)</span>
        </button>
      </div>

      {/* 60s Grace Period Cancellation Card */}
      {order.status === "placed" && cancelSecondsLeft !== null && cancelSecondsLeft > 0 && (
        <div className="rounded-3xl bg-amber-500/10 border-2 border-amber-300 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              ⏳
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide">60-Second Grace Cancellation Window</h4>
              <p className="text-xs text-amber-800 font-medium">
                Accidental order? You can cancel within the next <strong className="font-mono text-amber-950 text-sm font-bold bg-amber-200/60 px-1.5 py-0.5 rounded">{cancelSecondsLeft}s</strong> without charges.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelOrder}
            disabled={cancelling}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            {cancelling ? "Cancelling..." : "Cancel Order"}
          </button>
        </div>
      )}

      {/* Order Status Banner */}
      <div className="rounded-3xl bg-white p-6 border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Order Status</span>
              {order.status !== "delivered" && order.status !== "cancelled" && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              #{order._id.slice(-6).toUpperCase()}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {order.status !== "cancelled" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3.5 py-1 text-xs font-bold shadow-xs">
                <span>⏱️</span> {statusInfo.eta}
              </span>
            )}
            <span className={`rounded-full px-3.5 py-1 text-xs font-extrabold border uppercase tracking-wider ${statusInfo.bg}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* 5-Step Order Progress Stepper */}
        {order.status !== "cancelled" && (
          <div className="py-2">
            <div className="relative flex items-center justify-between">
              {/* Connecting Background Line */}
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-0" />

              {/* Connecting Active Progress Line */}
              <div
                className="absolute left-6 top-1/2 -translate-y-1/2 h-1 brand-gradient transition-all duration-700 -z-0"
                style={{
                  width: `${Math.min(100, Math.max(0, ((statusInfo.step - 1) / 4) * 100))}%`,
                }}
              />

              {TRACKING_STEPS.map((s) => {
                const isPassed = statusInfo.step > s.step;
                const isCurrent = statusInfo.step === s.step;

                return (
                  <div key={s.step} className="flex flex-col items-center gap-1.5 z-10 select-none">
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center text-base transition-all duration-300 ${
                        isCurrent
                          ? "brand-gradient text-white shadow-md shadow-red-500/30 scale-110 ring-4 ring-red-100"
                          : isPassed
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      {isPassed ? "✓" : s.icon}
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        isCurrent
                          ? "text-[#E23744]"
                          : isPassed
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delivery OTP Verification Card */}
        {order.deliveryOtp && (order.status === "rider_assigned" || order.status === "picked_up") && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-2 border-amber-300 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-black text-amber-950 uppercase tracking-wider">
                <span className="text-lg">🔐</span> Customer Delivery Handover OTP
              </div>
              <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-md">
                Share this secret 4-digit code with the rider when receiving your food to verify and complete delivery.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="bg-white border-2 border-amber-400 text-amber-950 font-mono font-black text-3xl tracking-[0.25em] px-6 py-2.5 rounded-2xl shadow-sm select-all">
                {order.deliveryOtp}
              </div>
            </div>
          </div>
        )}

        {/* Rider tracking card when assigned */}
        {(order.status === "rider_assigned" || order.status === "picked_up") && (
          <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">🛵</span>
                <div>
                  <h3 className="text-sm font-bold text-white">{order.riderName || "Delivery Partner"}</h3>
                  <p className="text-xs text-slate-400">On route with your delicious meal</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChatOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
                >
                  <BsChatDots size={13} />
                  <span>Chat with Partner</span>
                </button>
                {order.riderPhone && (
                  <a
                    href={`tel:${order.riderPhone}`}
                    className="flex items-center gap-1 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl transition"
                  >
                    <BiPhone size={14} />
                    <span>Call</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delivery Instructions Note */}
      {order.deliveryInstructions && (
        <div className="rounded-3xl bg-amber-50/80 border border-amber-200/80 p-5 flex items-start gap-3 shadow-xs">
          <span className="text-2xl shrink-0">📝</span>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Delivery & Kitchen Instructions</p>
            <p className="text-sm text-amber-950 font-semibold">{order.deliveryInstructions}</p>
          </div>
        </div>
      )}

      {/* Post-Delivery Star Rating / Review Card */}
      {order.status === "delivered" && (
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white border border-amber-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⭐</span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Rate Your Delivery Experience</h3>
              <p className="text-xs text-slate-500">Help us and our delivery partner provide an even better service</p>
            </div>
          </div>

          {order.review || reviewSubmitted ? (
            <div className="rounded-2xl bg-white/90 border border-amber-200 p-4 space-y-1.5">
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <BsStarFill
                    key={star}
                    size={16}
                    className={star <= (order.review?.rating || rating) ? "text-amber-400" : "text-slate-200"}
                  />
                ))}
                <span className="ml-2 text-xs font-extrabold text-slate-700">
                  {order.review?.rating || rating} / 5 Stars
                </span>
              </div>
              {(order.review?.comment || reviewComment) && (
                <p className="text-xs text-slate-600 italic">
                  "{order.review?.comment || reviewComment}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 bg-white/90 p-4 rounded-2xl border border-amber-200/60 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Your Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-125 transition cursor-pointer text-amber-400"
                    >
                      {star <= rating ? <BsStarFill size={22} /> : <BsStar size={22} className="text-slate-300" />}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share quick feedback on the food or delivery (optional)..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none h-16 text-slate-800 placeholder:text-slate-400"
              />

              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {submittingReview ? "Submitting..." : "Submit Review ⭐"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Live Map */}
      {(order.status === "rider_assigned" || order.status === "picked_up") && (
        <div className="rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Live Delivery Tracking
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live GPS Active
            </span>
          </div>
          {riderLocation && order.deliveryAddress?.latitude != null && order.deliveryAddress?.longitude != null ? (
            <UserOrderMap
              riderLocation={riderLocation}
              deliveryLocation={[
                order.deliveryAddress.latitude,
                order.deliveryAddress.longitude,
              ]}
            />
          ) : (
            <div className="p-8 text-center text-sm text-slate-400">
              Connecting to delivery partner's live GPS coordinates...
            </div>
          )}
        </div>
      )}

      {/* Items Breakdown */}
      <div className="rounded-3xl bg-white p-6 border border-slate-100 shadow-xs space-y-4">
        <h2 className="font-bold text-slate-900">Items Ordered ({order.items.length})</h2>
        <div className="space-y-2.5">
          {order.items.map((item, i) => (
            <div className="flex justify-between items-center text-sm" key={i}>
              <span className="text-slate-700 font-medium">
                {item.name} <span className="text-xs text-slate-400">× {item.quauntity}</span>
              </span>
              <span className="font-semibold text-slate-900">₹{item.price * item.quauntity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Address Details */}
      <div className="rounded-3xl bg-white p-6 border border-slate-100 shadow-xs space-y-2">
        <h2 className="font-bold text-slate-900">Delivery Address</h2>
        <div className="flex items-start gap-2.5 text-sm text-slate-600">
          <BiMapPin className="h-4 w-4 text-[#E23744] shrink-0 mt-0.5" />
          <p className="leading-relaxed">{order.deliveryAddress.fromattedAddress}</p>
        </div>
        <p className="text-xs text-slate-500 pl-6">
          Phone: <span className="font-medium text-slate-700">{order.deliveryAddress.mobile}</span>
        </p>
      </div>

      {/* Payment Summary */}
      <div className="rounded-3xl bg-white p-6 border border-slate-100 shadow-xs space-y-3 text-sm">
        <h2 className="font-bold text-slate-900">Payment Breakdown</h2>
        <div className="flex justify-between text-slate-600">
          <span>Items Subtotal</span> <span>₹{order.subtotal}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Delivery Fee</span> <span>{order.deliveryFee === 0 ? "FREE" : `₹${order.deliveryFee}`}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Platform Fee</span> <span>₹{order.platfromFee}</span>
        </div>

        {order.discount && order.discount > 0 ? (
          <div className="flex justify-between text-emerald-600 font-medium">
            <span>Coupon Discount ({order.couponCode || "COUPON"})</span>
            <span>- ₹{order.discount}</span>
          </div>
        ) : null}

        {order.tipAmount && order.tipAmount > 0 ? (
          <div className="flex justify-between text-slate-700 font-medium">
            <span>Delivery Partner Tip</span>
            <span>+ ₹{order.tipAmount}</span>
          </div>
        ) : null}

        <div className="flex justify-between font-extrabold text-base border-t border-slate-100 pt-3 text-slate-900">
          <span>Total Paid</span> <span className="text-[#E23744]">₹{order.totalAmount}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span>Payment via: <strong className="text-slate-700 capitalize">{order.paymentMethod}</strong></span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
            <BiCheckCircle size={14} /> Paid Securely
          </span>
        </div>
      </div>

      {/* Floating Chat Button */}
      {order.status !== "cancelled" && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#E23744] hover:bg-[#cf2b38] text-white px-5 py-3.5 rounded-full font-bold text-sm shadow-xl hover:shadow-2xl transition transform hover:scale-105 cursor-pointer"
        >
          <BsChatDots size={18} />
          <span>Chat with Delivery</span>
        </button>
      )}

      {/* In-App Live Chat Drawer */}
      <OrderChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        orderId={order._id}
        currentUserRole="customer"
        currentUserName="Customer"
        otherPartyName={order.riderName || "Delivery Partner"}
      />

      {/* Official Tax Invoice Modal */}
      <OrderInvoiceModal
        order={order}
        isOpen={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />
    </div>
  );
};

export default OrderPage;
