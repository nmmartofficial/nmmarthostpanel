/**
 * Barcode Processing Utilities
 */

/**
 * Normalizes barcode input (trims, removes special chars if needed)
 */
export const normalizeBarcode = (code) => {
  if (!code) return '';
  return String(code).trim();
};

/**
 * Checks if a scanned code looks like a standard EAN/UPC
 */
export const isStandardBarcode = (code) => {
  const c = normalizeBarcode(code);
  return /^\d{8,14}$/.test(c);
};

/**
 * Filters products by search term
 */
export const filterProductsBySearch = (products, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) return [];
  const term = searchTerm.toLowerCase();
  return (products || []).filter(p =>
    (p.itname || p.name || '').toLowerCase().includes(term) ||
    (p.barcode || '').toLowerCase().includes(term) ||
    (p.kcode || p.k_code || '').toLowerCase().includes(term)
  ).slice(0, 15);
};

/**
 * Advanced product filter (Category, Top Sale, Favourite)
 */
export const filterProducts = (products, { searchTerm = '', activeCategory = 'All', posFilter = 'All' }) => {
  const term = searchTerm.toLowerCase();
  return (products || []).filter(p => {
    const matchesSearch = (p.itname || p.name || '').toLowerCase().includes(term);
    const matchesCategory = activeCategory === 'All' || p.category_id === activeCategory || p.itg === activeCategory || p.itc === activeCategory;

    if (posFilter === 'TopSale') {
      return matchesSearch && matchesCategory && (parseFloat(p.opstock ?? p.stock ?? 0) > 50);
    }
    if (posFilter === 'Favourite') {
      return matchesSearch && matchesCategory && (p.isfav === 'Yes' || p.is_favourite === 'Yes' || p.rating > 4);
    }

    return matchesSearch && matchesCategory;
  });
};
