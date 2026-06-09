import React, { useState } from 'react';
import { Bell, Package, CheckCircle2, Send, RefreshCw, Users } from 'lucide-react';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import { cn, generateUUID } from '../utils/helpers';

export default function NotificationsView({ notifications, fetchInitialData }) {
  const [activeTab, setActiveTab] = useState('system'); // 'system' or 'user'
  const [userNotif, setUserNotif] = useState({ title: '', message: '', target: 'all' });
  const [isSending, setIsSending] = useState(false);

  const markAsRead = async (id) => {
    try {
      await handleERPAction(DB_SCHEMA.NOTIFICATIONS.table, ACTION_TYPES.UPDATE, { id, is_read: true });
      fetchInitialData();
    } catch (e) { console.error(e); }
  };

  const handleSendUserNotification = async (e) => {
    e.preventDefault();
    if (!userNotif.title || !userNotif.message) return alert("Please fill title and message");
    
    setIsSending(true);
    try {
      const payload = {
        id: generateUUID(),
        title: userNotif.title,
        message: userNotif.message,
        type: 'promotion',
        target_audience: userNotif.target,
        created_at: new Date().toISOString(),
        is_read: false
      };

      // Assuming we have a 'user_notifications' table or we use the same notifications table with a flag
      const res = await handleERPAction(DB_SCHEMA.NOTIFICATIONS.table, ACTION_TYPES.INSERT, payload);
      
      if (res.success) {
        alert("Notification sent to all users!");
        setUserNotif({ title: '', message: '', target: 'all' });
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      alert("Failed to send: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Tab Switcher */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit">
        <button 
          onClick={() => setActiveTab('system')}
          className={cn(
            "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'system' ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <Bell size={14} /> System Alerts
        </button>
        <button 
          onClick={() => setActiveTab('user')}
          className={cn(
            "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'user' ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <Users size={14} /> Send to App Users
        </button>
      </div>

      {activeTab === 'system' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">System Notifications</h3>
            <button 
              onClick={async () => {
                const unread = notifications.filter(n => !n.is_read);
                await Promise.all(unread.map(n => handleERPAction(DB_SCHEMA.NOTIFICATIONS.table, ACTION_TYPES.UPDATE, { id: n.id, is_read: true })));
                fetchInitialData();
              }}
              className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest"
            >
              Mark all as read
            </button>
          </div>

          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                <Bell size={40} className="mx-auto text-slate-200 mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No notifications found</p>
              </div>
            ) : notifications.map((n) => (
              <div key={n.id} className={cn(
                "bg-white p-4 rounded-xl border transition-all flex items-start gap-4",
                n.is_read ? "border-slate-100 opacity-60" : "border-blue-100 shadow-sm shadow-blue-50"
              )}>
                <div className={cn(
                  "p-2 rounded-lg",
                  n.type === 'low_stock' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                )}>
                  {n.type === 'low_stock' ? <Package size={16} /> : <Bell size={16} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{n.title}</h4>
                    <span className="text-[8px] font-bold text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 mt-1">{n.message}</p>
                  {!n.is_read && (
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="mt-3 text-[8px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
                    >
                      <CheckCircle2 size={10} /> Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-600 rounded-xl text-white">
              <Send size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter">Push Notification Console</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Send real-time alerts to all app users</p>
            </div>
          </div>

          <form onSubmit={handleSendUserNotification} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Notification Title</label>
              <input 
                type="text" 
                placeholder="e.g. Special Offer: 50% OFF on Fruits!"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                value={userNotif.title}
                onChange={e => setUserNotif({...userNotif, title: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Message Body</label>
              <textarea 
                placeholder="Enter the detailed message here..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 h-32 resize-none"
                value={userNotif.message}
                onChange={e => setUserNotif({...userNotif, message: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Target Audience</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                  value={userNotif.target}
                  onChange={e => setUserNotif({...userNotif, target: e.target.value})}
                >
                  <option value="all">All Registered Users</option>
                  <option value="active">Active Last 7 Days</option>
                  <option value="new">New Users (Last 24h)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Action Type</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                  <option value="none">Just Open App</option>
                  <option value="category">Open Category Page</option>
                  <option value="product">Open Product Page</option>
                  <option value="offer">Open Offers Page</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSending}
              className="w-full bg-blue-700 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-blue-200 flex items-center justify-center gap-3 hover:translate-y-[-1px] transition-all"
            >
              {isSending ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
              Send Broadcast Notification
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
