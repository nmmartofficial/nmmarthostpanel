import React, { useState } from 'react';
import { 
  Layout, Eye, EyeOff, Save, RefreshCw, 
  MoveUp, MoveDown, Trash2, Plus, Image as ImageIcon 
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import { cn, generateUUID } from '../utils/helpers';

export default function HomeLayoutManager({ homeConfig, banners, fetchInitialData, uploadImage }) {
  const [items, setItems] = useState(homeConfig || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);

  const handleReorder = (newOrder) => {
    setItems(newOrder);
  };

  const toggleVisibility = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, is_active: !item.is_active } : item
    ));
  };

  const handleSaveLayout = async () => {
    setIsSubmitting(true);
    try {
      // Update order index for each item
      const updatedItems = items.map((item, index) => ({
        ...item,
        order_index: index
      }));

      const res = await handleERPAction(DB_SCHEMA.HOME_CONFIG.table, ACTION_TYPES.BULK_UPSERT, updatedItems);
      if (res.success) {
        alert("Home Layout Saved Successfully!");
        fetchInitialData();
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      alert("Save Failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSection = async (id) => {
    if (!window.confirm("Are you sure you want to delete this section?")) return;
    try {
      const res = await handleERPAction(DB_SCHEMA.HOME_CONFIG.table, ACTION_TYPES.DELETE, { id });
      if (res.success) {
        setItems(items.filter(i => i.id !== id));
        fetchInitialData();
      }
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Layout size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Home Layout Manager</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Visual App Builder</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddSection(true)}
            className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-lg font-black uppercase text-[10px] flex items-center gap-2 hover:bg-blue-50 transition-all"
          >
            <Plus size={14} /> Add Section
          </button>
          <button 
            onClick={handleSaveLayout}
            disabled={isSubmitting}
            className="bg-blue-700 text-white px-6 py-2 rounded-lg font-black uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-blue-200 hover:translate-y-[-1px] transition-all"
          >
            {isSubmitting ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
            Save App Layout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Preview & Editor */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-slate-100 p-4 rounded-3xl border-8 border-slate-800 shadow-2xl min-h-[600px] relative overflow-hidden">
            <div className="bg-white h-6 w-32 mx-auto rounded-b-2xl mb-4"></div> {/* Phone Notch */}
            
            <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-3">
              {items.map((item) => (
                <Reorder.Item 
                  key={item.id} 
                  value={item}
                  className={cn(
                    "bg-white rounded-xl border-2 transition-all cursor-move group",
                    item.is_active ? "border-transparent shadow-sm" : "border-dashed border-slate-200 opacity-50 grayscale"
                  )}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                        <Layout size={16} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-slate-800 uppercase">{item.section_title || item.type}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.type} Section</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(item.id); }}
                        className={cn(
                          "p-1.5 rounded-md transition-all",
                          item.is_active ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-100"
                        )}
                      >
                        {item.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteSection(item.id); }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 space-y-4">
                <Layout size={48} strokeWidth={1} />
                <p className="text-xs font-black uppercase tracking-widest">No sections added yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Tools */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-4">Active Banners</h3>
            <div className="space-y-3">
              {banners.slice(0, 4).map(banner => (
                <div key={banner.id} className="relative aspect-[21/9] rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                    <span className="text-[8px] font-black text-white uppercase truncate">{banner.title}</span>
                  </div>
                </div>
              ))}
              <button className="w-full py-2 text-[9px] font-black text-blue-600 uppercase hover:bg-blue-50 rounded-lg transition-all border border-dashed border-blue-200">
                Manage All Banners
              </button>
            </div>
          </div>

          <div className="bg-blue-700 p-5 rounded-xl text-white shadow-lg space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest">App Theme Colors</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[8px] font-bold opacity-70 uppercase">Primary</p>
                <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-lg border border-white/10">
                  <div className="w-4 h-4 rounded bg-[#FFC107]"></div>
                  <span className="text-[9px] font-black uppercase">#FFC107</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-bold opacity-70 uppercase">Secondary</p>
                <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-lg border border-white/10">
                  <div className="w-4 h-4 rounded bg-[#212121]"></div>
                  <span className="text-[9px] font-black uppercase">#212121</span>
                </div>
              </div>
            </div>
            <button className="w-full bg-white text-blue-700 py-2 rounded-lg text-[9px] font-black uppercase shadow-md">Change Theme</button>
          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      <AnimatePresence>
        {showAddSection && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-800 uppercase">Add New App Section</h3>
                <button onClick={() => setShowAddSection(false)} className="p-1 hover:bg-white rounded-lg border border-slate-200 transition-all"><Plus className="rotate-45" size={18} /></button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {[
                  { type: 'banner_slider', label: 'Banner Slider', icon: <ImageIcon size={20} /> },
                  { type: 'category_grid', label: 'Categories Grid', icon: <Layout size={20} /> },
                  { type: 'product_scroll', label: 'Product Scroller', icon: <RefreshCw size={20} /> },
                  { type: 'promo_banner', label: 'Single Promo', icon: <ImageIcon size={20} /> },
                ].map(type => (
                  <button 
                    key={type.type}
                    onClick={async () => {
                      const newSection = {
                        id: generateUUID(),
                        type: type.type,
                        section_title: `New ${type.label}`,
                        is_active: true,
                        order_index: items.length
                      };
                      setItems([...items, newSection]);
                      setShowAddSection(false);
                    }}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-50 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="text-slate-400 group-hover:text-blue-600 transition-colors">{type.icon}</div>
                    <span className="text-[10px] font-black text-slate-600 uppercase">{type.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
