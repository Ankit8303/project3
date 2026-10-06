import type { IOrder } from "../types";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import { useSocket } from "../context/SocketContext";
import { BiNavigation, BiRadioCircleMarked, BiPlay, BiPause, BiReset } from "react-icons/bi";
import { BsCheckCircleFill, BsLightningChargeFill } from "react-icons/bs";
import toast from "react-hot-toast";
import {
  calculateDistanceKm,
  calculateEtaMinutes,
  generateRouteWaypoints,
} from "../utils/routeSimulation";

declare module "leaflet" {
  namespace Routing {
    function control(options: any): any;
    function osrmv1(options?: any): any;
  }
}

// 🛵 Rider pin with radar beacon
const riderIcon = new L.DivIcon({
  html: `
    <div style="position:relative; width:46px; height:46px; display:flex; align-items:center; justify-content:center;">
      <div class="rider-radar-halo"></div>
      <div style="position:relative; width:40px; height:40px; background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border:2.5px solid #FFFFFF; border-radius:15px; box-shadow:0 10px 20px -3px rgba(15,23,42,0.4); display:flex; align-items:center; justify-content:center; font-size:22px;">
        🛵
      </div>
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  popupAnchor: [0, -26],
  className: "custom-leaflet-marker",
});

// 📍 Delivery pin with emerald halo
const deliveryIcon = new L.DivIcon({
  html: `
    <div style="position:relative; width:46px; height:46px; display:flex; align-items:center; justify-content:center;">
      <div class="destination-pulse-halo"></div>
      <div style="position:relative; width:40px; height:40px; background:linear-gradient(135deg, #E23744 0%, #FF4D5B 100%); border:2.5px solid #FFFFFF; border-radius:15px; box-shadow:0 10px 20px -3px rgba(226,55,68,0.45); display:flex; align-items:center; justify-content:center; font-size:22px;">
        📍
      </div>
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  popupAnchor: [0, -26],
  className: "custom-leaflet-marker",
});

interface Props {
  order: IOrder;
}

const Routing = ({
  from,
  to,
}: {
  from: [number, number];
  to: [number, number];
}) => {
  const map = useMap();
  const controlRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !from || !to) return;
    try {
      const control = L.Routing.control({
        waypoints: [L.latLng(from), L.latLng(to)],
        lineOptions: {
          styles: [
            { color: "#E23744", weight: 9, opacity: 0.25 },
            { color: "#E23744", weight: 4.5, opacity: 0.95 },
          ],
        },
        addWaypoints: false,
        draggableWaypoints: false,
        show: false,
        createMarker: () => null,
        router: L.Routing.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
        }),
      }).addTo(map);

      controlRef.current = control;
    } catch (e) {
      console.log("Routing machine error:", e);
    }

    return () => {
      if (controlRef.current && map) {
        try {
          map.removeControl(controlRef.current);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [from[0], from[1], to[0], to[1], map]);

  return null;
};

const MapBoundsUpdater = ({
  from,
  to,
}: {
  from: [number, number];
  to: [number, number];
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !from || !to) return;
    try {
      const bounds = L.latLngBounds([from, to]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } catch (e) {
      // ignore
    }
  }, [from[0], from[1], to[0], to[1], map]);

  return null;
};

const MapControls = ({
  riderLocation,
  deliveryLocation,
}: {
  riderLocation: [number, number];
  deliveryLocation: [number, number];
}) => {
  const map = useMap();

  const handleCenterRider = () => {
    map.flyTo(riderLocation, 16, { animate: true, duration: 1.2 });
  };

  const handleFitRoute = () => {
    const bounds = L.latLngBounds([riderLocation, deliveryLocation]);
    map.fitBounds(bounds, { padding: [50, 50], animate: true });
  };

  return (
    <div className="absolute right-3.5 bottom-4 z-[999] flex flex-col gap-2">
      <button
        onClick={handleCenterRider}
        title="Focus on your position"
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-slate-800 shadow-lg shadow-black/10 border border-slate-200/80 hover:bg-slate-900 hover:text-white transition active:scale-95 cursor-pointer"
      >
        <BiRadioCircleMarked size={22} className="text-[#E23744]" />
      </button>
      <button
        onClick={handleFitRoute}
        title="Show complete navigation route"
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-slate-800 shadow-lg shadow-black/10 border border-slate-200/80 hover:bg-slate-900 hover:text-white transition active:scale-95 cursor-pointer"
      >
        <BiNavigation size={18} />
      </button>
    </div>
  );
};

