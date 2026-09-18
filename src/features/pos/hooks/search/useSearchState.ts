import { useState } from 'react';
import { SearchResult, ProductSearchItem } from '../../services/search';

export const useSearchState = () => {
  const [query, setQuery] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [products, setProducts] = useState<ProductSearchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return {
    query,
    barcode,
    selectedCategory: null,
    selectedBrand: null,
    selectedDepartment: null,
    selectedGroup: null,
    selectedSubGroup: null,
    selectedOffer: null,
    selectedStockFilter: null,
    sortBy: 'name',
    sortOrder: 'asc',
    loading,
    error,
    results,
    products,
    recentSearches: [],
    history: { recent: [], suggestions: [] },
    filters: {},
    options: {},
    isLoading: false,
    isError: false,
    setQuery,
    clearQuery: () => setQuery(''),
    setBarcode,
    clearBarcode: () => setBarcode(''),
    setCategory: () => {},
    setBrand: () => {},
    setDepartment: () => {},
    setGroup: () => {},
    setSubGroup: () => {},
    setOffer: () => {},
    setStockFilter: () => {},
    setSortBy: () => {},
    setSortOrder: () => {},
    setLoading,
    setError,
    setResults,
    setProducts,
    resetSearch: () => {
      setQuery('');
      setBarcode('');
      setResults([]);
    },
    addRecentSearch: () => {},
    clearRecentSearches: () => {}
  };
};
