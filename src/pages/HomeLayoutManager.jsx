import React, { useState } from 'react';
import { 
  Layout, Eye, EyeOff, Save, RefreshCw, 
  MoveUp, MoveDown, Trash2, Plus, Image as ImageIcon 
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import { cn, generateUUID } from '../utils/helpers';
import { toast } from 'sonner';

export default function HomeLayoutManager({ homeConfig, banners, categories, fetchInitialData, uploadImage }) {
  const [items, setItems] = useState(homeConfig || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleReorder = (newOrder) => {
    setItems(newOrder);
  };

  const updateSection = (id, updates) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleSaveLayout = async () => {
    setIsSubmitting(true);
    try {
      const updatedItems = items.map((item, index) => ({
        ...item,
        order_index: index
      }));

      const res = await handleERPAction(DB_SCHEMA.HOME_CONFIG.table, ACTION_TYPES.BULK_UPSERT, updatedItems);
      if (res.success) {
        toast.success("Mobile App Home Layout updated!");
        fetchInitialData();
      } else throw new Error(res.error);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSection = async (id) => {
    if (!window.confirm("Delete this section from App Home?")) return;
    setItems(items.filter(i => i.id !== id));
    await handleERPAction(DB_SCHEMA.HOME_CONFIG.table, ACTION_TYPES.DELETE, { id });
    toast.info("Section removed");
  };

  const getSectionPreview = (item) => {
    switch (item.type) {
      case 'banner_slider':
        return <div className="h-24 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center gap-2"><ImageIcon size={16} className="text-blue-400" /> <span className="text-[9px] font-black text-blue-400">BANNER SLIDER</span></div>;
      case 'category_grid':
        return (
          <div className="grid grid-cols-4 gap-2 px-2">
            {[1,2,3,4].map(i => <div key={i} className="aspect-square bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-[7px] font-bold text-slate-300">CAT</div>)}
          </div>
        );
      case 'product_scroll':
        return (
          <div className="flex gap-2 overflow-hidden px-2">
            {[1,2,3].map(i => <div key={i} className="w-20 h-24 bg-white border border-slate-100 rounded-lg flex-shrink-0" />)}
          </div>
        );
      default: return <div className="h-12 bg-slate-50 rounded-lg border border-dashed border-slate-200" />;
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
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

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0 overflow-hidden">
        <div className="md:col-span-2 space-y-4 flex flex-col min-h-0">
          <div className="flex-1 bg-slate-100 p-4 rounded-3xl border-8 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="bg-white h-6 w-32 mx-auto rounded-b-2xl mb-4 flex-shrink-0"></div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-3 pb-8">
                {items.map((item) => (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    className={cn(
                      "bg-white rounded-xl border-2 transition-all cursor-move group",
                      item.is_active ? "border-transparent shadow-sm" : "border-dashed border-slate-200 opacity-50 grayscale"
                    )}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                            <Layout size={16} />
                          </div>
                          <div>
                            {editingId === item.id ? (
                              <input
                                autoFocus
                                className="text-[11px] font-black text-slate-800 uppercase outline-none border-b-2 border-blue-500 bg-transparent"
                                value={item.section_title}
                                onChange={(e) => updateSection(item.id, { section_title: e.target.value })}
                                onBlur={() => setEditingId(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                              />
                            ) : (
                              <h4
                                className="text-[11px] font-black text-slate-800 uppercase cursor-text flex items-center gap-2 group/title"
                                onClick={() => setEditingId(item.id)}
                              >
                                {item.section_title || item.type}
                                <Plus size={10} className="opacity-0 group-hover/title:opacity-100 transition-opacity" />
                              </h4>
                            )}
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.type.replace('_', ' ')} Section</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateSection(item.id, { is_active: !item.is_active }); }}
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
                      {item.is_active && getSectionPreview(item)}
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <Layout size={48} strokeWidth={1} />
                  <p className="text-xs font-black uppercase tracking-widest">No sections added yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-4">Active Banners</h3>
            <div className="space-y-3">
              {banners.slice(0, 4).map(banner => (
                <div
                  key={banner.id}
                  className="relative aspect-[21/9] rounded-lg overflow-hidden border border-slate-100 shadow-sm bg-gradient-to-br from-blue-100 to-blue-200"
                  style={{
                    backgroundImage: banner.image_url ? `url(${banner.image_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                    <span className="text-[8px] font-black text-white uppercase truncate">{banner.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
