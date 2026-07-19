import { SearchFilters, SearchOptions, SearchResult, ProductSearchItem } from './search.types';
import { normalizeSearchText, normalizeBarcode, normalizeSKU } from './search.utils';
import { DEFAULT_SEARCH_SORT_ORDER } from './search.constants';

export const SearchService = {
  search: (
    items: ProductSearchItem[],
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): SearchResult[] => {
    // Handle empty dataset or empty query
    if (!items || items.length === 0) {
      return [];
    }

    const normalizedQuery = normalizeSearchText(query);

    if (!normalizedQuery) {
      return items.map((item) => ({
        id: item.id,
        name: item.productName,
        type: 'product'
      }));
    }

    // Define match type
    const matchType = options?.matchType || 'partial';

    // Filter items
    const filtered = items.filter((item) => {
      // Apply filters (placeholder - no real filtering yet)
      if (filters) {
        // TODO: Implement actual filtering when needed
      }

      const searchFields = [
        item.productName,
        item.sku,
        item.barcode,
        item.brand,
        item.category,
        item.itemCode
      ].filter(Boolean) as string[];

      // Check each field
      return searchFields.some((field) => {
        let normalizedField;
        if (item.barcode === field) {
          normalizedField = normalizeBarcode(field);
        } else if (item.sku === field) {
          normalizedField = normalizeSKU(field);
        } else {
          normalizedField = normalizeSearchText(field);
        }

        switch (matchType) {
          case 'exact':
            return normalizedField === normalizedQuery;
          case 'startsWith':
            return normalizedField.startsWith(normalizedQuery);
          case 'partial':
          default:
            return normalizedField.includes(normalizedQuery);
        }
      });
    });

    // Sort (stable sort, preserve original order)
    const sortBy = options?.sortBy || 'name';
    const sortOrder = options?.sortOrder || DEFAULT_SEARCH_SORT_ORDER;

    return filtered
      .map((item, index) => ({ item, originalIndex: index }))
      .sort((a, b) => {
        // TODO: Implement real sorting logic when needed
        return sortOrder === 'asc' 
          ? a.originalIndex - b.originalIndex 
          : b.originalIndex - a.originalIndex;
      })
      .map(({ item }) => ({
        id: item.id,
        name: item.productName,
        type: 'product'
      }));
  },
  clear: (): void => {
    // No-op - no side effects
  },
  reset: (): void => {
    // No-op - no side effects
  }
};
