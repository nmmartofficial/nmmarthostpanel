import React, { memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '../utils/helpers';
import { formatCurrency, escapeRegExp } from '../utils/pos';
import { usePOS } from '../context';

// --- Search Highlighting Helper ---
const HighlightText = memo(({ text, highlight }) => {
  const content = String(text || '');
  if (!highlight || !highlight.trim()) return <span>{content}</span>;

  const escapedHighlight = escapeRegExp(highlight.trim());
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = content.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.trim().toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-black px-0.5 rounded font-black">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
});

HighlightText.displayName = 'HighlightText';

const ProductSearch = memo(() => {
  const {
    searchTerm,
    setSearchTerm,
    showSearchDropdown,
    setShowSearchDropdown,
    searchResults,
    selectedIndex,
    setSelectedIndex,
    handleSearchKeyDown,
    handleProductSelect,
    searchInputRef,
    isTouchMode
  } = usePOS();

  const hasSearchTerm = Boolean(searchTerm?.trim());

  return (
    <div className="flex-1 relative">
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search Product | Barcode | SKU (F1)"
        className={cn(
          "w-full bg-white border-none rounded font-black text-black shadow-sm outline-none focus:ring-2 focus:ring-blue-500",
          isTouchMode ? "px-5 py-3 text-sm" : "px-3 py-1.5 text-xs"
        )}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowSearchDropdown(true);
        }}
        onFocus={() => setShowSearchDropdown(true)}
        onKeyDown={handleSearchKeyDown}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-label="Product search"
        aria-autocomplete="list"
        aria-expanded={Boolean(showSearchDropdown && hasSearchTerm)}
        aria-haspopup="listbox"
        aria-controls="product-search-results"
      />
      <AnimatePresence>
        {showSearchDropdown && hasSearchTerm && (
          <div
            id="product-search-results"
            role="listbox"
            className="absolute top-full left-0 w-full bg-white shadow-2xl rounded-b-lg mt-0.5 z-[100] border border-slate-200 overflow-hidden max-h-[400px]"
          >
            {searchResults.length > 0 ? (
              searchResults.map((p, idx) => (
                <button
                  key={p.id || p.barcode || `search-res-${idx}`}
                  role="option"
                  aria-selected={selectedIndex === idx}
                  onClick={() => handleProductSelect(p)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full text-left border-b border-slate-50 last:border-none flex justify-between items-center",
                    selectedIndex === idx ? "bg-blue-600 text-white" : "hover:bg-blue-50",
                    isTouchMode ? "px-6 py-4" : "px-4 py-2"
                  )}
                >
                  <div className="flex flex-col">
                    <span className={cn("font-black uppercase", isTouchMode ? "text-sm" : "text-[11px]")}>
                      <HighlightText text={p.itname || p.name} highlight={searchTerm} />
                    </span>
                    <span className={cn("opacity-60", isTouchMode ? "text-[10px]" : "text-[9px]")}>
                      Barcode: {p.barcode || 'N/A'}
                    </span>
                  </div>
                  <span className={cn("font-black", isTouchMode ? "text-sm" : "text-xs")}>
                    {formatCurrency(p.onlinerate || p.sale_rate || 0)}
                  </span>
                </button>
              ))
            ) : (
              <div role="status" className="p-4 text-center text-[10px] font-black text-slate-400">
                No Product Found
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

ProductSearch.displayName = 'ProductSearch';

export default ProductSearch;
