import type { Product } from '../../types';

export interface CartItem {
  id: string | number;
  product: Product;
  quantity: number;
}

export interface CartTax {
  id: string | number;
  name: string;
  rate: number;
  amount: number;
}

export interface CartDiscount {
  id: string | number;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
  code?: string;
}

export interface CartPayment {
  id: string | number;
  method: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  tax: number;
  grandTotal: number;
  roundOff: number;
  payableAmount: number;
  totalQty: number;
  totalItems: number;
}

export interface CartSummary {
  items: CartItem[];
  totals: CartTotals;
  discounts: CartDiscount[];
  taxes: CartTax[];
  payments: CartPayment[];
}

export interface CartValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Cart {
  id: string | number;
  items: CartItem[];
  selectedItem: CartItem | null;
  subtotal: number;
  discount: number;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number | null;
  subtotalAfterDiscount: number;
  tax: number;
  gstMode: 'cgst_sgst' | 'igst' | null;
  gstRate: number | null;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  roundOff: number;
  payableAmount: number;
  totalQty: number;
  totalItems: number;
  customerId: string | number | null;
  notes: string;
  status: 'empty' | 'active' | 'hold' | 'completed' | 'cancelled';
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}
