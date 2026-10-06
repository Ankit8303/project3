import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import { useEffect, useRef } from "react";
import { BiNavigation, BiRadioCircleMarked } from "react-icons/bi";
import { BsCheckCircleFill, BsLightningChargeFill } from "react-icons/bs";
import { calculateDistanceKm, calculateEtaMinutes } from "../utils/routeSimulation";

declare module "leaflet" {
  namespace Routing {
    function control(options: any): any;
    function osrmv1(options?: any): any;
  }
}

// 🛵 High-end Rider Icon with animated radar beacon
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

// 📍 High-end Delivery Destination Icon with animated emerald halo
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

const MapBoundsUpdater = ({
  riderLocation,
  deliveryLocation,
}: {
  riderLocation: [number, number];
  deliveryLocation: [number, number];
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !riderLocation || !deliveryLocation) return;
    try {
      const bounds = L.latLngBounds([riderLocation, deliveryLocation]);
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
    } catch (e) {
      // ignore
    }
  }, [riderLocation[0], riderLocation[1], deliveryLocation[0], deliveryLocation[1], map]);

  return null;
};

// Recenter Map Helper Button Component
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
    map.fitBounds(bounds, { padding: [55, 55], animate: true });
  };

  return (
    <div className="absolute right-3.5 bottom-4 z-[999] flex flex-col gap-2">
      <button
        onClick={handleCenterRider}
        title="Focus on delivery partner"
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-slate-800 shadow-lg shadow-black/10 border border-slate-200/80 hover:bg-slate-900 hover:text-white transition active:scale-95 cursor-pointer"
      >
        <BiRadioCircleMarked size={22} className="text-[#E23744]" />
      </button>
      <button
        onClick={handleFitRoute}
        title="Show complete delivery route"
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-slate-800 shadow-lg shadow-black/10 border border-slate-200/80 hover:bg-slate-900 hover:text-white transition active:scale-95 cursor-pointer"
      >
        <BiNavigation size={18} />
      </button>
    </div>
  );
};

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
            // Soft glowing backdrop
            { color: "#E23744", weight: 9, opacity: 0.25 },
            // Crisp solid crimson road line
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
      console.log("Routing error:", e);
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

interface props {
  riderLocation: [number, number];
  deliveryLocation: [number, number];
}

const UserOrderMap = ({ riderLocation, deliveryLocation }: props) => {
  const distanceKm = calculateDistanceKm(
    riderLocation[0],
    riderLocation[1],
    deliveryLocation[0],
    deliveryLocation[1]
  );
  const etaMinutes = calculateEtaMinutes(distanceKm);
  const hasArrived = distanceKm <= 0.05; // <= 50m

  return (
    <div className="relative rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-200/70 p-3 overflow-hidden">
      {/* Floating Status Pill Header */}
      <div className="absolute top-6 left-6 z-[999] pointer-events-none">
        <div className="flex items-center gap-2.5 rounded-2xl bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-xl shadow-black/10 border border-white/80 pointer-events-auto">
          <div className="relative flex h-3 w-3">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                hasArrived ? "bg-emerald-400" : "bg-emerald-400"
              } opacity-75`}
            />
            <span
              className={`relative inline-flex h-3 w-3 rounded-full ${
                hasArrived ? "bg-emerald-500" : "bg-emerald-500"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                {hasArrived ? "Rider Has Arrived" : "Live GPS Tracking"}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                  hasArrived
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {hasArrived ? "AT DOORSTEP" : "ACTIVE"}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              {hasArrived
                ? "🎉 Delivery partner is waiting at your location"
                : `🛵 On the way • ~${etaMinutes} mins away (${
                    distanceKm < 1
                      ? `${Math.round(distanceKm * 1000)} m`
                      : `${distanceKm.toFixed(1)} km`
                  })`}
            </p>
          </div>
        </div>
      </div>

      {/* Top Right Floating Live ETA Badge */}
      <div className="absolute top-6 right-6 z-[999] pointer-events-none">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-900/90 text-white backdrop-blur-md px-4 py-2.5 shadow-xl shadow-black/20 border border-slate-700/60 pointer-events-auto">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ETA
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-amber-400 flex items-center justify-end gap-1">
              {hasArrived ? (
                <span className="text-emerald-400">Arrived 🎉</span>
              ) : (
                <>
                  <BsLightningChargeFill className="text-amber-400" />
                  {etaMinutes} mins
                </>
              )}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-slate-700" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Distance
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white">
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)} m`
                : `${distanceKm.toFixed(1)} km`}
            </span>
          </div>
        </div>
      </div>

      {/* Arrival Bottom Banner Notification */}
      {hasArrived && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[999] animate-bounce pointer-events-none">
          <div className="flex items-center gap-2 rounded-full bg-emerald-600 text-white px-5 py-2.5 shadow-2xl font-bold text-xs uppercase tracking-wider border-2 border-white pointer-events-auto">
            <span>🎉</span>
            <span>Delivery Partner Has Arrived!</span>
          </div>
        </div>
      )}

      <MapContainer
        center={riderLocation}
        zoom={14}
        className="h-96 sm:h-[420px] w-full rounded-2xl overflow-hidden z-0"
      >
        {/* Free, OpenStreetMap Layer without API key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Outer Glow Line */}
        <Polyline
          positions={[riderLocation, deliveryLocation]}
          pathOptions={{ color: "#E23744", weight: 8, opacity: 0.2 }}
        />

        {/* Foreground Dashed Route Line */}
        <Polyline
          positions={[riderLocation, deliveryLocation]}
          pathOptions={{ color: "#E23744", weight: 4, dashArray: "8, 10", opacity: 0.95 }}
        />

        {/* Rider Pin */}
        <Marker position={riderLocation} icon={riderIcon}>
          <Popup>
            <div className="p-1 space-y-1 text-center min-w-[140px]">
              <span className="inline-block text-base">🛵</span>
              <p className="text-xs font-black text-slate-900">Delivery Partner</p>
              <p className="text-[10px] font-medium text-slate-500 flex items-center justify-center gap-1">
                {hasArrived ? (
                  <span className="text-emerald-600 font-bold">Arrived at your location</span>
                ) : (
                  <>
                    <BsLightningChargeFill className="text-amber-500" /> ~{etaMinutes} min away
                  </>
                )}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Destination Pin */}
        <Marker position={deliveryLocation} icon={deliveryIcon}>
          <Popup>
            <div className="p-1 space-y-1 text-center min-w-[140px]">
              <span className="inline-block text-base">📍</span>
              <p className="text-xs font-black text-slate-900">Your Delivery Address</p>
              <p className="text-[10px] font-medium text-emerald-600 flex items-center justify-center gap-1">
                <BsCheckCircleFill /> Destination point
              </p>
            </div>
          </Popup>
        </Marker>

        <Routing from={riderLocation} to={deliveryLocation} />
        <MapBoundsUpdater
          riderLocation={riderLocation}
          deliveryLocation={deliveryLocation}
        />
        <MapControls
          riderLocation={riderLocation}
          deliveryLocation={deliveryLocation}
        />
      </MapContainer>
    </div>
  );
};

export default UserOrderMap;
