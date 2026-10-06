import { useNavigate } from "react-router-dom";
import { BiNavigation } from "react-icons/bi";
import { BsHeart, BsHeartFill } from "react-icons/bs";
import { useFavorites } from "../context/FavoritesContext";

type props = {
  id: string;
  image: string;
  name: string;
  distance: string;
  isOpen: boolean;
};

const RestaurantCard = ({ id, image, name, distance, isOpen }: props) => {
  const navigate = useNavigate();
  const { isRestaurantFav, toggleRestaurantFav } = useFavorites();
  const isFav = isRestaurantFav(id);

  return (
    <div
      className={`group cursor-pointer overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-xs food-card-hover flex flex-col ${
        !isOpen ? "opacity-75" : ""
      }`}
      onClick={() => navigate(`/restaurant/${id}`)}
    >
      {/* Thumbnail Container */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80"}
          alt={name}
          className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 ${
            !isOpen ? "grayscale" : ""
          }`}
          loading="lazy"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-70 group-hover:opacity-50 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
          <span className="rounded-full bg-white/95 backdrop-blur-md px-2 py-0.5 text-[11px] font-extrabold text-slate-800 shadow-xs flex items-center gap-1 pointer-events-none">
            <span className="text-amber-500">★</span> 4.4
          </span>

          <div className="flex items-center gap-2">
            {isOpen ? (
              <span className="rounded-full bg-emerald-500/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-white shadow-xs pointer-events-none">
                OPEN
              </span>
            ) : (
              <span className="rounded-full bg-red-600/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-white shadow-xs pointer-events-none">
                CLOSED
              </span>
            )}

            {/* Favorite Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleRestaurantFav({
                  _id: id,
                  name,
                  image,
                  isOpen,
                });
              }}
              title={isFav ? "Remove from favorites" : "Save to favorites"}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-md hover:scale-110 cursor-pointer pointer-events-auto ${
                isFav
                  ? "bg-white text-[#E23744]"
                  : "bg-black/40 backdrop-blur-md text-white hover:bg-white hover:text-[#E23744]"
              }`}
            >
              {isFav ? <BsHeartFill size={14} /> : <BsHeart size={14} />}
            </button>
          </div>
        </div>

        {/* Bottom Thumbnail Overlay Info */}
        <div className="absolute bottom-2.5 inset-x-2.5 flex items-end justify-between pointer-events-none text-white">
          <div className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium shadow-xs">
            <BiNavigation size={11} className="text-[#FF4D5B]" />
            <span>{distance} km</span>
          </div>

          <span className="text-[11px] font-semibold text-slate-200 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
            25-35 mins
          </span>
        </div>

        {/* Status Closed Overlay */}
        {!isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs">
            <span className="rounded-full bg-red-600 px-4 py-1.5 font-black text-xs uppercase tracking-widest text-white shadow-md">
              Currently Closed
            </span>
          </div>
        )}
      </div>

      {/* Info Content */}
      <div className="p-3.5 flex flex-col justify-between flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <h3 className="truncate text-base font-extrabold text-slate-800 group-hover:text-[#E23744] transition-colors">
            {name}
          </h3>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
          <span className="truncate max-w-[140px]">North Indian • Fast Food</span>
          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md text-[10px]">
            Free Delivery
          </span>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
