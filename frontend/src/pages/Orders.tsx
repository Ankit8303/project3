import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiPackage, BiChevronRight, BiTimeFive, BiRefresh } from "react-icons/bi";
import OrderInvoiceModal from "../components/OrderInvoiceModal";
import { getAuthToken } from "../auth/tokenStore";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "placed":
      return { label: "Order Placed", bg: "bg-blue-50 text-blue-700 border-blue-100" };
    case "accepted":
    case "preparing":
      return { label: "Preparing 🍳", bg: "bg-amber-50 text-amber-700 border-amber-100" };
    case "ready_for_rider":
      return { label: "Food Ready", bg: "bg-purple-50 text-purple-700 border-purple-100" };
    case "rider_assigned":
    case "picked_up":
      return { label: "On The Way 🛵", bg: "bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse" };
    case "delivered":
      return { label: "Delivered ✅", bg: "bg-slate-100 text-slate-700 border-slate-200" };
    case "cancelled":
      return { label: "Cancelled", bg: "bg-red-50 text-red-600 border-red-100" };
    default:
      return { label: status, bg: "bg-slate-50 text-slate-600 border-slate-200" };
  }
};

const Orders = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<IOrder | null>(null);

  const navigate = useNavigate();
  const { socket } = useSocket();
  const { fetchCart } = useAppData();

  const handleReorder = async (order: IOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setReorderingId(order._id);
      for (const item of order.items) {
        await axios.post(
          `${restaurantService}/api/cart/add`,
          {
            restaurantId: order.restaurantId,
            itemId: item.itemId,
          },
          {
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
            },
          }
        );
      }
      await fetchCart();
      toast.success("Items added to cart! 🛒");
      navigate("/cart");
    } catch (error) {
      toast.error("Failed to reorder items");
    } finally {
      setReorderingId(null);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/myorder`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      setOrders(data.orders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = () => {
      fetchOrders();
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white p-4 border border-slate-100 shadow-xs" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center space-y-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-[#E23744]">
          <BiPackage size={40} />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-800">No Orders Placed Yet</h2>
          <p className="text-sm text-slate-500 max-w-sm">
            When you place an order, you'll be able to track live delivery status right here.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="rounded-full bg-[#E23744] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#cf2b38] transition"
        >
          Explore Food
        </button>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter(
    (o) => !ACTIVE_STATUSES.includes(o.status)
  );

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Orders</h1>
        <p className="text-xs sm:text-sm text-slate-500">Track and view past order history</p>
      </div>

      {activeOrders.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider text-xs">
              Live & Active Orders ({activeOrders.length})
            </h2>
          </div>

          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderRow
                key={order._id}
                order={order}
                onClick={() => navigate(`/order/${order._id}`)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Past Orders ({completedOrders.length})
        </h2>

        {completedOrders.length === 0 ? (
          <p className="text-sm text-slate-400">No completed past orders</p>
        ) : (
          <div className="space-y-3">
            {completedOrders.map((order) => (
              <OrderRow
                key={order._id}
                order={order}
                onClick={() => navigate(`/order/${order._id}`)}
                onReorder={(e) => handleReorder(order, e)}
                onInvoice={(e) => {
                  e.stopPropagation();
                  setInvoiceOrder(order);
                }}
                isReordering={reorderingId === order._id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Tax Invoice Modal */}
      <OrderInvoiceModal
        order={invoiceOrder}
        isOpen={Boolean(invoiceOrder)}
        onClose={() => setInvoiceOrder(null)}
      />
    </div>
  );
};

export default Orders;

const OrderRow = ({
  order,
  onClick,
  onReorder,
  onInvoice,
  isReordering,
}: {
  order: IOrder;
  onClick: () => void;
  onReorder?: (e: React.MouseEvent) => void;
  onInvoice?: (e: React.MouseEvent) => void;
  isReordering?: boolean;
}) => {
  const statusInfo = getStatusBadge(order.status);
  const isActive = ACTIVE_STATUSES.includes(order.status);

  return (
    <div
      className="group cursor-pointer rounded-3xl bg-white p-5 border border-slate-100 shadow-xs food-card-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      onClick={onClick}
    >
      <div className="space-y-2 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="font-extrabold text-base text-slate-900 group-hover:text-[#E23744] transition-colors">
            {order.restaurantName || "Restaurant"}
          </h3>
          <span className="font-mono text-xs font-bold text-slate-400">
            #{order._id.slice(-6).toUpperCase()}
          </span>
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-bold border uppercase tracking-wider ${statusInfo.bg}`}
          >
            {statusInfo.label}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 font-medium line-clamp-1">
          {order.items.map((item, i) => (
            <span key={i}>
              {item.name} × {item.quauntity}
              {i < order.items.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>

        <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
          <BiTimeFive size={13} className="text-slate-400" />
          <span>{new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </p>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
        <div className="sm:text-right">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Paid Total</span>
          <span className="text-lg font-black text-slate-900">
            ₹{order.totalAmount}
          </span>
        </div>

        {isActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full brand-gradient text-white text-xs font-bold px-4 py-2 shadow-sm shadow-red-500/25 group-hover:scale-105 transition-transform">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span>Track Live</span>
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {onInvoice && (
              <button
                onClick={onInvoice}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                title="View & Print Tax Invoice"
              >
                <span>🧾</span>
                <span>Invoice</span>
              </button>
            )}
            {onReorder && (
              <button
                disabled={isReordering}
                onClick={onReorder}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100/70 text-[#e23744] px-3.5 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Re-add items to cart"
              >
                <BiRefresh size={16} className={isReordering ? "animate-spin" : ""} />
                <span>{isReordering ? "Adding..." : "Reorder"}</span>
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-[#E23744] group-hover:text-white transition-colors">
              <BiChevronRight size={20} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
