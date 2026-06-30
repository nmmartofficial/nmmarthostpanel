import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GitBranch, Search, Trash2, FileJson, Plus, Edit2, X, Upload, RefreshCw, Save, QrCode, Printer, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateUUID } from '../../utils/helpers';
import { handleERPAction, ACTION_TYPES, parseERPCSV } from '../../erpController';
import { dbSync } from '../../dbSync';
import { DB_SCHEMA } from '../../dbSchema';
import PaginationFooter from '../../components/PaginationFooter';
import JsBarcode from 'jsbarcode';

// --- Validation Helpers
const validatePercent = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return { isValid: true, message: '' };
  if (num < 0 || num > 100) return { isValid: false, message: 'Must be between 0 and 100' };
  return { isValid: true, message: '' };
};

export default function ProductsView({ products, categories, brands, subcategories, filter, uploadImage, fetchInitialData, setLoading }) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [gstError, setGstError] = useState('');
  const [cessError, setCessError] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [barcodeToPrint, setBarcodeToPrint] = useState(null);
  const [labelQuantity, setLabelQuantity] = useState(1);
  const barcodeRef = useRef(null);

  const filteredProducts = useMemo(() => {
    let list = products;
    
    // Safety: Filter based on showTrash state
    if (showTrash) {
      list = list.filter(p => p.is_active === false);
    } else {
      list = list.filter(p => p.is_active !== false);
    }

    if (filter === 'low_stock') {
      list = list.filter(p => p.stock <= 5);
    }
    return list.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.hsn_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, filter, searchTerm, showTrash]);

  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Generate barcodes when label or quantity changes
  useEffect(() => {
    if (barcodeToPrint && barcodeToPrint.barcode) {
      setTimeout(() => {
        for (let i = 0; i < labelQuantity; i++) {
          const svgElement = document.getElementById(`barcode-${i}`);
          if (svgElement) {
            try {
              JsBarcode(svgElement, barcodeToPrint.barcode, {
                format: 'CODE128',
                width: 2,
                height: 30,
                margin: 0,
                fontSize: 10,
                displayValue: false
              });
            } catch (err) {
              console.error("Barcode generation error:", err);
            }
          }
        }
      }, 100);
    }
  }, [barcodeToPrint, labelQuantity]);

  // Add print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #barcode-label, #barcode-label * { visibility: visible; }
        #barcode-label { 
          position: absolute; 
          left: 0; 
          top: 0; 
          box-shadow: none !important;
          border: 1px solid black !important;
        }
        @page { margin: 0.5cm; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const handleImportCSV = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                setLoading(true);
                // EXACT mapping of your Excel headers to Database fields
                const columnMapping = {
                    'id': 'id',
                    'itname': 'name',
                    'itnameprint': 'print_name',
                    'barcode': 'barcode',
                    'imagename': 'image_url',
                    'itemdescription': 'description',
                    'hsncode': 'hsn_code',
                    'picture': 'image_url',
                    'takerate': 'take_rate',
                    'restrate': 'retail_rate',
                    'dlvrate': 'delivery_rate',
                    'onlinerate': 'online_rate',
                    'purcrate': 'purchase_rate',
                    'mrp': 'mrp',
                    'opstock': 'stock',
                    'discperc': 'discount_percent',
                    'isfav': 'is_favourite',
                    'unitcode': 'unit_name',
                    'itg': 'item_group',
                    'itc': 'item_category',
                    'dtcode': 'department_code',
                    'kcode': 'k_code',
                    'brandcode': 'brand_name',
                    'isdiscountable': 'is_discountable',
                    'gst': 'gst_percent',
                    'cess': 'cess_percent',
                    'shopid': 'shop_id',
                    'ispackage': 'is_package',
                    'narration': 'narration',
                    'narration2': 'narration2',
                    'itemstatus': 'item_status',
                    'Item Name': 'name',
                    'BARCODE': 'barcode',
                    'HSNCODE': 'hsn_code',
                    'MRP': 'mrp',
                    'SALE RA': 'sale_rate',
                    'SALE RATE': 'sale_rate',
                    'PURC RA': 'purchase_rate',
                    'PURC RATE': 'purchase_rate',
                    'GST%': 'gst_percent',
                    'CESS%': 'cess_percent',
                    'OPENING': 'stock',
                    'Closing': 'stock',
                    'MinQty': 'min_qty',
                    'Dis %': 'discount_percent',
                    'Size': 'size',
                    'Colour': 'color',
                    'Counter': 'counter_name',
                    'MAIN CATEGORY': 'category_name',
                    'SUB CATEGORY': 'subcategory_name',
                    'SUBC ATEGORY': 'subcategory_name',
                    'Brand na': 'brand_name',
                    'Brand name': 'brand_name',
                    'Unit': 'unit_name',
                    'Basic Sale Price': 'basic_sale_price'
                };
        
        const parsedData = await parseERPCSV(file, columnMapping);
        if (!parsedData || parsedData.length === 0) throw new Error("No data found in file");

        // --- STEP 1: AUTOMATIC MASTER UPDATE (BY NAME) ---
        const getUniqueNames = (data, field) => {
          const names = data.map(item => String(item[field] || "").trim()).filter(Boolean);
          const seen = new Set();
          return names.filter(name => {
            const lower = name.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
          });
        };

        const uniqueCats = getUniqueNames(parsedData, 'category_name');
        const uniqueSubCats = getUniqueNames(parsedData, 'subcategory_name');
        const uniqueBrands = getUniqueNames(parsedData, 'brand_name');
        const uniqueUnits = getUniqueNames(parsedData, 'unit_name');

        console.log(`[Import Orchestration] Found Unique Masters -> Cats: ${uniqueCats.length}, Brands: ${uniqueBrands.length}`);

        // Helper to insert master records if they don't exist
        const insertMasterIfNotExists = async (table, names) => {
          const existing = await dbSync.fetch(table);
          const existingNames = new Set(existing.map(item => item.name.toLowerCase()));
          const newNames = names.filter(name => !existingNames.has(name.toLowerCase()));
          
          if (newNames.length > 0) {
            const records = newNames.map(name => ({ 
              id: generateUUID(), 
              name, 
              is_active: true 
            }));
            await dbSync.insert(table, records);
          }
        };

        // Ensure these exist in Master Tables
        if (uniqueCats.length > 0) await insertMasterIfNotExists(DB_SCHEMA.CATEGORIES.table, uniqueCats);
        if (uniqueSubCats.length > 0) await insertMasterIfNotExists(DB_SCHEMA.SUBCATEGORIES.table, uniqueSubCats);
        if (uniqueBrands.length > 0) await insertMasterIfNotExists(DB_SCHEMA.BRANDS.table, uniqueBrands);
        if (uniqueUnits.length > 0) await insertMasterIfNotExists(DB_SCHEMA.UNITS.table, uniqueUnits);

        // --- STEP 2: FETCH FRESH IDS FOR LINKING ---
        const [dbCats, dbSubCats, dbBrands, dbUnits] = await Promise.all([
          dbSync.fetch(DB_SCHEMA.CATEGORIES.table),
          dbSync.fetch(DB_SCHEMA.SUBCATEGORIES.table),
          dbSync.fetch(DB_SCHEMA.BRANDS.table),
          dbSync.fetch(DB_SCHEMA.UNITS.table)
        ]);

        const catMap = Object.fromEntries(dbCats.map(c => [String(c.name).toLowerCase().trim(), c.id]));
        const subCatMap = Object.fromEntries(dbSubCats.map(s => [String(s.name).toLowerCase().trim(), s.id]));
        const brandMap = Object.fromEntries(dbBrands.map(b => [String(b.name).toLowerCase().trim(), b.id]));
        const unitMap = Object.fromEntries(dbUnits.map(u => [String(u.name).toLowerCase().trim(), u.id]));

        // --- STEP 3: PREPARE PRODUCTS WITH FULL CONSISTENCY ---
        const productsToUpload = parsedData.map(item => {
            const catName = String(item.category_name || "").toLowerCase().trim();
            const subCatName = String(item.subcategory_name || "").toLowerCase().trim();
            const brandName = String(item.brand_name || "").toLowerCase().trim();
            const unitName = String(item.unit_name || "").trim();
            
            // Sanitize stock: ensure it's never negative
            let stock = Math.max(0, parseFloat(item.stock) || 0);
            
            // Check if id from Excel is a valid UUID, if not, generate new one
            let productId;
            if (item.id) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(String(item.id).trim())) {
                    productId = item.id;
                } else {
                    productId = generateUUID();
                }
            } else {
                productId = generateUUID();
            }
            
            return {
                id: productId,
                barcode: String(item.barcode || "").trim() || null,
                name: String(item.name || "").trim(),
                print_name: String(item.print_name || "").trim() || null,
                hsn_code: String(item.hsn_code || "").trim() || null,
                mrp: parseFloat(item.mrp) || 0,
                sale_rate: parseFloat(item.sale_rate) || 0,
                take_rate: parseFloat(item.take_rate) || 0,
                retail_rate: parseFloat(item.retail_rate) || 0,
                delivery_rate: parseFloat(item.delivery_rate) || 0,
                online_rate: parseFloat(item.online_rate) || 0,
                purchase_rate: parseFloat(item.purchase_rate) || 0,
                gst_percent: parseFloat(item.gst_percent) || 0,
                cess_percent: parseFloat(item.cess_percent) || 0,
                stock: stock,
                min_qty: parseFloat(item.min_qty) || 0,
                discount_percent: parseFloat(item.discount_percent) || 0,
                size: String(item.size || "").trim() || null,
                color: String(item.color || "").trim() || null,
                counter_name: String(item.counter_name || "").trim() || null,
                category_name: catName || null,
                category_id: catMap[catName] || null,
                subcategory_name: subCatName || null,
                subcategory_id: subCatMap[subCatName] || null,
                brand_name: brandName || null,
                brand_id: brandMap[brandName] || null,
                unit_name: unitName || null,
                item_group: String(item.item_group || "").trim() || null,
                item_category: String(item.item_category || "").trim() || null,
                department_code: String(item.department_code || "").trim() || null,
                k_code: String(item.k_code || "").trim() || null,
                shop_id: String(item.shop_id || "").trim() || null,
                is_package: String(item.is_package || "No").trim(),
                narration: String(item.narration || "").trim() || null,
                narration2: String(item.narration2 || "").trim() || null,
                item_status: String(item.item_status || "Active").trim(),
                is_favourite: String(item.is_favourite || "No").trim(),
                is_discountable: String(item.is_discountable || "Yes").trim(),
                image_url: String(item.image_url || "").trim() || null,
                description: String(item.description || "").trim() || null,
                is_active: true
            };
        });

        // --- STEP 4: BULK UPLOAD PRODUCTS ---
        await dbSync.insert(DB_SCHEMA.PRODUCTS.table, productsToUpload);
        
        alert(`SUCCESS! ${productsToUpload.length} items imported.\nBrands: ${uniqueBrands.length}, Categories: ${uniqueCats.length}.\nMaster tables and reports are now fully synchronized.`);
        
        window.location.reload(); 
      } catch (error) {
        console.error("Import Error:", error);
        alert(`Import Failed: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate GST and CESS
    const gstValid = validatePercent(formData.gst_percent);
    const cessValid = validatePercent(formData.cess_percent);
    
    if (!gstValid.isValid) {
      setGstError(gstValid.message);
      setIsSubmitting(false);
      return;
    }
    
    if (!cessValid.isValid) {
      setCessError(cessValid.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      
      // Remove UI-only fields that aren't in the database
      delete finalData.brand;
      delete finalData.category;
      delete finalData.subcategory;
      delete finalData.unit;
      
      if (finalData.main_image_file) {
        const { url, error: uploadError } = await uploadImage(finalData.main_image_file, 'product-images');
        if (uploadError) throw new Error(`Product Image Upload Failed: ${uploadError}`);
        if (url) {
          finalData.image_url = url;
          delete finalData.main_image_file;
        }
      }

      // Fallback for not-null constraint on image_url
      if (!finalData.image_url) {
        finalData.image_url = 'https://via.placeholder.com/300?text=PRODUCT+IMAGE';
      }

      let res;
      if (editingProduct) {
        res = await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.UPDATE, { id: editingProduct.id, ...finalData });
        
        // Add Log if stock changed
        if (finalData.stock !== undefined && parseFloat(finalData.stock) !== parseFloat(editingProduct.stock)) {
          await handleERPAction(DB_SCHEMA.INVENTORY_LOGS.table, ACTION_TYPES.INSERT, {
            id: generateUUID(),
            product_id: editingProduct.id,
            old_stock: parseFloat(editingProduct.stock) || 0,
            new_stock: parseFloat(finalData.stock) || 0,
            change_type: 'manual',
            reference_id: 'Manual Update'
          });
        }
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.INSERT, finalData);

        // Add Log for new product
        await handleERPAction(DB_SCHEMA.INVENTORY_LOGS.table, ACTION_TYPES.INSERT, {
          id: generateUUID(),
          product_id: finalData.id,
          old_stock: 0,
          new_stock: parseFloat(finalData.stock) || 0,
          change_type: 'manual',
          reference_id: 'New Product'
        });
      }

      if (res && !res.success) {
        throw new Error(`Database Error: ${res.error}`);
      }

      setShowForm(false);
      setEditingProduct(null);
      setFormData({});
      fetchInitialData();
      alert("Product saved successfully!");
    } catch (error) {
      console.error("Product Save Error:", error);
      alert(`Product Operation Failed!\n\nReason: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-lg text-slate-900 border border-slate-100">
            <GitBranch size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Item Master</h2>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowTrash(!showTrash)}
            className={cn(
              "flex-1 md:flex-none px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-md border-none",
              showTrash ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            )}
            title={showTrash ? "View Active Items" : "View Recycle Bin"}
          >
            <Trash2 size={14} /> {showTrash ? "View Active" : "Recycle Bin"}
          </button>

          <button 
            onClick={async () => {
              if (window.confirm("KYA AAP SURE HAIN? Yeh sabhi active products ko delete kar dega!")) {
                setLoading(true);
                const res = await dbSync.deleteAll(DB_SCHEMA.PRODUCTS.table);
                if (res.success) {
                  alert("Sare products delete ho gaye hain!");
                  window.location.reload();
                } else {
                  alert("Delete failed: " + res.error);
                }
                setLoading(false);
              }
            }}
            className="flex-1 md:flex-none bg-red-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-md border-none"
          >
            <Trash2 size={14} /> DELETE ALL
          </button>
          <button 
            onClick={handleImportCSV}
            className="flex-1 md:flex-none bg-white text-blue-600 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-50 transition-all border border-blue-600 shadow-sm"
          >
            <FileJson size={14} /> IMPORT ITEM
          </button>
          <button 
            onClick={() => { 
              setEditingProduct(null); 
              setFormData({ 
                sale_rate: 0, 
                mrp: 0, 
                purchase_rate: 0, 
                gst_percent: 0, 
                cess_percent: 0, 
                discount_percent: 0, 
                is_favourite: 'No', 
                is_discountable: 'Yes', 
                is_active: true,
                category_id: '',
                category_name: '',
                subcategory_id: '',
                subcategory_name: '',
                brand_id: '',
                brand_name: '',
                unit_name: 'NA'
              }); 
              setShowForm(true); 
            }}
            className="flex-1 md:flex-none bg-white text-blue-600 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-50 transition-all border border-blue-600 shadow-sm"
          >
            <Plus size={16} /> Create New
          </button>
        </div>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">SNo</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Name / Category</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Barcode / HSN</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Brand / Counter</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Pricing (₹)</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Tax / Disc</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Stock / Specs</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Picture</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((product, idx) => (
                <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">
                    {(currentPage - 1) * rowsPerPage + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter leading-none">{product.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
                      {product.category_name || 'No Category'} {product.subcategory_name ? `/ ${product.subcategory_name}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="text-[10px] font-bold text-slate-600">{product.barcode || '-'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">HSN: {product.hsn_code || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase">{product.brand_name || '-'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{product.counter_name || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-blue-700">Sale: ₹{product.sale_rate}</span>
                      <span className="text-[8px] text-slate-400 line-through font-bold">MRP: ₹{product.mrp}</span>
                      <span className="text-[8px] text-slate-500 font-bold">Purc: ₹{product.purchase_rate || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">
                        {product.discount_percent || 0}% OFF
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase">GST: {product.gst_percent || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-[10px] font-black",
                        (product.stock || 0) <= 5 ? "text-red-600" : "text-green-600"
                      )}>
                        Stock: {product.stock || 0}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">
                        {product.size ? `Size: ${product.size}` : ''} {product.color ? `| ${product.color}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="w-10 h-10 mx-auto bg-slate-50 rounded-lg border border-slate-200 overflow-hidden p-1">
                      <img src={product.image_url} alt="" className="w-full h-full object-contain" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {showTrash ? (
                        <>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`Restore ${product.name}?`)) {
                                await dbSync.update(DB_SCHEMA.PRODUCTS.table, product.id, { is_active: true });
                                fetchInitialData();
                              }
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-all"
                            title="Restore"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`PERMANENTLY DELETE ${product.name}? Yeh wapas nahi aayega!`)) {
                                await dbSync.delete(DB_SCHEMA.PRODUCTS.table, product.id, true);
                                fetchInitialData();
                              }
                            }}
                            className="p-1.5 text-red-700 hover:bg-red-50 rounded-md transition-all"
                            title="Delete Permanently"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => setBarcodeToPrint(product)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                            title="Print Barcode"
                          >
                            <QrCode size={14} />
                          </button>
                          <button 
                            onClick={() => { 
                              setEditingProduct(product); 
                              // Pre-fill form data with proper category/subcategory/brand fields
                              const prefilledData = {
                                ...product,
                                category: product.category_name || '',
                                subcategory: product.subcategory_name || '',
                                brand: product.brand_name || '',
                                unit: product.unit_name || 'NA'
                              };
                              // If we have category_name but no category_id, try to find it
                              if (prefilledData.category_name && !prefilledData.category_id) {
                                const foundCat = categories.find(c => c.name === prefilledData.category_name);
                                if (foundCat) prefilledData.category_id = foundCat.id;
                              }
                              // Same for subcategory
                              if (prefilledData.subcategory_name && !prefilledData.subcategory_id) {
                                const foundSubCat = subcategories.find(s => s.name === prefilledData.subcategory_name);
                                if (foundSubCat) prefilledData.subcategory_id = foundSubCat.id;
                              }
                              // Same for brand
                              if (prefilledData.brand_name && !prefilledData.brand_id) {
                                const foundBrand = brands.find(b => b.name === prefilledData.brand_name);
                                if (foundBrand) prefilledData.brand_id = foundBrand.id;
                              }
                              setFormData(prefilledData); 
                              setShowForm(true); 
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`Delete ${product.name}?`)) {
                                await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.DELETE, { id: product.id });
                                fetchInitialData();
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationFooter 
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
          totalRecords={filteredProducts.length}
        />
      </div>


      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border-t-4 border-blue-600"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/30 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <GitBranch size={18} className="text-blue-700" />
                  <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">
                    Item [ {editingProduct ? 'MODIFY' : 'NEW'} ]
                  </h3>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-white rounded-lg border border-slate-200 shadow-sm bg-white">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Row 1: Item Name, Barcode, HSN */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-6 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Item Name</label>
                      <input 
                        type="text" 
                        value={formData.name || ''} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        className="w-full bg-slate-50 border-2 border-blue-100 rounded-lg px-4 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                        required 
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Barcode</label>
                        <button type="button" onClick={() => setFormData({...formData, barcode: Math.random().toString().slice(2, 12)})} className="text-[9px] font-bold text-blue-600 hover:underline">Generate code</button>
                      </div>
                      <input 
                        type="text" 
                        value={formData.barcode || ''} 
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">HSN Code</label>
                      <input 
                        type="text" 
                        value={formData.hsn_code || ''} 
                        onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  {/* Row 2: Group, Sub Category, Brand, Unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 border-b border-slate-100 pb-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Item Group Name</label>
                      <select value={formData.category_id || ''} onChange={(e) => {
                        const selectedCat = categories.find(c => c.id === e.target.value);
                        setFormData({
                          ...formData,
                          category_id: e.target.value,
                          category_name: selectedCat?.name || '',
                          category: selectedCat?.name || ''
                        });
                      }} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="">NM MART</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Sub Category Name</label>
                      <select value={formData.subcategory_id || ''} onChange={(e) => {
                        const selectedSubCat = subcategories.find(s => s.id === e.target.value);
                        setFormData({
                          ...formData,
                          subcategory_id: e.target.value,
                          subcategory_name: selectedSubCat?.name || '',
                          subcategory: selectedSubCat?.name || ''
                        });
                      }} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="">Chocolate</option>
                        {subcategories?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Brand Name</label>
                      <select value={formData.brand_id || ''} onChange={(e) => {
                        const selectedBrand = brands.find(b => b.id === e.target.value);
                        setFormData({
                          ...formData,
                          brand_id: e.target.value,
                          brand_name: selectedBrand?.name || '',
                          brand: selectedBrand?.name || ''
                        });
                      }} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="">NESTLE</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Unit Name</label>
                      <select value={formData.unit || ''} onChange={(e) => setFormData({ ...formData, unit: e.target.value, unit_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="NA">NA</option>
                        <option value="1 pcs">1 pcs</option>
                        <option value="1 kg">1 kg</option>
                        <option value="1 ltr">1 ltr</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Sale Rate, MRP, Purchase Rate, GST, Cess, Discount */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Sale Rate</label>
                      <input type="number" value={formData.sale_rate || 0} onChange={(e) => setFormData({ ...formData, sale_rate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Mrp</label>
                      <input type="number" value={formData.mrp || 0} onChange={(e) => setFormData({ ...formData, mrp: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Purchase Rate</label>
                      <input type="number" value={formData.purchase_rate || 0} onChange={(e) => setFormData({ ...formData, purchase_rate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Gst %</label>
                      <input 
                        type="number" 
                        value={formData.gst_percent || 0} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, gst_percent: val });
                          if (gstError) setGstError(validatePercent(val).message);
                        }}
                        onBlur={() => setGstError(validatePercent(formData.gst_percent).message)}
                        className={cn(
                          "w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none",
                          gstError ? "border-red-300 text-red-800" : "border-slate-200"
                        )}
                      />
                      {gstError && <p className="text-[9px] font-black text-red-500 flex items-center gap-1"><AlertCircle size={10}/> {gstError}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Cess %</label>
                      <input 
                        type="number" 
                        value={formData.cess_percent || 0} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, cess_percent: val });
                          if (cessError) setCessError(validatePercent(val).message);
                        }}
                        onBlur={() => setCessError(validatePercent(formData.cess_percent).message)}
                        className={cn(
                          "w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none",
                          cessError ? "border-red-300 text-red-800" : "border-slate-200"
                        )}
                      />
                      {cessError && <p className="text-[9px] font-black text-red-500 flex items-center gap-1"><AlertCircle size={10}/> {cessError}</p>}
                    </div>
                  </div>

                  {/* Row 4: Opening Stock, Low Stock Threshold, Min Qty, Batch No, Expiry Date, Is Perishable */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Opening Stock</label>
                      <input type="number" value={formData.stock || 0} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Low Stock Threshold</label>
                      <input type="number" value={formData.low_stock_threshold || 10} onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Min Qty</label>
                      <input type="number" value={formData.min_qty || 0} onChange={(e) => setFormData({ ...formData, min_qty: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Batch No</label>
                      <input type="text" value={formData.batch_no || ''} onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Expiry Date</label>
                      <input type="date" value={formData.expiry_date || ''} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Is Perishable?</label>
                      <select value={formData.is_perishable ? 'Yes' : 'No'} onChange={(e) => setFormData({ ...formData, is_perishable: e.target.value === 'Yes' })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 5: Favourite, Discountable */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Discount %</label>
                      <input type="number" value={formData.discount_percent || 0} onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Is favourite</label>
                      <select value={formData.is_favourite || 'No'} onChange={(e) => setFormData({ ...formData, is_favourite: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Is Discountable</label>
                      <select value={formData.is_discountable || 'Yes'} onChange={(e) => setFormData({ ...formData, is_discountable: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 6: Size, Colour, Counter, Category Name, Subcat Name, Brand Name */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Size</label>
                      <input type="text" value={formData.size || ''} onChange={(e) => setFormData({ ...formData, size: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Colour</label>
                      <input type="text" value={formData.color || ''} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Counter</label>
                      <input type="text" value={formData.counter_name || ''} onChange={(e) => setFormData({ ...formData, counter_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Category Name</label>
                      <input type="text" value={formData.category_name || ''} onChange={(e) => setFormData({ ...formData, category_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Subcategory Name</label>
                      <input type="text" value={formData.subcategory_name || ''} onChange={(e) => setFormData({ ...formData, subcategory_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Brand Name</label>
                      <input type="text" value={formData.brand_name || ''} onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                  </div>

                  {/* Row 5: Item Description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Item Description</label>
                    <input 
                      type="text" 
                      value={formData.description || ''} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none transition-all" 
                    />
                    <p className="text-[9px] font-bold text-slate-400 ml-1">{formData.description?.length || 0}/250 Characters</p>
                  </div>

                  {/* Row 6: Image Upload & Preview */}
                  <div className="flex flex-col sm:flex-row items-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex-1 space-y-1.5 w-full">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Picture</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          id="product-image-upload"
                          onChange={(e) => setFormData({ ...formData, main_image_file: e.target.files[0] })}
                          className="hidden"
                        />
                        <button 
                          type="button"
                          onClick={() => document.getElementById('product-image-upload').click()}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] hover:bg-blue-700 transition-all shadow-md"
                        >
                          Choose File
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">
                          {formData.main_image_file?.name || 'No file chosen'}
                        </span>
                      </div>
                    </div>
                    { (formData.main_image_file || formData.image_url) && (
                      <div className="w-20 h-20 rounded-lg border-2 border-white shadow-md overflow-hidden bg-white">
                        <img src={formData.main_image_file ? URL.createObjectURL(formData.main_image_file) : formData.image_url} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={async () => {
                        if (formData.main_image_file) {
                          const { url, error } = await uploadImage(formData.main_image_file, 'product-images');
                          if (url) {
                            setFormData({ ...formData, image_url: url, main_image_file: null });
                            alert("Image Uploaded Successfully!");
                          } else {
                            alert("Upload Failed: " + error);
                          }
                        } else {
                          alert("Please choose a file first");
                        }
                      }}
                      className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center gap-2 border border-slate-200 hover:bg-slate-200"
                    >
                      <Upload size={14} /> Upload
                    </button>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center gap-3 py-1">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Status:</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        formData.is_active ? "bg-blue-600" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                        formData.is_active ? "left-5.5" : "left-0.5"
                      )} />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {formData.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  {/* Form Actions */}
                  <div className="pt-4 flex gap-3 pb-4">
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-slate-100 text-slate-600 font-black py-3 rounded-xl uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                    >
                      Discard
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-700 text-white font-black py-3 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:translate-y-[-1px] transition-all"
                    >
                      {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                      {editingProduct ? 'Apply Changes' : 'Confirm Entry'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barcode Print Modal */}
      <AnimatePresence>
        {barcodeToPrint && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Barcode Label Generator</h3>
                <button onClick={() => setBarcodeToPrint(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase">Number of Labels</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={labelQuantity}
                  onChange={(e) => setLabelQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-center"
                />
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center max-h-[400px] overflow-y-auto p-2 bg-slate-50 rounded-xl">
                {Array.from({ length: labelQuantity }).map((_, index) => (
                  <div key={index} className="border-2 border-black p-3 bg-white inline-block text-black font-mono" id="barcode-label">
                    <p className="text-[11px] font-black uppercase mb-1">NM MART</p>
                    <p className="text-[9px] font-bold truncate max-w-[140px] mb-2">{barcodeToPrint.name}</p>
                    <svg ref={(el) => { if (el && barcodeToPrint?.barcode && index === 0) { JsBarcode(el, barcodeToPrint.barcode, { format: 'CODE128', width: 2, height: 30, margin: 0, fontSize: 10 }); } }} id={`barcode-${index}`}></svg>
                    <p className="text-[12px] font-black tracking-[2px] mt-1">{barcodeToPrint.barcode}</p>
                    <p className="text-[13px] font-black">MRP: ₹{barcodeToPrint.sale_rate}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()} 
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700"
                >
                  <Printer size={16} /> Print Labels
                </button>
                <button 
                  onClick={() => setBarcodeToPrint(null)} 
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
