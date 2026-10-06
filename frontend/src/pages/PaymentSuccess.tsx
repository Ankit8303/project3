import { useNavigate, useParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect } from "react";
import { BiCheckCircle } from "react-icons/bi";
import { BsArrowRight } from "react-icons/bs";

const PaymentSuccess = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  const { fetchCart } = useAppData();

  useEffect(() => {
    fetchCart();
  }, []);

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100 text-center space-y-5">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-500 border border-emerald-100">
            <BiCheckCircle size={48} />
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-black text-slate-900 font-heading">Payment Confirmed!</h1>
          <p className="text-sm text-slate-500 font-medium">
            Your food order has been securely placed and sent to the restaurant 🎉
          </p>
        </div>

        {paymentId && (
          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/70 text-left space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Payment Reference
            </span>
            <p className="font-mono text-xs text-slate-700 break-all">{paymentId}</p>
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E23744] to-[#f04452] py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/35 transition active:scale-[0.99] cursor-pointer"
            onClick={() => navigate("/orders")}
          >
            <span>Track & View Orders</span>
            <BsArrowRight size={16} />
          </button>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-[0.99] cursor-pointer"
            onClick={() => navigate("/")}
          >
            Explore More Restaurants
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
