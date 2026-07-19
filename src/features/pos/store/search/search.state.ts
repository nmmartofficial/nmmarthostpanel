import { SearchState } from '../../services/search';

export const initialSearchState: SearchState = {
  query: '',
  barcode: '',
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
  results: [],
  recentSearches: [],
  history: { recent: [], suggestions: [] },
  filters: {},
  options: {},
  isLoading: false,
  isError: false
};
