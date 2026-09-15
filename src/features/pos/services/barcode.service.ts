import { normalizeBarcode } from '../utils/barcode';
import { ProductSearchItem, SearchResult } from './search/search.types';
import { SearchService } from './search/search.service';

export const validateBarcode = (barcode: string): { isValid: boolean; errors: string[] } => {
  const normalized = normalizeBarcode(barcode);
  const errors: string[] = [];

  if (!normalized) {
    errors.push('Barcode cannot be empty');
  }

  return { isValid: errors.length === 0, errors };
};

export const searchByBarcode = (
  products: ProductSearchItem[],
  barcode: string
): SearchResult[] => {
  const normalized = normalizeBarcode(barcode);
  const { isValid } = validateBarcode(normalized);

  if (!isValid) {
    return [];
  }

  // Reuse SearchService with exact match on barcode
  return SearchService.search(products, normalized, undefined, { matchType: 'exact' });
};
