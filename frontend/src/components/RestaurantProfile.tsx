import { useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiEdit, BiMapPin, BiSave, BiLogOut } from "react-icons/bi";
import { BsHeart, BsHeartFill } from "react-icons/bs";
import { useAppData } from "../context/AppContext";
import { useFavorites } from "../context/FavoritesContext";
import { getAuthToken, setAuthToken } from "../auth/tokenStore";

interface props {
  restaurant: IRestaurant;
  isSeller: boolean;
  onUpdate: (restaurant: IRestaurant) => void;
}

const RestaurantProfile = ({ restaurant, isSeller, onUpdate }: props) => {
  const { isRestaurantFav, toggleRestaurantFav } = useFavorites();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description);
  const [isOpen, setIsOpen] = useState(restaurant.isOpen);
  const [loading, setLoading] = useState(false);

  const toggleOpenStatus = async () => {
    try {
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/status`,
        { status: !isOpen },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      toast.success(data.message);
      setIsOpen(data.restaurant.isOpen);
    } catch (error: any) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to toggle status");
    }
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/edit`,
        { name, description },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      toast.success(data.message);
      onUpdate(data.restaurant);
      setEditMode(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const { setIsAuth, setUser } = useAppData();

  const logoutHandler = async () => {
    await axios.put(
      `${restaurantService}/api/restaurant/status`,
      { status: false },
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      }
    );
    setAuthToken("");
    setIsAuth(false);
    setUser(null);
    toast.success("Logged out successfully");
  };

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-sm">
      {/* Cover Image Banner */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-slate-100">
        <img
          src={restaurant.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&q=80"}
          alt={restaurant.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Floating Badges */}
        <div className="absolute bottom-4 left-4 sm:left-6 right-4 flex items-end justify-between">
          <div className="text-white space-y-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isOpen ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              {isOpen ? "Open Now" : "Currently Closed"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow-sm font-heading">
              {restaurant.name}
            </h1>
          </div>

          {!isSeller && (
            <button
              type="button"
              onClick={() =>
                toggleRestaurantFav({
                  _id: restaurant._id,
                  name: restaurant.name,
                  image: restaurant.image,
                  isOpen: restaurant.isOpen,
                  description: restaurant.description,
                })
              }
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-md transition-all hover:scale-105 cursor-pointer ${
                isRestaurantFav(restaurant._id)
                  ? "bg-white text-[#E23744]"
                  : "bg-black/40 backdrop-blur-md text-white hover:bg-white hover:text-[#E23744]"
              }`}
            >
              {isRestaurantFav(restaurant._id) ? (
                <BsHeartFill size={15} />
              ) : (
                <BsHeart size={15} />
              )}
              <span>{isRestaurantFav(restaurant._id) ? "Favorited" : "Save"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Info Details */}
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            {editMode ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Restaurant Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base font-semibold focus:border-[#E23744] outline-none"
                />
              </div>
            ) : null}

            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <BiMapPin className="h-4 w-4 text-[#E23744] shrink-0" />
              <span>{restaurant.autoLocation?.formattedAddress || "Location unavailable"}</span>
            </div>
          </div>

          {isSeller && (
            <button
              onClick={() => setEditMode(!editMode)}
              className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <BiEdit size={16} />
              <span>{editMode ? "Cancel Editing" : "Edit Details"}</span>
            </button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">About / Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#E23744] outline-none"
              rows={3}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            {restaurant.description || "Authentic recipes crafted with fresh ingredients, served right to your doorstep."}
          </p>
        )}

        {/* Action Controls for Seller */}
        {isSeller && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {editMode && (
                <button
                  onClick={saveChanges}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-xs"
                >
                  <BiSave size={16} />
                  Save Changes
                </button>
              )}

              <button
                onClick={toggleOpenStatus}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-xs transition ${
                  isOpen
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isOpen ? "Pause Taking Orders" : "Resume Taking Orders"}
              </button>
            </div>

            <button
              onClick={logoutHandler}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 text-red-600 border border-red-100 px-4 py-2 text-sm font-semibold hover:bg-red-100 transition"
            >
              <BiLogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantProfile;
