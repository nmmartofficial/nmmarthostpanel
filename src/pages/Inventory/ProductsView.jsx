import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  GitBranch, Search, Trash2, Plus, Edit2, X, Upload, RefreshCw, Save, QrCode, Printer, AlertCircle, Calculator, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateUUID, generateNumericId } from '../../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../../erpController';
import { dbSync } from '../../dbSync';
import { DB_SCHEMA } from '../../dbSchema';
import PaginationFooter from '../../components/PaginationFooter';
import { ExcelUpload } from '../../components/common';
import StockAdjustmentDialog from '../../components/StockAdjustmentDialog';
import PhysicalCountDialog from '../../components/PhysicalCountDialog';
import BulkProductEntry from './BulkProductEntry';

// --- Validation Helpers
const validatePercent = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return { isValid: true, message: '' };
  if (num < 0 || num > 100) return { isValid: false, message: 'Must be between 0 and 100' };
  return { isValid: true, message: '' };
};

const sanitizeMasterCode = (value, fallback = 'master') => {
  const cleaned = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 40) || fallback;
};

const normalizeProductStatus = (rawValue) => {
  const statusText = String(rawValue ?? 'Active').trim().toLowerCase();

  if (['inactive', 'false', 'no', 'n'].includes(statusText)) {
    return { statusText: 'Inactive', isActive: false };
  }

  if (['', 'active', 'true', 'yes', 'y'].includes(statusText)) {
    return { statusText: 'Active', isActive: true };
  }

  if (/^\d+(\.\d+)?$/.test(statusText)) {
    return { statusText: 'Active', isActive: true };
  }

  return { statusText: 'Active', isActive: true };
};

