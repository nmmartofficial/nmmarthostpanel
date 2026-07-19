import { useEffect, useCallback } from 'react';
import { SearchService } from '../../services/search/search.service';
import { searchByBarcode } from '../../services/barcode.service';
import { useSearchState } from './useSearchState';

export const useSearch = () => {
  const searchState = useSearchState();
  const { query, barcode, mockProducts, setResults, setBarcode } = searchState;

  useEffect(() => {
    const newResults = SearchService.search(mockProducts, query);
    setResults(newResults);
  }, [query, mockProducts, setResults]);

  const searchBarcode = useCallback(() => {
    // Trim barcode before search
    const trimmedBarcode = barcode.trim();
    // Update state with trimmed barcode
    setBarcode(trimmedBarcode);
    // Search only if barcode is not empty
    if (trimmedBarcode) {
      const newResults = searchByBarcode(mockProducts, trimmedBarcode);
      setResults(newResults);
    }
  }, [barcode, mockProducts, setResults, setBarcode]);

  const clearBarcode = useCallback(() => {
    setBarcode('');
  }, [setBarcode]);

  return { ...searchState, searchBarcode, clearBarcode };
};