const RiderOrderMap = ({ order }: Props) => {
  const { socket } = useSocket();
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);

  const deliveryLat = order.deliveryAddress?.latitude ?? 25.1996;
  const deliveryLng = order.deliveryAddress?.longitude ?? 75.8838;
  const deliveryLocation: [number, number] = [deliveryLat, deliveryLng];

  const emitLocation = (lat: number, lng: number) => {
    setRiderLocation([lat, lng]);

    // 1. Emit via connected socket for instant real-time delivery
    if (socket && socket.connected) {
      socket.emit("rider:location:update", {
        orderId: order._id,
        userId: order.userId,
        latitude: lat,
        longitude: lng,
      });
    }

  };

  // 🎮 Live Driver Route Simulation Engine
  const startLat = order.restaurantLocation?.latitude ?? deliveryLat - 0.015;
  const startLng = order.restaurantLocation?.longitude ?? deliveryLng - 0.015;
  const startPoint = useRef<[number, number]>([startLat, startLng]);

  const waypoints = useRef<[number, number][]>(
    generateRouteWaypoints(startPoint.current, deliveryLocation, 40)
  ).current;

  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 5>(2);
  const [hasArrived, setHasArrived] = useState(false);

  // Remaining metrics
  const activeRiderLoc =
    riderLocation ||
    (isSimulating ? waypoints[simIndex] : [deliveryLat - 0.006, deliveryLng - 0.006]);

  const distanceKm = calculateDistanceKm(
    activeRiderLoc[0],
    activeRiderLoc[1],
    deliveryLat,
    deliveryLng
  );
  const etaMins = calculateEtaMinutes(distanceKm);
  const progressPercent = Math.min(
    100,
    Math.round((simIndex / (waypoints.length - 1)) * 100)
  );

  const startSimulation = () => {
    if (hasArrived) {
      setSimIndex(0);
      setHasArrived(false);
    }
    setIsSimulating(true);
    toast.success("🚗 Route Simulation Started! Scooter moving along roads...");
  };

  const pauseSimulation = () => {
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setSimIndex(0);
    setHasArrived(false);
    const startPt = waypoints[0];
    emitLocation(startPt[0], startPt[1]);
    toast("↺ Reset route back to starting point");
  };

  useEffect(() => {
    if (!isSimulating) return;

    const intervalTime = Math.max(250, Math.floor(1400 / speedMultiplier));
    const timer = setInterval(() => {
      setSimIndex((prev) => {
        const next = prev + 1;
        if (next >= waypoints.length) {
          setIsSimulating(false);
          setHasArrived(true);
          emitLocation(deliveryLocation[0], deliveryLocation[1]);
          toast.success(
            "📍 Arrived at customer doorstep! Collect the 4-digit Delivery OTP.",
            { duration: 6000 }
          );
          return waypoints.length - 1;
        }

        const pt = waypoints[next];
        emitLocation(pt[0], pt[1]);
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isSimulating, speedMultiplier, waypoints, deliveryLocation]);

  useEffect(() => {
    let active = true;

    const fetchLocation = () => {
      if (!active || isSimulating) return;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!active || isSimulating) return;
            emitLocation(pos.coords.latitude, pos.coords.longitude);
          },
          () => {
            if (!active || isSimulating) return;
            const fallbackLat = deliveryLat - 0.006;
            const fallbackLng = deliveryLng - 0.006;
            emitLocation(fallbackLat, fallbackLng);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 6000,
          }
        );
      } else {
        const fallbackLat = deliveryLat - 0.006;
        const fallbackLng = deliveryLng - 0.006;
        emitLocation(fallbackLat, fallbackLng);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 6000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [order._id, order.userId, deliveryLat, deliveryLng, socket, isSimulating]);

  return (
    <div className="relative rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-200/70 p-4 space-y-3 overflow-hidden">
      {/* Top Header & Live Broadcast Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSimulating ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-ping"
              }`}
            />
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                isSimulating ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </span>
          <span className="font-extrabold text-slate-800">
            {isSimulating ? "GPS Route Simulation Active" : "Realtime GPS Broadcasting"}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isSimulating
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {isSimulating ? `SIMULATING (${speedMultiplier}X)` : "LIVE TRANSMIT"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span>
            {activeRiderLoc[0].toFixed(4)}, {activeRiderLoc[1].toFixed(4)}
          </span>
        </div>
      </div>

      {/* 🎮 Interactive Driving Simulator Control Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-3.5 text-white shadow-md shadow-slate-900/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎮</span>
            <div>
              <h4 className="text-xs font-black tracking-tight text-white">
                Live Drive Simulator (Demo Controller)
              </h4>
              <p className="text-[10px] text-slate-400">
                Moves scooter along real roads via WebSockets to customer map
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                Distance
              </span>
              <span className="font-black text-amber-400">{distanceKm} km</span>
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                ETA
              </span>
              <span className="font-black text-emerald-400">
                {hasArrived ? "Arrived 📍" : `~${etaMins} mins`}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-slate-400">
            <span>Progress: {progressPercent}%</span>
            <span>
              {hasArrived
                ? "🎉 Destination Reached"
                : `Waypoint ${simIndex + 1} of ${waypoints.length}`}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/80">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                hasArrived
                  ? "bg-emerald-400"
                  : "brand-gradient"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons & Speed Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-700/60">
          <div className="flex items-center gap-2">
            {!isSimulating ? (
              <button
                onClick={startSimulation}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl brand-gradient text-white text-xs font-bold shadow-md shadow-red-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <BiPlay size={16} />
                <span>{simIndex === 0 ? "Start Route Simulation" : "Resume Drive"}</span>
              </button>
            ) : (
              <button
                onClick={pauseSimulation}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition cursor-pointer"
              >
                <BiPause size={16} />
                <span>Pause Drive</span>
              </button>
            )}

            <button
              onClick={resetSimulation}
              title="Reset to origin"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <BiReset size={14} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>

          {/* Speed Multiplier Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 hidden sm:inline">
              Speed:
            </span>
            {([1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  speedMultiplier === spd
                    ? "bg-white text-slate-900 shadow-xs scale-105"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {spd}x {spd === 5 ? "⚡" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaflet Map Display */}
      <MapContainer
        center={activeRiderLoc}
        zoom={14}
        className="h-80 sm:h-96 w-full rounded-2xl overflow-hidden z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Polyline
          positions={[activeRiderLoc, deliveryLocation]}
          pathOptions={{ color: "#E23744", weight: 7, opacity: 0.2 }}
        />
        <Polyline
          positions={[activeRiderLoc, deliveryLocation]}
          pathOptions={{ color: "#E23744", weight: 3.5, dashArray: "8, 10", opacity: 0.95 }}
        />
        <Marker position={activeRiderLoc} icon={riderIcon}>
          <Popup>
            <div className="p-1 text-center min-w-[130px] space-y-0.5">
              <span className="text-base">🛵</span>
              <p className="text-xs font-black text-slate-900">Your Current Position</p>
              <p className="text-[10px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
                <BsLightningChargeFill className="text-amber-500" /> Broadcasting live
              </p>
            </div>
          </Popup>
        </Marker>
        <Marker position={deliveryLocation} icon={deliveryIcon}>
          <Popup>
            <div className="p-1 text-center min-w-[130px] space-y-0.5">
              <span className="text-base">📍</span>
              <p className="text-xs font-black text-slate-900">Customer Drop-off</p>
              <p className="text-[10px] font-medium text-slate-500 flex items-center justify-center gap-1">
                <BsCheckCircleFill className="text-emerald-500" /> Destination point
              </p>
            </div>
          </Popup>
        </Marker>
        <Routing from={activeRiderLoc} to={deliveryLocation} />
        <MapBoundsUpdater from={activeRiderLoc} to={deliveryLocation} />
        <MapControls riderLocation={activeRiderLoc} deliveryLocation={deliveryLocation} />
      </MapContainer>
    </div>
  );
};

export default RiderOrderMap;
