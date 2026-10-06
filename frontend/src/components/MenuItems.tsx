import { useState } from "react";
import type { IMenuItem } from "../types";
import { FiEyeOff } from "react-icons/fi";
import { BsCartPlus, BsEye, BsHeart, BsHeartFill } from "react-icons/bs";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";
import { useFavorites } from "../context/FavoritesContext";
import { getAuthToken } from "../auth/tokenStore";

interface MenuItemsProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller: boolean;
}

const MenuItems = ({ items, onItemDeleted, isSeller }: MenuItemsProps) => {
  const { isDishFav, toggleDishFav } = useFavorites();
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const handleDelete = async (itemId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this item?");
    if (!confirm) return;

    try {
      await axios.delete(`${restaurantService}/api/item/${itemId}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      toast.success("Item deleted");
      onItemDeleted();
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete item");
    }
  };

  const toggleAvailiblity = async (itemId: string) => {
    try {
      const { data } = await axios.put(
        `${restaurantService}/api/item/status/${itemId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      toast.success(data.message);
      onItemDeleted();
    } catch (error) {
      console.log(error);
      toast.error("Failed to update status");
    }
  };

  const { fetchCart } = useAppData();

  const addToCart = async (restaurantId: string, itemId: string) => {
    try {
      setLoadingItemId(itemId);

      const { data } = await axios.post(
        `${restaurantService}/api/cart/add`,
        {
          restaurantId,
          itemId,
        },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      toast.success(data.message);
      fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add to cart");
    } finally {
      setLoadingItemId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-200">
          <BsCartPlus size={30} />
        </div>
        <p className="text-slate-500 font-bold text-sm">No items matching your search</p>
        <p className="text-slate-400 text-xs">Try searching for something else!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item, idx) => {
        const isLoading = loadingItemId === item._id;
        const isNonVeg = /chicken|meat|fish|mutton|pork|beef|egg|prawn/i.test(`${item.name} ${item.description || ""}`);

        return (
          <div
            className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 ${
              !item.isAvailable ? "opacity-60 bg-slate-50/70" : ""
            }`}
            key={item._id}
          >
            {/* Image & Badging */}
            <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-slate-100 mb-3 shadow-inner">
              <img
                src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"}
                alt={item.name}
                className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  !item.isAvailable ? "grayscale" : ""
                }`}
                loading="lazy"
              />

              {/* Diet Badge (Veg / Non-Veg Indicator) */}
              <div className="absolute top-2.5 left-2.5 rounded-md bg-white/95 backdrop-blur-xs p-1 shadow-xs border border-white/60">
                <div
                  className={`h-2.5 w-2.5 rounded-full flex items-center justify-center ${
                    isNonVeg ? "bg-red-500" : "bg-emerald-500"
                  }`}
                />
              </div>

              {/* Dish Favorite Button */}
              {!isSeller && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDishFav({
                      _id: item._id,
                      restaurantId: item.restaurantId,
                      name: item.name,
                      description: item.description,
                      image: item.image,
                      price: item.price,
                    });
                  }}
                  title={isDishFav(item._id) ? "Remove from saved" : "Save dish"}
                  className={`absolute top-2.5 right-2.5 h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-md hover:scale-110 cursor-pointer ${
                    isDishFav(item._id)
                      ? "bg-white text-[#E23744]"
                      : "bg-black/40 backdrop-blur-md text-white hover:bg-white hover:text-[#E23744]"
                  }`}
                >
                  {isDishFav(item._id) ? <BsHeartFill size={13} /> : <BsHeart size={13} />}
                </button>
              )}

              {/* Promotional Smart Tag Badge */}
              <div className="absolute bottom-2 left-2 pointer-events-none">
                <span className="rounded-full bg-slate-950/85 backdrop-blur-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300 shadow-xs border border-white/10 flex items-center gap-1">
                  {idx % 3 === 0 ? "🔥 Bestseller" : idx % 3 === 1 ? "⭐ Must Try" : "✨ Chef's Pick"}
                </span>
              </div>

              {!item.isAvailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs">
                  <span className="rounded-full bg-slate-900/90 px-3 py-1 text-[10px] font-black text-white uppercase tracking-wider border border-white/20">
                    Sold Out
                  </span>
                </div>
              )}
            </div>

            {/* Content info */}
            <div className="space-y-1.5 flex-1 flex flex-col justify-between px-0.5">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm leading-snug group-hover:text-[#E23744] transition-colors line-clamp-1">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Price & Actions Row */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Price</span>
                  <span className="text-base font-black text-slate-900">
                    ₹{item.price}
                  </span>
                </div>

                {isSeller && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => toggleAvailiblity(item._id)}
                      className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                      title={item.isAvailable ? "Mark Unavailable" : "Mark Available"}
                    >
                      {item.isAvailable ? <BsEye size={16} /> : <FiEyeOff size={16} />}
                    </button>

                    <button
                      onClick={() => handleDelete(item._id)}
                      className="rounded-xl p-2 text-red-500 hover:bg-red-50 transition cursor-pointer"
                      title="Delete Item"
                    >
                      <BiTrash size={16} />
                    </button>
                  </div>
                )}

                {!isSeller && (
                  <button
                    disabled={!item.isAvailable || isLoading}
                    onClick={() => addToCart(item.restaurantId, item._id)}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all active:scale-95 cursor-pointer ${
                      !item.isAvailable || isLoading
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : "bg-gradient-to-r from-[#E23744] to-[#f04452] text-white shadow-md shadow-red-500/20 hover:shadow-red-500/35 hover:-translate-y-0.5"
                    }`}
                  >
                    {isLoading ? (
                      <VscLoading size={15} className="animate-spin" />
                    ) : (
                      <>
                        <BsCartPlus size={15} />
                        <span>ADD</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MenuItems;
