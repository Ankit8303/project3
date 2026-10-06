import React, { useRef } from "react";
import type { IOrder } from "../types";
import { BiPrinter, BiX } from "react-icons/bi";
import { BsCheckCircleFill } from "react-icons/bs";

interface Props {
  order: IOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderInvoiceModal: React.FC<Props> = ({ order, isOpen, onClose }) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const invoiceNumber = `INV-${order._id.slice(-8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧾</span>
            <span className="font-bold text-slate-800 text-sm">Official Tax Invoice</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E23744] hover:bg-[#cf2b38] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <BiPrinter size={16} />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
            >
              <BiX size={20} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Area */}
        <div ref={printAreaRef} className="p-6 sm:p-8 space-y-6 text-slate-800 printable-invoice-content bg-white">
          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl brand-gradient flex items-center justify-center text-white text-base">
                  🍅
                </span>
                <span className="font-heading font-black text-xl text-[#E23744]">Tomato Foods Pvt. Ltd.</span>
              </div>
              <p className="text-xs text-slate-500">
                GSTIN: 07AABCT8912C1Z8 | CIN: U55101DL2024PTC123456
              </p>
              <p className="text-xs text-slate-500">
                Customer Care: support@tomato.com | 1800-123-TOMATO
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-black uppercase tracking-wider">
                Original Tax Invoice
              </span>
              <p className="font-mono text-sm font-bold text-slate-900">{invoiceNumber}</p>
              <p className="text-xs text-slate-500 font-medium">{invoiceDate}</p>
            </div>
          </div>

          {/* Billed To and Restaurant Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider block">Customer Delivery Details</span>
              <p className="font-extrabold text-slate-900 text-sm">Delivery Destination</p>
              <p className="text-slate-600 leading-relaxed">{order.deliveryAddress?.fromattedAddress}</p>
              <p className="text-slate-600 font-medium">Contact: +91 {order.deliveryAddress?.mobile}</p>
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="font-bold text-slate-400 uppercase tracking-wider block">Fulfilling Restaurant</span>
              <p className="font-extrabold text-slate-900 text-sm">{order.restaurantName}</p>
              <p className="text-slate-500">Verified Food Partner</p>
              <div className="pt-1 flex sm:justify-end items-center gap-1 text-emerald-600 font-bold">
                <BsCheckCircleFill size={12} />
                <span>Payment Confirmed ({order.paymentMethod.toUpperCase()})</span>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Price</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{item.name}</td>
                    <td className="py-2.5 px-4 text-center">{item.quauntity}</td>
                    <td className="py-2.5 px-4 text-right">₹{item.price}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      ₹{item.price * item.quauntity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Delivery Partner Fee</span>
                <span>{order.deliveryFee === 0 ? "FREE" : `₹${order.deliveryFee}`}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Platform & Convenience Fee</span>
                <span>₹{order.platfromFee}</span>
              </div>

              {order.discount && order.discount > 0 ? (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount ({order.couponCode || "PROMO"})</span>
                  <span>- ₹{order.discount}</span>
                </div>
              ) : null}

              {order.tipAmount && order.tipAmount > 0 ? (
                <div className="flex justify-between text-slate-700 font-bold">
                  <span>Delivery Partner Tip</span>
                  <span>+ ₹{order.tipAmount}</span>
                </div>
              ) : null}

              <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                <span>GST (Taxes Included)</span>
                <span>5.0%</span>
              </div>

              <div className="border-t-2 border-slate-900 pt-2 flex justify-between font-black text-base text-slate-900">
                <span>Grand Total Paid</span>
                <span className="text-[#E23744]">₹{order.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Delivery OTP verification stamp if verified */}
          {order.deliveryOtp && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
              <span className="text-amber-800 font-medium">Delivery Handover Security Code:</span>
              <span className="font-mono font-black text-amber-950 tracking-wider">
                {order.deliveryOtp}
              </span>
            </div>
          )}

          {/* Invoice Disclaimer Footer */}
          <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 space-y-1">
            <p>This is an electronically generated tax invoice and does not require a physical signature.</p>
            <p>© {new Date().getFullYear()} Tomato Foods Technologies Private Limited. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderInvoiceModal;
