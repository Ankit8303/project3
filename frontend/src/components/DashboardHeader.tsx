import { useAppData } from "../context/AppContext";
import { BiLogOut, BiCheckCircle } from "react-icons/bi";

interface DashboardHeaderProps {
  title: string;
  roleBadge: string;
  badgeColor?: string;
  extraActions?: React.ReactNode;
}

const DashboardHeader = ({
  title,
  roleBadge,
  badgeColor = "bg-red-50 text-red-600 border-red-200",
  extraActions,
}: DashboardHeaderProps) => {
  const { user, logout } = useAppData();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-100 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 gap-4">
        {/* Left: Brand & Dashboard Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E23744] to-[#ff5d6c] text-white shadow-sm shadow-red-500/30 text-xl select-none">
            🍅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg font-black text-slate-900">{title}</h1>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                {roleBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Logged in as <span className="font-semibold text-slate-700">{user?.name}</span> ({user?.email})
            </p>
          </div>
        </div>

        {/* Right: Actions & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {extraActions}

          <div className="hidden md:flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
            <BiCheckCircle size={14} className="text-emerald-500" />
            <span>Role: {roleBadge}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-100 px-3.5 py-1.5 text-xs font-bold text-[#E23744] hover:bg-[#E23744] hover:text-white transition shadow-xs"
            title="Log Out of this Account"
          >
            <BiLogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
