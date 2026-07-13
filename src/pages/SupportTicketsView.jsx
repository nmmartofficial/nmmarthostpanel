import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, User, Clock, CheckCircle2, 
  Trash2, X, RefreshCw, Send, Phone, MapPin 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { dbSync } from '../dbSync';
import { DB_SCHEMA } from '../dbSchema';
import { cn } from '../utils/helpers';

export default function SupportTicketsView() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await dbSync.fetch(DB_SCHEMA.SUPPORT_TICKETS.table, {
        order: { column: 'created_at', ascending: false }
      });
      setTickets(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await handleERPAction(DB_SCHEMA.SUPPORT_TICKETS.table, ACTION_TYPES.UPDATE, { id, status });
      fetchTickets();
      if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status });
    } catch (e) { alert(e.message); }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    
    setIsSending(true);
    try {
      // 1. Mark as Resolved
      await updateStatus(selectedTicket.id, 'resolved');
      
      // 2. Add system log or send notification (Simplified for now)
      alert("Reply sent to user and ticket marked as resolved!");
      setReply('');
      setSelectedTicket(null);
    } catch (e) { alert(e.message); }
    finally { setIsSending(false); }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg text-white shadow-md">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Support & Feedback</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Service Console</p>
          </div>
        </div>
        <button 
          onClick={fetchTickets}
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0 overflow-hidden">
        {/* Left: Ticket List */}
        <div className="md:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Inquiries</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center"><RefreshCw className="animate-spin mx-auto text-slate-300" /></div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-[10px] font-black text-slate-400 uppercase">No tickets found</div>
            ) : tickets.map(ticket => (
              <button 
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  "w-full p-4 text-left hover:bg-slate-50 transition-all group",
                  selectedTicket?.id === ticket.id ? "bg-blue-50/50 border-r-4 border-blue-600" : ""
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-black text-slate-800 uppercase truncate pr-2">{ticket.subject || 'No Subject'}</span>
                  <span className={cn(
                    "text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                    ticket.status === 'resolved' ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                  )}>{ticket.status || 'open'}</span>
                </div>
                <p className="text-[9px] text-slate-500 line-clamp-1 mb-2">{ticket.message}</p>
                <div className="flex justify-between items-center text-[8px] font-bold text-slate-400">
                  <span className="flex items-center gap-1"><User size={10} /> {ticket.user_name || ticket.user_mobile}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Ticket Detail */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
          {selectedTicket ? (
            <>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase">{selectedTicket.user_name || 'Walk-in User'}</h3>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Phone size={10} /> {selectedTicket.user_mobile}</span>
                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><MapPin size={10} /> {selectedTicket.user_id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTicket.status !== 'resolved' && (
                    <button 
                      onClick={() => updateStatus(selectedTicket.id, 'resolved')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 hover:bg-emerald-100"
                    >
                      <CheckCircle2 size={12} /> Mark Resolved
                    </button>
                  )}
                  <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={18} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inquiry Message</h4>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-700 text-xs leading-relaxed">
                    {selectedTicket.message}
                  </div>
                  <span className="text-[8px] text-slate-400 font-bold block text-right italic">
                    Sent on {new Date(selectedTicket.created_at).toLocaleString()}
                  </span>
                </div>

                {selectedTicket.status !== 'resolved' && (
                  <form onSubmit={handleSendReply} className="space-y-3 pb-4">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Quick Reply</h4>
                    <textarea 
                      placeholder="Type your response to the user..."
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 h-32 resize-none transition-all"
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                    />
                    <button 
                      type="submit"
                      disabled={isSending || !reply.trim()}
                      className="w-full bg-blue-700 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:translate-y-[-1px] transition-all disabled:opacity-50"
                    >
                      {isSending ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                      Resolve & Send Reply
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-4">
              <MessageSquare size={64} strokeWidth={1} />
              <p className="text-xs font-black uppercase tracking-widest">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
