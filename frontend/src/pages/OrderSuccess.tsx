import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { utilsService, restaurantService } from "../main";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { BiCheckCircle, BiLoader } from "react-icons/bi";
import { BsArrowRight } from "react-icons/bs";
import { getAuthToken } from "../auth/tokenStore";

const OrderSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { fetchCart } = useAppData();
  const sessionId = params.get("session_id");
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkPayment = async (attempt = 0) => {
      if (!sessionId) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const demo = sessionId.startsWith("demo_session_");
        if (demo) {
          const { data } = await axios.post(
            `${utilsService}/api/payment/stripe/verify`,
            { sessionId },
            { headers: { Authorization: `Bearer ${getAuthToken()}` } },
          );
          if (!cancelled) {
            setOrderId(data.orderId);
            setVerified(true);
            await fetchCart();
            toast.success("Demo payment accepted! 🎉");
            setLoading(false);
          }
          return;
        }

        const { data } = await axios.get(`${utilsService}/api/payment/stripe/status`, {
          params: { sessionId },
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });

        if (cancelled) return;
        setOrderId(data.orderId || null);

        if (data.paymentStatus === "paid") {
          try {
            await axios.get(`${restaurantService}/api/order/${data.orderId}`, {
              headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            setVerified(true);
            await fetchCart();
            toast.success("Payment confirmed and order placed! 🎉");
            setLoading(false);
            return;
          } catch {
            // Webhook may have reached Stripe but the order event can still be propagating.
          }
        }

        if (attempt < 10) {
          timer = setTimeout(() => void checkPayment(attempt + 1), 1500);
        } else {
          setLoading(false);
          toast("Payment is still being confirmed. You can check your orders shortly.");
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoading(false);
          toast.error("Unable to retrieve payment status.");
        }
      }
    };

    void checkPayment();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, fetchCart]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center flex-col gap-3">
        <BiLoader size={48} className="animate-spin text-[#e23744]" />
        <p className="text-gray-600 font-medium">Confirming your payment with Stripe...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100 text-center space-y-6">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-500 border border-emerald-100">
            <BiCheckCircle size={48} />
          </div>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black text-slate-900 font-heading">
            {verified ? "Order Placed Successfully!" : "Payment Status"}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {verified
              ? "Your food order has been confirmed and sent to the restaurant 🎉"
              : "Stripe is still confirming the payment. Your order will update automatically."}
          </p>
        </div>
        {sessionId && (
          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/70 text-left space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stripe Session ID</span>
            <p className="font-mono text-xs text-slate-700 break-all">{sessionId}</p>
          </div>
        )}
        <div className="space-y-2.5 pt-2">
          {orderId && (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e23744] to-[#f04452] py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/35 transition active:scale-[0.99] cursor-pointer"
              onClick={() => navigate(`/order/${orderId}`)}
            >
              <span>Track Your Order Live</span><BsArrowRight size={16} />
            </button>
          )}
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition active:scale-[0.99] cursor-pointer" onClick={() => navigate("/orders")}>
            <span>View All Orders</span><BsArrowRight size={16} />
          </button>
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-[0.99] cursor-pointer" onClick={() => navigate("/")}>Explore More Restaurants</button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
