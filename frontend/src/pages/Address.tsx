import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { restaurantService } from "../main";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";
import { BiLoader, BiPlus, BiTrash, BiMapPin, BiPhone } from "react-icons/bi";
import { getAuthToken } from "../auth/tokenStore";

// 🔧 Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

// 📍 Click-to-select location
const LocationPicker = ({
  setLocation,
}: {
  setLocation: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// 🎯 Locate me button
const LocateMeButton = ({
  onLocate,
}: {
  onLocate: (lat: number, lng: number) => void;
}) => {
  const map = useMap();
  const locateUser = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16, { animate: true });
        onLocate(latitude, longitude);
      },
      () => toast.error("Location permission denied")
    );
  };
  return (
    <button
      onClick={locateUser}
      className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-slate-700 shadow-md hover:bg-white hover:text-[#E23744] transition active:scale-95"
    >
      <LuLocateFixed size={16} className="text-[#E23744]" />
      <span>Use Current Location</span>
    </button>
  );
};

const AddAddressPage = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 📋 Form state
  const [mobile, setMobile] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // 🌍 Reverse geocoding
  const fetchFormattedAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      setFormattedAddress(data.display_name || "");
    } catch {
      toast.error("Failed to fetch address details");
    }
  };

  const setLocation = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    fetchFormattedAddress(lat, lng);
  };

  // 📡 Fetch addresses
  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/address/all`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      setAddresses(data || []);
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // ➕ Add address
  const addAddress = async () => {
    if (
      !mobile ||
      !formattedAddress ||
      latitude === null ||
      longitude === null
    ) {
      toast.error("Please click on the map to choose your drop-off location");
      return;
    }
    try {
      setAdding(true);
      await axios.post(
        `${restaurantService}/api/address/new`,
        {
          formattedAddress,
          mobile,
          latitude,
          longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      toast.success("Address saved successfully");
      setMobile("");
      setFormattedAddress("");
      setLatitude(null);
      setLongitude(null);
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save address");
    } finally {
      setAdding(false);
    }
  };

  // 🗑 Delete address
  const deleteAddress = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      setDeletingId(id);
      await axios.delete(`${restaurantService}/api/address/${id}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      toast.success("Address removed");
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Saved Delivery Addresses</h1>
        <p className="text-xs sm:text-sm text-slate-500">Pick on the map to pin accurate delivery addresses</p>
      </div>

      {/* Map Card */}
      <div className="rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-sm p-4 space-y-4">
        <div className="relative h-72 sm:h-96 w-full overflow-hidden rounded-2xl border border-slate-100">
          <MapContainer
            center={[latitude || 28.6139, longitude || 77.209]}
            zoom={13}
            className="h-full w-full"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
            <LocationPicker setLocation={setLocation} />
            <LocateMeButton onLocate={setLocation} />
            {latitude && longitude && (
              <Marker
                position={[latitude, longitude]}
                icon={
                  new L.DivIcon({
                    html: `
                      <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
                        <div class="destination-pulse-halo"></div>
                        <div style="position:relative; width:38px; height:38px; background:linear-gradient(135deg, #E23744 0%, #FF4D5B 100%); border:2.5px solid #FFFFFF; border-radius:14px; box-shadow:0 10px 20px -3px rgba(226,55,68,0.45); display:flex; align-items:center; justify-content:center; font-size:20px;">
                          📍
                        </div>
                      </div>
                    `,
                    iconSize: [44, 44],
                    iconAnchor: [22, 22],
                    className: "custom-leaflet-marker",
                  })
                }
              />
            )}
          </MapContainer>
        </div>

        {/* Selected Address Display */}
        {formattedAddress && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 p-4 text-xs sm:text-sm text-emerald-900">
            <BiMapPin size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{formattedAddress}</span>
          </div>
        )}

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="relative flex items-center">
            <BiPhone className="absolute left-3.5 text-slate-400" size={18} />
            <input
              type="tel"
              placeholder="Contact Mobile Number (e.g. 9876543210)"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-3 text-sm focus:border-[#E23744] focus:bg-white focus:ring-2 focus:ring-red-100 outline-none"
            />
          </div>

          <button
            disabled={adding}
            onClick={addAddress}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#E23744] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#cf2b38] transition active:scale-[0.99] disabled:opacity-50"
          >
            {adding ? <BiLoader className="animate-spin" size={18} /> : <BiPlus size={18} />}
            <span>Save This Address</span>
          </button>
        </div>
      </div>

      {/* Saved Addresses List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-800">Your Saved Addresses ({addresses.length})</h2>

        {loading ? (
          <p className="text-sm text-slate-400">Loading saved addresses...</p>
        ) : addresses.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center border border-slate-100 space-y-1">
            <p className="text-sm font-bold text-slate-700">No addresses saved yet</p>
            <p className="text-xs text-slate-400">Use the map above to add your first delivery location.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4.5 shadow-xs hover:border-slate-200 transition"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase">
                    <BiMapPin size={14} className="text-[#E23744]" />
                    <span>Drop Location</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                    {addr.formattedAddress}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 pt-1">
                    <BiPhone size={13} />
                    <span>{addr.mobile}</span>
                  </p>
                </div>

                <button
                  onClick={() => deleteAddress(addr._id)}
                  disabled={deletingId === addr._id}
                  className="rounded-xl p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50 shrink-0"
                  title="Delete Address"
                >
                  {deletingId === addr._id ? (
                    <BiLoader size={18} className="animate-spin text-red-500" />
                  ) : (
                    <BiTrash size={18} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddAddressPage;
