// Re-export Product interfaces from Search module as single source of truth
export type { ProductSearchItem as Product } from '../services/search/search.types';
export type { SearchResult } from '../services/search/search.types';

export interface ProductVariant {
  id: string | number;
  productId: string | number;
  name: string;
  price: number;
}

export interface CustomerAddress {
  id: string | number;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface Customer {
  id: string | number;
  name: string;
  email?: string;
  phone?: string;
  addresses?: CustomerAddress[];
}

export interface Payment {
  id: string | number;
  amount: number;
  method: string;
}

export interface SaleItem {
  id: string | number;
  product: Product;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string | number;
  items: SaleItem[];
  total: number;
  customer?: Customer;
  payment: Payment;
  status: string;
}

export interface POSState {
  cart: Cart;
  customer?: Customer;
  settings: TerminalSettings;
}

export interface TerminalSettings {
  theme: string;
  language: string;
}

export interface Discount {
  id: string | number;
  type: string;
  value: number;
}

export interface Tax {
  id: string | number;
  type: string;
  rate: number;
}

export interface BarcodeResult {
  barcode: string;
  product?: Product;
}
