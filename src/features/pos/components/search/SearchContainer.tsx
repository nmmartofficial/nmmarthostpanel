import React from 'react';
import { cn } from '../../../../utils/helpers';
import SearchBar from './SearchBar';
import BarcodeInput from './BarcodeInput';
import SearchFilters from './SearchFilters';
import { useSearch } from '../../hooks/search';

interface SearchContainerProps {
  className?: string;
}

const SearchContainer: React.FC<SearchContainerProps> = ({ className }) => {
  const {
    query,
    setQuery,
    clearQuery,
    barcode,
    setBarcode,
    searchBarcode,
    results
  } = useSearch();

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      searchBarcode();
    }
  };

  return (
    <div className={cn('flex flex-col gap-3 w-full p-4 bg-white rounded-lg shadow-sm border border-neutral-200', className)}>
      <div className="flex flex-col md:flex-row gap-3">
        <SearchBar 
          value={query} 
          onChange={setQuery} 
          onClear={clearQuery}
        />
        <BarcodeInput 
          value={barcode}
          onChange={setBarcode}
          onKeyDown={handleBarcodeKeyDown}
        />
      </div>
      <SearchFilters />
      <div className="text-xs font-black text-neutral-600 uppercase">
        Found {results.length} result{results.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default SearchContainer;
