import { useSearchParams, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState, useMemo } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantCard from "../components/RestaurantCard";
import { BiSearch } from "react-icons/bi";
import { getAuthToken } from "../auth/tokenStore";

const Home = () => {
  const { location, city } = useAppData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const search = searchParams.get("search") || "";

  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // Smart filters & recent spots state
  const [recentSpots, setRecentSpots] = useState<any[]>([]);
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const [filterFastDelivery, setFilterFastDelivery] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "distance" | "name">("default");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tomato_recent_restaurants") || "[]");
      setRecentSpots(saved);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  };

  const fetchRestaurants = async () => {
    const lat = location?.latitude || 28.6139;
    const lng = location?.longitude || 77.2090;

    try {
      setLoading(true);

      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/all`,
        {
          params: {
            latitude: lat,
            longitude: lng,
            search,
          },
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      setRestaurants(data.restaurants ?? []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [location, search]);

  const CATEGORIES = [
    { label: "All", icon: "🍽️", query: "" },
    { label: "Pizza", icon: "🍕", query: "pizza" },
    { label: "Burgers", icon: "🍔", query: "burger" },
    { label: "Biryani", icon: "🍛", query: "biryani" },
    { label: "Chinese", icon: "🍜", query: "chinese" },
    { label: "Desserts", icon: "🍰", query: "sweet" },
    { label: "Healthy", icon: "🥗", query: "healthy" },
    { label: "Shakes & Tea", icon: "🥤", query: "drink" },
  ];

  const displayedRestaurants = useMemo(() => {
    let list = [...restaurants];

    if (filterOpenOnly) {
      list = list.filter((r) => r.isOpen);
    }

    if (filterFastDelivery && location) {
      list = list.filter((r) => {
        const [resLng, resLat] = r.autoLocation.coordinates;
        const d = getDistanceKm(location.latitude, location.longitude, resLat, resLng);
        return d <= 5;
      });
    }

    if (sortBy === "distance" && location) {
      list.sort((a, b) => {
        const [aLng, aLat] = a.autoLocation.coordinates;
        const [bLng, bLat] = b.autoLocation.coordinates;
        const dA = getDistanceKm(location.latitude, location.longitude, aLat, aLng);
        const dB = getDistanceKm(location.latitude, location.longitude, bLat, bLng);
        return dA - dB;
      });
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [restaurants, filterOpenOnly, filterFastDelivery, sortBy, location]);

  if (loading && restaurants.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
        <div className="h-32 w-full animate-pulse rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="animate-pulse space-y-3 rounded-2xl bg-white p-3 border border-slate-100 shadow-xs">
              <div className="h-40 rounded-xl bg-slate-200" />
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-8">
      {/* Hero Welcome Banner */}
      {!search && (
        <div className="relative overflow-hidden rounded-3xl brand-gradient p-6 sm:p-10 text-white shadow-xl shadow-red-500/20">
          <div className="relative z-10 max-w-xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-xs">
                <span>⚡</span> 30-Min Fast Delivery
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/30 backdrop-blur-md px-3 py-1 text-xs font-bold text-amber-200 shadow-xs">
                <span>★</span> Top Rated Kitchens
              </span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15]">
              Craving Something Delicious in {city || "Your Area"}?
            </h1>
            <p className="text-sm sm:text-base text-red-100 max-w-lg font-medium leading-relaxed">
              Order hot meals from verified local dining spots and track your rider in real time with live GPS.
            </p>

            <div className="flex items-center gap-4 pt-1 text-xs text-white/90 font-semibold">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Tracking
              </span>
              <span>•</span>
              <span>🔐 OTP Verified Handover</span>
              <span>•</span>
              <span>⚡ Zero Extra Fees</span>
            </div>
          </div>
          
          {/* Decorative Floating Badges */}
          <div className="absolute -right-8 -bottom-8 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute top-8 right-12 text-7xl opacity-20 select-none hidden lg:block animate-float">
            🍕 🍔 🍣
          </div>
        </div>
      )}

      {/* Cuisines & Category Pills Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
            Inspiration for your order
          </h3>
          {search && (
            <button
              onClick={() => fetchRestaurants()}
              className="text-xs font-bold text-[#E23744] hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = (!search && cat.query === "") || (search.toLowerCase() === cat.query.toLowerCase());

            return (
              <button
                key={cat.label}
                onClick={() => {
                  const url = new URL(window.location.href);
                  if (cat.query) url.searchParams.set("search", cat.query);
                  else url.searchParams.delete("search");
                  window.history.pushState({}, "", url);
                  window.dispatchEvent(new Event("popstate"));
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-xs cursor-pointer select-none ${
                  isActive
                    ? "brand-gradient text-white shadow-md shadow-red-500/25 scale-[1.03]"
                    : "bg-white text-slate-700 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recently Viewed Carousel */}
      {recentSpots.length > 0 && !search && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🕒</span>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Pick up where you left off (Recently Viewed)
            </h3>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {recentSpots.map((r: any) => (
              <div
                key={r._id}
                onClick={() => navigate(`/restaurant/${r._id}`)}
                className="flex items-center gap-2.5 bg-white border border-slate-200/80 hover:border-red-300 p-2.5 pr-4 rounded-2xl cursor-pointer shadow-xs transition hover:scale-[1.02] shrink-0"
              >
                <img
                  src={r.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&q=80"}
                  alt={r.name}
                  className="h-11 w-11 rounded-xl object-cover"
                />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{r.name}</h4>
                  <span className={`text-[10px] font-bold ${r.isOpen ? "text-emerald-600" : "text-slate-400"}`}>
                    {r.isOpen ? "🟢 Open Now" : "⚪ Closed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Header with Smart Filters */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-heading">
              {search ? `Search results for "${search}"` : "Top Restaurants Near You"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              {displayedRestaurants.length} {displayedRestaurants.length === 1 ? "restaurant" : "restaurants"} ready to deliver to your doorstep
            </p>
          </div>

          {/* Quick Filter & Sort Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterOpenOnly(!filterOpenOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                filterOpenOnly
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${filterOpenOnly ? "bg-white" : "bg-emerald-500"}`} />
              <span>Open Now</span>
            </button>

            <button
              onClick={() => setFilterFastDelivery(!filterFastDelivery)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                filterFastDelivery
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>⚡</span>
              <span>Fast (&lt;5km)</span>
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl outline-none focus:border-[#E23744] cursor-pointer"
            >
              <option value="default">Sort: Recommended</option>
              <option value="distance">Sort: Nearest First</option>
              <option value="name">Sort: Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Restaurants Grid */}
      {displayedRestaurants.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {displayedRestaurants.map((res) => {
            const [resLng, resLat] = res.autoLocation.coordinates;

            const distance = getDistanceKm(
              location?.latitude || 28.6139,
              location?.longitude || 77.2090,
              resLat,
              resLng
            );

            return (
              <RestaurantCard
                key={res._id}
                id={res._id}
                name={res.name}
                image={res.image ?? ""}
                distance={`${distance}`}
                isOpen={res.isOpen}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl bg-white border border-slate-100 p-8 text-center space-y-4 shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-[#E23744]">
            <BiSearch size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">No restaurants found</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              We couldn't find any matches {search ? `for "${search}"` : "in your location"}. Try searching something else!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
