import { useState } from "react";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import axios from "axios";
import { restaurantService } from "../main";
import { BiMapPin, BiUpload, BiCheckCircle } from "react-icons/bi";
import { getAuthToken } from "../auth/tokenStore";

interface props {
  fetchMyRestaurant: () => Promise<void>;
}

const AddRestaurant = ({ fetchMyRestaurant }: props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { loadingLocation, location } = useAppData();
  const [customAddress, setCustomAddress] = useState("");
  const [useDefaultLoc, setUseDefaultLoc] = useState(false);

  const activeLocation = location || (useDefaultLoc ? {
    latitude: 28.6139,
    longitude: 77.2090,
    formattedAddress: customAddress.trim() || "Connaught Place, New Delhi, Delhi, India",
  } : null);

  const handleImageChange = (file: File | null) => {
    setImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a restaurant name");
      return;
    }

    if (!phone.trim()) {
      toast.error("Please enter a contact phone number");
      return;
    }

    if (!image) {
      toast.error("Please upload a restaurant image");
      return;
    }

    const locToUse = activeLocation || {
      latitude: 28.6139,
      longitude: 77.2090,
      formattedAddress: customAddress.trim() || "Connaught Place, New Delhi, Delhi, India",
    };

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("latitude", String(locToUse.latitude));
    formData.append("longitude", String(locToUse.longitude));
    formData.append("formattedAddress", customAddress.trim() || locToUse.formattedAddress);
    formData.append("file", image);
    formData.append("phone", phone.trim());

    try {
      setSubmitting(true);
      await axios.post(`${restaurantService}/api/restaurant/new`, formData, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      toast.success("Restaurant added successfully! 🎉");
      fetchMyRestaurant();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to add restaurant";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-sm space-y-5 border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Add Your Restaurant</h1>
          <p className="text-sm text-slate-500 mt-1">Register your kitchen and start receiving orders</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Restaurant Name *</label>
            <input
              type="text"
              placeholder="e.g. Spice Route Kitchen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#e23744] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Contact Number *</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#e23744] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Description</label>
            <textarea
              placeholder="Describe your cuisine, specialties, and dining vibe..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#e23744] transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Restaurant Cover Image *</label>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-4 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition">
              {imagePreview ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-xs font-semibold">
                    Click to change image
                  </div>
                </div>
              ) : (
                <>
                  <BiUpload className="h-7 w-7 text-[#e23744]" />
                  <span className="font-medium text-slate-700">Click to upload restaurant image</span>
                  <span className="text-xs text-slate-400">PNG, JPG or WebP (max 10MB)</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Restaurant Location</label>
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-2 bg-slate-50/50">
              <div className="flex items-start gap-2.5 text-sm">
                <BiMapPin className="mt-0.5 h-5 w-5 text-[#e23744] shrink-0" />
                <div className="flex-1 text-slate-700 text-xs sm:text-sm">
                  {loadingLocation ? (
                    <span className="text-slate-500 animate-pulse">Detecting your location...</span>
                  ) : activeLocation ? (
                    <div>
                      <span className="font-semibold text-slate-800">Detected: </span>
                      {activeLocation.formattedAddress}
                    </div>
                  ) : (
                    <div className="text-amber-700">
                      Location not detected automatically.
                    </div>
                  )}
                </div>
              </div>

              {!location && !useDefaultLoc && (
                <button
                  type="button"
                  onClick={() => setUseDefaultLoc(true)}
                  className="text-xs text-[#e23744] font-semibold hover:underline flex items-center gap-1 mt-1"
                >
                  <BiCheckCircle /> Use Default Location (Connaught Place, New Delhi)
                </button>
              )}

              <input
                type="text"
                placeholder="Or customize address (e.g. 12 Baker Street, London)"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#e23744]"
              />
            </div>
          </div>
        </div>

        <button
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white bg-[#e23744] hover:bg-[#d02e3b] transition disabled:opacity-60 shadow-md shadow-red-500/20"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Creating Restaurant..." : "Add Restaurant"}
        </button>
      </div>
    </div>
  );
};

export default AddRestaurant;
