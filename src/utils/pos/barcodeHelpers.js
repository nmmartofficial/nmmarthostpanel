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

const getProductIdKey = (product) => (
  product?.id === null || product?.id === undefined ? product : String(product.id)
);

const getProductCodes = (product) => [
  product?.sku,
  product?.item_code,
  product?.kcode,
  product?.k_code,
  product?.dtcode
].filter((value) => value !== null && value !== undefined && String(value).trim());

const getReferencedName = (records, id) => {
  if (!Array.isArray(records) || id === null || id === undefined) return null;
  const record = records.find((item) => String(item?.id) === String(id));
  return record?.name || record?.category_name || record?.brand_name || record?.catname || null;
};

const getProductSearchFields = (product, { categories = [], brands = [] } = {}) => [
  product?.itname,
  product?.name,
  product?.item_name,
  product?.barcode,
  ...getProductCodes(product),
  product?.brand_name,
  product?.brandcode,
  product?.brand_code,
  getReferencedName(brands, product?.brand_id),
  product?.category_name,
  product?.item_category,
  product?.category_code,
  getReferencedName(categories, product?.category_id),
  product?.subcategory_name,
  product?.sub_category_name,
  product?.sub_category_code,
  product?.variant_name,
  product?.variant,
  product?.size,
  product?.weight,
  product?.pack,
  product?.pack_size
].filter((value) => value !== null && value !== undefined && String(value).trim())
  .map((value) => String(value).trim().toLocaleLowerCase());

const uniqueProducts = (products) => {
  const seen = new Set();
  return (Array.isArray(products) ? products : []).filter((product) => {
    const key = getProductIdKey(product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const buildBarcodeIndex = (products) => {
  const index = new Map();
  uniqueProducts(products).forEach((product) => {
    const barcode = normalizeBarcode(product?.barcode);
    if (!barcode) return;
    const matches = index.get(barcode) || [];
    matches.push(product);
    index.set(barcode, matches);
  });
  return index;
};

export const resolveBarcodeMatch = (barcodeIndex, rawCode) => {
  const code = normalizeBarcode(rawCode);
  if (!code) return { status: 'not-found', products: [] };
  const products = barcodeIndex?.get(code) || [];
  if (products.length === 1) return { status: 'match', product: products[0], products };
  if (products.length > 1) return { status: 'ambiguous', products };
  return { status: 'not-found', products: [] };
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
export const filterProductsBySearch = (products, searchTerm, lookups) => {
  if (!searchTerm || !searchTerm.trim()) return [];
  const term = searchTerm.trim().toLocaleLowerCase();
  const items = uniqueProducts(products);
  const matches = items.filter((product) =>
    getProductSearchFields(product, lookups).some((field) => field.includes(term))
  );
  const exactBarcodeMatches = matches.filter((product) => (
    normalizeBarcode(product?.barcode).toLocaleLowerCase() === term
  ));
  const exactCodeMatches = matches.filter((product) => (
    getProductCodes(product).some((code) => String(code).trim().toLocaleLowerCase() === term)
  ));
  const prioritized = [...exactBarcodeMatches, ...exactCodeMatches, ...matches];
  return uniqueProducts(prioritized).slice(0, 15);
};

/**
 * Advanced product filter (Category, Top Sale, Favourite)
 */
export const filterProducts = (
  products,
  { searchTerm = '', activeCategory = 'All', posFilter = 'All' },
  lookups
) => {
  const term = searchTerm.trim().toLocaleLowerCase();
  return uniqueProducts(products).filter(p => {
    const matchesSearch = !term || getProductSearchFields(p, lookups).some((field) => field.includes(term));
    const matchesCategory = activeCategory === 'All' || String(p.category_id) === String(activeCategory);

    if (posFilter === 'TopSale') {
      return matchesSearch && matchesCategory && (parseFloat(p.opstock ?? p.stock ?? 0) > 50);
    }
    if (posFilter === 'Favourite') {
      return matchesSearch && matchesCategory && (p.isfav === 'Yes' || p.is_favourite === 'Yes' || p.rating > 4);
    }

    return matchesSearch && matchesCategory;
  });
};
