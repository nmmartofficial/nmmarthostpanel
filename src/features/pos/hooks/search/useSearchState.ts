import { useState } from 'react';
import { SearchResult, ProductSearchItem } from '../../services/search';

// Mock dataset (single source of truth)
const MOCK_PRODUCTS: ProductSearchItem[] = [
  { id: 1, productName: "Amul Butter", sku: "AB-001", barcode: "8901030411111", brand: "Amul", category: "Dairy", price: 55, mrp: 60 },
  { id: 2, productName: "Nestle Maggi", sku: "NM-002", barcode: "8901030422222", brand: "Nestle", category: "Snacks", price: 14, mrp: 15 },
  { id: 3, productName: "Parle-G Biscuit", sku: "PG-003", barcode: "8901030433333", brand: "Parle", category: "Snacks", price: 10, mrp: 10 },
  { id: 4, productName: "Britannia Bread", sku: "BB-004", barcode: "8901030444444", brand: "Britannia", category: "Bakery", price: 40, mrp: 45 },
  { id: 5, productName: "Fortune Oil", sku: "FO-005", barcode: "8901030455555", brand: "Fortune", category: "Groceries", price: 185, mrp: 200 },
];

export const useSearchState = () => {
  const [query, setQuery] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>(
    MOCK_PRODUCTS.map((product) => ({
      id: product.id,
      name: product.productName,
      type: 'product'
    }))
  );

  return {
    // State properties
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
    loading: false,
    error: null,
    results,
    recentSearches: [],
    history: { recent: [], suggestions: [] },
    // Compatibility properties
    filters: {},
    options: {},
    isLoading: false,
    isError: false,
    // Mock products
    mockProducts: MOCK_PRODUCTS,
    // Actions
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
    setLoading: () => {},
    setError: () => {},
    setResults,
    resetSearch: () => {},
    addRecentSearch: () => {},
    clearRecentSearches: () => {}
  };
};
