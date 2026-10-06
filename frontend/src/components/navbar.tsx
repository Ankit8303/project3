import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useFavorites } from "../context/FavoritesContext";
import { useEffect, useState } from "react";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch, BiUser } from "react-icons/bi";
import { BsHeart, BsSun, BsMoonStars } from "react-icons/bs";

const Navbar = () => {
  const { isAuth, city, quauntity } = useAppData();
  const { totalFavoritesCount } = useFavorites();
  const currLocation = useLocation();

  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem("tomato_theme") === "dark" ||
      document.documentElement.classList.contains("dark")
    );
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("tomato_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("tomato_theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const isHomePage = currLocation.pathname === "/";

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        setSearchParams({ search });
      } else {
        setSearchParams({});
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <header className="sticky top-0 z-50 w-full glass-nav transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5 gap-4">
        {/* Logo */}
        <Link
          to={"/"}
          className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-[#E23744] hover:opacity-95 group cursor-pointer select-none"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl brand-gradient text-white shadow-md shadow-red-500/25 group-hover:scale-105 group-hover:rotate-6 transition-transform">
            🍅
          </span>
          <span className="font-heading text-2xl font-black tracking-tight bg-gradient-to-r from-[#E23744] via-[#ea3c4b] to-[#c72635] bg-clip-text text-transparent">
            Tomato
          </span>
        </Link>

        {/* Search & Location Bar (Inline on Desktop for Home) */}
        {isHomePage && (
          <div className="hidden md:flex flex-1 max-w-xl items-center rounded-full border border-slate-200/80 bg-white/80 shadow-xs hover:border-slate-300 focus-within:border-[#E23744] focus-within:ring-4 focus-within:ring-red-500/10 focus-within:bg-white transition-all overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-r border-slate-100 text-slate-700 max-w-[175px] shrink-0">
              <BiMapPin className="h-4 w-4 text-[#E23744] shrink-0" />
              <span className="text-xs font-bold truncate text-slate-700">
                {city || "Detecting..."}
              </span>
            </div>
            <div className="flex flex-1 items-center gap-2 px-3.5">
              <BiSearch className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search restaurants, cuisines, or dishes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2 text-sm bg-transparent text-slate-800 placeholder-slate-400 outline-none font-medium"
              />
            </div>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {isAuth && (
            <Link
              to="/orders"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#E23744] px-3 py-2 rounded-full hover:bg-red-50/60 transition-colors"
            >
              <span>📦</span>
              <span>Orders</span>
            </Link>
          )}

          {isAuth && (
            <Link
              to="/favorites"
              className="relative flex items-center justify-center h-10 w-10 rounded-full bg-slate-100/80 hover:bg-red-50 text-slate-700 hover:text-[#E23744] transition-all hover:scale-105"
              title="Favorites & Bookmarks"
            >
              <BsHeart className="h-4.5 w-4.5" />
              {totalFavoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E23744] px-1 text-[11px] font-black text-white shadow-xs ring-2 ring-white animate-subtle-pulse">
                  {totalFavoritesCount}
                </span>
              )}
            </Link>
          )}

          <Link
            to={"/cart"}
            className="relative flex items-center justify-center h-10 w-10 rounded-full bg-slate-100/80 hover:bg-red-50 text-slate-700 hover:text-[#E23744] transition-all hover:scale-105"
            title="Cart"
          >
            <CgShoppingCart className="h-5 w-5" />
            {quauntity > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full brand-gradient px-1 text-[11px] font-black text-white shadow-xs ring-2 ring-white animate-subtle-pulse">
                {quauntity}
              </span>
            )}
          </Link>

          {/* Theme Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 hover:text-amber-500 transition-all hover:scale-105 cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <BsSun className="h-4.5 w-4.5 text-amber-400 animate-spin-slow" />
            ) : (
              <BsMoonStars className="h-4.5 w-4.5 text-slate-600" />
            )}
          </button>

          {isAuth ? (
            <Link
              to="/account"
              className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-red-200 hover:bg-red-50/40 hover:text-[#E23744] shadow-xs hover:shadow-sm transition-all"
            >
              <BiUser className="h-4 w-4 text-[#E23744]" />
              <span className="hidden sm:inline">Account</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-full brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile search bar on HomePage */}
      {isHomePage && (
        <div className="md:hidden border-t border-slate-100 px-4 py-2.5 bg-slate-50/50">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-xs focus-within:border-[#E23744] focus-within:ring-2 focus-within:ring-red-100 overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 border-r border-slate-100 text-slate-700 max-w-[120px] shrink-0">
              <BiMapPin className="h-4 w-4 text-[#E23744] shrink-0" />
              <span className="text-xs font-semibold truncate text-slate-700">
                {city || "Location"}
              </span>
            </div>
            <div className="flex flex-1 items-center gap-2 px-3">
              <BiSearch className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search restaurant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-1.5 text-sm bg-transparent outline-none placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
