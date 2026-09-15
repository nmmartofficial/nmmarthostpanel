export interface SearchFilters {
  category?: string;
  brand?: string;
  inStock?: boolean;
  onSale?: boolean;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  matchType?: 'exact' | 'partial' | 'startsWith';
}

export interface SearchResult {
  id: string | number;
  name: string;
  type: 'product' | 'category' | 'brand';
}

export interface ProductSearchItem {
  id: string | number;
  productName: string;
  sku?: string;
  barcode?: string;
  brand?: string;
  category?: string;
  itemCode?: string;
  price?: number;
  mrp?: number;
}

export interface RecentSearch {
  id: string | number;
  query: string;
  timestamp: Date;
}

export interface SearchHistory {
  recent: RecentSearch[];
  suggestions: string[];
}

export interface SearchState {
  query: string;
  barcode: string;
  selectedCategory: string | null;
  selectedBrand: string | null;
  selectedDepartment: string | null;
  selectedGroup: string | null;
  selectedSubGroup: string | null;
  selectedOffer: string | null;
  selectedStockFilter: string | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  loading: boolean;
  error: string | null;
  results: SearchResult[];
  recentSearches: RecentSearch[];
  history: SearchHistory;
  // Keep existing fields for compatibility
  filters: SearchFilters;
  options: SearchOptions;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}
