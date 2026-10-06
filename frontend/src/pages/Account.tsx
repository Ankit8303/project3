import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { BiLogOut, BiMapPin, BiPackage, BiChevronRight, BiCheckCircle } from "react-icons/bi";

const Account = () => {
  const { user, logout } = useAppData();
  const navigate = useNavigate();

  const firstLetter = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  const logoutHandler = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-[85vh] bg-slate-50/50 px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-md space-y-6">
        {/* User Card */}
        <div className="rounded-3xl bg-white p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E23744] to-[#ff5d6c] text-2xl font-black text-white shadow-md shadow-red-500/20">
            {firstLetter}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold text-slate-900 truncate">{user?.name}</h2>
              <BiCheckCircle size={18} className="text-emerald-500 shrink-0" title="Verified Account" />
            </div>
            <p className="text-xs text-slate-500 truncate font-mono">{user?.email}</p>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md mt-1">
              Role: {user?.role || "Customer"}
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
          <div
            className="group flex cursor-pointer items-center justify-between p-4.5 hover:bg-slate-50 transition"
            onClick={() => navigate("/orders")}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#E23744]">
                <BiPackage size={22} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 group-hover:text-[#E23744] transition-colors block">
                  Your Orders
                </span>
                <span className="text-xs text-slate-400">Track and view previous purchases</span>
              </div>
            </div>
            <BiChevronRight size={20} className="text-slate-400 group-hover:text-slate-600 transition" />
          </div>

          <div
            className="group flex cursor-pointer items-center justify-between p-4.5 hover:bg-slate-50 transition"
            onClick={() => navigate("/address")}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#E23744]">
                <BiMapPin size={22} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 group-hover:text-[#E23744] transition-colors block">
                  Saved Addresses
                </span>
                <span className="text-xs text-slate-400">Manage delivery drop-off locations</span>
              </div>
            </div>
            <BiChevronRight size={20} className="text-slate-400 group-hover:text-slate-600 transition" />
          </div>

          <div
            className="group flex cursor-pointer items-center justify-between p-4.5 hover:bg-red-50/50 transition"
            onClick={logoutHandler}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-red-100 group-hover:text-red-600 transition">
                <BiLogOut size={22} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 group-hover:text-red-600 transition block">
                  Log Out
                </span>
                <span className="text-xs text-slate-400">Sign out of your Tomato session</span>
              </div>
            </div>
            <BiChevronRight size={20} className="text-slate-400 group-hover:text-red-600 transition" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
