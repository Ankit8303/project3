import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import { BiLoader, BiSearch, BiShoppingBag } from "react-icons/bi";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { useAppData } from "../context/AppContext";
import { getAuthToken } from "../auth/tokenStore";

const RestaurantPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cart, quauntity, subTotal } = useAppData();

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);

  const fetchRestaurant = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/${id}`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      setRestaurant(data || null);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/item/all/${id}`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      setMenuItems(data || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRestaurant();
      fetchMenuItems();
    }
  }, [id]);

  useEffect(() => {
    if (restaurant) {
      try {
        const saved = JSON.parse(localStorage.getItem("tomato_recent_restaurants") || "[]");
        const filtered = saved.filter((r: any) => r._id !== restaurant._id);
        const updated = [
          {
            _id: restaurant._id,
            name: restaurant.name,
            image: restaurant.image,
            isOpen: restaurant.isOpen,
            description: restaurant.description,
          },
          ...filtered,
        ].slice(0, 6);
        localStorage.setItem("tomato_recent_restaurants", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  }, [restaurant]);

  const filteredItems = useMemo(() => {
    let result = menuItems;
    if (vegOnly) {
      result = result.filter(
        (item) => !/chicken|meat|fish|mutton|pork|beef|egg|prawn/i.test(`${item.name} ${item.description || ""}`)
      );
    }
    if (searchQuery.trim()) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [menuItems, searchQuery, vegOnly]);

  // Check if current user has active cart items from this restaurant
  const cartRestaurantId = cart && cart.length > 0 ? ((cart[0].restaurantId as any)?._id || cart[0].restaurantId) : null;
  const isCartFromThisRestaurant = cartRestaurantId && id && String(cartRestaurantId) === String(id);

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <BiLoader size={44} className="animate-spin text-[#E23744]" />
        <p className="text-slate-500 font-semibold text-sm">Preparing restaurant menu...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <h2 className="text-2xl font-black text-slate-800 font-heading">Restaurant Not Found</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          The restaurant you are looking for does not exist or has been removed.
        </p>
        <button
          onClick={() => navigate("/")}
          className="rounded-2xl bg-[#E23744] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#cf2b38] transition cursor-pointer"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 sm:px-6 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100/70 border border-slate-200/80 px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs"
        >
          <BsArrowLeft size={14} />
          <span>All Restaurants</span>
        </button>
      </div>

      <RestaurantProfile
        restaurant={restaurant}
        onUpdate={setRestaurant}
        isSeller={false}
      />

      {/* Ratings & Customer Reviews Showcase */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-white border border-amber-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Rating Summary */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-500 text-white flex flex-col items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
            <span className="text-lg leading-none">4.6</span>
            <span className="text-[10px] leading-tight opacity-90">★ ★ ★ ★</span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-slate-900 text-sm">Customer Favorite Rating</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Top Rated
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Based on 320+ verified deliveries in your area
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                ⏱️ 98% On-Time
              </span>
              <span className="text-[10px] font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                🧼 Hygienic Kitchen
              </span>
              <span className="text-[10px] font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                📦 Tamper-Proof Packaging
              </span>
            </div>
          </div>
        </div>

        {/* Right Customer Testimonials */}
        <div className="flex flex-col sm:flex-row gap-2 md:max-w-md">
          <div className="bg-white/90 border border-amber-200/60 p-3 rounded-2xl text-xs space-y-1 shadow-2xs flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800">Priya S.</span>
              <span className="text-amber-500 font-black text-[11px]">★ 5.0</span>
            </div>
            <p className="text-slate-500 italic text-[11px] line-clamp-2">
              "Arrived piping hot and well packaged. Best food in the neighborhood!"
            </p>
          </div>

          <div className="bg-white/90 border border-amber-200/60 p-3 rounded-2xl text-xs space-y-1 shadow-2xs flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800">Rahul M.</span>
              <span className="text-amber-500 font-black text-[11px]">★ 5.0</span>
            </div>
            <p className="text-slate-500 italic text-[11px] line-clamp-2">
              "Portions are generous and the rider was very polite."
            </p>
          </div>
        </div>
      </div>

      {/* Menu Header & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-heading">
              Menu Items ({filteredItems.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Freshly prepared with authentic ingredients
            </p>
          </div>

          {/* Controls: Veg Only Toggle & Search */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 ${
                vegOnly
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/25"
                  : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${vegOnly ? "bg-white" : "bg-emerald-500"}`} />
              <span>Pure Veg</span>
            </button>

            <div className="relative flex-1 sm:w-72">
              <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search in menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200/80 focus:border-[#E23744] focus:ring-2 focus:ring-red-100 outline-none transition"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200/70 p-5 sm:p-6 shadow-xs">
          <MenuItems
            isSeller={false}
            items={filteredItems}
            onItemDeleted={() => {}}
          />
        </div>
      </div>

      {/* Floating Bottom Cart Bar (if user added items) */}
      {isCartFromThisRestaurant && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-40 animate-fade-in">
          <div
            onClick={() => navigate("/cart")}
            className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-5 py-3.5 shadow-2xl shadow-black/40 border border-white/10 hover:shadow-black/60 transition cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#E23744] text-white">
                <BiShoppingBag size={20} />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#E23744] text-[10px] font-black">
                  {quauntity}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-white/90">
                  {quauntity} {quauntity === 1 ? "item" : "items"} added
                </p>
                <p className="text-sm font-black text-white">
                  ₹{subTotal} <span className="text-[10px] text-white/60 font-normal">+ taxes & fees</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black text-[#E23744] bg-white px-3.5 py-2 rounded-xl hover:bg-slate-100 transition">
              <span>View Cart</span>
              <BsArrowRight size={14} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantPage;
