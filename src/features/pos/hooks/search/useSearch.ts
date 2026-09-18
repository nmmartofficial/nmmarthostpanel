import { useEffect, useCallback } from 'react';
import { SearchService } from '../../services/search/search.service';
import { searchByBarcode } from '../../services/barcode.service';
import { ProductService } from '../../services/product.service';
import { useSearchState } from './useSearchState';

const toSearchProduct = (row) => ({
  id: row?.id ?? row?.product_id ?? row?.code ?? '',
  productName: row?.name || row?.product_name || row?.itname || 'Untitled Product',
  sku: row?.sku || row?.item_code || row?.code || '',
  barcode: row?.barcode || row?.barcode_no || '',
  brand: row?.brand_name || row?.brand || row?.brandcode || '',
  category: row?.category_name || row?.category || row?.item_category || '',
  itemCode: row?.item_code || row?.sku || '',
  price: Number(row?.sale_rate ?? row?.selling_price ?? row?.price ?? 0),
  mrp: Number(row?.mrp ?? row?.retail_rate ?? row?.max_price ?? 0),
  stock: Number(row?.stock ?? 0),
  is_active: row?.is_active ?? true,
});

export const useSearch = () => {
  const searchState = useSearchState();
  const { query, barcode, products, setProducts, setResults, setLoading, setError, setBarcode } = searchState;

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await ProductService.getProducts();
        const normalizedProducts = rows.map(toSearchProduct).filter((item) => item && item.id != null && item.productName);
        if (!isMounted) return;
        setProducts(normalizedProducts);
        setResults(SearchService.search(normalizedProducts, query));
      } catch (error) {
        if (!isMounted) return;
        setError(error?.message || 'Product lookup failed');
        setResults([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProducts();
    return () => { isMounted = false; };
  }, [setError, setLoading, setProducts, setResults, query]);

  useEffect(() => {
    if (products.length > 0) {
      setResults(SearchService.search(products, query));
    }
  }, [products, query, setResults]);

  const searchBarcode = useCallback(() => {
    const trimmedBarcode = barcode.trim();
    setBarcode(trimmedBarcode);
    if (!trimmedBarcode) {
      setResults([]);
      return;
    }
    const newResults = searchByBarcode(products, trimmedBarcode);
    setResults(newResults);
  }, [barcode, products, setBarcode, setResults]);

  const clearBarcode = useCallback(() => {
    setBarcode('');
    setResults(SearchService.search(products, query));
  }, [products, query, setBarcode, setResults]);

  return { ...searchState, products, searchBarcode, clearBarcode };
};
