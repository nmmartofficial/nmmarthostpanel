export const normalizeSearchText = (text: string): string => {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

export const normalizeBarcode = (barcode: string): string => {
  return barcode.trim().replace(/\s+/g, '');
};

export const normalizeSKU = (sku: string): string => {
  return sku.trim().toLowerCase().replace(/\s+/g, '');
};

export const safeStringCompare = (a: string, b: string): boolean => {
  return normalizeSearchText(a) === normalizeSearchText(b);
};

export const formatSearchQuery = (query: string): string => {
  return normalizeSearchText(query);
};

export const highlightSearchMatches = (text: string, query: string): string => {
  // Placeholder - no DOM usage
  return text;
};
