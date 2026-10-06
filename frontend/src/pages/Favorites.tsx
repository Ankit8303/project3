import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFavorites } from "../context/FavoritesContext";
import { useAppData } from "../context/AppContext";
import { restaurantService } from "../main";
import axios from "axios";
import toast from "react-hot-toast";
import { BsHeartFill, BsArrowLeft, BsCartPlus } from "react-icons/bs";
import { BiNavigation, BiStore, BiFoodMenu } from "react-icons/bi";
import { getAuthToken } from "../auth/tokenStore";

const Favorites = () => {
  const {
    favoriteRestaurants,
    favoriteDishes,
    toggleRestaurantFav,
    toggleDishFav,
    favRestaurantsCount,
    favDishesCount,
  } = useFavorites();

  const { fetchCart } = useAppData();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"restaurants" | "dishes">("restaurants");
  const [addingDishId, setAddingDishId] = useState<string | null>(null);

  const handleAddToCart = async (restaurantId: string, itemId: string) => {
    try {
      setAddingDishId(itemId);
      const { data } = await axios.post(
        `${restaurantService}/api/cart/add`,
        { restaurantId, itemId },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      toast.success(data.message || "Added to cart! 🛒");
      fetchCart();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingDishId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-xs"
            >
              <BsArrowLeft size={13} />
              <span>Back</span>
            </Link>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Collection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Favorites & Bookmarks</span>
            <span className="text-xl">❤️</span>
          </h1>
          <p className="text-xs text-slate-500">
            Quickly re-order and explore your top saved spots and favorite meals.
          </p>
        </div>

        {/* Tab switch pills */}
        <div className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl self-start sm:self-auto border border-slate-200/60">
          <button
            onClick={() => setActiveTab("restaurants")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "restaurants"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BiStore size={16} />
            <span>Restaurants</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "restaurants" ? "bg-[#E23744] text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {favRestaurantsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("dishes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "dishes"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BiFoodMenu size={16} />
            <span>Dishes</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "dishes" ? "bg-[#E23744] text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {favDishesCount}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Favorite Restaurants */}
      {activeTab === "restaurants" && (
        <>
          {favoriteRestaurants.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-xs space-y-4 max-w-md mx-auto">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-3xl shadow-inner">
                💔
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800">No Favorite Restaurants Yet</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Click the heart icon on any restaurant card to save your favorite dining spots here!
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full brand-gradient px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/20 hover:scale-105 transition"
              >
                <span>Explore Restaurants</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {favoriteRestaurants.map((rest) => (
                <div
                  key={rest._id}
                  className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-xs food-card-hover flex flex-col cursor-pointer"
                  onClick={() => navigate(`/restaurant/${rest._id}`)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    <img
                      src={rest.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80"}
                      alt={rest.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    {/* Remove favorite button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRestaurantFav(rest);
                      }}
                      title="Remove from favorites"
                      className="absolute top-2.5 right-2.5 h-9 w-9 rounded-full bg-white/95 text-[#E23744] hover:bg-white flex items-center justify-center shadow-md transition-all hover:scale-110 cursor-pointer"
                    >
                      <BsHeartFill size={15} />
                    </button>

                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs">
                      <span className="flex items-center gap-1 font-semibold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                        <BiNavigation size={12} className="text-[#E23744]" />
                        <span>Featured Spot</span>
                      </span>
                      <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full text-[10px]">
                        ★ 4.5
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 group-hover:text-[#E23744] transition truncate">
                        {rest.name}
                      </h3>
                      {rest.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{rest.description}</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-emerald-600 font-bold">Fast Delivery</span>
                      <span className="text-[#E23744] font-bold group-hover:translate-x-0.5 transition">
                        View Menu →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Saved Dishes */}
      {activeTab === "dishes" && (
        <>
          {favoriteDishes.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-xs space-y-4 max-w-md mx-auto">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-3xl shadow-inner">
                🍲
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800">No Saved Dishes Yet</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Heart the tastiest dishes from any menu to save them here for instant 1-click re-ordering!
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full brand-gradient px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/20 hover:scale-105 transition"
              >
                <span>Browse Menus</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favoriteDishes.map((dish) => (
                <div
                  key={dish._id}
                  className="rounded-2xl bg-white border border-slate-100 p-4 shadow-xs food-card-hover flex flex-col justify-between space-y-3 relative group"
                >
                  {/* Dish Image */}
                  <div className="relative h-40 w-full rounded-xl overflow-hidden bg-slate-100">
                    <img
                      src={
                        dish.image ||
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"
                      }
                      alt={dish.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                    />

                    {/* Un-favorite button */}
                    <button
                      type="button"
                      onClick={() => toggleDishFav(dish)}
                      title="Remove from favorites"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/95 text-[#E23744] hover:bg-white flex items-center justify-center shadow-md transition-all hover:scale-110 cursor-pointer"
                    >
                      <BsHeartFill size={13} />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">{dish.name}</h4>
                      <span className="font-black text-slate-900 text-sm">₹{dish.price}</span>
                    </div>
                    {dish.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{dish.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => handleAddToCart(dish.restaurantId, dish._id)}
                      disabled={addingDishId === dish._id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl brand-gradient text-white font-bold text-xs shadow-xs hover:scale-[1.02] transition cursor-pointer disabled:opacity-50"
                    >
                      <BsCartPlus size={14} />
                      <span>{addingDishId === dish._id ? "Adding..." : "Add to Cart"}</span>
                    </button>

                    <button
                      onClick={() => navigate(`/restaurant/${dish.restaurantId}`)}
                      title="Visit Restaurant"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer text-xs font-bold"
                    >
                      Visit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Favorites;
