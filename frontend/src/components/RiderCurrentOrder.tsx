import axios from "axios";
import { useState } from "react";
import type { IOrder } from "../types";
import { riderService } from "../main";
import toast from "react-hot-toast";
import OrderChatDrawer from "./OrderChatDrawer";
import { BsChatDots } from "react-icons/bs";
import { getAuthToken } from "../auth/tokenStore";

interface Props {
  order: IOrder;
  onStatusUpdate: () => void;
}

const RiderCurrentOrder = ({ order, onStatusUpdate }: Props) => {
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const updateStatus = async (enteredOtp?: string) => {
    if (order.status === "picked_up" && (!enteredOtp || enteredOtp.length !== 4)) {
      toast.error("Please enter the 4-digit delivery OTP from the customer");
      return;
    }

    try {
      setSubmitting(true);
      await axios.put(
        `${riderService}/api/rider/order/update/${order._id}`,
        { otp: enteredOtp },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      toast.success(
        order.status === "rider_assigned"
          ? "Reached restaurant! Food picked up."
          : "Delivery verified & completed! 🎉"
      );
      onStatusUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h1 className="font-bold text-gray-800 text-base">Active Delivery Task</h1>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 uppercase">
          {order.status.replace("_", " ")}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-2 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
        <div className="flex items-start gap-2">
          <span className="text-base text-amber-600 shrink-0">🏪</span>
          <div>
            <span className="text-xs text-gray-400 block font-medium">Pickup Restaurant</span>
            <span className="font-bold text-gray-800">{order.restaurantName}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-1 border-t border-gray-200/60">
          <span className="text-base text-red-500 shrink-0">📍</span>
          <div>
            <span className="text-xs text-gray-400 block font-medium">Delivery Destination</span>
            <span className="font-semibold text-gray-800 text-xs">
              {order.deliveryAddress?.fromattedAddress}
            </span>
          </div>
        </div>

        <div className="flex justify-between pt-1 border-t border-gray-200/60 text-xs">
          <span>Order Total: <strong className="text-gray-800">₹{order.totalAmount}</strong></span>
          <span>Your Earning: <strong className="text-emerald-600">₹{order.riderAmount || 49}</strong></span>
        </div>

        {order.tipAmount && order.tipAmount > 0 ? (
          <div className="flex items-center gap-1.5 pt-1 text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded-md border border-amber-200/60">
            <span>🎉</span> Customer included a <strong>₹{order.tipAmount}</strong> tip!
          </div>
        ) : null}
      </div>

      {order.deliveryInstructions && (
        <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase">
            <span>📝</span> Customer Instruction:
          </div>
          <p className="text-xs font-semibold text-amber-950 pl-5">
            "{order.deliveryInstructions}"
          </p>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
        <div className="text-xs">
          <p className="text-gray-400 font-medium">Customer Contact</p>
          <p className="font-bold text-gray-800">
            {order.deliveryAddress?.mobile || "Customer"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChatOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <BsChatDots size={13} />
            <span>Chat</span>
          </button>
          {order.deliveryAddress?.mobile && (
            <a
              href={`tel:${order.deliveryAddress.mobile}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            >
              <span>📞</span> Call
            </a>
          )}
        </div>
      </div>

      <OrderChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        orderId={order._id}
        currentUserRole="rider"
        currentUserName={order.riderName || "Delivery Partner"}
        otherPartyName="Customer"
      />

      <div className="space-y-3 pt-1">
        {order.status === "rider_assigned" && (
          <button
            disabled={submitting}
            onClick={() => updateStatus()}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold text-sm shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Updating..." : "🏪 Mark as Reached Restaurant (Pick Up)"}
          </button>
        )}

        {order.status === "picked_up" && (
          <div className="space-y-3 bg-amber-50/70 border border-amber-200 rounded-xl p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <span>🔐</span> Customer Handover OTP Verification
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Ask the customer for the 4-digit code shown on their tracking screen before handing over the food.
              </p>
            </div>

            <input
              type="text"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full text-center tracking-[0.4em] font-mono font-black text-2xl py-2 px-3 border border-amber-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 text-amber-950 placeholder:text-gray-300"
            />

            <button
              disabled={submitting || otp.length !== 4}
              onClick={() => updateStatus(otp)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold text-sm shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                "Verifying OTP..."
              ) : (
                <>
                  <span>✓</span> Verify OTP & Complete Delivery
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderCurrentOrder;
