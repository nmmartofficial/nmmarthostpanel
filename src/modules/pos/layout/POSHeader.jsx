import React, { useEffect, useState } from "react";
import {
  Bell,
  Wifi,
  User,
  ShoppingCart,
  Clock3,
  BadgeIndianRupee,
} from "lucide-react";

const POSHeader = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-5">

      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow">
          NM
        </div>

        <div>
          <h1 className="text-lg font-bold text-gray-800">
            NM MART POS
          </h1>
          <p className="text-xs text-gray-500">
            Ultra Retail ERP
          </p>
        </div>
      </div>

      {/* Center */}
      <div className="hidden lg:flex items-center gap-6">

        <div className="flex items-center gap-2 bg-green-100 px-3 py-2 rounded-lg">
          <ShoppingCart size={18} />
          <div>
            <p className="text-xs text-gray-500">Today's Sale</p>
            <h3 className="font-bold">₹0</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-blue-100 px-3 py-2 rounded-lg">
          <BadgeIndianRupee size={18} />
          <div>
            <p className="text-xs text-gray-500">Cash</p>
            <h3 className="font-bold">₹0</h3>
          </div>
        </div>

      </div>

      {/* Right */}
      <div className="flex items-center gap-4">

        <div className="flex items-center gap-2 text-green-600">
          <Wifi size={18} />
          <span className="text-sm font-medium">Online</span>
        </div>

        <div className="flex items-center gap-2 text-gray-700">
          <Clock3 size={18} />
          <span className="text-sm">
            {time.toLocaleTimeString()}
          </span>
        </div>

        <button className="relative">
          <Bell size={22} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">
            2
          </span>
        </button>

        <div className="flex items-center gap-2 border-l pl-4">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
            <User size={18} />
          </div>

          <div>
            <h4 className="font-semibold text-sm">
              Super Admin
            </h4>
            <p className="text-xs text-gray-500">
              NMMART07
            </p>
          </div>
        </div>

      </div>

    </header>
  );
};

export default POSHeader;