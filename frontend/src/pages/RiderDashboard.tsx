import { useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import type { IOrder } from "../types";
import audio from "../assets/faaah.mp3";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";
import DashboardHeader from "../components/DashboardHeader";
import { getAuthToken } from "../auth/tokenStore";

interface IRider {
  _id: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  picture: string;
  isVerified: boolean;
  isAvailble: boolean;
}

const RiderDashboard = () => {
  const { user } = useAppData();
  const { socket } = useSocket();

  const [profile, setProfile] = useState<IRider | null>(null);
  const [loading, setLoading] = useState(true);

  const [toggling, setToggling] = useState(false);

  const [incomingOrders, setIncomingOrders] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);
  const [availableOrders, setAvailableOrders] = useState<IOrder[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audio);
    audioRef.current.preload = "auto";
  }, []);

  const unlockAudio = async () => {
    try {
      if (!audioRef.current) return;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioUnlocked(true);
      toast.success("Sound Enabled");
    } catch (error) {
      toast.error("Tap again to enable sound");
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      setLoadingAvailable(true);
      const { data } = await axios.get(
        `${riderService}/api/rider/orders/available`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      setAvailableOrders(data.orders || []);
    } catch (error) {
      console.log("Error fetching available orders:", error);
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onOrderAvailable = ({ orderId }: { orderId: string }) => {
      setIncomingOrders((prev) =>
        prev.includes(orderId) ? prev : [...prev, orderId]
      );

      fetchAvailableOrders();

      if (audioUnlocked && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      setTimeout(() => {
        setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
      }, 10000);
    };

    socket.on("order:available", onOrderAvailable);

    return () => {
      socket.off("order:available", onOrderAvailable);
    };
  }, [socket, audioUnlocked]);

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(`${riderService}/api/rider/myprofile`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      setProfile(data || null);
    } catch (error) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "rider") fetchProfile();
    else setLoading(false);
  }, [user]);

  const fetchCurrentOrder = async () => {
    try {
      const { data } = await axios.get(
        `${riderService}/api/rider/order/current`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      setCurrentOrder(data.order);
    } catch (error) {
      console.log(error);
      setCurrentOrder(null);
    }
  };

  useEffect(() => {
    fetchCurrentOrder();
  }, []);

  // Poll available orders when online and has no active delivery
  useEffect(() => {
    if (profile?.isAvailble && !currentOrder) {
      fetchAvailableOrders();
      const interval = setInterval(fetchAvailableOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [profile?.isAvailble, currentOrder]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      setAcceptingId(orderId);
      await axios.post(
        `${riderService}/api/rider/accept/${orderId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      toast.success("Delivery order accepted! 🚴");
      setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
      await fetchCurrentOrder();
      await fetchProfile();
      await fetchAvailableOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept order");
      fetchAvailableOrders();
    } finally {
      setAcceptingId(null);
    }
  };

  const toggleAvailiblity = async () => {
    setToggling(true);

    const performToggle = async (lat: number, lon: number) => {
      try {
        await axios.patch(
          `${riderService}/api/rider/toggle`,
          {
            isAvailble: !profile?.isAvailble,
            latitude: lat,
            longitude: lon,
          },
          {
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
            },
          }
        );

        toast.success(
          profile?.isAvailble ? "You are offline" : "You are online"
        );
        fetchProfile();
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to update availability");
      } finally {
        setToggling(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => performToggle(pos.coords.latitude, pos.coords.longitude),
        () => performToggle(28.6139, 77.2090),
        { timeout: 5000 }
      );
    } else {
      performToggle(28.6139, 77.2090);
    }
  };

  const [phoneNumber, setPhoneNumber] = useState("");
  const [aadharNumber, setaadharNumber] = useState("");
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!phoneNumber || !aadharNumber || !drivingLicenseNumber || !image) {
      toast.error("All fields and image are required");
      return;
    }

    setSubmitting(true);

    const performSubmit = async (lat: number, lon: number) => {
      const formData = new FormData();
      formData.append("phoneNumber", phoneNumber);
      formData.append("aadharNumber", aadharNumber);
      formData.append("drivingLicenseNumber", drivingLicenseNumber);
      formData.append("latitude", lat.toString());
      formData.append("longitude", lon.toString());
      formData.append("file", image);

      try {
        const { data } = await axios.post(
          `${riderService}/api/rider/new`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
            },
          }
        );

        toast.success(data.message || "Rider profile registered! 🎉");
        fetchProfile();
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to register profile");
      } finally {
        setSubmitting(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => performSubmit(pos.coords.latitude, pos.coords.longitude),
        () => performSubmit(28.6139, 77.2090),
        { timeout: 5000 }
      );
    } else {
      performSubmit(28.6139, 77.2090);
    }
  };

  if (user?.role !== "rider") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <DashboardHeader title="Rider Partner Portal" roleBadge="Rider" badgeColor="bg-blue-100 text-blue-800 border-blue-200" />
        <div className="flex flex-1 items-center justify-center text-gray-500">
          You are not registered as a rider
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <DashboardHeader title="Rider Partner Portal" roleBadge="Rider" badgeColor="bg-blue-100 text-blue-800 border-blue-200" />
        <div className="flex flex-1 items-center justify-center text-gray-500">
          Loading rider details...
        </div>
      </div>
    );
  }

  if (!profile)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <DashboardHeader title="Rider Partner Portal" roleBadge="Rider" badgeColor="bg-blue-100 text-blue-800 border-blue-200" />
        <div className="px-4 py-6 max-w-lg mx-auto w-full">
          <div className="rounded-xl bg-white p-6 shadow-sm space-y-5">
            <h1 className="text-xl font-semibold">Add Your Profile</h1>
            <input
              type="number"
              placeholder="Aadhar number"
              value={aadharNumber}
              onChange={(e) => setaadharNumber(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
            />
            <input
              type="number"
              placeholder="Contact Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
            />

            <input
              type="text"
              placeholder="driving Licence"
              value={drivingLicenseNumber}
              onChange={(e) => setDrivingLicenseNumber(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
            />

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
              <BiUpload className="h-5 w-5 text-red-500" />
              {image ? image.name : "Upload your image"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </label>

            <button
              className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-[#e23744]"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting..." : "Add Profile"}
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader title="Rider Partner Portal" roleBadge="Rider" badgeColor="bg-blue-100 text-blue-800 border-blue-200" />
      <div className="space-y-4 max-w-7xl mx-auto w-full py-4">
      <div className="mx-auto max-w-md px-4 py-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="relative mx-auto w-24 h-24">
            <img
              src={profile.picture}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100 shadow-md"
              alt="Rider"
            />
            <span
              className={`absolute bottom-0 right-1 h-5 w-5 rounded-full ring-4 ring-white ${
                profile.isAvailble ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
          </div>

          <div className="text-center space-y-0.5">
            <h2 className="font-extrabold text-slate-900 text-lg">{user?.name}</h2>
            <p className="text-xs font-semibold text-slate-400 font-mono">
              +91 {profile.phoneNumber}
            </p>
          </div>

          <div className="flex justify-center gap-2">
            <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {profile.isVerified ? "✓ Verified Partner" : "Pending Verification"}
            </span>

            <span
              className={`px-3 py-1 text-xs font-extrabold rounded-full border ${
                profile.isAvailble
                  ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {profile.isAvailble ? "🟢 Online" : "⚪ Offline"}
            </span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs text-slate-500 leading-relaxed text-center">
            Hotspot coverage active. Keep yourself online to receive instant delivery requests from nearby restaurants.
          </div>

          {profile.isVerified && !currentOrder && (
            <button
              onClick={toggleAvailiblity}
              disabled={toggling}
              className={`w-full py-3 rounded-2xl text-white font-extrabold text-sm shadow-md transition-all cursor-pointer ${
                toggling
                  ? "bg-slate-400 opacity-60"
                  : profile.isAvailble
                  ? "bg-slate-800 hover:bg-slate-900 shadow-slate-900/10"
                  : "brand-gradient shadow-red-500/25 hover:scale-[1.01]"
              }`}
            >
              {toggling
                ? "Updating..."
                : profile.isAvailble
                ? "Go Offline"
                : "⚡ Go Online"}
            </button>
          )}

          {/* Rider Daily Earnings & Performance Stats */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Shift Stats</span>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active Shift
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 block">Earnings</span>
                <span className="text-base font-black text-slate-900">₹395</span>
                <span className="text-[9px] font-semibold text-emerald-600 block">+₹40 tips</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 block">Trips</span>
                <span className="text-base font-black text-slate-900">7</span>
                <span className="text-[9px] font-semibold text-slate-400 block">Completed</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 block">Rating</span>
                <span className="text-base font-black text-amber-500 flex items-center justify-center gap-0.5">
                  <span>★</span> 4.9
                </span>
                <span className="text-[9px] font-semibold text-slate-400 block">Top Rated</span>
              </div>
            </div>

            {/* Daily Incentive Target Progress */}
            <div className="bg-gradient-to-r from-red-500/5 via-amber-500/5 to-emerald-500/5 border border-amber-200/80 rounded-2xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span>🎯</span> Daily Target Bonus
                </span>
                <span className="font-black text-emerald-600">7 / 10 Orders</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full brand-gradient rounded-full" style={{ width: "70%" }} />
              </div>
              <p className="text-[10px] text-slate-500">
                Complete 3 more deliveries to unlock extra <strong className="text-slate-800">₹150 bonus</strong> today!
              </p>
            </div>
          </div>
        </div>
      </div>

      {!audioUnlocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-medium text-blue-900">
                Enable Sound Notification
              </p>
              <p className="text-sm text-blue-700">
                Get Notified when new orders arrive
              </p>
            </div>
          </div>

          <button
            onClick={unlockAudio}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Enable sound
          </button>
        </div>
      )}

      {profile.isAvailble && incomingOrders.length > 0 && (
        <div className="mx-auto max-w-2xl px-4 space-y-3">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
            <span className="animate-pulse">🔔</span> Immediate Delivery Alert
          </h3>
          {incomingOrders.map((id) => (
            <RiderOrderRequest
              key={id}
              orderId={id}
              onAccepted={() => {
                fetchProfile();
                fetchCurrentOrder();
                fetchAvailableOrders();
              }}
            />
          ))}
        </div>
      )}

      {/* Active Current Order */}
      {currentOrder ? (
        <div className="mx-auto max-w-lg px-4 space-y-4">
          <RiderCurrentOrder
            order={currentOrder}
            onStatusUpdate={() => {
              fetchCurrentOrder();
              fetchProfile();
              fetchAvailableOrders();
            }}
          />
          <RiderOrderMap order={currentOrder} />
        </div>
      ) : profile.isAvailble ? (
        <div className="mx-auto max-w-2xl px-4 space-y-4">
          <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl shadow-sm border border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>📦</span> Available Delivery Orders
                <span className="text-xs bg-red-100 text-[#e23744] font-semibold px-2 py-0.5 rounded-full">
                  {availableOrders.length}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Orders ready or preparing for pickup near you
              </p>
            </div>
            <button
              onClick={fetchAvailableOrders}
              disabled={loadingAvailable}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <span className={loadingAvailable ? "animate-spin" : ""}>🔄</span>
              {loadingAvailable ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100 space-y-3">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                🚴
              </div>
              <h3 className="font-semibold text-gray-800 text-base">
                Looking for new delivery requests...
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                You are online! New customer orders will appear here automatically as soon as restaurants accept or prepare them.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableOrders.map((order) => {
                const isAccepting = acceptingId === order._id;
                const statusBadge =
                  order.status === "ready_for_rider"
                    ? { label: "Ready for Pickup", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
                    : order.status === "preparing"
                    ? { label: "Food Preparing", color: "bg-blue-100 text-blue-700 border-blue-200" }
                    : { label: "New Order", color: "bg-amber-100 text-amber-700 border-amber-200" };

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-emerald-300 transition space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-base">
                            {order.restaurantName || "Restaurant"}
                          </h4>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge.color}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Order #{order._id.slice(-6)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Your Earning</span>
                        <span className="text-lg font-extrabold text-emerald-600">
                          ₹{order.riderAmount || 49}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm text-gray-700">
                      <div className="flex items-start gap-2">
                        <span className="text-base text-red-500 shrink-0">📍</span>
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 font-medium">Deliver To</p>
                          <p className="text-xs text-gray-800 font-semibold line-clamp-2">
                            {order.deliveryAddress?.fromattedAddress || "Delivery Address"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-xs text-gray-500">
                        <span>Items: {order.items?.length || 1} {order.items?.length ? `(${order.items.map(i => i.name).join(", ")})` : ""}</span>
                        <span className="font-medium text-gray-700">Order Value: ₹{order.totalAmount}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptOrder(order._id)}
                      disabled={isAccepting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
                    >
                      {isAccepting ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>Accepting Delivery...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Accept Delivery Order</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-lg px-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center space-y-2">
            <span className="text-3xl">🛵</span>
            <h3 className="font-semibold text-amber-900 text-base">You are currently Offline</h3>
            <p className="text-xs text-amber-700">
              Click the <span className="font-bold">"Go Online"</span> button above to start receiving delivery requests from customers.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default RiderDashboard;
