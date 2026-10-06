import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../main";
import toast from "react-hot-toast";
import { useUser, useClerk, useSignIn, useAuth } from "@clerk/clerk-react";
import { useAppData } from "../context/AppContext";
import { BiLoader, BiShieldQuarter, BiLockAlt, BiCheck } from "react-icons/bi";
import { setAuthToken } from "../auth/tokenStore";

const roles = [
  { id: "customer", label: "Customer", emoji: "🍔", desc: "Order food & track deliveries" },
  { id: "seller", label: "Restaurant", emoji: "🏪", desc: "Manage menu & fulfill orders" },
  { id: "rider", label: "Rider", emoji: "🛵", desc: "Accept & deliver live orders" },
];

const Login = () => {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const { openSignIn } = useClerk();
  const { setUser, setIsAuth, isAuth } = useAppData();
  const [syncing, setSyncing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(() => localStorage.getItem("pendingRole") || "customer");
  const navigate = useNavigate();

  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const isClerkConfigured = clerkKey && clerkKey !== "pk_test_placeholder";

  const currentRoleObj = roles.find((r) => r.id === selectedRole) || roles[0];

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    localStorage.setItem("pendingRole", roleId);
  };

  // Exchange the verified Clerk session for a short-lived Tomato application token.
  const syncUser = async () => {
    if (!clerkLoaded || !isSignedIn || !clerkUser || syncing || isAuth) return;

    setSyncing(true);
    try {
      const clerkToken = await getToken();
      if (!clerkToken) throw new Error("Clerk session token is unavailable");

      const { data } = await axios.post(
        `${authService}/api/auth/login-clerk`,
        {},
        { headers: { Authorization: `Bearer ${clerkToken}` } },
      );

      setAuthToken(data.token);
      setUser(data.user);
      setIsAuth(true);
      toast.success(data.message || "Authenticated successfully");

      if (!data.user.role) {
        navigate("/select-role");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      console.error("Backend auth sync error:", error);
      toast.error(error.response?.data?.message || "Failed to synchronize account with database");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    syncUser();
  }, [clerkLoaded, isSignedIn, clerkUser]);

  const { signIn, isLoaded: signInLoaded } = useSignIn();

  const handleGoogleSignIn = async () => {
    localStorage.setItem("pendingRole", selectedRole);
    if (!isClerkConfigured) {
      toast.error("Google authentication is not configured yet.");
      return;
    }
    try {
      if (isSignedIn && clerkUser) {
        await syncUser();
        return;
      }

      if (signInLoaded && signIn) {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: window.location.origin + "/login",
          redirectUrlComplete: window.location.origin + "/",
        });
      } else if (openSignIn) {
        openSignIn();
      }
    } catch (error: any) {
      console.warn("Google direct OAuth note:", error);
      if (openSignIn) {
        openSignIn();
      }
    }
  };

  if (syncing) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-3">
        <BiLoader size={48} className="animate-spin text-[#E23744]" />
        <p className="text-slate-600 font-semibold">Logging you into Tomato...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[90vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-5 flex flex-col items-center">
        {/* Brand Icon & Header */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E23744] to-[#ff5d6c] text-3xl shadow-lg shadow-red-500/25 select-none">
            🍅
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-slate-900">
            Sign in to Tomato
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
            Select your account role and sign in with Google or your email
          </p>
        </div>

        {/* Unified Login Card */}
        <div className="w-full rounded-3xl bg-white p-6 sm:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
          {/* Step 1: Role Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                1. Select Account Role <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                Active: <span className="text-[#E23744] font-bold">{currentRoleObj.label}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => {
                const isSelected = selectedRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleSelect(r.id)}
                    className={`relative flex items-start gap-2.5 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#E23744] bg-red-50/50 shadow-sm ring-2 ring-red-100/60"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <span className="text-2xl select-none shrink-0">{r.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isSelected ? "text-[#E23744]" : "text-slate-800"}`}>
                          {r.label}
                        </span>
                        {isSelected && <BiCheck className="h-4 w-4 text-[#E23744] shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Login Options */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                2. Choose Sign-In Method
              </label>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-slate-800 text-sm font-bold transition shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google as {currentRoleObj.label}</span>
            </button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Email sign-in is handled securely by Clerk.</strong>
              Use the Clerk sign-in flow above. Tomato never accepts an email address as proof of identity.
            </div>
          </div>

          {/* Strict 1 Email = 1 Role Banner */}
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600">
            <BiLockAlt className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>Identity is verified by Clerk.</strong> Your Tomato role is stored server-side and cannot be changed after onboarding.
            </span>
          </div>
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <BiShieldQuarter size={16} className="text-emerald-500" />
          <span>Clerk identity verification & signed application sessions active</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
