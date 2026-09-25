import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  Search,
  Barcode,
  Zap,
  RefreshCw,
  Save,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { handleERPAction, ACTION_TYPES, parseERPCSV } from '../../erpController';
import { DB_SCHEMA } from '../../dbSchema';

const SESSION_STORAGE_ITEMS_KEY = 'nm_bulk_entry_session_items';
const SESSION_STORAGE_UNKNOWN_KEY = 'nm_bulk_entry_unknown_barcodes';

export default function BulkProductEntry({
  products = [],
  categories = [],
  brands = [],
  subcategories = [],
  uploadImage,
  fetchInitialData,
  onClose
}) {
  // =========================================================
  // SEARCH / SCANNER STATE
  // =========================================================

  const [searchInput, setSearchInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Camera scanner
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // =========================================================
  // SESSION STATE
  // =========================================================

  const [sessionItems, setSessionItems] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_ITEMS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [unknownBarcodes, setUnknownBarcodes] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_UNKNOWN_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [unmatchedImages, setUnmatchedImages] = useState([]);
  const [highlightedBarcodes, setHighlightedBarcodes] = useState(new Set());

  // =========================================================
  // MODAL / UI STATE
  // =========================================================

  const [showSavePreview, setShowSavePreview] = useState(false);
  const [isSaving, setIsProcessing] = useState(false);

  const [saveProgress, setSaveProgress] = useState({
    current: 0,
    total: 0
  });

  const [failedItems, setFailedItems] = useState([]);
  const [showFailedDrawer, setShowFailedDrawer] = useState(false);

  const [replaceBlankExcelValues, setReplaceBlankValues] = useState(false);

  const [showUnknownDrawer, setShowUnknownDrawer] = useState(false);
  const [showUnmatchedImagesDrawer, setShowUnmatchedImagesDrawer] = useState(false);

  // =========================================================
  // BRANDS
  // =========================================================

  const bulkBrands = useMemo(() => {
    const seen = new Set();

    return (Array.isArray(brands) ? brands : [])
      .map((brand) => {
        if (!brand || brand.id == null) return null;

        const name = String(
          brand.name ??
          brand.brand_name ??
          brand.brandname ??
          brand.title ??
          ''
        ).trim();

        if (!name) return null;

        return {
          ...brand,
          id: brand.id,
          name
        };
      })
      .filter(Boolean)
      .filter((brand) => {
        const key = String(brand.id).trim();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
  }, [brands]);

  // =========================================================
  // CATEGORIES
  // =========================================================

  const bulkCategories = useMemo(() => {
    const seen = new Set();

    return (Array.isArray(categories) ? categories : [])
      .map((category) => {
        if (!category || category.id == null) return null;

        const name = String(
          category.name ??
          category.category_name ??
          category.title ??
          ''
        ).trim();

        if (!name) return null;

        return {
          ...category,
          id: category.id,
          name
        };
      })
      .filter(Boolean)
      .filter((category) => {
        const key = String(category.id).trim();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
  }, [categories]);

  // =========================================================
  // SUBCATEGORIES
  //
  // IMPORTANT:
  // ALL MASTER SUBCATEGORIES ARE KEPT.
  // NO CATEGORY FILTER IS APPLIED HERE.
  // =========================================================

  const bulkSubcategories = useMemo(() => {
    const seen = new Set();

    return (Array.isArray(subcategories) ? subcategories : [])
      .map((subcategory) => {
        if (!subcategory || subcategory.id == null) return null;

        const name = String(
          subcategory.name ??
          subcategory.subcategory_name ??
          subcategory.subcategory ??
          subcategory.title ??
          ''
        ).trim();

        if (!name) return null;

        return {
          ...subcategory,

          id: subcategory.id,

          name,

          category_id:
            subcategory.category_id ??
            subcategory.parent_category_id ??
            subcategory.categoryId ??
            null
        };
      })
      .filter(Boolean)
      .filter((subcategory) => {
        const key = String(subcategory.id).trim();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
  }, [subcategories]);

  // =========================================================
  // CATEGORY ID RESOLUTION
  // =========================================================

  const resolveCatId = useCallback((row) => {
    if (!row) return '';

    if (!row.category_id && !row.category_name) {
      return '';
    }

    // Direct ID match
    const directCat = categories.find(
      (c) =>
        String(c.id).trim() ===
        String(row.category_id).trim()
    );

    if (directCat) {
      return String(directCat.id);
    }

    // Name match
    const categoryCandidates = [
      row.category_name,
      row.category_id
    ]
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean);

    const nameCat = categories.find((c) =>
      categoryCandidates.includes(
        String(c.name || '').trim().toLowerCase()
      )
    );

    if (nameCat) {
      return String(nameCat.id);
    }

    return String(row.category_id || row.category_name || '');
  }, [categories]);

  // =========================================================
  // PERSIST SESSION
  // =========================================================

  useEffect(() => {
    try {
      const cleanForStorage = sessionItems.map((item) => {
        const {
          new_image_file,
          ...rest
        } = item;

        return rest;
      });

      localStorage.setItem(
        SESSION_STORAGE_ITEMS_KEY,
        JSON.stringify(cleanForStorage)
      );
    } catch (err) {
      console.warn(
        'Failed to persist bulk session to localStorage:',
        err
      );
    }
  }, [sessionItems]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SESSION_STORAGE_UNKNOWN_KEY,
        JSON.stringify(unknownBarcodes)
      );
    } catch (err) {
      console.warn(
        'Failed to persist unknown barcodes to localStorage:',
        err
      );
    }
  }, [unknownBarcodes]);

  // =========================================================
  // FOCUS SEARCH INPUT
  // =========================================================

  const focusInput = useCallback(() => {
    setTimeout(() => {
      if (
        searchInputRef.current &&
        document.activeElement !== searchInputRef.current
      ) {
        const isEditingTableInput =
          document.activeElement &&
          (
            document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'SELECT'
          ) &&
          document.activeElement !== searchInputRef.current;

        if (!isEditingTableInput) {
          searchInputRef.current.focus();
        }
      }
    }, 50);
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  // =========================================================
  // BARCODE MAP
  // =========================================================

  const barcodeMap = useMemo(() => {
    const map = new Map();

    (products || []).forEach((p) => {
      if (p.barcode) {
        map.set(
          String(p.barcode).trim(),
          p
        );
      }

      if (p.hsn_code) {
        map.set(
          String(p.hsn_code).trim(),
          p
        );
      }

      if (p.hsncode) {
        map.set(
          String(p.hsncode).trim(),
          p
        );
      }
    });

    return map;
  }, [products]);

  // =========================================================
  // LIVE PRODUCT SEARCH
  // =========================================================

  const matchingProducts = useMemo(() => {
    const term = searchInput
      .trim()
      .toLowerCase();

    if (!term) return [];

    return (products || [])
      .filter((p) => {
        const name = String(
          p.itname ||
          p.name ||
          ''
        ).toLowerCase();

        const barcode = String(
          p.barcode ||
          ''
        ).toLowerCase();

        const brand = String(
          p.brand_name ||
          p.brandcode ||
          ''
        ).toLowerCase();

        const cat = String(
          p.category_name ||
          p.itc ||
          ''
        ).toLowerCase();

        const subcat = String(
          p.subcategory_name ||
          p.dtcode ||
          ''
        ).toLowerCase();

        return (
          name.includes(term) ||
          barcode.includes(term) ||
          brand.includes(term) ||
          cat.includes(term) ||
          subcat.includes(term)
        );
      })
      .slice(0, 12);
  }, [searchInput, products]);

  // =========================================================
  // ADD PRODUCT TO SESSION
  // =========================================================

  const addProductToSession = useCallback(
    (product) => {
      if (!product) return;

      const barcodeKey = String(
        product.barcode ||
        product.id
      ).trim();

      setSessionItems((prev) => {
        const existingIdx = prev.findIndex(
          (item) =>
            String(item.id) ===
              String(product.id) ||
            (
              barcodeKey &&
              String(item.barcode).trim() ===
                barcodeKey
            )
        );

        // DUPLICATE PRODUCT
        if (existingIdx !== -1) {
          const updated = [...prev];

          const currentCount =
            updated[existingIdx].scan_count || 1;

          updated[existingIdx] = {
            ...updated[existingIdx],
            scan_count:
              currentCount + 1
          };

          setHighlightedBarcodes(
            (h) =>
              new Set(h).add(barcodeKey)
          );

          setTimeout(() => {
            setHighlightedBarcodes((h) => {
              const next = new Set(h);

              next.delete(barcodeKey);

              return next;
            });
          }, 1500);

          toast.info(
            `Incremented scan count for "${
              product.itname ||
              product.name
            }" (${currentCount + 1} scans)`
          );

          return updated;
        }

        // NEW PRODUCT
        const mrp =
          parseFloat(product.mrp) || 0;

        const purchaseRate =
          parseFloat(
            product.purcrate ??
            product.purchase_rate
          ) || 0;

        const saleRate =
          parseFloat(
            product.onlinerate ??
            product.sale_rate
          ) || 0;

        const discount =
          parseFloat(
            product.discperc ??
            product.discount_percent
          ) || 0;

        const gst =
          parseFloat(
            product.gst ??
            product.gst_percent
          ) || 0;

        const stock =
          parseFloat(
            product.opstock ??
            product.stock
          ) || 0;

        const rawImg = String(
          product.picture ||
          product.image_url ||
          ''
        ).trim();

        const cleanImg =
          rawImg.includes('/products/null')
            ? ''
            : rawImg;

        const newItem = {
          id: product.id,

          itname:
            product.itname ||
            product.name ||
            '',

          name:
            product.itname ||
            product.name ||
            '',

          barcode:
            product.barcode ||
            '',

          brand_id:
            product.brand_id ?? '',

          brand_name:
            product.brand_name ||
            product.brandcode ||
            '',

          category_id:
            product.category_id ?? '',

          category_name:
            product.category_name ||
            product.itc ||
            '',

          itc:
            product.itc ||
            product.category_name ||
            '',

          subcategory_id:
            product.subcategory_id ?? '',

          subcategory_name:
            product.subcategory_name ||
            product.dtcode ||
            '',

          dtcode:
            product.dtcode ||
            product.subcategory_name ||
            '',

          mrp,

          purchase_rate:
            purchaseRate,

          purcrate:
            purchaseRate,

          sale_rate:
            saleRate,

          onlinerate:
            saleRate,

          discount_percent:
            discount,

          discperc:
            discount,

          hsn_code:
            product.hsncode ||
            product.hsn_code ||
            '',

          hsncode:
            product.hsncode ||
            product.hsn_code ||
            '',

          gst_percent:
            gst,

          gst,

          stock,

          opstock:
            stock,

          unit_name:
            product.unitcode ||
            product.unit_name ||
            'Nos',

          image_url:
            cleanImg,

          picture:
            cleanImg,

          new_image_file:
            null,

          new_image_preview:
            null,

          scan_count:
            1,

          _original: {
            mrp,

            purchaseRate,

            saleRate,

            discount,

            hsn:
              product.hsncode ||
              product.hsn_code ||
              '',

            gst,

            brand_id:
              product.brand_id ??
              null,

            category_id:
              product.category_id ??
              null,

            subcategory_id:
              product.subcategory_id ??
              null,

            image_url:
              cleanImg,

            stock,

            name:
              product.itname ||
              product.name ||
              ''
          }
        };

        toast.success(
          `Added "${
            product.itname ||
            product.name
          }" to Bulk Entry session`
        );

        return [
          newItem,
          ...prev
        ];
      });

      setSearchInput('');
      setShowDropdown(false);
      setSelectedIndex(-1);

      focusInput();
    },
    [focusInput]
  );

  // =========================================================
  // CAMERA BARCODE SCANNER
  // =========================================================

  const handleCameraScan = useCallback(
    (result) => {
      if (!result) return;

      const scannedBarcode =
        typeof result === 'string'
          ? result.trim()
          : String(
              result?.[0]?.rawValue || ''
            ).trim();

      if (!scannedBarcode) {
        return;
      }

      const product =
        barcodeMap.get(
          scannedBarcode
        );

      if (product) {
        addProductToSession(product);

        setShowCameraScanner(false);

        return;
      }

      toast.error(
        `PRODUCT NOT FOUND: ${scannedBarcode}`
      );

      setUnknownBarcodes(
        (prev) => [
          {
            id: Date.now(),
            barcode:
              scannedBarcode,
            timestamp:
              new Date().toLocaleTimeString(),
            status:
              'Not Found',
            reason:
              'Scanned barcode does not match any existing product'
          },
          ...prev
        ]
      );

      setShowCameraScanner(false);

      setSearchInput('');
      setShowDropdown(false);

      focusInput();
    },
    [
      barcodeMap,
      addProductToSession,
      focusInput
    ]
  );

  // =========================================================
  // SEARCH / USB SCANNER ENTER
  // =========================================================

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();

      setSelectedIndex(
        (prev) =>
          prev <
          matchingProducts.length - 1
            ? prev + 1
            : prev
      );

      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();

      setSelectedIndex(
        (prev) =>
          prev > 0
            ? prev - 1
            : 0
      );

      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();

      if (
        selectedIndex >= 0 &&
        matchingProducts[selectedIndex]
      ) {
        addProductToSession(
          matchingProducts[selectedIndex]
        );

        return;
      }

      const query =
        searchInput.trim();

      if (!query) return;

      const exactBarcodeMatch =
        barcodeMap.get(query);

      if (exactBarcodeMatch) {
        addProductToSession(
          exactBarcodeMatch
        );

        return;
      }

      if (
        matchingProducts.length === 1
      ) {
        addProductToSession(
          matchingProducts[0]
        );

        return;
      }

      toast.error(
        `PRODUCT NOT FOUND for "${query}"`
      );

      setUnknownBarcodes(
        (prev) => [
          {
            id:
              Date.now(),
            barcode:
              query,
            timestamp:
              new Date().toLocaleTimeString(),
            status:
              'Not Found',
            reason:
              'Barcode or item name not found in database'
          },
          ...prev
        ]
      );

      setSearchInput('');
      setShowDropdown(false);

      focusInput();

      return;
    }

    if (e.key === 'Escape') {
      setShowDropdown(false);
      setSearchInput('');
      focusInput();
    }
  };

  // =========================================================
  // FIELD CHANGE HANDLER
  // =========================================================

  const handleItemFieldChange = (
    itemId,
    field,
    value
  ) => {
    setSessionItems(
      (prev) =>
        prev.map((item) => {
          if (
            item.id !== itemId
          ) {
            return item;
          }

          const updated = {
            ...item,
            [field]: value
          };

          if (
            field === 'itname' ||
            field === 'name'
          ) {
            updated.itname =
              value;

            updated.name =
              value;
          }

          if (field === 'mrp') {
            updated.mrp =
              value === ''
                ? ''
                : (
                    isNaN(
                      parseFloat(value)
                    )
                      ? 0
                      : parseFloat(value)
                  );
          }

          if (
            field === 'sale_rate' ||
            field === 'onlinerate'
          ) {
            const val =
              value === ''
                ? ''
                : (
                    isNaN(
                      parseFloat(value)
                    )
                      ? 0
                      : parseFloat(value)
                  );

            updated.sale_rate =
              val;

            updated.onlinerate =
              val;
          }

          if (
            field === 'purchase_rate' ||
            field === 'purcrate'
          ) {
            const val =
              value === ''
                ? ''
                : (
                    isNaN(
                      parseFloat(value)
                    )
                      ? 0
                      : parseFloat(value)
                  );

            updated.purchase_rate =
              val;

            updated.purcrate =
              val;
          }

          if (
            field === 'discount_percent' ||
            field === 'discperc'
          ) {
            const val =
              value === ''
                ? ''
                : (
                    isNaN(
                      parseFloat(value)
                    )
                      ? 0
                      : parseFloat(value)
                  );

            updated.discount_percent =
              val;

            updated.discperc =
              val;
          }

          if (
            field === 'gst_percent' ||
            field === 'gst'
          ) {
            const val =
              value === ''
                ? ''
                : (
                    isNaN(
                      parseFloat(value)
                    )
                      ? 0
                      : parseFloat(value)
                  );

            updated.gst_percent =
              val;

            updated.gst =
              val;
          }

          if (
            field === 'hsn_code' ||
            field === 'hsncode'
          ) {
            updated.hsn_code =
              value;

            updated.hsncode =
              value;
          }

          if (
            field === 'stock' ||
            field === 'opstock'
          ) {
            const val =
              value === ''
                ? ''
                : (
                    isNaN(
                      parseFloat(value)
                    )
                      ? 0
                      : parseFloat(value)
                  );

            updated.stock =
              val;

            updated.opstock =
              val;
          }

          return updated;
        })
    );
  };

  // =========================================================
  // SINGLE IMAGE
  // =========================================================

  const handleSingleImageChange = (
    itemId,
    file
  ) => {
    if (!file) return;

    const previewUrl =
      URL.createObjectURL(file);

    setSessionItems(
      (prev) =>
        prev.map((item) => {
          if (
            item.id !== itemId
          ) {
            return item;
          }

          return {
            ...item,
            new_image_file:
              file,
            new_image_preview:
              previewUrl
          };
        })
    );

    toast.success(
      'Attached new image preview to row'
    );
  };

  // =========================================================
  // REMOVE IMAGE
  // =========================================================

  const handleRemoveImage = (
    itemId
  ) => {
    setSessionItems(
      (prev) =>
        prev.map((item) => {
          if (
            item.id !== itemId
          ) {
            return item;
          }

          return {
            ...item,
            image_url: '',
            picture: '',
            new_image_file:
              null,
            new_image_preview:
              null
          };
        })
    );
  };

  // =========================================================
  // BULK IMAGE MATCH
  // =========================================================

  const handleBulkImageMatch = (
    e
  ) => {
    const files =
      Array.from(
        e.target.files || []
      );

    if (
      files.length === 0
    ) {
      return;
    }

    let matchedCount = 0;

    const unmatchedNames = [];

    files.forEach((file) => {
      const filename =
        file.name
          .substring(
            0,
            file.name.lastIndexOf('.')
          )
          .trim();

      const previewUrl =
        URL.createObjectURL(file);

      let found = false;

      setSessionItems(
        (prev) =>
          prev.map((item) => {
            if (
              String(
                item.barcode
              ).trim() ===
              filename
            ) {
              found = true;

              matchedCount++;

              return {
                ...item,
                new_image_file:
                  file,
                new_image_preview:
                  previewUrl
              };
            }

            return item;
          })
      );

      if (!found) {
        unmatchedNames.push(
          file.name
        );
      }
    });

    setUnmatchedImages(
      (prev) => [
        ...unmatchedNames,
        ...prev
      ]
    );

    if (
      matchedCount > 0
    ) {
      toast.success(
        `Matched ${matchedCount} image(s) with session product barcodes!`
      );
    }

    if (
      unmatchedNames.length >
      0
    ) {
      toast.warning(
        `${unmatchedNames.length} image(s) did not match any barcode in session.`
      );

      setShowUnmatchedImagesDrawer(
        true
      );
    }

    e.target.value = '';
  };

  // =========================================================
  // EXCEL IMPORT
  // =========================================================

  const handleExcelImport = async (
    e
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    e.target.value = '';

    try {
      const columnMapping = {
        Barcode:
          'barcode',
        MRP:
          'mrp',
        'Purchase Rate':
          'purchase_rate',
        'Sale Rate':
          'sale_rate',
        'Discount %':
          'discount_percent',
        HSN:
          'hsn_code',
        'GST %':
          'gst_percent'
      };

      const parsedRows =
        await parseERPCSV(
          file,
          columnMapping
        );

      if (
        !parsedRows ||
        parsedRows.length === 0
      ) {
        toast.error(
          'No data found in Excel file'
        );

        return;
      }

      let updatedCount = 0;

      parsedRows.forEach(
        (row) => {
          const rowBarcode =
            String(
              row.barcode ||
              ''
            ).trim();

          if (!rowBarcode) {
            return;
          }

          const productMatch =
            barcodeMap.get(
              rowBarcode
            );

          if (productMatch) {
            addProductToSession(
              productMatch
            );

            setSessionItems(
              (prev) =>
                prev.map(
                  (item) => {
                    if (
                      String(
                        item.barcode
                      ).trim() ===
                      rowBarcode
                    ) {
                      updatedCount++;

                      const getValue =
                        (
                          val,
                          originalVal
                        ) => {
                          if (
                            val !==
                              undefined &&
                            val !==
                              null &&
                            val !==
                              ''
                          ) {
                            return val;
                          }

                          return replaceBlankExcelValues
                            ? ''
                            : originalVal;
                        };

                      return {
                        ...item,

                        mrp:
                          getValue(
                            parseFloat(
                              row.mrp
                            ),
                            item.mrp
                          ),

                        sale_rate:
                          getValue(
                            parseFloat(
                              row.sale_rate
                            ),
                            item.sale_rate
                          ),

                        onlinerate:
                          getValue(
                            parseFloat(
                              row.sale_rate
                            ),
                            item.sale_rate
                          ),

                        purchase_rate:
                          getValue(
                            parseFloat(
                              row.purchase_rate
                            ),
                            item.purchase_rate
                          ),

                        purcrate:
                          getValue(
                            parseFloat(
                              row.purchase_rate
                            ),
                            item.purchase_rate
                          ),

                        discount_percent:
                          getValue(
                            parseFloat(
                              row.discount_percent
                            ),
                            item.discount_percent
                          ),

                        discperc:
                          getValue(
                            parseFloat(
                              row.discount_percent
                            ),
                            item.discount_percent
                          ),

                        hsn_code:
                          getValue(
                            row.hsn_code,
                            item.hsn_code
                          ),

                        hsncode:
                          getValue(
                            row.hsn_code,
                            item.hsn_code
                          ),

                        gst_percent:
                          getValue(
                            parseFloat(
                              row.gst_percent
                            ),
                            item.gst_percent
                          ),

                        gst:
                          getValue(
                            parseFloat(
                              row.gst_percent
                            ),
                            item.gst
                          )
                      };
                    }

                    return item;
                  }
                )
            );
          } else {
            setUnknownBarcodes(
              (prev) => [
                {
                  id:
                    Date.now() +
                    Math.random(),

                  barcode:
                    rowBarcode,

                  timestamp:
                    new Date().toLocaleTimeString(),

                  status:
                    'Excel Barcode Not Found',

                  reason:
                    'Barcode in Excel does not match any existing product'
                },

                ...prev
              ]
            );
          }
        }
      );

      toast.success(
        `Imported Excel: Updated ${updatedCount} products in session!`
      );
    } catch (err) {
      console.error(
        'Excel Import Error:',
        err
      );

      toast.error(
        `Excel Import Failed: ${err.message}`
      );
    }
  };

  // =========================================================
  // SESSION STATS
  // =========================================================

  const sessionStats =
    useMemo(() => {
      let totalScans = 0;
      let changedCount = 0;
      let imagesChangedCount = 0;

      let nameChanges = 0;
      let mrpChanges = 0;
      let purchaseChanges = 0;
      let saleChanges = 0;
      let discountChanges = 0;
      let hsnChanges = 0;
      let gstChanges = 0;
      let categoryChanges = 0;
      let brandChanges = 0;
      let stockChanges = 0;

      let validationErrors = 0;

      sessionItems.forEach(
        (item) => {
          totalScans +=
            item.scan_count || 1;

          const orig =
            item._original || {};

          const currentName =
            String(
              item.itname ||
              item.name ||
              ''
            ).trim();

          const origName =
            String(
              orig.name || ''
            ).trim();

          const currentMrp =
            parseFloat(
              item.mrp
            ) || 0;

          const currentSale =
            parseFloat(
              item.sale_rate
            ) || 0;

          const currentPurc =
            parseFloat(
              item.purchase_rate
            ) || 0;

          const currentDisc =
            parseFloat(
              item.discount_percent
            ) || 0;

          const currentGst =
            parseFloat(
              item.gst_percent
            ) || 0;

          const currentStock =
            item.stock === ''
              ? 0
              : (
                  parseFloat(
                    item.stock
                  ) || 0
                );

          const origStock =
            (
              orig.stock !==
                undefined &&
              orig.stock !==
                null
            )
              ? (
                  parseFloat(
                    orig.stock
                  ) || 0
                )
              : currentStock;

          const isNameChanged =
            currentName !==
            origName;

          const isMrpChanged =
            currentMrp !==
            (
              parseFloat(
                orig.mrp
              ) || 0
            );

          const isPurchaseChanged =
            currentPurc !==
            (
              parseFloat(
                orig.purchaseRate
              ) || 0
            );

          const isSaleChanged =
            currentSale !==
            (
              parseFloat(
                orig.saleRate
              ) || 0
            );

          const isDiscountChanged =
            currentDisc !==
            (
              parseFloat(
                orig.discount
              ) || 0
            );

          const isHsnChanged =
            String(
              item.hsn_code ||
              ''
            ).trim() !==
            String(
              orig.hsn ||
              ''
            ).trim();

          const isGstChanged =
            currentGst !==
            (
              parseFloat(
                orig.gst
              ) || 0
            );

          const isBrandChanged =
            String(
              item.brand_id ||
              ''
            ) !==
            String(
              orig.brand_id ||
              ''
            );

          const isCategoryChanged =
            String(
              item.category_id ||
              ''
            ) !==
            String(
              orig.category_id ||
              ''
            );

          const isSubcategoryChanged =
            String(
              item.subcategory_id ||
              ''
            ) !==
            String(
              orig.subcategory_id ||
              ''
            );

          const isImageChanged =
            Boolean(
              item.new_image_file ||
              (
                item.image_url !==
                orig.image_url
              )
            );

          const isStockChanged =
            Math.abs(
              currentStock -
              origStock
            ) > 0.0001;

          if (
            isNameChanged
          ) {
            nameChanges++;
          }

          if (
            isMrpChanged
          ) {
            mrpChanges++;
          }

          if (
            isPurchaseChanged
          ) {
            purchaseChanges++;
          }

          if (
            isSaleChanged
          ) {
            saleChanges++;
          }

          if (
            isDiscountChanged
          ) {
            discountChanges++;
          }

          if (
            isHsnChanged
          ) {
            hsnChanges++;
          }

          if (
            isGstChanged
          ) {
            gstChanges++;
          }

          if (
            isBrandChanged ||
            isCategoryChanged ||
            isSubcategoryChanged
          ) {
            categoryChanges++;
          }

          if (
            isImageChanged
          ) {
            imagesChangedCount++;
          }

          if (
            isStockChanged
          ) {
            stockChanges++;
          }

          if (
            isNameChanged ||
            isMrpChanged ||
            isPurchaseChanged ||
            isSaleChanged ||
            isDiscountChanged ||
            isHsnChanged ||
            isGstChanged ||
            isBrandChanged ||
            isCategoryChanged ||
            isSubcategoryChanged ||
            isImageChanged ||
            isStockChanged
          ) {
            changedCount++;
          }

          // Validation
          if (
            currentSale >
              currentMrp &&
            currentMrp > 0
          ) {
            validationErrors++;
          }

          if (
            currentMrp < 0 ||
            currentSale < 0 ||
            currentPurc < 0 ||
            currentStock < 0 ||
            isNaN(currentStock)
          ) {
            validationErrors++;
          }
        }
      );

      return {
        uniqueProducts:
          sessionItems.length,

        totalScans,

        changedCount,

        imagesChangedCount,

        nameChanges,

        mrpChanges,

        purchaseChanges,

        saleChanges,

        discountChanges,

        hsnChanges,

        gstChanges,

        categoryChanges,

        brandChanges,

        stockChanges,

        validationErrors,

        unknownCount:
          unknownBarcodes.length
      };
    }, [
      sessionItems,
      unknownBarcodes
    ]);

  // =========================================================
  // REMOVE ITEM
  // =========================================================

  const removeItemFromSession = (
    itemId
  ) => {
    setSessionItems(
      (prev) =>
        prev.filter(
          (item) =>
            item.id !== itemId
        )
    );

    toast.info(
      'Removed product from session'
    );
  };

  // =========================================================
  // CLEAR SESSION
  // =========================================================

  const clearSession = () => {
    if (
      sessionItems.length === 0 &&
      unknownBarcodes.length === 0
    ) {
      return;
    }

    if (
      window.confirm(
        'Are you sure you want to CLEAR the entire Bulk Entry session? All unsaved edits will be discarded.'
      )
    ) {
      setSessionItems([]);
      setUnknownBarcodes([]);
      setUnmatchedImages([]);

      localStorage.removeItem(
        SESSION_STORAGE_ITEMS_KEY
      );

      localStorage.removeItem(
        SESSION_STORAGE_UNKNOWN_KEY
      );

      toast.success(
        'Bulk Entry session cleared'
      );

      focusInput();
    }
  };

  // =========================================================
  // SAVE ALL
  // =========================================================

  const handleConfirmSaveAll =
    async () => {
      if (
        sessionStats.changedCount ===
          0 &&
        sessionStats.imagesChangedCount ===
          0
      ) {
        toast.info(
          'No changes detected in session'
        );

        setShowSavePreview(
          false
        );

        return;
      }

      if (
        sessionStats.validationErrors >
        0
      ) {
        alert(
          `Cannot Save: ${sessionStats.validationErrors} product(s) have validation errors (e.g. Sale Rate > MRP, negative price, or negative stock). Please fix highlighted errors first.`
        );

        setShowSavePreview(
          false
        );

        return;
      }

      setIsProcessing(true);

      setSaveProgress({
        current: 0,
        total: sessionItems.length
      });

      const failedList = [];

      let successCount = 0;

      const BATCH_SIZE = 50;

      try {
        for (
          let i = 0;
          i < sessionItems.length;
          i += BATCH_SIZE
        ) {
          const batch =
            sessionItems.slice(
              i,
              i + BATCH_SIZE
            );

          for (
            const item of batch
          ) {
            try {
              // IMAGE
              let finalImageUrl =
                item._original
                  ?.image_url ||
                null;

              if (
                item.new_image_file
              ) {
                const {
                  url,
                  error: uploadErr
                } =
                  await uploadImage(
                    item.new_image_file,
                    'products'
                  );

                if (
                  uploadErr
                ) {
                  throw new Error(
                    `Image Upload Failed: ${uploadErr}`
                  );
                }

                if (url) {
                  finalImageUrl =
                    url;
                }
              } else if (
                item.image_url !==
                  undefined &&
                item.image_url !==
                  null
              ) {
                finalImageUrl =
                  item.image_url;
              }

              if (
                typeof finalImageUrl ===
                  'string' &&
                finalImageUrl.includes(
                  '/products/null'
                )
              ) {
                finalImageUrl =
                  item._original
                    ?.image_url ||
                  null;
              }

              const resolveBrandId = () => {
                const brandId =
                  item.brand_id ||
                  item._original?.brand_id ||
                  '';

                const brandName = String(
                  item.brand_name || item._original?.brand_name || ''
                ).trim().toLowerCase();
                const brand = bulkBrands.find(
                  (entry) =>
                    String(entry.id).trim() === String(brandId).trim() ||
                    String(entry.name).trim().toLowerCase() === brandName
                );

                return brand?.id ?? (brandId || null);
              };

              const resolveCategoryId = () => {
                const categoryId =
                  resolveCatId({
                    ...item,
                    category_id:
                      item.category_id ||
                      item._original?.category_id ||
                      ''
                  });

                return categoryId || null;
              };

              const resolveSubcategoryId = () => {
                const subcategoryId =
                  item.subcategory_id ||
                  item._original?.subcategory_id ||
                  '';

                const subcategoryName = String(
                  item.subcategory_name || item._original?.subcategory_name || ''
                ).trim().toLowerCase();
                const subcategory = bulkSubcategories.find(
                  (entry) =>
                    String(entry.id).trim() === String(subcategoryId).trim() ||
                    String(entry.name).trim().toLowerCase() === subcategoryName
                );

                return subcategory?.id ?? (subcategoryId || null);
              };

              // BRAND NAME
const resolveBrandName = () => {
  const brandId =
    item.brand_id ||
    item._original?.brand_id ||
    '';

  if (!brandId) {
    return String(
      item.brand_name || ''
    ).trim();
  }

  const brand = bulkBrands.find(
    (b) =>
      String(b.id).trim() ===
      String(brandId).trim()
  );

  return String(
    brand?.name ||
    item.brand_name ||
    ''
  ).trim();
};

// CATEGORY NAME
const resolveCategoryName = () => {
  const categoryId = item.category_id || item._original?.category_id || '';
  const categoryName = String(
    item.category_name || item.itc || item._original?.category_name || ''
  ).trim();
  const category = bulkCategories.find((c) =>
    String(c.id).trim() === String(categoryId).trim() ||
    String(c.name).trim().toLowerCase() === categoryName.toLowerCase()
  );

  return String(
    category?.name ||
    categoryName
  ).trim();
};

// SUBCATEGORY NAME
const resolveSubcategoryName = () => {
  const subcategoryId =
    item.subcategory_id ||
    item._original?.subcategory_id ||
    '';
  const subcategoryName = String(
    item.subcategory_name || item.dtcode || item._original?.subcategory_name || ''
  ).trim();

  const subcategory =
    bulkSubcategories.find(
      (s) =>
        String(s.id).trim() ===
          String(subcategoryId).trim() ||
        String(s.name).trim().toLowerCase() === subcategoryName.toLowerCase()
    );

  return String(
    subcategory?.name ||
    subcategoryName
  ).trim();
};

              // Calculate stock change, but apply it only after the product
              // master update has been verified successfully.
              const origStock =
                (
                  item._original &&
                  item._original.stock !==
                    undefined &&
                  item._original.stock !==
                    null
                )
                  ? (
                      parseFloat(
                        item._original
                          .stock
                      ) || 0
                    )
                  : (
                      parseFloat(
                        item.stock
                      ) || 0
                    );

              const currentStock =
                parseFloat(
                  item.stock
                ) || 0;

              const stockDiff =
                currentStock -
                origStock;

              // PRODUCT MASTER UPDATE
              const updatePayload = {
                id:
                  item.id,

                name:
                  item.itname ||
                  item.name,

                itname:
                  item.itname ||
                  item.name,

                brand_name:
                  resolveBrandName(),

                category_name:
                  resolveCategoryName(),

                itc:
                  resolveCategoryName(),

                subcategory_name:
                  resolveSubcategoryName(),

                dtcode:
                  resolveSubcategoryName(),

                mrp:
                  parseFloat(
                    item.mrp
                  ) || 0,

                purchase_rate:
                  parseFloat(
                    item.purchase_rate ??
                    item.purcrate
                  ) || 0,

                purcrate:
                  parseFloat(
                    item.purchase_rate
                  ) ||
                  parseFloat(
                    item.purcrate
                  ) || 0,

                sale_rate:
                  parseFloat(
                    item.sale_rate ??
                    item.onlinerate
                  ) || 0,

                onlinerate:
                  parseFloat(
                    item.sale_rate ??
                    item.onlinerate
                  ) || 0,

                discount_percent:
                  parseFloat(
                    item.discount_percent ??
                    item.discperc
                  ) || 0,

                discperc:
                  parseFloat(
                    item.discount_percent ??
                    item.discperc
                  ) || 0,

                hsn_code:
                  item.hsn_code ||
                  item.hsncode ||
                  '',

                hsncode:
                  item.hsn_code ||
                  item.hsncode ||
                  '',

                gst_percent:
                  parseFloat(
                    item.gst_percent ??
                    item.gst
                  ) || 0,

                gst:
                  parseFloat(
                    item.gst_percent ??
                    item.gst
                  ) || 0,

                brand_id:
                  resolveBrandId(),

                category_id:
                  resolveCategoryId(),

                subcategory_id:
                  resolveSubcategoryId(),

                image_url:
                  finalImageUrl,

                picture:
                  finalImageUrl,

                updated_at:
                  new Date().toISOString()
              };

              console.log(
                `[BULK SAVE] UPDATE REQUEST`,
                {
                  productId:
                    item.id,

                  barcode:
                    item.barcode,

                  updatePayload
                }
              );

              let res;

              let attempts = 0;

              while (
                attempts < 2
              ) {
                try {
                  attempts++;

                  res =
                    await handleERPAction(
                      DB_SCHEMA.PRODUCTS.table,
                      ACTION_TYPES.UPDATE,
                      updatePayload
                    );

                  if (
                    res?.success &&
                    res?.data
                  ) {
                    break;
                  }
                } catch (
                  fetchErr
                ) {
                  if (
                    attempts >= 2 ||
                    !fetchErr?.message?.includes(
                      'Failed to fetch'
                    )
                  ) {
                    throw fetchErr;
                  }

                  console.warn(
                    `[BULK SAVE RETRY] Network fetch transient error on attempt ${attempts}, retrying in 300ms...`,
                    fetchErr.message
                  );

                  await new Promise(
                    (r) =>
                      setTimeout(
                        r,
                        300
                      )
                  );
                }
              }

              console.log(
                `[BULK SAVE] SUPABASE UPDATE RESPONSE`,
                {
                  status:
                    res?.success
                      ? 200
                      : 400,

                  statusText:
                    res?.success
                      ? 'OK'
                      : 'Error',

                  error:
                    res?.error ||
                    null,

                  returnedRowCount:
                    res?.data
                      ? 1
                      : 0,

                  returnedData:
                    res?.data ||
                    null
                }
              );

              if (
                !res?.success
              ) {
                const errMsg =
                  res?.error ||
                  res?.details ||
                  'Database product master update failed';

                throw new Error(
                  `Product Master Update Failed: ${errMsg}`
                );
              }

              if (
                !res?.data
              ) {
                throw new Error(
                  `Product Master Update Failed: Database updated 0 rows for ID ${item.id}. Check tenant context or ID.`
                );
              }

              // dbSync.update() returns the updated row, so verify locally
              // without issuing another read request for every product.
              const freshProd =
                Array.isArray(res.data)
                  ? res.data[0]
                  : res.data;

              console.log(
                `[BULK SAVE] FRESH DATABASE VERIFICATION`,
                {
                  productId:
                    item.id,

                  savedName:
                    freshProd?.name,

                  savedItname:
                    freshProd?.itname,

                  savedPurchaseRate:
                    freshProd?.purchase_rate,

                  savedSaleRate:
                    freshProd?.sale_rate,

                  savedMrp:
                    freshProd?.mrp,

                  savedBrandId:
                    freshProd?.brand_id,

                  savedCategoryId:
                    freshProd?.category_id,

                  savedSubcategoryId:
                    freshProd?.subcategory_id,

                  savedImageUrl:
                    freshProd?.image_url,

                  updatedAt:
                    freshProd?.updated_at
                }
              );

              if (
                !freshProd
              ) {
                throw new Error(
                  `Database verification failed: Product ID ${item.id} not found in database after update.`
                );
              }

              const isNameVerified =
                freshProd.name ===
                  updatePayload.name &&
                freshProd.itname ===
                  updatePayload.itname;

              const isPurcVerified =
                Math.abs(
                  (
                    freshProd.purchase_rate ||
                    0
                  ) -
                  updatePayload.purchase_rate
                ) < 0.001;

              if (
                !isNameVerified ||
                !isPurcVerified
              ) {
                throw new Error(
                  `Database verification failed: Product ID ${item.id} in Supabase still contains un-updated values.`
                );
              }

              if (
                !isNaN(stockDiff) &&
                Math.abs(stockDiff) > 0.0001
              ) {
                const stockRes = await handleERPAction(
                  DB_SCHEMA.PRODUCTS.table,
                  ACTION_TYPES.ADJUST_STOCK,
                  {
                    product_id: item.id,
                    change_qty: stockDiff,
                    change_type: 'manual',
                    narration: 'Bulk Product Entry Stock Update',
                    reference_number: `BULK-ENTRY-${item.barcode || item.id}`
                  }
                );

                if (!stockRes?.success) {
                  throw new Error(
                    `Stock Adjustment Failed (RPC): ${
                      stockRes?.error ||
                      'Atomic inventory transaction rejected'
                    }`
                  );
                }
              }

              successCount++;
            } catch (
              itemErr
            ) {
              console.error(
                `Failed to update barcode ${item.barcode}:`,
                itemErr
              );

              failedList.push({
                barcode:
                  item.barcode ||
                  'N/A',

                name:
                  item.itname ||
                  item.name ||
                  'Unnamed Item',

                error:
                  itemErr.message ||
                  itemErr.details ||
                  String(
                    itemErr
                  )
              });
            } finally {
              setSaveProgress(
                (prev) => ({
                  ...prev,
                  current:
                    prev.current +
                    1
                })
              );
            }
          }
        }

        if (
          failedList.length ===
          0
        ) {
          toast.success(
            `Successfully updated ${successCount} products in live database!`
          );

          setSessionItems([]);

          localStorage.removeItem(
            SESSION_STORAGE_ITEMS_KEY
          );

          setShowSavePreview(
            false
          );

          await fetchInitialData(
            true,
            true
          );
        } else {
          setFailedItems(
            failedList
          );

          setShowFailedDrawer(
            true
          );

          toast.warning(
            `Updated ${successCount} products. ${failedList.length} products failed.`
          );

          const failedBarcodes =
            new Set(
              failedList.map(
                (f) =>
                  f.barcode
              )
            );

          setSessionItems(
            (prev) =>
              prev.filter(
                (item) =>
                  failedBarcodes.has(
                    item.barcode
                  )
              )
          );

          setShowSavePreview(
            false
          );

          await fetchInitialData(
            true,
            true
          );
        }
      } catch (
        globalErr
      ) {
        console.error(
          'Save All Fatal Error:',
          globalErr
        );

        alert(
          `Save All Error: ${globalErr.message}`
        );
      } finally {
        setIsProcessing(
          false
        );

        focusInput();
      }
    };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="flex flex-col space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 min-h-[calc(100vh-10rem)]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-200">
            <Zap size={22} />
          </div>

          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              Item Master → Bulk Entry

              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">
                Scanner-First Workflow
              </span>
            </h2>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Continuous Scanner &amp; Search Session • Multi-Product Bulk Edits
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">

          {/* BULK IMAGE MATCH */}
          <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-1.5">

            <ImageIcon
              size={14}
              className="text-blue-600"
            />

            Bulk Match Images

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={
                handleBulkImageMatch
              }
              className="hidden"
            />
          </label>

          {/* EXCEL */}
          <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-1.5">

            <FileSpreadsheet
              size={14}
              className="text-emerald-600"
            />

            Excel Update

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={
                handleExcelImport
              }
              className="hidden"
            />
          </label>

          {/* CLEAR */}
          {sessionItems.length >
            0 && (
            <button
              onClick={
                clearSession
              }
              className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Clear Session
            </button>
          )}

          {/* SAVE */}
          <button
            onClick={() =>
              setShowSavePreview(
                true
              )
            }
            disabled={
              sessionItems.length ===
                0 ||
              isSaving
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />

            SAVE ALL (
            {
              sessionStats.changedCount
            }
            )
          </button>

          {/* EXIT */}
          {onClose && (
            <button
              onClick={
                onClose
              }
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Exit Bulk Mode
            </button>
          )}
        </div>
      </div>

      {/* =====================================================
          SEARCH / BARCODE
      ===================================================== */}

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 relative flex-shrink-0">

        <div className="flex items-center justify-between">

          <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">

            <Barcode
              size={16}
              className="text-blue-600"
            />

            Scan Barcode or Type Product Name (Live Search)
          </label>

          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            USB Scanner / Keyboard Enter Supported
          </span>
        </div>

        <div className="relative">

          <div className="flex items-center gap-2">

            <div className="relative flex-1">

              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                size={18}
              />

              <input
                ref={
                  searchInputRef
                }
                type="text"
                value={
                  searchInput
                }
                onChange={(e) => {
                  setSearchInput(
                    e.target.value
                  );

                  setShowDropdown(
                    true
                  );

                  setSelectedIndex(
                    -1
                  );
                }}
                onKeyDown={
                  handleSearchKeyDown
                }
                onFocus={() => {
                  if (
                    searchInput.trim()
                  ) {
                    setShowDropdown(
                      true
                    );
                  }
                }}
                placeholder="SCAN BARCODE OR TYPE PRODUCT NAME..."
                className="w-full bg-blue-50/40 border-2 border-blue-200 focus:border-blue-600 rounded-xl pl-12 pr-12 py-3 text-xs font-black text-slate-900 placeholder-slate-400 outline-none transition-all shadow-inner"
                autoFocus
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput(
                      ''
                    );

                    setShowDropdown(
                      false
                    );

                    focusInput();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* CAMERA BUTTON */}
            <button
              type="button"
              onClick={() => {
                setShowDropdown(
                  false
                );

                setShowCameraScanner(
                  true
                );
              }}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center justify-center shadow-md"
              title="Scan Barcode with Camera"
            >
              <Barcode
                size={22}
              />
            </button>
          </div>

          {/* SEARCH DROPDOWN */}
          <AnimatePresence>
            {showDropdown &&
              matchingProducts.length >
                0 && (
                <motion.div
                  ref={
                    dropdownRef
                  }
                  initial={{
                    opacity: 0,
                    y: -5
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                  exit={{
                    opacity: 0,
                    y: -5
                  }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[200] max-h-80 overflow-y-auto divide-y divide-slate-100"
                >
                  {matchingProducts.map(
                    (
                      p,
                      idx
                    ) => (
                      <div
                        key={
                          p.id
                        }
                        onClick={() =>
                          addProductToSession(
                            p
                          )
                        }
                        className={cn(
                          "p-3 flex items-center justify-between cursor-pointer transition-colors hover:bg-blue-50/80",
                          idx ===
                            selectedIndex &&
                            "bg-blue-100/80"
                        )}
                      >
                        <div className="flex items-center gap-3">

                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">

                            {p.picture ||
                            p.image_url ? (
                              <img
                                src={
                                  p.picture ||
                                  p.image_url
                                }
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ImageIcon
                                size={
                                  16
                                }
                                className="text-slate-300"
                              />
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                              {
                                p.itname ||
                                p.name
                              }
                            </p>

                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              Barcode:{' '}
                              {
                                p.barcode ||
                                'N/A'
                              }{' '}
                              • Brand:{' '}
                              {
                                p.brand_name ||
                                p.brandcode ||
                                '-'
                              }{' '}
                              • Cat:{' '}
                              {
                                p.category_name ||
                                p.itc ||
                                '-'
                              }
                            </p>
                          </div>
                        </div>

                        <div className="text-right">

                          <p className="text-xs font-black text-blue-700">
                            Sale: ₹
                            {
                              p.onlinerate ??
                              p.sale_rate ??
                              0
                            }
                          </p>

                          <p className="text-[9px] font-bold text-slate-400 line-through">
                            MRP: ₹
                            {
                              p.mrp ||
                              0
                            }
                          </p>

                          <p className="text-[9px] font-bold text-slate-500">
                            Stock:{' '}
                            {
                              p.opstock ??
                              p.stock ??
                              0
                            }
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>

      {/* =====================================================
          CAMERA SCANNER MODAL
      ===================================================== */}

      <AnimatePresence>
        {showCameraScanner && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">

            <motion.div
              initial={{
                scale: 0.95,
                opacity: 0
              }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              exit={{
                scale: 0.95,
                opacity: 0
              }}
              className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl"
            >

              {/* Scanner Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">

                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">
                    Scan Barcode
                  </h3>

                  <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-1">
                    Camera Barcode Scanner
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCameraScanner(
                      false
                    );

                    focusInput();
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Camera */}
              <div className="relative bg-black aspect-square overflow-hidden">

                <Scanner
                  onScan={
                    handleCameraScan
                  }
                  constraints={{
                    facingMode:
                      'environment'
                  }}
                  scanDelay={
                    500
                  }
                  allowMultiple={
                    false
                  }
                  components={{
                    audio: false,
                    onOff: false,
                    torch: false,
                    finder: true
                  }}
                  styles={{
                    container: {
                      width:
                        '100%',
                      height:
                        '100%'
                    },
                    video: {
                      width:
                        '100%',
                      height:
                        '100%',
                      objectFit:
                        'cover'
                    }
                  }}
                />

                {/* Scanner Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">

                  <div className="w-[72%] h-[28%] border-2 border-white rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.25)] relative">

                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500 shadow-lg" />

                  </div>
                </div>
              </div>

              {/* Scanner Footer */}
              <div className="p-4 bg-white space-y-3">

                <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest">
                  Barcode ko frame ke andar rakhein
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setShowCameraScanner(
                      false
                    );

                    focusInput();
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Cancel Scanner
                </button>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 flex-shrink-0">

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Unique Products
          </p>

          <p className="text-lg font-black text-slate-800">
            {
              sessionStats.uniqueProducts
            }
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Total Scans
          </p>

          <p className="text-lg font-black text-blue-600">
            {
              sessionStats.totalScans
            }
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Products Changed
          </p>

          <p className="text-lg font-black text-amber-600">
            {
              sessionStats.changedCount
            }
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Images Changed
          </p>

          <p className="text-lg font-black text-purple-600">
            {
              sessionStats.imagesChangedCount
            }
          </p>
        </div>

        <button
          onClick={() =>
            setShowUnknownDrawer(
              true
            )
          }
          className="bg-white hover:bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm space-y-1 text-left transition-all"
        >
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">

            Unknown Barcodes

            {sessionStats.unknownCount >
              0 && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </p>

          <p className="text-lg font-black text-red-600">
            {
              sessionStats.unknownCount
            }
          </p>
        </button>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Validation Errors
          </p>

          <p
            className={cn(
              "text-lg font-black",
              sessionStats.validationErrors >
                0
                ? "text-red-600"
                : "text-emerald-600"
            )}
          >
            {
              sessionStats.validationErrors
            }
          </p>
        </div>
      </div>

      {/* =====================================================
          MOBILE PRODUCT CARDS
      ===================================================== */}

      <div className="md:hidden w-full space-y-4">

        {sessionItems.length ===
        0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">

            <Barcode
              size={42}
              strokeWidth={1}
              className="mx-auto text-slate-300 mb-3"
            />

            <p className="text-xs font-black uppercase tracking-widest text-slate-600">
              Bulk Entry Session Empty
            </p>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              Scan barcode or search product name to add products
            </p>
          </div>
        ) : (
          sessionItems.map(
            (item, idx) => {
              const isHighlighted =
                highlightedBarcodes.has(
                  String(
                    item.barcode
                  ).trim()
                );

              const hasRatesError =
                item.sale_rate >
                  item.mrp &&
                item.mrp > 0;

              const currentStockVal =
                item.stock === ''
                  ? 0
                  : (
                      parseFloat(
                        item.stock
                      ) || 0
                    );

              const origStockVal =
                item._original &&
                item._original
                  .stock !==
                  undefined &&
                item._original
                  .stock !==
                  null
                  ? (
                      parseFloat(
                        item._original
                          .stock
                      ) || 0
                    )
                  : currentStockVal;

              const isStockModified =
                Math.abs(
                  currentStockVal -
                    origStockVal
                ) > 0.0001;

              const hasStockError =
                currentStockVal <
                  0 ||
                isNaN(
                  currentStockVal
                );

              const activeCatId =
                resolveCatId(
                  item
                );

              // IMPORTANT:
              // ALL SUBCATEGORIES
              // ARE SHOWN.
              const rowSubcategories =
                bulkSubcategories;

              return (
                <div
                  key={
                    item.id
                  }
                  className={cn(
                    "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4",
                    isHighlighted &&
                      "ring-2 ring-blue-400 bg-blue-50",
                    (
                      hasRatesError ||
                      hasStockError
                    ) &&
                      "border-red-300 bg-red-50/40"
                  )}
                >

                  {/* PRODUCT HEADER */}
                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center gap-2 mb-1">

                        <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                          #{idx + 1}
                        </span>

                        <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                          SCANS:{' '}
                          {
                            item.scan_count ||
                            1
                          }
                        </span>
                      </div>

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Product Name
                      </p>

                      <input
                        type="text"
                        value={
                          item.itname ||
                          item.name ||
                          ''
                        }
                        onChange={(
                          e
                        ) =>
                          handleItemFieldChange(
                            item.id,
                            'itname',
                            e.target
                              .value
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black uppercase text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                        placeholder="Product Name"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeItemFromSession(
                          item.id
                        )
                      }
                      className="flex-shrink-0 p-2 text-red-500 bg-red-50 border border-red-100 rounded-lg"
                      title="Remove product"
                    >
                      <Trash2
                        size={16}
                      />
                    </button>
                  </div>

                  {/* BARCODE */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">

                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Barcode
                    </p>

                    <p className="text-xs font-mono font-black text-slate-700 break-all">
                      {
                        item.barcode ||
                        'N/A'
                      }
                    </p>
                  </div>

                  {/* BRAND / CATEGORY / SUBCATEGORY */}
                  <div className="grid grid-cols-1 gap-3">

                    {/* BRAND */}
                    <div>

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Brand
                      </p>

                      <select
                        value={String(
                          item.brand_id ||
                            ''
                        )}
                        onChange={(
                          e
                        ) => {
                          const bId =
                            e.target
                              .value;

                          const bName =
                            bulkBrands.find(
                              (b) =>
                                String(
                                  b.id
                                ) ===
                                bId
                            )?.name ||
                            '';

                          handleItemFieldChange(
                            item.id,
                            'brand_id',
                            bId
                          );

                          handleItemFieldChange(
                            item.id,
                            'brand_name',
                            bName
                          );
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                      >
                        <option value="">
                          Select Brand
                        </option>

                        {bulkBrands.map(
                          (b) => (
                            <option
                              key={
                                b.id
                              }
                              value={
                                b.id
                              }
                            >
                              {
                                b.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* CATEGORY */}
                    <div>

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Category
                      </p>

                      <select
                        value={String(
                          activeCatId ||
                            ''
                        )}
                        onChange={(
                          e
                        ) => {
                          const cId =
                            e.target
                              .value;

                          const cName =
                            bulkCategories.find(
                              (c) =>
                                String(
                                  c.id
                                ) ===
                                cId
                            )?.name ||
                            '';

                          handleItemFieldChange(
                            item.id,
                            'category_id',
                            cId
                          );

                          handleItemFieldChange(
                            item.id,
                            'category_name',
                            cName
                          );

                          /*
                           * IMPORTANT:
                           * Subcategory dropdown is NOT filtered
                           * by category.
                           *
                           * Therefore we intentionally DO NOT
                           * clear the selected subcategory here.
                           *
                           * User requested that ALL Master
                           * subcategories remain available.
                           */
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                      >
                        <option value="">
                          Select Category
                        </option>

                        {bulkCategories.map(
                          (c) => (
                            <option
                              key={
                                c.id
                              }
                              value={
                                c.id
                              }
                            >
                              {
                                c.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* SUBCATEGORY */}
                    <div>

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Subcategory
                      </p>

                      <select
                        value={String(
                          item.subcategory_id ||
                            ''
                        )}
                        onChange={(
                          e
                        ) => {
                          const scId =
                            e.target
                              .value;

                          const scMatch =
                            bulkSubcategories.find(
                              (s) =>
                                String(
                                  s.id
                                ) ===
                                scId
                            );

                          handleItemFieldChange(
                            item.id,
                            'subcategory_id',
                            scId
                          );

                          handleItemFieldChange(
                            item.id,
                            'subcategory_name',
                            scMatch?.name ||
                              ''
                          );
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                      >
                        <option value="">
                          {rowSubcategories.length ===
                          0
                            ? 'No Subcategories Available'
                            : 'Select Subcategory'}
                        </option>

                        {rowSubcategories.map(
                          (s) => (
                            <option
                              key={
                                s.id
                              }
                              value={
                                s.id
                              }
                            >
                              {
                                s.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  {/* RATES */}
                  <div className="grid grid-cols-2 gap-3">

                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        MRP (₹)
                      </p>

                      <input
                        type="number"
                        step="0.01"
                        value={
                          item.mrp ||
                          0
                        }
                        onChange={(
                          e
                        ) =>
                          handleItemFieldChange(
                            item.id,
                            'mrp',
                            e.target
                              .value
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Purchase Rate (₹)
                      </p>

                      <input
                        type="number"
                        step="0.01"
                        value={
                          item.purchase_rate ||
                          0
                        }
                        onChange={(
                          e
                        ) =>
                          handleItemFieldChange(
                            item.id,
                            'purchase_rate',
                            e.target
                              .value
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Sale Rate (₹)
                      </p>

                      <input
                        type="number"
                        step="0.01"
                        value={
                          item.sale_rate ||
                          0
                        }
                        onChange={(
                          e
                        ) =>
                          handleItemFieldChange(
                            item.id,
                            'sale_rate',
                            e.target
                              .value
                          )
                        }
                        className={cn(
                          "w-full border rounded-lg px-3 py-2 text-xs font-black outline-none focus:border-blue-500",
                          hasRatesError
                            ? "bg-red-100 border-red-400 text-red-800"
                            : "bg-blue-50 border-slate-200 text-blue-700"
                        )}
                      />

                      {hasRatesError && (
                        <p className="text-[8px] font-black text-red-600 uppercase mt-1">
                          Sale Rate &gt; MRP
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Discount %
                      </p>

                      <input
                        type="number"
                        step="0.1"
                        value={
                          item.discount_percent ||
                          0
                        }
                        onChange={(
                          e
                        ) =>
                          handleItemFieldChange(
                            item.id,
                            'discount_percent',
                            e.target
                              .value
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* HSN / GST / STOCK */}
                  <div className="grid grid-cols-2 gap-3">

                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        HSN Code
                      </p>

                      <input
                        type="text"
                        value={
                          item.hsn_code ||
                          ''
                        }
                        onChange={(
                          e
                        ) =>
                          handleItemFieldChange(
                            item.id,
                            'hsn_code',
                            e.target
                              .value
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        GST %
                      </p>

                      <input
                        type="number"
                        step="0.1"
                        value={
                          item.gst_percent ||
                          0
                        }
                        onChange={(
                          e
                        ) =>
                          handleItemFieldChange(
                            item.id,
                            'gst_percent',
                            e.target
                              .value
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-2">

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Current Stock
                      </p>

                      <div className="flex items-center gap-2">

                        <input
                          type="number"
                          step="0.001"
                          value={
                            item.stock ??
                            0
                          }
                          onChange={(
                            e
                          ) =>
                            handleItemFieldChange(
                              item.id,
                              'stock',
                              e.target
                                .value
                            )
                          }
                          className={cn(
                            "w-full border rounded-lg px-3 py-2 text-xs font-black outline-none focus:border-blue-500",
                            hasStockError
                              ? "bg-red-100 border-red-400 text-red-800"
                              : isStockModified
                                ? "bg-amber-100 border-amber-400 text-amber-900"
                                : "bg-slate-50 border-slate-200 text-slate-800"
                          )}
                        />

                        <span className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">
                          {
                            item.unit_name
                          }
                        </span>
                      </div>

                      {hasStockError && (
                        <p className="text-[8px] font-black text-red-600 uppercase mt-1">
                          Stock &lt; 0
                        </p>
                      )}
                    </div>
                  </div>

                  {/* IMAGE */}
                  <div>

                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Product Image
                    </p>

                    <div className="flex items-center gap-3">

                      <label className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer">

                        {item.new_image_preview ||
                        item.image_url ? (
                          <img
                            src={
                              item.new_image_preview ||
                              item.image_url
                            }
                            alt=""
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <ImageIcon
                            size={22}
                            className="text-slate-300"
                          />
                        )}

                        <input
                          type="file"
                          accept="image/*"
                          onChange={(
                            e
                          ) =>
                            handleSingleImageChange(
                              item.id,
                              e.target
                                .files?.[0]
                            )
                          }
                          className="hidden"
                        />
                      </label>

                      {(
                        item.new_image_preview ||
                        item.image_url
                      ) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveImage(
                              item.id
                            )
                          }
                          className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[9px] font-black uppercase"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          )
        )}
      </div>

      {/* =====================================================
          DESKTOP TABLE
      ===================================================== */}

      <div className="hidden md:flex flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-col min-h-0">

        <div className="flex-1 overflow-auto custom-scrollbar">

          <table className="w-full text-left border-collapse min-w-[1550px]">

            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">

              <tr className="border-b border-slate-200 text-slate-700">

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-12 text-center">
                  S.No
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest min-w-[200px]">
                  Product Name
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-28">
                  Barcode
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-36">
                  Brand
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-36">
                  Category
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-36">
                  Subcategory
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-24">
                  MRP (₹)
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-24">
                  Purc Rate (₹)
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-24">
                  Sale Rate (₹)
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-20">
                  Disc %
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-24">
                  HSN Code
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-20">
                  GST %
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-28 text-center bg-blue-50/60">
                  Current Stock
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-28 text-center">
                  Image
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-16 text-center">
                  Scans
                </th>

                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest w-12 text-center">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {sessionItems.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={16}
                    className="px-4 py-20 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center gap-3">

                      <Barcode
                        size={48}
                        strokeWidth={1}
                        className="text-slate-300 animate-pulse"
                      />

                      <p className="text-xs font-black uppercase tracking-widest text-slate-600">
                        Bulk Entry Session Empty
                      </p>

                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Scan barcodes continuously or search product names to add items to this session!
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sessionItems.map(
                  (item, idx) => {
                    const isHighlighted =
                      highlightedBarcodes.has(
                        String(
                          item.barcode
                        ).trim()
                      );

                    const hasRatesError =
                      item.sale_rate >
                        item.mrp &&
                      item.mrp > 0;

                    const currentStockVal =
                      item.stock ===
                      ''
                        ? 0
                        : (
                            parseFloat(
                              item.stock
                            ) || 0
                          );

                    const origStockVal =
                      item._original &&
                      item._original
                        .stock !==
                        undefined &&
                      item._original
                        .stock !==
                        null
                        ? (
                            parseFloat(
                              item._original
                                .stock
                            ) || 0
                          )
                        : currentStockVal;

                    const isStockModified =
                      Math.abs(
                        currentStockVal -
                          origStockVal
                      ) >
                      0.0001;

                    const hasStockError =
                      currentStockVal <
                        0 ||
                      isNaN(
                        currentStockVal
                      );

                    const activeCatId =
                      resolveCatId(
                        item
                      );

                    // ALL MASTER SUBCATEGORIES
                    const rowSubcategories =
                      bulkSubcategories;

                    return (
                      <tr
                        key={
                          item.id
                        }
                        className={cn(
                          "hover:bg-slate-50 transition-colors",
                          isHighlighted &&
                            "bg-blue-100/90 transition-all duration-300",
                          (
                            hasRatesError ||
                            hasStockError
                          ) &&
                            "bg-red-50/60"
                        )}
                      >

                        {/* S.NO */}
                        <td className="px-3 py-2 text-center text-[10px] font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* PRODUCT NAME */}
                        <td className="px-2 py-2">

                          <input
                            type="text"
                            value={
                              item.itname ||
                              item.name ||
                              ''
                            }
                            onChange={(
                              e
                            ) =>
                              handleItemFieldChange(
                                item.id,
                                'itname',
                                e.target
                                  .value
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-black uppercase text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                            placeholder="Product Name"
                          />
                        </td>

                        {/* BARCODE */}
                        <td className="px-3 py-2">

                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {
                              item.barcode ||
                              'N/A'
                            }
                          </span>
                        </td>

                        {/* BRAND */}
                        <td className="px-2 py-2">

                          <select
                            value={String(
                              item.brand_id ||
                                ''
                            )}
                            onChange={(
                              e
                            ) => {
                              const bId =
                                e.target
                                  .value;

                              const bName =
                                bulkBrands.find(
                                  (
                                    b
                                  ) =>
                                    String(
                                      b.id
                                    ) ===
                                    bId
                                )?.name ||
                                '';

                              handleItemFieldChange(
                                item.id,
                                'brand_id',
                                bId
                              );

                              handleItemFieldChange(
                                item.id,
                                'brand_name',
                                bName
                              );
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-blue-500"
                          >
                            <option value="">
                              Select Brand
                            </option>

                            {bulkBrands.map(
                              (
                                b
                              ) => (
                                <option
                                  key={
                                    b.id
                                  }
                                  value={
                                    b.id
                                  }
                                >
                                  {
                                    b.name
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        {/* CATEGORY */}
                        <td className="px-2 py-2">

                          <select
                            value={String(
                              activeCatId ||
                                ''
                            )}
                            onChange={(
                              e
                            ) => {
                              const cId =
                                e.target
                                  .value;

                              const cName =
                                bulkCategories.find(
                                  (
                                    c
                                  ) =>
                                    String(
                                      c.id
                                    ) ===
                                    cId
                                )?.name ||
                                '';

                              handleItemFieldChange(
                                item.id,
                                'category_id',
                                cId
                              );

                              handleItemFieldChange(
                                item.id,
                                'category_name',
                                cName
                              );

                              /*
                               * NO SUBCATEGORY FILTER.
                               * ALL subcategories remain available.
                               */
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-blue-500"
                          >
                            <option value="">
                              Select Category
                            </option>

                            {bulkCategories.map(
                              (
                                c
                              ) => (
                                <option
                                  key={
                                    c.id
                                  }
                                  value={
                                    c.id
                                  }
                                >
                                  {
                                    c.name
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        {/* SUBCATEGORY */}
                        <td className="px-2 py-2">

                          <select
                            value={String(
                              item.subcategory_id ||
                                ''
                            )}
                            onChange={(
                              e
                            ) => {
                              const scId =
                                e.target
                                  .value;

                              const scMatch =
                                bulkSubcategories.find(
                                  (
                                    s
                                  ) =>
                                    String(
                                      s.id
                                    ) ===
                                    scId
                                );

                              handleItemFieldChange(
                                item.id,
                                'subcategory_id',
                                scId
                              );

                              handleItemFieldChange(
                                item.id,
                                'subcategory_name',
                                scMatch?.name ||
                                  ''
                              );
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-blue-500"
                          >

                            {rowSubcategories.length ===
                            0 ? (
                              <option value="">
                                No Subcategories Available
                              </option>
                            ) : (
                              <>
                                <option value="">
                                  Select Subcat
                                </option>

                                {rowSubcategories.map(
                                  (
                                    s
                                  ) => (
                                    <option
                                      key={
                                        s.id
                                      }
                                      value={
                                        s.id
                                      }
                                    >
                                      {
                                        s.name
                                      }
                                    </option>
                                  )
                                )}
                              </>
                            )}
                          </select>
                        </td>

                        {/* MRP */}
                        <td className="px-2 py-2">

                          <input
                            type="number"
                            step="0.01"
                            value={
                              item.mrp ||
                              0
                            }
                            onChange={(
                              e
                            ) =>
                              handleItemFieldChange(
                                item.id,
                                'mrp',
                                e.target
                                  .value
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-blue-500 text-right"
                          />
                        </td>

                        {/* PURCHASE RATE */}
                        <td className="px-2 py-2">

                          <input
                            type="number"
                            step="0.01"
                            value={
                              item.purchase_rate ||
                              0
                            }
                            onChange={(
                              e
                            ) =>
                              handleItemFieldChange(
                                item.id,
                                'purchase_rate',
                                e.target
                                  .value
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-blue-500 text-right"
                          />
                        </td>

                        {/* SALE RATE */}
                        <td className="px-2 py-2">

                          <input
                            type="number"
                            step="0.01"
                            value={
                              item.sale_rate ||
                              0
                            }
                            onChange={(
                              e
                            ) =>
                              handleItemFieldChange(
                                item.id,
                                'sale_rate',
                                e.target
                                  .value
                              )
                            }
                            className={cn(
                              "w-full border rounded px-2 py-1 text-[10px] font-black outline-none focus:border-blue-500 text-right",
                              hasRatesError
                                ? "bg-red-100 border-red-400 text-red-800"
                                : "bg-slate-50 border-slate-200 text-blue-700"
                            )}
                          />

                          {hasRatesError && (
                            <p className="text-[7px] font-black text-red-600 uppercase mt-0.5">
                              Sale Rate &gt; MRP
                            </p>
                          )}
                        </td>

                        {/* DISCOUNT */}
                        <td className="px-2 py-2">

                          <input
                            type="number"
                            step="0.1"
                            value={
                              item.discount_percent ||
                              0
                            }
                            onChange={(
                              e
                            ) =>
                              handleItemFieldChange(
                                item.id,
                                'discount_percent',
                                e.target
                                  .value
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-blue-500 text-center"
                          />
                        </td>

                        {/* HSN */}
                        <td className="px-2 py-2">

                          <input
                            type="text"
                            value={
                              item.hsn_code ||
                              ''
                            }
                            onChange={(
                              e
                            ) =>
                              handleItemFieldChange(
                                item.id,
                                'hsn_code',
                                e.target
                                  .value
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-blue-500 text-center uppercase"
                          />
                        </td>

                        {/* GST */}
                        <td className="px-2 py-2">

                          <input
                            type="number"
                            step="0.1"
                            value={
                              item.gst_percent ||
                              0
                            }
                            onChange={(
                              e
                            ) =>
                              handleItemFieldChange(
                                item.id,
                                'gst_percent',
                                e.target
                                  .value
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-blue-500 text-center"
                          />
                        </td>

                        {/* STOCK */}
                        <td className="px-2 py-2 bg-blue-50/20">

                          <div className="flex items-center gap-1">

                            <input
                              type="number"
                              step="0.001"
                              value={
                                item.stock ??
                                0
                              }
                              onChange={(
                                e
                              ) =>
                                handleItemFieldChange(
                                  item.id,
                                  'stock',
                                  e.target
                                    .value
                                )
                              }
                              className={cn(
                                "w-full border rounded px-2 py-1 text-[10px] font-black outline-none focus:border-blue-500 text-right cursor-text transition-colors",
                                hasStockError
                                  ? "bg-red-100 border-red-400 text-red-800"
                                  : isStockModified
                                    ? "bg-amber-100 border-amber-400 text-amber-900 font-black shadow-sm"
                                    : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                              )}
                              placeholder="0"
                              title="Click to edit stock"
                            />

                            <span className="text-[8px] font-bold text-slate-400 uppercase flex-shrink-0">
                              {
                                item.unit_name
                              }
                            </span>
                          </div>

                          {hasStockError && (
                            <p className="text-[7px] font-black text-red-600 uppercase mt-0.5 text-center">
                              Stock &lt; 0
                            </p>
                          )}
                        </td>

                        {/* IMAGE */}
                        <td className="px-2 py-2 text-center">

                          <div className="flex items-center justify-center gap-1">

                            <label className="w-8 h-8 rounded border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-400 relative">

                              {item.new_image_preview ||
                              item.image_url ? (
                                <img
                                  src={
                                    item.new_image_preview ||
                                    item.image_url
                                  }
                                  alt=""
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <ImageIcon
                                  size={
                                    14
                                  }
                                  className="text-slate-300"
                                />
                              )}

                              <input
                                type="file"
                                accept="image/*"
                                onChange={(
                                  e
                                ) =>
                                  handleSingleImageChange(
                                    item.id,
                                    e.target
                                      .files?.[0]
                                  )
                                }
                                className="hidden"
                              />
                            </label>

                            {(
                              item.new_image_preview ||
                              item.image_url
                            ) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveImage(
                                    item.id
                                  )
                                }
                                className="text-red-400 hover:text-red-600 p-0.5"
                                title="Remove image"
                              >
                                <X
                                  size={
                                    12
                                  }
                                />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* SCANS */}
                        <td className="px-3 py-2 text-center">

                          <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                            {
                              item.scan_count ||
                              1
                            }
                          </span>
                        </td>

                        {/* ACTION */}
                        <td className="px-3 py-2 text-center">

                          <button
                            onClick={() =>
                              removeItemFromSession(
                                item.id
                              )
                            }
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Remove from session"
                          >
                            <Trash2
                              size={
                                14
                              }
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          SAVE PREVIEW MODAL
      ===================================================== */}

      <AnimatePresence>
        {showSavePreview && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">

            <motion.div
              initial={{
                scale: 0.95,
                opacity: 0
              }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              exit={{
                scale: 0.95,
                opacity: 0
              }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
            >

              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">

                <div className="flex items-center gap-3">

                  <div className="p-2 bg-emerald-600 rounded-lg text-white">
                    <Save size={18} />
                  </div>

                  <div>

                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                      Confirm Bulk Product Updates
                    </h3>

                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Review all changes before writing to Supabase database
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setShowSavePreview(
                      false
                    )
                  }
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">

                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Total Products in Session
                    </p>

                    <p className="text-lg font-black text-slate-800">
                      {
                        sessionStats.uniqueProducts
                      }
                    </p>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">

                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                      Products with Changes
                    </p>

                    <p className="text-lg font-black text-amber-700">
                      {
                        sessionStats.changedCount
                      }
                    </p>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">

                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">
                      Images Changed
                    </p>

                    <p className="text-lg font-black text-purple-700">
                      {
                        sessionStats.imagesChangedCount
                      }
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200 text-xs">

                  <p className="font-black text-slate-700 uppercase tracking-wider mb-2 text-[10px]">
                    Change Breakdown:
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">

                    <div>
                      • Name Updates:{' '}
                      <span className="font-black text-slate-800">
                        {
                          sessionStats.nameChanges
                        }
                      </span>
                    </div>

                    <div>
                      • MRP Updates:{' '}
                      <span className="font-black text-slate-800">
                        {
                          sessionStats.mrpChanges
                        }
                      </span>
                    </div>

                    <div>
                      • Purchase Rate Updates:{' '}
                      <span className="font-black text-slate-800">
                        {
                          sessionStats.purchaseChanges
                        }
                      </span>
                    </div>

                    <div>
                      • Sale Rate Updates:{' '}
                      <span className="font-black text-slate-800">
                        {
                          sessionStats.saleChanges
                        }
                      </span>
                    </div>

                    <div>
                      • Discount % Updates:{' '}
                      <span className="font-black text-slate-800">
                        {
                          sessionStats.discountChanges
                        }
                      </span>
                    </div>

                    <div>
                      • HSN Code Updates:{' '}
                      <span className="font-black text-slate-800">
                        {
                          sessionStats.hsnChanges
                        }
                      </span>
                    </div>

                    <div>
                      • GST % Updates:{' '}
                      <span className="font-black text-slate-800">
                        {
                          sessionStats.gstChanges
                        }
                      </span>
                    </div>

                    <div>
                      • Stock Adjustments (RPC):{' '}
                      <span className="font-black text-amber-700">
                        {
                          sessionStats.stockChanges
                        }
                      </span>
                    </div>

                    <div>
                      • Category/Brand Updates:{' '}
                      <span className="font-black text-slate-800">
                        {
                          sessionStats.categoryChanges
                        }
                      </span>
                    </div>

                    <div>
                      • Unknown Barcodes Logged:{' '}
                      <span className="font-black text-red-600">
                        {
                          sessionStats.unknownCount
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {isSaving && (
                  <div className="space-y-2 bg-blue-50 p-4 rounded-xl border border-blue-200">

                    <div className="flex justify-between text-xs font-black text-blue-800 uppercase">

                      <span>
                        Saving Updates to Supabase...
                      </span>

                      <span>
                        {
                          saveProgress.current
                        }{' '}
                        /{' '}
                        {
                          saveProgress.total
                        }
                      </span>
                    </div>

                    <div className="w-full bg-blue-200 h-3 rounded-full overflow-hidden">

                      <div
                        className="bg-blue-600 h-full transition-all duration-200"
                        style={{
                          width: `${
                            (
                              saveProgress.current /
                              Math.max(
                                1,
                                saveProgress.total
                              )
                            ) *
                            100
                          }%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setShowSavePreview(
                      false
                    )
                  }
                  disabled={
                    isSaving
                  }
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleConfirmSaveAll
                  }
                  disabled={
                    isSaving
                  }
                  className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                >

                  {isSaving ? (
                    <RefreshCw
                      className="animate-spin"
                      size={14}
                    />
                  ) : (
                    <CheckCircle2
                      size={16}
                    />
                  )}

                  Confirm &amp; Update Database
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================
          FAILED ITEMS DRAWER
      ===================================================== */}

      <AnimatePresence>
        {showFailedDrawer &&
          failedItems.length >
            0 && (
            <div className="fixed inset-0 z-[400] flex justify-end bg-slate-900/40 backdrop-blur-sm">

              <motion.div
                initial={{
                  x: '100%'
                }}
                animate={{
                  x: 0
                }}
                exit={{
                  x: '100%'
                }}
                className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
              >

                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-red-50">

                  <h3 className="text-xs font-black text-red-800 uppercase tracking-widest flex items-center gap-2">

                    <AlertTriangle
                      size={16}
                      className="text-red-600"
                    />

                    Failed Item Updates Log (
                    {
                      failedItems.length
                    }
                    )
                  </h3>

                  <button
                    onClick={() =>
                      setShowFailedDrawer(
                        false
                      )
                    }
                    className="p-1 hover:bg-red-100 rounded text-red-700"
                  >
                    <X
                      size={18}
                    />
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3 divide-y divide-slate-100">

                  {failedItems.map(
                    (
                      item,
                      idx
                    ) => (
                      <div
                        key={
                          idx
                        }
                        className="pt-3 space-y-1"
                      >

                        <div className="flex justify-between items-start">

                          <p className="text-xs font-black text-slate-800 uppercase">
                            {
                              item.name
                            }
                          </p>

                          <span className="text-[9px] bg-red-100 text-red-700 font-mono font-black px-2 py-0.5 rounded">
                            {
                              item.barcode
                            }
                          </span>
                        </div>

                        <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">
                          Reason:{' '}
                          {
                            item.error
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">

                  <p className="text-[10px] text-slate-500 font-bold">
                    Note: Failed items remain in your Bulk Entry session. You can review the error reasons, make corrections, and click "SAVE ALL" again to retry.
                  </p>

                  <button
                    onClick={() =>
                      setShowFailedDrawer(
                        false
                      )
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Review &amp; Retry Failed Items
                  </button>
                </div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>

      {/* =====================================================
          UNKNOWN BARCODE DRAWER
      ===================================================== */}

      <AnimatePresence>
        {showUnknownDrawer && (
          <div className="fixed inset-0 z-[400] flex justify-end bg-slate-900/40 backdrop-blur-sm">

            <motion.div
              initial={{
                x: '100%'
              }}
              animate={{
                x: 0
              }}
              exit={{
                x: '100%'
              }}
              className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            >

              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">

                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">

                  <AlertTriangle
                    size={16}
                    className="text-red-500"
                  />

                  Unknown Barcodes Log (
                  {
                    unknownBarcodes.length
                  }
                  )
                </h3>

                <button
                  onClick={() =>
                    setShowUnknownDrawer(
                      false
                    )
                  }
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-2 divide-y divide-slate-100">

                {unknownBarcodes.length ===
                0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-10">
                    No unknown barcodes scanned
                  </p>
                ) : (
                  unknownBarcodes.map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="pt-2 text-xs font-bold text-slate-700 flex justify-between items-center"
                      >

                        <div>

                          <p className="font-mono font-black text-red-600">
                            {
                              item.barcode
                            }
                          </p>

                          <p className="text-[9px] text-slate-400">
                            {
                              item.timestamp
                            }{' '}
                            •{' '}
                            {
                              item.reason
                            }
                          </p>
                        </div>

                        <span className="text-[9px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded">
                          {
                            item.status
                          }
                        </span>
                      </div>
                    )
                  )
                )}
              </div>

              {unknownBarcodes.length >
                0 && (
                <div className="p-4 border-t border-slate-200 bg-slate-50">

                  <button
                    onClick={() =>
                      setUnknownBarcodes(
                        []
                      )
                    }
                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
                  >
                    Clear Unknown List
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================
          UNMATCHED IMAGES DRAWER
      ===================================================== */}

      <AnimatePresence>
        {showUnmatchedImagesDrawer && (
          <div className="fixed inset-0 z-[400] flex justify-end bg-slate-900/40 backdrop-blur-sm">

            <motion.div
              initial={{
                x: '100%'
              }}
              animate={{
                x: 0
              }}
              exit={{
                x: '100%'
              }}
              className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            >

              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">

                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">

                  <ImageIcon
                    size={16}
                    className="text-purple-600"
                  />

                  Unmatched Images Log (
                  {
                    unmatchedImages.length
                  }
                  )
                </h3>

                <button
                  onClick={() =>
                    setShowUnmatchedImagesDrawer(
                      false
                    )
                  }
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-2">

                {unmatchedImages.length ===
                0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-10">
                    No unmatched images
                  </p>
                ) : (
                  unmatchedImages.map(
                    (
                      filename,
                      idx
                    ) => (
                      <div
                        key={
                          idx
                        }
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex justify-between items-center"
                      >

                        <span className="font-mono text-[10px]">
                          {
                            filename
                          }
                        </span>

                        <span className="text-[9px] text-amber-600 font-black">
                          No Barcode Match
                        </span>
                      </div>
                    )
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}