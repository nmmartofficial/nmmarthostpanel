import React from "react";
import {
  Home,
  PauseCircle,
  FileClock,
  Undo2,
  Barcode2,
  Settings,
  LogOut,
} from "lucide-react";
import { usePOS } from "../context/POSContext";

export default function BottomToolbar() {
  const { cart, openHoldBillDialog, openReturnDialog, openBarcodeDialog } = usePOS();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const buttons = [
    {
      title: "Home",
      icon: Home,
      color: "bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
    },
    {
      title: "Hold Bill",
      icon: PauseCircle,
      color: "bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
      action: openHoldBillDialog,
      badge: cartCount > 0 ? cartCount : null,
    },
    {
      title: "Recall",
      icon: FileClock,
      color: "bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700",
      action: openHoldBillDialog,
    },
    {
      title: "Return",
      icon: Undo2,
      color: "bg-gradient-to-br from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600",
      action: openReturnDialog,
    },
    {
      title: "Barcode",
      icon: Barcode2,
      color: "bg-gradient-to-br from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700",
      action: openBarcodeDialog,
    },
    {
      title: "Settings",
      icon: Settings,
      color: "bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800",
    },
    {
      title: "Logout",
      icon: LogOut,
      color: "bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800",
    },
  ];

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg px-4 py-3">
      <div className="grid grid-cols-7 gap-2">
        {buttons.map((btn, index) => {
          const Icon = btn.icon;
          return (
            <button
              key={index}
              onClick={btn.action}
              className={`${btn.color} text-white rounded-xl py-3 flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md relative`}
            >
              <Icon size={20} />
              <span className="text-[11px] mt-1 font-semibold">
                {btn.title}
              </span>
              {btn.badge && (
                <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-red-500">
                  {btn.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
