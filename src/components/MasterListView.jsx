import React, { useState } from 'react';
import { 
  Search, FileJson, Download, Plus, GitBranch, 
  Edit2, Eye, Trash2, Database, X, Save, RefreshCw, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateUUID } from '../utils/helpers';
import { handleERPAction, ACTION_TYPES, parseERPCSV } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import PaginationFooter from './PaginationFooter';

export default function MasterListView({ title, table, bucket, fields, data, uploadImage, fetchInitialData, customColumnMapping, ...relatedData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Helper to get full image URL from filename or URL
  const getImageUrl = (src) => {
    if (!src) return null;
    if (src.startsWith('http')) return src;
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
    return `${baseUrl}/storage/v1/object/public/category-images/${src}`;
  };
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Import Logic
  const handleImportCSV = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls'; // Accept both CSV and Excel files
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        // Check if file is an image
        if (file.type.startsWith('image/')) {
          throw new Error("यह फ़ाइल इमेज है! इमेज अपलोड करने के लिए 'Create New' बटन पर क्लिक करें, फिर फॉर्म में इमेज फील्ड चुनें!");
        }

        // First, fetch any related data we might need for select fields
        // For example, for subcategories, we need categories to map name to id
        let fetchedRelatedData = {};
        if (relatedData.categories) {
          fetchedRelatedData.categories = relatedData.categories;
        }
        if (relatedData.products) {
          fetchedRelatedData.products = relatedData.products;
        }

        // Create mapping from field labels to names
        const columnMapping = {};
        
        // First, add any top-level custom mappings
        if (customColumnMapping) {
          Object.entries(customColumnMapping).forEach(([key, value]) => {
            columnMapping[key] = value;
          });
        }
        
        // Then add standard mappings
        fields.forEach(f => {
          columnMapping[f.label] = f.name;
          columnMapping[f.name] = f.name; // also map actual name
          
          // Add common variations automatically
          const labelLower = f.label.toLowerCase();
          if (labelLower.includes('category')) {
            columnMapping['Category'] = f.name;
            columnMapping['Category Name'] = f.name;
          }
          if (labelLower.includes('subcategory')) {
            columnMapping['Subcategory'] = f.name;
            columnMapping['Sub Category'] = f.name;
          }
          if (labelLower.includes('name')) {
            columnMapping['Name'] = f.name;
          }
          if (labelLower.includes('active')) {
            columnMapping['Active'] = f.name;
            columnMapping['Is Active'] = f.name;
          }
        });
        
        console.log("Column mapping for import:", columnMapping);
        
        const parsedData = await parseERPCSV(file, columnMapping);
        if (parsedData.length === 0) throw new Error("No data found in file");

        // Process the data to map select fields (like category_id) from name to ID
        const processedData = parsedData.map(item => {
          const processedItem = { ...item };
          
          fields.forEach(field => {
            if (field.type === 'select' && processedItem[field.name]) {
              const value = processedItem[field.name];
              
              // If options are available, try to map name to value
              if (field.options && Array.isArray(field.options)) {
                const option = field.options.find(opt => 
                  String(opt.label).toLowerCase() === String(value).toLowerCase() || 
                  String(opt.value) === String(value)
                );
                if (option) {
                  processedItem[field.name] = option.value;
                }
              }
              
              // Special case for category_id: use relatedData.categories
              if (field.name === 'category_id' && fetchedRelatedData.categories) {
                const category = fetchedRelatedData.categories.find(c => 
                  String(c.name).toLowerCase() === String(value).toLowerCase() || 
                  String(c.id) === String(value)
                );
                if (category) {
                  processedItem[field.name] = category.id;
                }
              }
            }
          });
          
          return processedItem;
        });

        // Generate IDs for new records
        const recordsToInsert = processedData.map(item => ({
          ...item,
          id: item.id || generateUUID(),
          is_active: item.is_active !== undefined ? item.is_active : true
        }));

        console.log("Processed records to insert:", recordsToInsert);

        // Use insert instead of upsert
        const res = await handleERPAction(table, ACTION_TYPES.INSERT, recordsToInsert);
        if (res.success) {
          alert(`Successfully imported ${recordsToInsert.length} records!`);
          // Silent refresh after import to avoid UI flickering
          setTimeout(() => fetchInitialData(true, true), 500);
        } else {
          throw new Error(res.error);
        }
      } catch (error) {
        console.error("Import Error:", error);
        alert(`Import Failed: ${error.message}`);
      }
    };
    input.click();
  };

  const filteredData = (data || []).filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      for (const field of fields) {
        if (field.type === 'image') {
          if (finalData[`${field.name}_file`]) {
            const { url, error: uploadError } = await uploadImage(finalData[`${field.name}_file`], bucket || 'category-images');
            if (uploadError) throw new Error(`Image Upload Failed: ${uploadError}`);
            if (url) {
              finalData[field.name] = url;
              delete finalData[`${field.name}_file`];
            }
          }
          
          // No fallback - image fields can be null
          if (!finalData[field.name]) {
            finalData[field.name] = null;
          }
        } else if (field.type === 'boolean' && !(field.name in finalData)) {
          // Set default boolean to true if not provided
          finalData[field.name] = true;
        }
      }

      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        // Ensure all boolean fields have defaults for new items
        for (const field of fields) {
          if (field.type === 'boolean' && !(field.name in finalData)) {
            finalData[field.name] = true;
          }
        }
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) {
        throw new Error(`Database Error [Table: ${table}]: ${res.error}`);
      }

      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      
      // Force immediate refresh from server
      await fetchInitialData();
      
      alert(`${title.slice(0, -1)} saved successfully!`);
    } catch (error) {
      console.error("Form Submission Error:", error);
      alert(`Operation Failed!\n\nReason: ${error.message}\n\nPlease check your internet connection or database permissions.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Section matching Item Master style */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md">
            <GitBranch size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder={`Search ${title}...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-[10px] font-black focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400 text-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={async () => {
                console.log('[MasterListView Delete All] Button clicked! table:', table, 'data:', data);
                let confirmMessage = `Are you sure you want to delete ALL ${title}? This cannot be undone!`;
                if (table === DB_SCHEMA.CATEGORIES.table) {
                  confirmMessage = "ARE YOU SURE? This will PERMANENTLY DELETE ALL CATEGORIES and REMOVE THEM FROM ALL PRODUCTS!";
                } else if (table === DB_SCHEMA.SUBCATEGORIES.table) {
                  confirmMessage = "ARE YOU SURE? This will PERMANENTLY DELETE ALL SUBCATEGORIES and REMOVE THEM FROM ALL PRODUCTS!";
                } else if (table === DB_SCHEMA.BRANDS.table) {
                  confirmMessage = "ARE YOU SURE? This will PERMANENTLY DELETE ALL BRANDS and REMOVE THEM FROM ALL PRODUCTS!";
                }
                
                if (!window.confirm(confirmMessage)) {
                  console.log('[MasterListView Delete All] User cancelled');
                  return;
                }
                
                // Delete all records
                const itemsToDelete = data || [];
                console.log('[MasterListView Delete All] Items to delete:', itemsToDelete);
                for (const item of itemsToDelete) {
                  console.log('[MasterListView Delete All] Deleting item:', item);
                  const res = await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                  console.log('[MasterListView Delete All] Deleted item, response:', res);
                }
                console.log('[MasterListView Delete All] All items deleted, calling fetchInitialData');
                fetchInitialData();
                alert(`All ${title} deleted successfully!`);
              }}
              className="flex-1 md:flex-none bg-red-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-red-700 transition-all border border-red-600 shadow-sm"
            >
              <Trash2 size={14} /> Delete All
            </button>
            <button 
              onClick={handleImportCSV}
              className="flex-1 md:flex-none bg-white text-blue-600 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-blue-50 transition-all border border-blue-600 shadow-sm"
            >
              <FileJson size={14} /> Import
            </button>
            <button 
              onClick={() => handleERPAction(table, ACTION_TYPES.MAINTENANCE_EXPORT, { fileName: `${title}_Export` })}
              className="flex-1 md:flex-none bg-white text-slate-700 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
            >
              <Download size={14} className="text-blue-600" /> Export
            </button>
            <button 
              onClick={() => { 
                setEditingItem(null); 
                // Initialize form data with default values for fields
                const defaultFormData = {};
                fields.forEach(field => {
                  if (field.type === 'boolean') {
                    defaultFormData[field.name] = true;
                  }
                });
                setFormData(defaultFormData); 
                setShowForm(true); 
              }}
              className="flex-1 md:flex-none bg-blue-700 text-white px-5 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:translate-y-[-1px] transition-all"
            >
              <Plus size={14} /> Create New
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-16">SNo.</th>
                {fields.map(f => (
                  <th key={f.name} className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">{f.label}</th>
                ))}
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? paginatedData.map((item, index) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-4 py-3 text-[10px] font-black text-slate-400">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {fields.map(f => (
                    <td key={f.name} className="px-4 py-3">
                      {f.type === 'image' ? (
                        <div 
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-slate-500"
                          style={{
                            backgroundImage: getImageUrl(item[f.name]) ? `url(${getImageUrl(item[f.name])})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                          {(() => {
                            // Check if we have an image
                            if (getImageUrl(item[f.name])) {
                              // We'll use the background image, and show nothing else
                              return null;
                            }
                            // Otherwise, show placeholder text
                            return <span className="text-[8px] font-black uppercase">No Img</span>;
                          })()}
                        </div>
                      ) : f.type === 'boolean' ? (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                          item[f.name] ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                        )}>
                          {item[f.name] ? 'Active' : 'Inactive'}
                        </span>
                      ) : f.type === 'product-search' ? (
                        <span className="text-[10px] font-bold text-slate-700">
                          {relatedData.products?.find(p => p.id === item[f.name])?.name || item[f.name]}
                        </span>
                      ) : f.type === 'category-search' || f.name === 'category_id' ? (
                        <span className="text-[10px] font-bold text-slate-700">
                          {relatedData.categories?.find(c => c.id === item[f.name])?.name || item[f.name]}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-700">{item[f.name]}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100 shadow-sm hover:shadow-md"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={async () => {
                          const field = 'is_active' in item ? 'is_active' : ('is_allowed' in item ? 'is_allowed' : null);
                          if (field) {
                            await handleERPAction(table, ACTION_TYPES.UPDATE, { id: item.id, [field]: !item[field] });
                            fetchInitialData();
                          }
                        }}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all border border-transparent hover:border-amber-100 shadow-sm hover:shadow-md"
                        title="Toggle"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={async () => {
                          console.log('[MasterListView Delete] Button clicked! item:', item, 'table:', table);
                          // Confirmation for all master tables
                          let confirmMessage = "Are you sure you want to delete this entry permanently?";
                          if (table === DB_SCHEMA.PRODUCTS.table) {
                            confirmMessage = "ARE YOU SURE? This will permanently delete this Item Master entry!";
                          } else if (table === DB_SCHEMA.CATEGORIES.table) {
                            confirmMessage = "ARE YOU SURE? This will permanently delete this Category and it will be removed from all products!";
                          } else if (table === DB_SCHEMA.SUBCATEGORIES.table) {
                            confirmMessage = "ARE YOU SURE? This will permanently delete this Subcategory and it will be removed from all products!";
                          } else if (table === DB_SCHEMA.BRANDS.table) {
                            confirmMessage = "ARE YOU SURE? This will permanently delete this Brand and it will be removed from all products!";
                          }
                          
                          if (!window.confirm(confirmMessage)) {
                            console.log('[MasterListView Delete] User cancelled');
                            return;
                          }
                          
                          console.log('[MasterListView Delete] Calling handleERPAction');
                          const res = await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                          console.log('[MasterListView Delete] handleERPAction response:', res);
                          fetchInitialData();
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 shadow-sm hover:shadow-md"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={fields.length + 2} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Database size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No Records Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter 
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
          totalRecords={filteredData.length}
        />
      </div>


      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                      {title} [ {editingItem ? 'MODIFY' : 'NEW'} ]
                    </h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Enter details below to {editingItem ? 'update' : 'create'} record</p>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 hover:shadow-sm">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-5">
                  {fields.filter(f => !f.condition || f.condition(formData)).map(f => (
                    <div key={f.name} className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{f.label}</label>
                        {f.required && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Required</span>}
                      </div>
                      
                      {f.type === 'image' ? (
                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors group relative overflow-hidden">
                          <input 
                            type="file" 
                            onChange={(e) => setFormData({ ...formData, [`${f.name}_file`]: e.target.files[0] })}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shadow-sm flex-shrink-0">
                            {(formData[`${f.name}_file`] || formData[f.name]) ? (
                              <img 
                                src={formData[`${f.name}_file`] ? URL.createObjectURL(formData[`${f.name}_file`]) : formData[f.name]} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                <ImageIcon size={24} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                              {formData[`${f.name}_file`]?.name || 'Choose Image File'}
                            </p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Click or drag to upload</p>
                          </div>
                          {(formData[`${f.name}_file`] || formData[f.name]) && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({ ...formData, [f.name]: null, [`${f.name}_file`]: null });
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg z-20 hover:scale-110 transition-transform"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ) : f.type === 'product-search' ? (
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder={`Search product to link...`}
                            value={
                              formData[f.name] 
                                ? (relatedData.products?.find(p => p.id === formData[f.name])?.name || productSearchTerm)
                                : productSearchTerm
                            }
                            onChange={(e) => {
                              setProductSearchTerm(e.target.value);
                              setShowProductDropdown(true);
                            }}
                            onFocus={() => setShowProductDropdown(true)}
                            onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-900 shadow-sm placeholder-slate-300"
                            required={f.required}
                          />
                          <AnimatePresence>
                            {showProductDropdown && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto"
                              >
                                {(relatedData.products || [])
                                  .filter(p => p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                  .slice(0, 5)
                                  .map(product => (
                                    <button
                                      key={product.id}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, [f.name]: product.id });
                                        setProductSearchTerm(product.name);
                                        setShowProductDropdown(false);
                                      }}
                                      className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-700 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                                    >
                                      {product.name}
                                    </button>
                                  ))
                                }
                                {(relatedData.products || []).filter(p => p.name?.toLowerCase().includes(productSearchTerm.toLowerCase())).length === 0 && (
                                  <div className="px-4 py-4 text-[11px] font-bold text-slate-400 text-center">
                                    No products found
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : f.type === 'category-search' ? (
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder={`Search category to link...`}
                            value={
                              formData[f.name] 
                                ? (relatedData.categories?.find(c => c.id === formData[f.name])?.name || categorySearchTerm)
                                : categorySearchTerm
                            }
                            onChange={(e) => {
                              setCategorySearchTerm(e.target.value);
                              setShowCategoryDropdown(true);
                            }}
                            onFocus={() => setShowCategoryDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-900 shadow-sm placeholder-slate-300"
                            required={f.required}
                          />
                          <AnimatePresence>
                            {showCategoryDropdown && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto"
                              >
                                {(relatedData.categories || [])
                                  .filter(c => c.name?.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                                  .slice(0, 5)
                                  .map(category => (
                                    <button
                                      key={category.id}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, [f.name]: category.id });
                                        setCategorySearchTerm(category.name);
                                        setShowCategoryDropdown(false);
                                      }}
                                      className="w-full px-4 py-3 text-left text-[11px] font-bold text-slate-700 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                                    >
                                      {category.name}
                                    </button>
                                  ))
                                }
                                {(relatedData.categories || []).filter(c => c.name?.toLowerCase().includes(categorySearchTerm.toLowerCase())).length === 0 && (
                                  <div className="px-4 py-4 text-[11px] font-bold text-slate-400 text-center">
                                    No categories found
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : f.type === 'select' ? (
                        <select 
                          value={formData[f.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-900 appearance-none shadow-sm"
                          required={f.required}
                        >
                          <option value="">Select {f.label}</option>
                          {f.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : f.type === 'boolean' ? (
                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, [f.name]: !formData[f.name] })}
                            className={cn(
                              "w-12 h-6 rounded-full transition-all relative shadow-inner",
                              formData[f.name] ? "bg-emerald-500" : "bg-slate-300"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                              formData[f.name] ? "left-7" : "left-1"
                            )} />
                          </button>
                          <div>
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{formData[f.name] ? 'ACTIVE' : 'INACTIVE'}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Visibility Status</p>
                          </div>
                        </div>
                      ) : (
                        <input 
                          type={f.type || 'text'}
                          placeholder={`Enter ${f.label.toLowerCase()}...`}
                          value={formData[f.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-900 shadow-sm placeholder-slate-300"
                          required={f.required}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-slate-100 text-slate-500 font-black py-3.5 rounded-xl uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all shadow-sm"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-700 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    {editingItem ? 'Update Record' : 'Confirm Entry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