const resolveProductImageUrl = (rawValue) => {
  const imageName = String(rawValue || '').trim();
  if (!imageName) return null;
  if (/^https?:\/\//i.test(imageName)) return imageName;

  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const encodedPath = imageName.split('/').map((part) => encodeURIComponent(part)).join('/');
  return baseUrl ? `${baseUrl}/storage/v1/object/public/products/${encodedPath}` : imageName;
};

// --- Product Import Processing ---
const processProductImportData = async (parsedData, brands = []) => {
  const safeBrands = Array.isArray(brands) ? brands : [];
  const safeParsed = Array.isArray(parsedData) ? parsedData : [];
  const missingNameRow = safeParsed.findIndex((item) => !String(item?.itname || item?.name || '').trim());
  if (missingNameRow !== -1) {
    throw new Error(`Excel row ${missingNameRow + 2} में itname खाली है। Product name required है।`);
  }

  // --- CHECK FOR DUPLICATES IN EXCEL (User Requirement) ---
  const nameSet = new Set();
  for (const item of safeParsed) {
    const name = String(item?.itname || item?.name || "").trim();
    if (!name) continue;
    if (nameSet.has(name)) {
      throw new Error(`Duplicate product name found in Excel: "${name}", please fix and re-upload`);
    }
    nameSet.add(name);
  }

  // --- Brand name resolver: safely resolve name from ID or string value ---
  const resolveBrandFromRow = (row) => {
    // 1) if explicit brand_id, look up from brands table
    if (row?.brand_id != null && row?.brand_id !== '') {
      const byId = safeBrands.find(b => Number(b?.id) === Number(row.brand_id));
      if (byId?.name) return { name: byId.name, id: byId.id };
    }
    // 2) if brandcode / brand_name looks like a pure number, treat as brand ID
    const rawBrandVal = String(row?.brandcode || row?.brand_name || "").trim();
    if (/^\d+$/.test(rawBrandVal)) {
      const byNumericCode = safeBrands.find(b => Number(b?.id) === Number(rawBrandVal));
      if (byNumericCode?.name) return { name: byNumericCode.name, id: byNumericCode.id };
    }
    // 3) try matching by NAME against brands table
    if (rawBrandVal) {
      const byName = safeBrands.find(b => String(b?.name || "").toLowerCase() === rawBrandVal.toLowerCase());
      if (byName?.name) return { name: byName.name, id: byName.id };
    }
    // 4) fallback: keep raw string if present, otherwise empty
    return { name: rawBrandVal || null, id: row?.brand_id ? row.brand_id : null };
  };

  // --- VALIDATE AND PREPARE PRODUCTS ---
  return parsedData.map((item) => {
    // Sanitize stock: ensure it's never negative
    let stock = Math.max(0, parseFloat(item.opstock || item.stock) || 0);
    const { statusText, isActive } = normalizeProductStatus(item.itemstatus ?? item.item_status ?? 'Active');
    const statusCode = isActive ? 1 : 0;
    
    // Map both old and new column names for backward compatibility
    const productImage = resolveProductImageUrl(item.picture || item.image_url || item.imagename);

    // Safe brand resolution (ID -> name + id)
    const resolvedBrand = resolveBrandFromRow(item);
    const finalBrandName = resolvedBrand.name;
    const finalBrandId = resolvedBrand.id ?? item.brand_id ?? null;

    return {
      itname: String(item.itname || item.name || "").trim(),
      name: String(item.itname || item.name || "").trim(),
      itnameprint: String(item.itnameprint || item.print_name || "").trim() || null,
      print_name: String(item.itnameprint || item.print_name || "").trim() || null,
      barcode: String(item.barcode || "").trim() || null,
      imagename: String(item.imagename || "").trim() || null,
      itemdescription: String(item.itemdescription || item.description || "").trim() || null,
      description: String(item.itemdescription || item.description || "").trim() || null,
      hsncode: String(item.hsncode || item.hsn_code || "").trim() || null,
      hsn_code: String(item.hsncode || item.hsn_code || "").trim() || null,
      picture: productImage,
      image_url: productImage,
      takerate: parseFloat(item.takerate || item.take_rate) || 0,
      take_rate: parseFloat(item.takerate || item.take_rate) || 0,
      restrate: parseFloat(item.restrate || item.retail_rate) || 0,
      retail_rate: parseFloat(item.restrate || item.retail_rate) || 0,
      dlvrate: parseFloat(item.dlvrate || item.delivery_rate) || 0,
      delivery_rate: parseFloat(item.dlvrate || item.delivery_rate) || 0,
      onlinerate: parseFloat(item.onlinerate || item.sale_rate) || 0,
      sale_rate: parseFloat(item.onlinerate || item.sale_rate) || 0,
      purcrate: parseFloat(item.purcrate || item.purchase_rate) || 0,
      purchase_rate: parseFloat(item.purcrate || item.purchase_rate) || 0,
      mrp: parseFloat(item.mrp) || 0,
      opstock: stock,
      stock: stock,
      discperc: parseFloat(item.discperc || item.discount_percent) || 0,
      discount_percent: parseFloat(item.discperc || item.discount_percent) || 0,
      isfav: String(item.isfav || item.is_favourite || "No").trim() === 'true' || String(item.isfav || item.is_favourite || "No").trim().toLowerCase() === 'yes' || String(item.isfav || item.is_favourite || "No").trim() === '1',
      is_favourite: String(item.isfav || item.is_favourite || "No").trim() === 'true' || String(item.isfav || item.is_favourite || "No").trim().toLowerCase() === 'yes' || String(item.isfav || item.is_favourite || "No").trim() === '1',
      unitcode: String(item.unitcode || item.unit_name || "Nos").trim(),
      unit_name: String(item.unitcode || item.unit_name || "Nos").trim(),
      itg: String(item.itg || "").trim() || null,
      itc: String(item.itc || "").trim() || null,
      dtcode: String(item.dtcode || "").trim() || null,
      kcode: String(item.kcode || "").trim() || null,
      brandcode: finalBrandName,
      brand_name: finalBrandName,
      brand_id: finalBrandId,
      isdiscountable: String(item.isdiscountable || item.is_discountable || "Yes").trim() !== 'false' && String(item.isdiscountable || item.is_discountable || "Yes").trim().toLowerCase() !== 'no' && String(item.isdiscountable || item.is_discountable || "Yes").trim() !== '0',
      is_discountable: String(item.isdiscountable || item.is_discountable || "Yes").trim() !== 'false' && String(item.isdiscountable || item.is_discountable || "Yes").trim().toLowerCase() !== 'no' && String(item.isdiscountable || item.is_discountable || "Yes").trim() !== '0',
      gst: parseFloat(item.gst || item.gst_percent) || 0,
      gst_percent: parseFloat(item.gst || item.gst_percent) || 0,
      cess: parseFloat(item.cess || item.cess_percent) || 0,
      cess_percent: parseFloat(item.cess || item.cess_percent) || 0,
      shopid: String(item.shopid || "").trim() || null,
      ispackage: String(item.ispackage || item.is_package || "No").trim() === 'true' || String(item.ispackage || item.is_package || "No").trim().toLowerCase() === 'yes' || String(item.ispackage || item.is_package || "No").trim() === '1',
      narration: String(item.narration || "").trim() || null,
      narration2: String(item.narration2 || "").trim() || null,
      itemstatus: statusCode,
      item_status: statusText,
      is_active: isActive
    };
  });
};

export default function ProductsView({ products = [], categories = [], brands = [], subcategories = [], filter, uploadImage, fetchInitialData, setLoading }) {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [gstError, setGstError] = useState('');
  const [cessError, setCessError] = useState('');
  // Filter State
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [barcodeToPrint, setBarcodeToPrint] = useState(null);
  const [labelQuantity, setLabelQuantity] = useState(1);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [productToAdjust, setProductToAdjust] = useState(null);
  const barcodeRef = useRef(null);

  // --- Brand name resolver: NEVER render raw numeric brand_id as brand label ---
  const resolveBrandName = useCallback((product) => {
    if (!product) return '-';
    // Prefer the brand master, including legacy numeric code fields.
    const brandIdCandidates = [product.brand_id, product.brandId, product.brandcode, product.brand_code]
      .filter(value => value != null && String(value).trim() !== '' && /^\d+$/.test(String(value).trim()));
    if (brandIdCandidates.length > 0) {
      const match = Array.isArray(brands) && brands.find(b => brandIdCandidates.some(value => Number(b.id) === Number(value)));
      if (match?.name) return match.name;
    }
    const textFallback = product.brand_name || product.brand || product.brandName || product.brandcode || product.brand_code || '';
    if (textFallback && !/^\d+$/.test(String(textFallback).trim())) return textFallback;
    return '-';
  }, [brands]);

  const resolveCategoryName = useCallback((product) => {
    if (!product) return '-';
    const match = (categories || []).find(category => String(category.id) === String(product.category_id));
    if (match?.name) return match.name;
    return product.category_name || product.itc || product.item_category || '-';
  }, [categories]);

  const resolveSubcategoryName = useCallback((product) => {
    if (!product) return '-';
    const match = (subcategories || []).find(subcategory => String(subcategory.id) === String(product.subcategory_id));
    if (match?.name) return match.name;
    return product.subcategory_name || product.sub_category_name || '-';
  }, [subcategories]);

  // Filtered subcategories based on selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategories.filter(s => Number(s.category_id) === Number(selectedCategoryId));
  }, [subcategories, selectedCategoryId]);

  const selectedCategoryMatch = useMemo(() => {
    if (!formData.category_id) return null;
    return (categories || []).find(c => String(c.id) === String(formData.category_id));
  }, [categories, formData.category_id]);

  const activeSubcategories = useMemo(() => {
    // User requested to see ALL subcategories to allow free selection
    return subcategories || [];
  }, [subcategories]);

  const resolveFormSubcategory = useCallback((nextFormData) => {
    const rawCategoryId = nextFormData.category_id || nextFormData.categoryId;
    if (!rawCategoryId) {
      return { ...nextFormData, subcategory_id: '', subcategory_name: '', subcategory: '' };
    }

    const selectedCategoryId = Number(rawCategoryId);

    if (nextFormData.subcategory_id) {
      const matched = (subcategories || []).find(
        s => Number(s.id) === Number(nextFormData.subcategory_id)
          && Number(s.category_id) === selectedCategoryId
      );

      if (matched) {
        return {
          ...nextFormData,
          subcategory_id: String(matched.id),
          subcategory_name: matched.name,
          subcategory: matched.name
        };
      }
    }

    const lookupName = String(nextFormData.subcategory_name || nextFormData.subcategory || '').trim().toLowerCase();
    if (lookupName) {
      const matchedByName = (subcategories || []).find(
        s => Number(s.category_id) === selectedCategoryId
          && String(s.name || '').trim().toLowerCase() === lookupName
      );

      if (matchedByName) {
        return {
          ...nextFormData,
          subcategory_id: String(matchedByName.id),
          subcategory_name: matchedByName.name,
          subcategory: matchedByName.name
        };
      }
    }

    return { ...nextFormData, subcategory_id: '', subcategory_name: '', subcategory: '' };
  }, [subcategories]);

  const resolveCategoryId = useCallback((record = {}) => {
    const idCandidates = [
      record.category_id,
      record.categoryId,
      record.category?.id,
      record.main_category_id,
      record.itc_id,
      record.item_group_id,
      record.itg,
      record.itg_id
    ];
    const nameCandidates = [
      record.category_name,
      record.category,
      record.itc,
      record.item_category,
      record.main_category,
      record.categoryName,
      record.category?.name
    ];

    for (const candidate of idCandidates) {
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        const match = (categories || []).find(
          c => String(c.id).trim() === String(candidate).trim()
        );
        if (match) return { id: String(match.id), name: match.name };
      }
    }

    for (const candidate of nameCandidates) {
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        const normalized = String(candidate).trim().toLowerCase();
        if (normalized === '' || normalized === 'null' || normalized === 'undefined') continue;
        const match = (categories || []).find(c => String(c.name || '').trim().toLowerCase() === normalized);
        if (match) return { id: String(match.id), name: match.name };
      }
    }

    return null;
  }, [categories]);

  const resolveSubcategoryId = useCallback((record = {}) => {
    const idCandidates = [
      record.subcategory_id,
      record.subCategoryId,
      record.subcategory?.id,
      record.subcategory_id,
      record.sub_category_id,
      record.subcat_id,
      record.dtcode,
      record.dtcode_id,
      record.kcode,
      record.kcode_id
    ];
    const nameCandidates = [
      record.subcategory_name,
      record.subcategory,
      record.subcategoryName,
      record.sub_category_name,
      record.subcat_name,
      record.subcategory?.name
    ];

    const categoryMatch = resolveCategoryId(record);
    const matchByCategory = (candidate) => {
      if (candidate === undefined || candidate === null || candidate === '') return null;
      return (subcategories || []).find(s => {
        const matchesId = String(s.id).trim() === String(candidate).trim();
        const matchesName = String(s.name || '').trim().toLowerCase() === String(candidate).trim().toLowerCase();
        // If we have a category match, try to find subcategory WITHIN that category
        const categoryOk = !categoryMatch || Number(s.category_id) === Number(categoryMatch.id);
        return (matchesId || matchesName) && categoryOk;
      });
    };

    // First try strict match (by ID/Name AND Category)
    for (const candidate of idCandidates) {
      const match = matchByCategory(candidate);
      if (match) return { id: String(match.id), name: match.name };
    }

    for (const candidate of nameCandidates) {
      const match = matchByCategory(candidate);
      if (match) return { id: String(match.id), name: match.name };
    }

    // If no match found within category, try to find by ID/Name across ANY category
    for (const candidate of idCandidates) {
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        const match = (subcategories || []).find(s => String(s.id).trim() === String(candidate).trim());
        if (match) return { id: String(match.id), name: match.name };
      }
    }

    for (const candidate of nameCandidates) {
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        const normalized = String(candidate).trim().toLowerCase();
        if (normalized === '' || normalized === 'null' || normalized === 'undefined') continue;
        const match = (subcategories || []).find(s => String(s.name || '').trim().toLowerCase() === normalized);
        if (match) return { id: String(match.id), name: match.name };
      }
    }

    // Finally, if we have a category match, just pick the FIRST subcategory under it if any
    if (categoryMatch) {
      const fallbackMatch = (subcategories || []).find(s => Number(s.category_id) === Number(categoryMatch.id));
      if (fallbackMatch) return { id: String(fallbackMatch.id), name: fallbackMatch.name };
    }

    return null;
  }, [resolveCategoryId, subcategories]);

  const resolveBrandId = useCallback((record = {}) => {
    const idCandidates = [record.brand_id, record.brandId, record.brand?.id];
    const nameCandidates = [record.brand_name, record.brand, record.brandcode, record.brand_name, record.brandName];

    for (const candidate of idCandidates) {
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        const match = (brands || []).find(b => String(b.id) === String(candidate));
        if (match) return { id: String(match.id), name: match.name };
      }
    }

    for (const candidate of nameCandidates) {
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        const match = (brands || []).find(b => String(b.name || '').toLowerCase() === String(candidate).trim().toLowerCase());
        if (match) return { id: String(match.id), name: match.name };
      }
    }

    return null;
  }, [brands]);

  const filteredProducts = useMemo(() => {
    let list = products;
    
    // Safety: Filter based on showTrash state
    if (showTrash) {
      list = list.filter(p => p.is_active === false || p.is_active === 'Inactive' || p.is_active === 'inactive');
    } else {
      list = list.filter((p) => {
        const activeValue = p.is_active;
        if (activeValue === false || activeValue === 'false' || activeValue === 'FALSE' || activeValue === 'Inactive' || activeValue === 'inactive') {
          return false;
        }
        return true;
      });
    }

    if (filter === 'low_stock') {
      list = list.filter(p => (p.opstock ?? p.stock) <= 5);
    }

    // Category Filter (only apply to products that have category_id)
    if (selectedCategoryId) {
      list = list.filter(p => p.category_id === selectedCategoryId);
    }

    // Subcategory Filter (only apply to products that have subcategory_id)
    if (selectedSubcategoryId) {
      list = list.filter(p => p.subcategory_id === selectedSubcategoryId);
    }

    return list.filter(p => {
      const searchLower = (searchTerm || '').toLowerCase();
      const name = (p.itname || p.name || '').toLowerCase();
      const bcode = (p.barcode || '').toLowerCase();
      const hsn = (p.hsncode || p.hsn_code || '').toLowerCase();

      return (
        name.includes(searchLower) ||
        bcode.includes(searchLower) ||
        hsn.includes(searchLower)
      );
    });
  }, [products, filter, searchTerm, showTrash, selectedCategoryId, selectedSubcategoryId]);

  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Generate barcodes when label or quantity changes
  useEffect(() => {
    const generateBarcodes = async () => {
      if (barcodeToPrint && barcodeToPrint.barcode) {
        const JsBarcode = (await import('jsbarcode')).default;
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
    };
    generateBarcodes();
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



  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    // Validate GST and CESS
    const gstValue = formData.gst || formData.gst_percent || 0;
    const cessValue = formData.cess || formData.cess_percent || 0;
    const gstValid = validatePercent(gstValue);
    const cessValid = validatePercent(cessValue);
    
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

    // --- REFERENCE VALIDATION ONLY ---
    // Product/Item master must not enforce duplicate validation by item name, barcode, brand, category or subcategory.
    // Only master records (Brand, Main Category, Sub Category) are uniqueness-checked elsewhere.
    const resolvedBrand = resolveBrandId(formData) || (editingProduct ? resolveBrandId(editingProduct) : null);
    const rawBrandId = formData.brand_id || editingProduct?.brand_id || resolvedBrand?.id || null;
    const currentBrandId = rawBrandId != null && rawBrandId !== '' ? Number(rawBrandId) : null;
    let currentCategoryId = formData.category_id != null && formData.category_id !== ''
      ? Number(formData.category_id)
      : (editingProduct?.category_id != null ? Number(editingProduct.category_id) : null);
    let currentSubCategoryId = formData.subcategory_id != null && formData.subcategory_id !== ''
      ? Number(formData.subcategory_id)
      : (editingProduct?.subcategory_id != null ? Number(editingProduct.subcategory_id) : null);
    const isEditing = Boolean(editingProduct?.id);

    if (!isEditing && (currentBrandId == null || Number.isNaN(currentBrandId) || !brands.some((brand) => Number(brand?.id) === Number(currentBrandId)))) {
      alert('Brand not found.');
      setIsSubmitting(false);
      return;
    }

    if (!isEditing && (currentCategoryId == null || Number.isNaN(currentCategoryId) || !categories.some((category) => Number(category?.id) === Number(currentCategoryId)))) {
      alert('Main Category not found.');
      setIsSubmitting(false);
      return;
    }

    const subCategoryLookupName = String(formData.subcategory_name || formData.subcategory || '').trim();
    const matchingByNameInSelectedCategory = subCategoryLookupName
      ? subcategories.find((subcategory) => {
          const sameName = String(subcategory?.name || '').trim().toLowerCase() === subCategoryLookupName.toLowerCase();
          const sameCategory = Number(subcategory?.category_id) === Number(currentCategoryId);
          return sameName && sameCategory;
        })
      : null;

    if (matchingByNameInSelectedCategory) {
      currentSubCategoryId = Number(matchingByNameInSelectedCategory.id);
    }

    if (!isEditing && (currentSubCategoryId == null || Number.isNaN(currentSubCategoryId) || !subcategories.some((subcategory) => Number(subcategory?.id) === Number(currentSubCategoryId)))) {
      alert('Sub Category not found.');
      setIsSubmitting(false);
      return;
    }

    const selectedSubcategory = subcategories.find((subcategory) => Number(subcategory?.id) === Number(currentSubCategoryId));
    if (selectedSubcategory && Number(selectedSubcategory.category_id) !== Number(currentCategoryId)) {
      const fallbackMatch = subcategories.find((subcategory) => {
        const subName = String(subcategory?.name || '').trim().toLowerCase();
        const lookName = subCategoryLookupName.toLowerCase();
        const sameName = subName === lookName;
        const sameCategory = Number(subcategory?.category_id) === Number(currentCategoryId);
        return sameName && sameCategory;
      });

      if (fallbackMatch) {
        currentSubCategoryId = Number(fallbackMatch.id);
      } else {
        const categoryMatch = categories.find(c => Number(c.id) === Number(currentCategoryId));
        const subCategoryName = selectedSubcategory?.name || subCategoryLookupName;
        const categoryName = categoryMatch?.name || 'Selected Category';

        alert(`Sub Category "${subCategoryName}" does not belong to "${categoryName}". Please select a sub category that belongs to the selected main category.`);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const finalCategoryId = currentCategoryId;
      const finalSubcategoryId = currentSubCategoryId;
      const finalBrandId = currentBrandId;

      // Get category/brand names from existing records for backward compatibility
      const categoryNameToUse = categories.find(c => Number(c.id) === finalCategoryId)?.name || formData.category_name || formData.itc || '';
      const brandNameToUse = brands.find(b => Number(b.id) === finalBrandId)?.name || formData.brand_name || formData.brandcode || '';

      // Build final data with both new and old column names for backward compatibility
      const finalData = { 
        ...formData,
        // Ensure both column names are set
        name: formData.itname || formData.name,
        itname: formData.itname || formData.name,
        print_name: formData.itnameprint || formData.print_name,
        itnameprint: formData.itnameprint || formData.print_name,
        hsn_code: formData.hsncode || formData.hsn_code,
        hsncode: formData.hsncode || formData.hsn_code,
        picture: formData.picture || formData.image_url,
        image_url: formData.picture || formData.image_url,
        imagename: formData.imagename,
        itemdescription: formData.itemdescription || formData.description,
        description: formData.itemdescription || formData.description,
        take_rate: formData.takerate || formData.take_rate || 0,
        takerate: formData.takerate || formData.take_rate || 0,
        retail_rate: formData.restrate || formData.retail_rate || 0,
        restrate: formData.restrate || formData.retail_rate || 0,
        delivery_rate: formData.dlvrate || formData.delivery_rate || 0,
        dlvrate: formData.dlvrate || formData.delivery_rate || 0,
        online_rate: formData.onlinerate || formData.online_rate || 0,
        sale_rate: formData.onlinerate || formData.sale_rate || 0,
        onlinerate: formData.onlinerate || formData.sale_rate || 0,
        purchase_rate: formData.purcrate || formData.purchase_rate || 0,
        purcrate: formData.purcrate || formData.purchase_rate || 0,
        stock: formData.opstock || formData.stock,
        opstock: formData.opstock || formData.stock,
        discount_pct: formData.discperc || formData.discount_pct || 0,
        discount_percent: formData.discperc || formData.discount_percent || 0,
        discount: formData.discperc || formData.discount || 0,
        discperc: formData.discperc || formData.discount_percent || 0,
        is_favourite: formData.isfav || formData.is_favourite || 'No',
        isfav: formData.isfav || formData.is_favourite || 'No',
        unit_name: formData.unitcode || formData.unit_name,
        unitcode: formData.unitcode || formData.unit_name,
        item_group: formData.itg || formData.item_group,
        itg: formData.itg || formData.item_group,
        item_category: formData.itc || formData.item_category,
        category_name: categoryNameToUse,
        itc: categoryNameToUse,
        department_code: formData.dtcode || formData.department_code,
        dtcode: formData.dtcode || formData.department_code,
        k_code: formData.kcode || formData.k_code,
        kcode: formData.kcode || formData.k_code,
        brand_code: brandNameToUse,
        brand_name: brandNameToUse,
        brandcode: brandNameToUse,
        is_discountable: formData.isdiscountable || formData.is_discountable || 'Yes',
        isdiscountable: formData.isdiscountable || formData.is_discountable || 'Yes',
        gst_percent: formData.gst || formData.gst_percent || 0,
        gst: formData.gst || formData.gst_percent || 0,
        cess_percent: formData.cess || formData.cess_percent || 0,
        cess: formData.cess || formData.cess_percent || 0,
        shop_id: formData.shopid || formData.shop_id,
        shopid: formData.shopid || formData.shop_id,
        is_package: formData.ispackage || formData.is_package || 'No',
        ispackage: formData.ispackage || formData.is_package || 'No',
        narration: formData.narration,
        narration2: formData.narration2,
        item_status: formData.itemstatus || formData.item_status || 'Active',
        itemstatus:
  typeof formData.itemstatus === "number"
    ? formData.itemstatus
    : String(formData.itemstatus ?? "").toLowerCase() === "active"
      ? 1
      : 0,
        category_id: finalCategoryId,
        subcategory_id: finalSubcategoryId,
        brand_id: finalBrandId
      };
      
      // Remove UI-only fields that aren't in the database
      delete finalData.brand;
      delete finalData.category;
      delete finalData.subcategory;
      delete finalData.unit;
      
      if (finalData.main_image_file) {
        const { url, error: uploadError } = await uploadImage(finalData.main_image_file, 'products');
        if (uploadError) throw new Error(`Product Image Upload Failed: ${uploadError}`);
        if (url) {
          finalData.image_url = url;
          finalData.picture = url;
          delete finalData.main_image_file;
        }
      }

      // No fallback - image_url can be null
      if (!finalData.image_url && !finalData.picture) {
        finalData.image_url = null;
        finalData.picture = null;
      }

      let res;
      let insertedProduct = null;

      if (editingProduct) {
        // Bariki: Stock update must be atomic via RPC if it changed
        const oldStock = parseFloat(editingProduct.opstock ?? editingProduct.stock ?? 0);
        const newStock = parseFloat(finalData.opstock ?? finalData.stock ?? 0);

        // Update product master data (excluding stock from direct update)
        const masterUpdateData = { ...finalData };
        delete masterUpdateData.stock;
        delete masterUpdateData.opstock;

        res = await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.UPDATE, { id: editingProduct.id, ...masterUpdateData });

        if (oldStock !== newStock) {
          try {
            await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.ADJUST_STOCK, {
              product_id: editingProduct.id,
              change_qty: newStock - oldStock,
              change_type: 'manual',
              narration: 'Manual update from Product Master'
            });
          } catch (invErr) {
            console.warn('Atomic stock adjustment failed:', invErr.message);
            toast.error("Stock could not be updated atomically");
          }
        }
      } else {
        // DON'T set id - let Supabase auto-generate!
        res = await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.INSERT, finalData);

        // Get the inserted product from the response!
        if (res.success && res.data && (Array.isArray(res.data) ? res.data.length > 0 : res.data)) {
          insertedProduct = Array.isArray(res.data) ? res.data[0] : res.data;
        }

        // Inventory log for new product happens automatically if opstock > 0 and we used an atomic path?
        // Wait, for NEW products, we just INSERT. We should probably adjust stock atomically if opstock > 0?
        // Actually, the initial INSERT is fine for a new row. But to be safe and consistent with audit logs:
        const initialStock = parseFloat(finalData.opstock ?? finalData.stock ?? 0);
        if (insertedProduct && insertedProduct.id && initialStock > 0) {
          try {
            // Log the initial opening stock
            await handleERPAction(DB_SCHEMA.INVENTORY_LOGS.table, ACTION_TYPES.INSERT, {
              product_id: insertedProduct.id,
              old_stock: 0,
              new_stock: initialStock,
              change_qty: initialStock,
              change_type: 'opening',
              narration: 'Initial stock on creation'
            });
          } catch (invErr) { console.warn('Opening inventory log skipped:', invErr.message); }
        }
      }

      if (!res?.success) {
        throw new Error(`Database Error: ${res?.error || 'Save request was rejected'}`);
      }
      if (editingProduct && !res.data) {
        throw new Error('Save failed: Supabase updated 0 product rows. Check login permissions and tenant/company context.');
      }
      if (!editingProduct && !insertedProduct) {
        throw new Error('Save failed: Supabase did not return the newly inserted product row.');
      }

      setShowForm(false);
      setEditingProduct(null);
      setFormData({});
      setSearchTerm('');
      setSelectedCategoryId('');
      setSelectedSubcategoryId('');
      setCurrentPage(1);
      setGstError('');
      setCessError('');

      // Force fetch taaki Supabase waala data 100% UI me aa jaye — Realtime ke aane se bhi pehle
      try { await fetchInitialData(true, true, { productsIncludeDeleted: showTrash }); } catch (e) { console.warn('post-save refresh:', e); }

      toast?.success ? toast.success("Product saved successfully!") : alert("Product saved successfully!");
    } catch (error) {
      console.error("Product Save Error:", error);
      const errMsg = String(error?.message || error || 'Unknown error');
      toast?.error?.(`Product save failed: ${errMsg}`);
      // Postgres unique violation (SQLSTATE 23505) — typically barcode collision
      if (errMsg.includes('23505') || /duplicate.*key.*violates/i.test(errMsg) || /uq_products_barcode/i.test(errMsg)) {
        const bcValMatch = errMsg.match(/barcode[^\w]*=?[^\w]*["']?([^"'\)]+)/i);
        const bcHint = bcValMatch ? ` (barcode: ${bcValMatch[1]})` : '';
        alert(`❌ Duplicate Barcode${bcHint}!\n\nThis barcode is already in use by another product. Please choose a different barcode or edit the existing product instead.`);
      } else {
        alert(`Product Operation Failed!\n\nReason: ${errMsg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBulkMode) {
    return (
      <BulkProductEntry
        products={products}
        categories={categories}
        brands={brands}
        subcategories={subcategories}
        uploadImage={uploadImage}
        fetchInitialData={fetchInitialData}
        onClose={() => setIsBulkMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-900 border border-slate-100">
              <GitBranch size={20} />
            </div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Item Master</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
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
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Category</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setSelectedSubcategoryId(''); // Reset subcategory when category changes
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 outline-none transition-all"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Subcategory</label>
            <select
              value={selectedSubcategoryId}
              onChange={(e) => setSelectedSubcategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 outline-none transition-all"
              disabled={!selectedCategoryId}
            >
              <option value="">All Subcategories</option>
              {availableSubcategories.map(subcat => (
                <option key={subcat.id} value={subcat.id}>{subcat.name}</option>
              ))}
            </select>
          </div>

          {/* Reset Filter Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId('');
              setSelectedSubcategoryId('');
            }}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 transition-all"
          >
            Reset Filters
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={async () => {
              const next = !showTrash;
              setShowTrash(next);
              try {
                await fetchInitialData(true, false, { productsIncludeDeleted: next });
              } catch {}
            }}
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
                  const count = res.count ?? 0;
                  if (count === 0) {
                    alert("0 products delete hue. Ya to pehle se hi recycle bin me hain ya tenant/company_code mismatch hai.");
                  } else {
                    alert(`Aapke ${count} products ko recycle bin me bhej diya gaya hai.`);
                    try {
                      await fetchInitialData(true, false, { productsIncludeDeleted: showTrash });
                    } catch (e) {
                      console.warn('deleteAll refresh fallback to reload:', e);
                      window.location.reload();
                    }
                  }
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
            onClick={() => setIsBulkMode(true)}
            className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
            title="Open Scanner-First Bulk Entry Mode"
          >
            <Zap size={14} /> BULK ENTRY
          </button>

          <ExcelUpload 
            tableKey="PRODUCTS" 
            buttonText="IMPORT ITEM"
            uniqueField="barcode"
            processData={(data) => processProductImportData(data, brands || [])}
            onSuccess={async (_data, msg) => {
              try {
                // Force refresh from Supabase (pura data fir se load)
                await fetchInitialData(true, false, { productsIncludeDeleted: showTrash });
              } catch (e) {
                console.warn('post-import refresh fallback to reload:', e);
                window.location.reload();
              }
              toast?.success ? toast.success(msg || "Import complete") : null;
            }}
          />
          <button 
            onClick={() => { 
              setEditingProduct(null); 
              setFormData({
                // New fields
                itname: '',
                onlinerate: 0, 
                purcrate: 0, 
                gst: 0, 
                cess: 0, 
                discperc: 0, 
                isfav: 'No', 
                opstock: 0,
                hsncode: '',
                // Old fields for backward compatibility
                name: '',
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
                unit_name: 'Nos'
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-4 text-[12px] font-black text-slate-800 uppercase tracking-widest">SNo</th>
                <th className="px-5 py-4 text-[12px] font-black text-slate-800 uppercase tracking-widest">Name / Category</th>
                <th className="px-5 py-4 text-[12px] font-black text-slate-800 uppercase tracking-widest text-center">Barcode / HSN</th>
                <th className="px-5 py-4 text-[12px] font-black text-slate-800 uppercase tracking-widest text-center">Brand / Counter</th>
                <th className="px-5 py-4 text-[12px] font-black text-slate-800 uppercase tracking-widest text-center">Pricing (₹)</th>
                <th className="px-5 py-4 text-[12px] font-black text-slate-800 uppercase tracking-widest text-center">Tax / Disc</th>
                <th className="px-5 py-4 text-[12px] font-black text-slate-800 uppercase tracking-widest text-center">Stock / Specs</th>
                <th className="px-5 py-4 text-[12px] font-black text-slate-800 uppercase tracking-widest text-center">Picture</th>
                <th className="px-5 py-4 text-[12px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((product, idx) => {
                // Helper function to get value from either new or old column
                const getVal = (newField, oldField) => product[newField] ?? product[oldField];
                const productName = getVal('itname', 'name');
                
                return (
                <tr key={product.id} className="odd:bg-white even:bg-slate-100 hover:bg-blue-50/30 transition-colors group">
                  <td className="px-5 py-4 text-[12px] font-bold text-slate-500">
                    {(currentPage - 1) * rowsPerPage + idx + 1}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[12px] font-black text-slate-800 uppercase tracking-tighter leading-tight">{productName}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                      {resolveCategoryName(product)} {resolveSubcategoryName(product) !== '-' ? `/ ${resolveSubcategoryName(product)}` : ''}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <p className="text-[12px] font-bold text-slate-600">{product.barcode || '-'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">HSN: {getVal('hsncode', 'hsn_code') || '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <p className="text-[12px] font-bold text-slate-600 uppercase">{resolveBrandName(product)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{product.counter_name || '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[12px] font-black text-blue-700">Sale: ₹{getVal('onlinerate', 'sale_rate')}</span>
                      <span className="text-[10px] text-slate-400 line-through font-bold">MRP: ₹{product.mrp}</span>
                      <span className="text-[10px] text-slate-500 font-bold">Purc: ₹{getVal('purcrate', 'purchase_rate') || 0}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {getVal('discperc', 'discount_percent') || 0}% OFF
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">GST: {getVal('gst', 'gst_percent') || 0}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-[12px] font-black",
                        (getVal('opstock', 'stock') || 0) <= 5 ? "text-red-600" : "text-green-600"
                      )}>
                        Stock: {getVal('opstock', 'stock') || 0}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {product.size ? `Size: ${product.size}` : ''} {product.color ? `| ${product.color}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="w-12 h-12 mx-auto bg-slate-50 rounded-lg border border-slate-200 overflow-hidden p-1">
                      <img
                        src={resolveProductImageUrl(getVal('picture', 'image_url') || product.imagename) || undefined}
                        alt={productName}
                        className="w-full h-full object-contain"
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      {showTrash ? (
                        <>
                          <button 
                            onClick={async () => {
                              if (!window.confirm(`Restore ${productName}?`)) return;
                              try {
                                await dbSync.update(DB_SCHEMA.PRODUCTS.table, product.id, { is_active: true });
                                // Force re-fetch with includeDeleted because we're in Trash view
                                await fetchInitialData(true, false, { productsIncludeDeleted: true });
                                toast?.success ? toast.success(`${productName} restored!`) : null;
                              } catch (e) {
                                console.error('Restore failed:', e);
                                alert(`Restore failed: ${e.message}`);
                              }
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-all"
                            title="Restore"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (!window.confirm(`PERMANENTLY DELETE ${productName}? Yeh wapas nahi aayega!`)) return;
                              try {
                                await dbSync.delete(DB_SCHEMA.PRODUCTS.table, product.id, true);
                                // Hard delete ke baad bhi re-fetch taaki dusre deleted items ki list sahi rahe
                                await fetchInitialData(true, false, { productsIncludeDeleted: true });
                                toast?.success ? toast.success(`${productName} permanently deleted`) : null;
                              } catch (e) {
                                console.error('Permanent delete failed:', e);
                                alert(`Delete failed: ${e.message}`);
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
                              setProductToAdjust(product);
                              setShowCountDialog(true);
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                            title="Physical Count"
                          >
                            <Calculator size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setProductToAdjust(product);
                              setShowAdjustDialog(true);
                            }}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                            title="Adjust Stock"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button 
                            onClick={() => { 
                              setEditingProduct(product); 
                              // Pre-fill form data with proper category/subcategory/brand fields
                              let prefilledData = {
                                ...product,
                                category: product.itc || product.category_name || product.category || '',
                                subcategory: product.subcategory_name || product.subcategory || '',
                                brand: resolveBrandName(product),
                                unit: product.unitcode || product.unit_name || 'Nos'
                              };

                              const matchingCategory = resolveCategoryId(prefilledData);
                              if (matchingCategory) {
                                prefilledData.category_id = matchingCategory.id;
                                prefilledData.category_name = matchingCategory.name;
                                prefilledData.category = matchingCategory.name;
                                prefilledData.itc = matchingCategory.name;
                              }

                              const matchingSubCategory = resolveSubcategoryId(prefilledData);
                              if (matchingSubCategory) {
                                prefilledData.subcategory_id = matchingSubCategory.id;
                                prefilledData.subcategory_name = matchingSubCategory.name;
                                prefilledData.subcategory = matchingSubCategory.name;
                              }

                              const matchingBrand = resolveBrandId(prefilledData);
                              if (matchingBrand) {
                                prefilledData.brand_id = matchingBrand.id;
                                prefilledData.brand_name = matchingBrand.name;
                                prefilledData.brandcode = matchingBrand.name;
                                prefilledData.brand = matchingBrand.name;
                              }

                              // Ensure internal state consistency
                              prefilledData = resolveFormSubcategory(prefilledData);

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
                              if (!window.confirm(`Delete ${productName}? (yaha se delete = Supabase me soft delete, Recycle Bin se restore kar sakte ho)`)) return;
                              try {
                                const res = await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.DELETE, { id: product.id });
                                if (!res.success) throw new Error(res.error || 'Unknown delete error');
                                // Force = true, silent=false, includeDeleted as per current showTrash
                                await fetchInitialData(true, false, { productsIncludeDeleted: showTrash });
                                toast?.success ? toast.success(`${productName} moved to Recycle Bin`) : null;
                              } catch (e) {
                                console.error('Product delete failed:', e);
                                alert(`Delete failed: ${e.message}`);
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-all"
                            title="Delete (soft delete, can restore)"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>

        {/* Stock Valuation Summary Footer */}
        {!showTrash && (
          <div className="bg-slate-900 px-6 py-4 flex flex-wrap justify-between items-center gap-6 border-t border-slate-800">
            <div className="flex gap-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Inventory Items</p>
                <p className="text-xl font-black text-white">{filteredProducts.length}</p>
              </div>
              <div className="space-y-1 border-l border-slate-800 pl-10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Stock Quantity</p>
                <p className="text-xl font-black text-emerald-400">
                  {filteredProducts.reduce((sum, p) => sum + (parseFloat(p.stock) || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1 border-l border-slate-800 pl-10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Inventory Value (Purchase)</p>
                <p className="text-xl font-black text-amber-400">
                  ₹{filteredProducts.reduce((sum, p) => sum + ((parseFloat(p.stock) || 0) * (parseFloat(p.purcrate || p.purchase_rate) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="space-y-1 border-l border-slate-800 pl-10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Inventory Value (Sale)</p>
                <p className="text-xl font-black text-blue-400">
                  ₹{filteredProducts.reduce((sum, p) => sum + ((parseFloat(p.stock) || 0) * (parseFloat(p.onlinerate || p.sale_rate) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const data = filteredProducts.map(p => ({
                  'Item Name': p.itname || p.name,
                  'Barcode': p.barcode,
                  'Stock': p.stock,
                  'Unit': p.unit_name,
                  'Purchase Rate': p.purcrate || p.purchase_rate,
                  'Sale Rate': p.onlinerate || p.sale_rate,
                  'Purchase Value': (parseFloat(p.stock) || 0) * (parseFloat(p.purcrate || p.purchase_rate) || 0),
                  'Sale Value': (parseFloat(p.stock) || 0) * (parseFloat(p.onlinerate || p.sale_rate) || 0)
                }));
                import('../../erpController').then(m => m.exportToExcel(data, `Inventory_Valuation_${new Date().toISOString().split('T')[0]}`));
              }}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10"
            >
              <RefreshCw size={14} /> Export Valuation
            </button>
          </div>
        )}

        <div className="flex-shrink-0">
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            setCurrentPage={setCurrentPage}
            totalRecords={filteredProducts.length}
          />
        </div>
      </div>


      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border-t-4 border-blue-600"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center gap-2">
                  <GitBranch size={18} className="text-blue-700" />
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">
                    Item [ {editingProduct ? 'EDIT' : 'NEW'} ]
                  </h3>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
                    {/* Row 1 */}
                    <div className="md:col-span-6 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Item Name</label>
                      <input
                        type="text"
                        value={formData.itname || formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, itname: e.target.value, name: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Barcode</label>
                        <button type="button" onClick={() => setFormData({...formData, barcode: Math.random().toString().slice(2, 13)})} className="text-[10px] font-bold text-blue-600 hover:underline">Generate code</button>
                      </div>
                      <input
                        type="text"
                        value={formData.barcode || ''}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">HSN Code</label>
                      <input
                        type="text"
                        value={formData.hsncode || formData.hsn_code || ''}
                        onChange={(e) => setFormData({ ...formData, hsncode: e.target.value, hsn_code: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>

                    {/* Row 2 */}
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                        Item Group Name ({categories.length})
                      </label>
                      <select value={String(formData.category_id ?? '')} onChange={(e) => {
                        const selectedCat = categories.find(c => String(c.id) === String(e.target.value));
                        const selectedCategoryId = e.target.value;
                        const nextFormData = {
                          ...formData,
                          category_id: selectedCategoryId,
                          category_name: selectedCat?.name || '',
                          category: selectedCat?.name || ''
                        };

                        setFormData(resolveFormSubcategory(nextFormData));
                      }} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none">
                        <option value="">Select Group</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                        Sub Category Name ({subcategories.length})
                      </label>
                      <select value={String(formData.subcategory_id ?? '')} onChange={(e) => {
                        const selectedSubCat = subcategories.find(s => String(s.id) === String(e.target.value));
                        const updates = {
                          subcategory_id: e.target.value,
                          subcategory_name: selectedSubCat?.name || '',
                          subcategory: selectedSubCat?.name || ''
                        };

                        // Smart Auto-Selection: If subcategory has a parent category, update it too
                        if (selectedSubCat?.category_id) {
                          const parentCat = categories.find(c => String(c.id) === String(selectedSubCat.category_id));
                          updates.category_id = String(selectedSubCat.category_id);
                          updates.category_name = parentCat?.name || '';
                          updates.category = parentCat?.name || '';
                        }

                        setFormData({ ...formData, ...updates });
                      }} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none">
                        <option value="">Select Sub Category</option>
                        {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Brand Name</label>
                      <select value={String(formData.brand_id ?? '')} onChange={(e) => {
                        const selectedBrand = brands.find(b => String(b.id) === String(e.target.value));
                        setFormData({
                          ...formData,
                          brand_id: e.target.value,
                          brand_name: selectedBrand?.name || '',
                          brand: selectedBrand?.name || ''
                        });
                      }} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none">
                        <option value="">Select Brand</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Unit Name</label>
                      <select value={formData.unit || formData.unit_name || ''} onChange={(e) => setFormData({ ...formData, unit: e.target.value, unit_name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none">
                        <option value="Nos">Nos</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Kg">Kg</option>
                        <option value="Ltr">Ltr</option>
                        <option value="Box">Box</option>
                        <option value="Pkt">Pkt</option>
                      </select>
                    </div>

                    <div className="md:col-span-12 border-t border-slate-100 my-2" />

                    {/* Row 3 */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Sale Rate</label>
                      <input type="number" value={formData.onlinerate || formData.sale_rate || 0} onChange={(e) => setFormData({ ...formData, onlinerate: e.target.value, sale_rate: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mrp</label>
                      <input type="number" value={formData.mrp || 0} onChange={(e) => setFormData({ ...formData, mrp: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Purchase Rate</label>
                      <input type="number" value={formData.purcrate || formData.purchase_rate || 0} onChange={(e) => setFormData({ ...formData, purcrate: e.target.value, purchase_rate: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Gst %</label>
                      <input
                        type="number"
                        value={formData.gst || formData.gst_percent || 0}
                        onChange={(e) => setFormData({ ...formData, gst: e.target.value, gst_percent: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cess %</label>
                      <input
                        type="number"
                        value={formData.cess || formData.cess_percent || 0}
                        onChange={(e) => setFormData({ ...formData, cess: e.target.value, cess_percent: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Discount %</label>
                      <input type="number" value={formData.discount_percent || formData.discperc || 0} onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value, discperc: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none" />
                    </div>

                    {/* Row 4 */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Opening Stock</label>
                      <input type="number" value={formData.opstock || formData.stock || 0} onChange={(e) => setFormData({ ...formData, opstock: e.target.value, stock: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Is favourite</label>
                      <select value={formData.is_favourite || formData.isfav || 'No'} onChange={(e) => setFormData({ ...formData, is_favourite: e.target.value, isfav: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Is Discountable</label>
                      <select value={formData.is_discountable || formData.isdiscountable || 'Yes'} onChange={(e) => setFormData({ ...formData, is_discountable: e.target.value, isdiscountable: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    <div className="md:col-span-12 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Item Description</label>
                      <textarea
                        value={formData.description || formData.itemdescription || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value, itemdescription: e.target.value })}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 outline-none transition-all"
                      />
                      <p className="text-[10px] text-slate-400 font-bold">{(formData.description || formData.itemdescription || '').length}/250 Characters</p>
                    </div>

                    {/* Image Upload Section */}
                    <div className="md:col-span-12 pt-4">
                      <div className="flex flex-wrap items-end gap-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              id="product-image-upload"
                              onChange={(e) => setFormData({ ...formData, main_image_file: e.target.files[0] })}
                              className="text-xs font-bold file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (!formData.main_image_file) return alert("Please choose a file first");
                                const { url, error } = await uploadImage(formData.main_image_file, 'products');
                                if (url) {
                                  setFormData((previous) => ({ ...previous, image_url: url, picture: url, main_image_file: null }));
                                  alert("Image Uploaded Successfully!");
                                } else {
                                  alert("Upload Failed: " + error);
                                }
                              }}
                              className="bg-white border border-slate-400 text-slate-700 px-6 py-1.5 rounded-md text-[10px] font-black uppercase hover:bg-slate-50 transition-all shadow-sm"
                            >
                              Upload
                            </button>
                          </div>

                          <div className="mt-4 flex flex-col items-start gap-2">
                             <div className="w-16 h-12 rounded border border-slate-200 overflow-hidden bg-slate-50 p-1">
                               {(formData.main_image_file || formData.image_url || formData.picture) ? (
                                  <img src={formData.main_image_file ? URL.createObjectURL(formData.main_image_file) : (formData.image_url || formData.picture)} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Upload size={16} className="text-slate-300" /></div>
                                )}
                             </div>
                             <button type="button" className="text-blue-600 text-[10px] font-bold underline">View</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-10 py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 flex items-center gap-2 hover:bg-blue-700 transition-all"
                    >
                      {isSubmitting ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                      Save
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="px-10 py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] bg-slate-500 text-white hover:bg-slate-600 transition-all shadow-md"
                    >
                      Cancel
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
                    <svg ref={async (el) => { if (el && barcodeToPrint?.barcode && index === 0) { const JsBarcode = (await import('jsbarcode')).default; JsBarcode(el, barcodeToPrint.barcode, { format: 'CODE128', width: 2, height: 30, margin: 0, fontSize: 10 }); } }} id={`barcode-${index}`}></svg>
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

      <StockAdjustmentDialog
        isOpen={showAdjustDialog}
        onClose={() => {
          setShowAdjustDialog(false);
          setProductToAdjust(null);
        }}
        product={productToAdjust}
        fetchInitialData={fetchInitialData}
      />
      <PhysicalCountDialog
        isOpen={showCountDialog}
        onClose={() => {
          setShowCountDialog(false);
          setProductToAdjust(null);
        }}
        product={productToAdjust}
        fetchInitialData={fetchInitialData}
      />
    </div>
  );
}
