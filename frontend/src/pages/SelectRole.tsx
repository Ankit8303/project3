import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authService } from "../main";
import toast from "react-hot-toast";
import { BsArrowRight } from "react-icons/bs";
import { BiLockAlt, BiLogOut } from "react-icons/bi";
import { getAuthToken, setAuthToken } from "../auth/tokenStore";

type Role = "customer" | "rider" | "seller" | null;

const SelectRole = () => {
  const [role, setRole] = useState<Role>(() => {
    const pending = localStorage.getItem("pendingRole");
    return pending === "customer" || pending === "rider" || pending === "seller" ? pending : null;
  });
  const [loading, setLoading] = useState(false);
  const { user, setUser, logout } = useAppData();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role) {
      navigate("/", { replace: true });
    }
  }, [user]);

  const roleDetails = [
    {
      id: "customer" as Role,
      title: "Hungry Customer",
      desc: "Order delicious dishes, track deliveries, and discover restaurants.",
      icon: "🍔",
      badge: "Consumer",
    },
    {
      id: "seller" as Role,
      title: "Restaurant Owner / Seller",
      desc: "List your menu, accept incoming food orders, and grow your sales.",
      icon: "🏪",
      badge: "Merchant",
    },
    {
      id: "rider" as Role,
      title: "Delivery Partner / Rider",
      desc: "Accept nearby orders, navigate with maps, and earn with live deliveries.",
      icon: "🛵",
      badge: "Logistics",
    },
  ];

  const addRole = async () => {
    if (!role) return;

    try {
      setLoading(true);
      const { data } = await axios.put(
        `${authService}/api/auth/add/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      setAuthToken(data.token);
      localStorage.removeItem("pendingRole");
      setUser(data.user);
      toast.success(`Role locked as ${role.toUpperCase()}! 🎉`);
      navigate("/", { replace: true });
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to set role";
      toast.error(msg);
      if (error.response?.data?.user) {
        setUser(error.response.data.user);
        navigate("/", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[90vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6 rounded-3xl bg-white p-6 sm:p-10 border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="text-center space-y-1.5">
          <div className="flex justify-center mb-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E23744] to-[#ff5d6c] text-2xl text-white shadow-md shadow-red-500/25">
              🍅
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-slate-900">
            Choose Your Permanent Role
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Signed in as <strong className="text-slate-800">{user?.email}</strong>
          </p>
        </div>

        {/* 1 Email = 1 Role Notice */}
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200/70 rounded-2xl text-xs text-amber-900">
          <BiLockAlt size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">1 Email Address = 1 Fixed Role</p>
            <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
              Once you confirm your role, this email address is permanently dedicated to this role. To operate as another role, please sign up with a separate email.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {roleDetails.map((r) => (
            <div
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                role === r.id
                  ? "border-[#E23744] bg-red-50/40 shadow-xs ring-2 ring-red-100"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50"
              }`}
            >
              <span className="text-3xl select-none">{r.icon}</span>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {r.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2">
          <button
            disabled={!role || loading}
            onClick={addRole}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all shadow-xs active:scale-[0.99] ${
              role && !loading
                ? "bg-[#E23744] text-white hover:bg-[#cf2b38] shadow-red-500/25"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <span>{loading ? "Locking In Role..." : `Confirm as ${role ? role.toUpperCase() : ""}`}</span>
            <BsArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-400 hover:text-red-500 transition"
          >
            <BiLogOut size={14} />
            <span>Sign in with a different email</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectRole;
