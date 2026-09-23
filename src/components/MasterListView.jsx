import React, { useEffect, useState } from 'react';
import { 
  Search, FileJson, Download, Plus, GitBranch, 
  Edit2, Eye, Trash2, Database, X, Save, RefreshCw, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateUUID } from '../utils/helpers';
import { secureStorage } from '../utils/security';
import { handleERPAction, ACTION_TYPES, parseERPCSV } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import { toast } from 'sonner';
import PaginationFooter from './PaginationFooter';

const parseLinkedProductIds = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string') return value == null || value === '' ? [] : [String(value)];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch (_) {
    // Legacy single IDs and comma-separated values are handled below.
  }
  return value.split(',').map((id) => id.trim()).filter(Boolean);
};

const getProductBarcodeValue = (product) => String(
  product?.barcode ?? product?.Barcode ?? product?.bar_code ?? product?.rawcode ?? product?.RawCodeNew ?? ''
).trim();

const getProductDisplayName = (product) => String(
  product?.name ?? product?.itname ?? product?.item_name ?? product?.product_name ?? product?.RawName ?? ''
).trim();

export default function MasterListView({ title, table, bucket, fields, data, uploadImage, fetchInitialData, loading, customColumnMapping, filterField, filterOptions = [], ...relatedData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [masterFilter, setMasterFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [multiProductSearchTerm, setMultiProductSearchTerm] = useState('');

  const hasMultiProductField = fields.some((field) => field.type === 'product-multi-search');
  const selectedProducts = (relatedData.products || []).filter((product) =>
    selectedProductIds.some((id) => String(id) === String(product.id))
  );

  const addLinkedProduct = (product) => {
    if (!product) return;
    const productId = String(product.id);
    const nextIds = [...new Set([...parseLinkedProductIds(formData.link_id), productId])];
    setSelectedProductIds(nextIds);
    setFormData((current) => ({ ...current, link_id: JSON.stringify(nextIds) }));
    setMultiProductSearchTerm('');
  };

  const removeLinkedProduct = (productId) => {
    setSelectedProductIds((current) => {
      const next = current.filter((id) => String(id) !== String(productId));
      setFormData((currentForm) => ({ ...currentForm, link_id: JSON.stringify(next) }));
      return next;
    });
  };

  // Helper to get full image URL from filename or URL
  const getImageUrl = (src) => {
    if (!src) return null;
    if (src.startsWith('http')) return src;
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!baseUrl) {
      console.error('VITE_SUPABASE_URL environment variable is not set');
      return null;
    }
    return `${baseUrl}/storage/v1/object/public/${bucket || 'images'}/${src}`;
  };
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedData.map(item => item.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = async (status) => {
    if (!window.confirm(`Change status for ${selectedIds.length} items to ${status ? 'Active' : 'Inactive'}?`)) return;
    setIsSubmitting(true);
    try {
      const updates = selectedIds.map(id => ({ id, is_active: status }));
      const res = await handleERPAction(table, ACTION_TYPES.BULK_UPSERT, updates);
      if (res.success) {
        toast.success(`Successfully updated ${selectedIds.length} items`);
        setSelectedIds([]);
        fetchInitialData();
      } else throw new Error(res.error);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`PERMANENTLY DELETE ${selectedIds.length} items? This cannot be undone!`)) return;
    setIsSubmitting(true);
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        const res = await handleERPAction(table, ACTION_TYPES.DELETE, { id }, true);
        if (res.success) successCount++;
      }
      toast.success(`Deleted ${successCount} items`);
      setSelectedIds([]);
      fetchInitialData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        const userData = secureStorage.getItem('nm_user_data');
        const shopId = userData?.shop_id;

        const recordsToInsert = processedData.map(item => {
          const { id, ...rest } = item;
          return {
            ...rest,
            ...(Number.isInteger(id) ? { id } : {}),
            shop_id: shopId,
            is_active: item.is_active !== undefined ? item.is_active : true
          };
        });

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
    (!filterField || !masterFilter || String(item?.[filterField] || '') === masterFilter) &&
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredField = fields.find((field) => {
  if (!field.required) return false;

  // Image field: check uploaded file OR existing image URL
  if (field.type === 'image') {
    const imageFile = formData[`${field.name}_file`];
    const imageUrl = formData[field.name];

    return !imageFile && (!imageUrl || String(imageUrl).trim() === '');
  }

  // Normal fields
  return (
    formData[field.name] === undefined ||
    formData[field.name] === null ||
    String(formData[field.name]).trim() === ''
  );
});

if (requiredField) {
  toast.error(`${requiredField.label || requiredField.name} is required`);
  return;
}

    const numericError = fields.find((field) => field.type === 'number' && formData[field.name] !== undefined && formData[field.name] !== '' && !Number.isFinite(Number(formData[field.name])));
    if (numericError) {
      toast.error(`${numericError.label || numericError.name} must be a valid number`);
      return;
    }

    // --- Detailed Validation Bariki ---
    if (table === DB_SCHEMA.PRODUCTS.table) {
      if (formData.sale_rate > formData.mrp) {
        toast.error("Sale Rate cannot be higher than MRP!");
        return;
      }
    }

    if (table === DB_SCHEMA.CATEGORIES.table) {
      const name = String(formData.name || '').trim();
      if (name) {
        const duplicateCategory = (data || []).find((item) => item && String(item.name || '').trim().toLowerCase() === name.toLowerCase() && String(item.id) !== String(editingItem?.id || ''));
        if (duplicateCategory) {
          toast.error(`Category "${name}" already exists. Please use the existing category or edit it instead.`);
          return;
        }
      }
    }

    if (table === DB_SCHEMA.SUBCATEGORIES.table) {
      const name = String(formData.name || '').trim();
      const categoryId = formData.category_id ? Number(formData.category_id) : null;
      const parentCategory = (relatedData.categories || []).find((category) => Number(category.id) === categoryId);
      if (!parentCategory) {
        toast.error('A valid parent category is required');
        return;
      }
      if (name && categoryId) {
        const duplicateSubcategory = (data || []).find((item) => {
          if (!item || String(item.id) === String(editingItem?.id || '')) return false;
          return (
            String(item.name || '').trim().toLowerCase() === name.toLowerCase() &&
            Number(item.category_id) === categoryId
          );
        });

        if (duplicateSubcategory) {
          toast.error(`Subcategory "${name}" already exists under this category. Duplicate subcategories are not allowed.`);
          return;
        }
      }
    }

    if (table === DB_SCHEMA.BRANDS.table) {
      const name = String(formData.name || '').trim();
      if (name) {
        const duplicateBrand = (data || []).find((item) => item && String(item.name || '').trim().toLowerCase() === name.toLowerCase() && String(item.id) !== String(editingItem?.id || ''));
        if (duplicateBrand) {
          toast.error(`Brand "${name}" already exists. Please reuse the existing brand instead of creating a duplicate.`);
          return;
        }
      }
    }

    if ([DB_SCHEMA.UNITS.table, DB_SCHEMA.DEPARTMENTS.table].includes(table)) {
      const name = String(formData.name || '').trim().toLowerCase();
      const code = String(formData.code || '').trim().toLowerCase();
      const duplicate = (data || []).find((item) => {
        if (String(item.id) === String(editingItem?.id || '')) return false;
        return (name && String(item.name || '').trim().toLowerCase() === name)
          || (code && String(item.code || '').trim().toLowerCase() === code);
      });
      if (duplicate) {
        toast.error('A record with the same name or code already exists');
        return;
      }
    }

    if (table === DB_SCHEMA.COUPONS.table) {
      const code = String(formData.code || '').trim().toUpperCase();
      const duplicate = (data || []).find((item) => String(item.id) !== String(editingItem?.id || '') && String(item.code || '').trim().toUpperCase() === code);
      if (duplicate) {
        toast.error(`Coupon code "${code}" already exists`);
        return;
      }
      if (Number(formData.discount_value) < 0 || Number(formData.min_order_amount || 0) < 0) {
        toast.error('Coupon amounts cannot be negative');
        return;
      }
    }

    if (table === DB_SCHEMA.USERS.table || table === DB_SCHEMA.DELIVERY_CUSTOMERS.table) {
      if (formData.mobile && !/^[6-9]\d{9}$/.test(formData.mobile)) {
        toast.error("Invalid Mobile Number! Please enter 10 digits.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
        if (hasMultiProductField) {
          finalData.link_id = JSON.stringify(selectedProductIds);
        }
      const allowedKeys = new Set(fields.map(f => f.name));

      for (const field of fields) {
        if (field.type === 'image') {
          if (finalData[`${field.name}_file`]) {
            const { url, error: uploadError } = await uploadImage(finalData[`${field.name}_file`], bucket || 'images');
            if (uploadError) throw new Error(`Image Upload Failed: ${uploadError}`);
            if (url) {
              finalData[field.name] = url;
              delete finalData[`${field.name}_file`];
            }
          }

          if (!finalData[field.name]) {
            finalData[field.name] = null;
          }
        } else if (field.type === 'boolean' && !(field.name in finalData)) {
          finalData[field.name] = true;
        }
      }

      for (const key of Object.keys(finalData)) {
        if (!allowedKeys.has(key) && !key.endsWith('_file')) {
          delete finalData[key];
        }
      }

      if (table === DB_SCHEMA.CATEGORIES.table || table === DB_SCHEMA.SUBCATEGORIES.table || table === DB_SCHEMA.BRANDS.table || table === DB_SCHEMA.BANNERS.table) {
        if (finalData.name && typeof finalData.name === 'string') {
          finalData.name = finalData.name.trim();
        }
        if (finalData.description && typeof finalData.description === 'string') {
          finalData.description = finalData.description.trim();
        }
      }

      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        // ID removed to let Database handle auto-incrementing numbers (1, 2, 3...)
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) {
        throw new Error(`Database Error [Table: ${table}]: ${res.error}`);
      }

      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      
      // Force immediate refresh from server so the new record appears in the UI right away
      await fetchInitialData(true, true);
      
      alert(`${title.slice(0, -1)} saved successfully!`);
    } catch (error) {
      console.error("Form Submission Error:", error);
      alert(`Operation Failed!\n\nReason: ${error.message}\n\nPlease check your internet connection or database permissions.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMultiProductPicker = () => {
    const term = multiProductSearchTerm.trim().toLowerCase();
    const matches = (relatedData.products || []).filter((product) =>
      (getProductDisplayName(product).toLowerCase().includes(term) || getProductBarcodeValue(product).toLowerCase().includes(term))
      && !selectedProductIds.some((id) => String(id) === String(product.id))
    );
    const addFromInput = () => {
      if (!term) return;

      const exactByBarcode = (relatedData.products || []).find((product) => getProductBarcodeValue(product).toLowerCase() === term);
      if (exactByBarcode) {
        addLinkedProduct(exactByBarcode);
        return;
      }

      const exactByName = (relatedData.products || []).find((product) => getProductDisplayName(product).toLowerCase() === term);
      if (exactByName) {
        addLinkedProduct(exactByName);
        return;
      }

      if (matches.length > 0) {
        addLinkedProduct(matches[0]);
      }
    };
    return <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search product name or scan barcode..."
          value={multiProductSearchTerm}
          onChange={(e) => setMultiProductSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              addFromInput();
            }
          }}
          className="min-w-0 flex-1 bg-white border-2 border-neutral-100 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-primary-500 outline-none"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addFromInput();
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary-700"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {term && <div className="max-h-52 overflow-y-auto rounded-xl border border-neutral-100 bg-white shadow-sm">{matches.map((product) => <button key={product.id} type="button" onClick={() => addLinkedProduct(product)} className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-slate-700 hover:bg-blue-50 border-b border-slate-100 last:border-0">{getProductDisplayName(product)} {getProductBarcodeValue(product) ? `(${getProductBarcodeValue(product)})` : ''}</button>)}{matches.length === 0 && <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500">Product Not Found</div>}</div>}
      {selectedProducts.length > 0 && <div className="flex flex-wrap gap-2">{selectedProducts.map((product) => <span key={product.id} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700">{getProductDisplayName(product)}<button type="button" onClick={() => removeLinkedProduct(product.id)} className="text-blue-500 hover:text-red-600" aria-label={`Remove ${getProductDisplayName(product)}`}><X size={13} /></button></span>)}</div>}
    </div>;
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Header Section matching Item Master style */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-neutral-200 shadow-enterprise flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600 rounded-lg text-white shadow-md">
            <GitBranch size={20} />
          </div>
          <h2 className="text-base font-black text-neutral-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input 
              type="text"
              placeholder={`Search ${title}...`}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-4 py-2 text-[10px] font-black focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-neutral-400 text-neutral-900 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {filterField && filterOptions.length > 0 && (
            <select
              value={masterFilter}
              onChange={(e) => setMasterFilter(e.target.value)}
              className="w-full md:w-52 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-700 outline-none"
            >
              <option value="">All Placements</option>
              {filterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          )}
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={async () => {
                console.log('[MasterListView Delete All] Button clicked! table:', table, 'data:', data);
                let confirmMessage = `क्या आप वाकई सभी ${title} को PERMANENTLY DELETE करना चाहते हैं? ये वापस नहीं लाया जा सकता!`;
                if (table === DB_SCHEMA.CATEGORIES.table) {
                  confirmMessage = "क्या आप वाकई SURE हैं? ये सभी CATEGORIES को soft delete करेगा (hide कर देगा)!";
                } else if (table === DB_SCHEMA.SUBCATEGORIES.table) {
                  confirmMessage = "क्या आप वाकई SURE हैं? ये सभी SUBCATEGORIES को soft delete करेगा (hide कर देगा)!";
                } else if (table === DB_SCHEMA.BRANDS.table) {
                  confirmMessage = "क्या आप वाकई SURE हैं? ये सभी BRANDS को soft delete करेगा (hide कर देगा)!";
                }
                
                if (!window.confirm(confirmMessage)) {
                  console.log('[MasterListView Delete All] User cancelled');
                  return;
                }
                
                // Delete all records
                const itemsToDelete = data || [];
                console.log('[MasterListView Delete All] Items to delete:', itemsToDelete);
                let hasError = false;
                let firstErrorMsg = null;
                
                for (const item of itemsToDelete) {
                  console.log('[MasterListView Delete All] Deleting item:', item);
                  const res = await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                  console.log('[MasterListView Delete All] Deleted item, response:', res);
                  
                  if (!res.success) {
                    hasError = true;
                    if (!firstErrorMsg) {
                      firstErrorMsg = res.error;
                    }
                    break; // Stop at first error
                  }
                }
                
                if (hasError) {
                  if (firstErrorMsg && firstErrorMsg.startsWith('409_CONFLICT:')) {
                    const errorMsg = firstErrorMsg.replace('409_CONFLICT:', '');
                    alert(`⚠️ SAB DELETE NAHI HO PAYE!\n\n${errorMsg}\n\nकृपया पहले जुड़े Records को हटाएँ!`);
                  } else {
                    alert(`Delete All Failed!\n\n${firstErrorMsg}`);
                  }
                } else {
                  console.log('[MasterListView Delete All] All items processed, refreshing from Supabase');
                  await fetchInitialData(true, true);
                  alert(`सभी ${title} सफलतापूर्वक DELETE कर दिए गए!`);
                }
              }}
              className="flex-1 md:flex-none bg-red-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-red-700 transition-all border border-red-600 shadow-sm"
            >
              <Trash2 size={14} /> Delete All
            </button>
            <button 
              onClick={handleImportCSV}
              className="flex-1 md:flex-none bg-white text-primary-600 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-primary-50 transition-all border border-primary-600 shadow-sm"
            >
              <FileJson size={14} /> Import
            </button>
            <button 
              onClick={() => handleERPAction(table, ACTION_TYPES.MAINTENANCE_EXPORT, { fileName: `${title}_Export` })}
              className="flex-1 md:flex-none bg-white text-neutral-700 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all border border-neutral-200 shadow-sm"
            >
              <Download size={14} className="text-primary-600" /> Export
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
              className="flex-1 md:flex-none bg-primary-600 text-white px-5 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 hover:translate-y-[-1px] transition-all hover:bg-primary-700"
            >
              <Plus size={14} /> Create New
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-enterprise flex flex-col relative">
        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-0 left-0 right-0 z-20 bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-black uppercase tracking-widest bg-blue-600 px-3 py-1 rounded-full">{selectedIds.length} Selected</span>
                <button onClick={() => setSelectedIds([])} className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest">Clear Selection</button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleBulkStatus(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                  <RefreshCw size={14} /> Activate
                </button>
                <button onClick={() => handleBulkStatus(false)} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                  <X size={14} /> Inactivate
                </button>
                <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                  <Trash2 size={14} /> Bulk Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse sticky-header">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-4 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedData.length && paginatedData.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-neutral-500 uppercase tracking-widest w-16">SNo.</th>
                {fields.map((f, i) => (
                  <th
                    key={f.name}
                    className={cn(
                      "px-4 py-4 text-[9px] font-black text-neutral-500 uppercase tracking-widest",
                      i > 1 && "hidden md:table-cell"
                    )}
                  >
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-4 text-[9px] font-black text-neutral-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 table-striped">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4 w-12"><div className="h-4 bg-slate-100 rounded w-4 mx-auto" /></td>
                    <td className="px-4 py-4 w-16"><div className="h-4 bg-slate-100 rounded w-8" /></td>
                    {fields.map((_, idx) => (
                      <td key={idx} className={cn("px-4 py-4", idx > 1 && "hidden md:table-cell")}>
                        <div className="h-4 bg-slate-50 rounded w-full" />
                      </td>
                    ))}
                    <td className="px-4 py-4"><div className="h-8 bg-slate-50 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : paginatedData.length > 0 ? paginatedData.map((item, index) => (
                <tr
                  key={item.id}
                  className={cn(
                    "odd:bg-white even:bg-slate-100 hover:bg-primary-50 transition-colors group",
                    selectedIds.includes(item.id) && "bg-blue-50/50"
                  )}
                >
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-[10px] font-black text-neutral-400">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {fields.map((f, i) => (
                    <td
                      key={f.name}
                      className={cn(
                        "px-4 py-3",
                        i > 1 && "hidden md:table-cell"
                      )}
                    >
                      {f.type === 'image' ? (
                        <div 
                          className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-300"
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
                            return <ImageIcon size={14} />;
                          })()}
                        </div>
                      ) : f.type === 'boolean' ? (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                          item[f.name] ? "bg-success-50 text-success-700 border border-success-100" : "bg-error-50 text-error-700 border border-error-100"
                        )}>
                          {item[f.name] ? 'Active' : 'Inactive'}
                        </span>
                      ) : f.type === 'product-multi-search' ? (
                        <span className="text-[10px] font-bold text-neutral-700">
                          {parseLinkedProductIds(item[f.name]).map((id) => getProductDisplayName((relatedData.products || []).find((product) => String(product.id) === String(id))) || id).join(', ') || '-'}
                        </span>
                      ) : f.type === 'product-search' ? (
                        <span className="text-[10px] font-bold text-neutral-700">
                          {relatedData.products?.find(p => p.id === item[f.name])?.name || item[f.name]}
                        </span>
                      ) : f.type === 'category-search' || f.name === 'category_id' ? (
                        <span className="text-[10px] font-bold text-neutral-700">
                          {relatedData.categories?.find(c => c.id === item[f.name])?.name || item[f.name]}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-neutral-700">{item[f.name]}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setFormData(item);
                          setSelectedProductIds(parseLinkedProductIds(item.link_id));
                          setMultiProductSearchTerm('');
                          setShowForm(true);
                        }}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all border border-transparent hover:border-primary-100 shadow-sm hover:shadow-md"
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
                        className="p-2 text-warning-600 hover:bg-warning-50 rounded-lg transition-all border border-transparent hover:border-warning-100 shadow-sm hover:shadow-md"
                        title="Toggle"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={async () => {
                          console.log('[MasterListView Delete] Button clicked! item:', item, 'table:', table);
                          // Confirmation for all master tables
                          let confirmMessage = "क्या आप वाकई इस entry को DELETE करना चाहते हैं?";
                          if (table === DB_SCHEMA.PRODUCTS.table) {
                            confirmMessage = "क्या आप वाकई SURE हैं? ये इस Item Master entry को DELETE कर देगा!";
                          } else if (table === DB_SCHEMA.CATEGORIES.table) {
                            confirmMessage = "क्या आप वाकई SURE हैं? ये इस Category को hide कर देगा!";
                          }
                          
                          if (!window.confirm(confirmMessage)) return;
                          
                          const res = await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });

                          if (res.success) {
                            toast.success(`${title.slice(0, -1)} permanently deleted`);
                            await fetchInitialData(true, true);
                          } else {
                            if (res.error && res.error.startsWith('409_CONFLICT:')) {
                              alert(`⚠️ DELETE नहीं हो पाया!\n\n${res.error.replace('409_CONFLICT:', '')}`);
                            } else {
                              toast.error(`Delete Failed: ${res.error}`);
                            }
                          }
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
                  <td colSpan={fields.length + 3} className="px-4 py-20 text-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                        <Database size={40} className="text-slate-200" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-widest">No {title} Found</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Get started by creating your first entry</p>
                      </div>
                      <button
                        onClick={() => { setEditingItem(null); setFormData({}); setShowForm(true); }}
                        className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:translate-y-[-2px] transition-all"
                      >
                        Create Now
                      </button>
                    </motion.div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex-shrink-0">
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            setCurrentPage={setCurrentPage}
            totalRecords={filteredData.length}
          />
        </div>
      </div>


      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[26px] shadow-2xl w-full max-w-[440px] sm:max-w-[480px] max-h-[90vh] overflow-hidden border border-slate-200"
            >
              <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-600 rounded-lg text-white">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest">
                      {title} [ {editingItem ? 'MODIFY' : 'NEW'} ]
                    </h3>
                    <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mt-0.5">Enter details below to {editingItem ? 'update' : 'create'} record</p>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-neutral-200 hover:shadow-sm">
                  <X size={20} className="text-neutral-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[calc(90vh-120px)] overflow-y-auto">
                <div className="grid grid-cols-1 gap-4 sm:gap-5">
                  {fields.filter(f => !f.condition || f.condition(formData)).map(f => (
                    <div key={f.name} className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">{f.label}</label>
                        {f.required && <span className="text-[8px] font-black text-error-500 uppercase tracking-widest">Required</span>}
                      </div>
                      
                      {f.type === 'image' ? (
                        <div className="flex items-center gap-4 bg-neutral-50 p-3 rounded-xl border-2 border-dashed border-neutral-200 hover:border-primary-400 transition-colors group relative overflow-hidden">
                          <input 
                            type="file" 
                            onChange={(e) => setFormData({ ...formData, [`${f.name}_file`]: e.target.files[0] })}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-16 h-16 rounded-lg bg-white border border-neutral-200 overflow-hidden shadow-sm flex-shrink-0">
                            {(formData[`${f.name}_file`] || formData[f.name]) ? (
                              <img 
                                src={formData[`${f.name}_file`] ? URL.createObjectURL(formData[`${f.name}_file`]) : formData[f.name]} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-50">
                                <ImageIcon size={24} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">
                              {formData[`${f.name}_file`]?.name || 'Choose Image File'}
                            </p>
                            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mt-0.5">Click or drag to upload</p>
                          </div>
                          {(formData[`${f.name}_file`] || formData[f.name]) && (
                            <button 
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, [f.name]: null, [`${f.name}_file`]: null });
                                setSelectedProductIds([]);
                                setMultiProductSearchTerm('');
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-error-500 text-white rounded-lg shadow-lg z-20 hover:scale-110 transition-transform"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ) : f.type === 'product-multi-search' ? renderMultiProductPicker() : f.type === 'product-search' ? (
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder={`Search product to link...`}
                            value={
                                formData[f.name]
                                ? (relatedData.products?.find(p => String(p.id) === String(formData[f.name]))?.name || productSearchTerm)
                                : productSearchTerm
                            }
                            onChange={(e) => {
                              setProductSearchTerm(e.target.value);
                              setShowProductDropdown(true);
                            }}
                            onFocus={() => setShowProductDropdown(true)}
                            onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                            className="w-full bg-white border-2 border-neutral-100 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all text-neutral-900 shadow-sm placeholder-neutral-300 outline-none"
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
                                  .filter(p => (p.name || '').toLowerCase().includes(productSearchTerm.toLowerCase()))
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
                                ? (relatedData.categories?.find(c => String(c.id) === String(formData[f.name]))?.name || categorySearchTerm)
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
                                  .filter(c => (c.name || '').toLowerCase().includes(categorySearchTerm.toLowerCase()))
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
                    className="flex-1 bg-neutral-100 text-neutral-500 font-black py-3.5 rounded-xl uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all shadow-sm"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 bg-primary-600 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-primary-600/20 hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center justify-center gap-2 hover:bg-primary-700"
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
