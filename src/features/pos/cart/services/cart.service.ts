import type { Product } from '../../types';
import type { Cart, CartItem, CartValidation } from '../types/cart.types';
import { initialCartState } from '../store/cart.state';
import { cloneCart, createCartItem, calculateSubtotal, calculateTotalQuantity, calculateTotalItems, calculateDiscountAmount, calculateSubtotalAfterDiscount, calculateGST, calculateCGST, calculateSGST, calculateIGST, calculateRoundOff, calculateGrandTotal, calculatePayableAmount } from '../utils/cart.utils';

const ensureMinQty = (qty: number): number => Math.max(1, qty);

export const CartService = {
  attachCustomer: (cart: Cart, customerId: string | number): Cart => {
    const newCart = cloneCart(cart);
    newCart.customerId = customerId;
    return newCart;
  },

  clearCustomer: (cart: Cart): Cart => {
    const newCart = cloneCart(cart);
    newCart.customerId = null;
    return newCart;
  },

  updateCartSummary: (cart: Cart): Cart => {
    let newCart = cloneCart(cart);
    newCart.subtotal = calculateSubtotal(cart);
    newCart.totalQty = calculateTotalQuantity(cart);
    newCart.totalItems = calculateTotalItems(cart);
    // Also update discount-related fields
    newCart = CartService.updateDiscountSummary(newCart);
    // Also update GST-related fields
    newCart = CartService.updateGSTSummary(newCart);
    // Also update bill summary
    newCart = CartService.updateBillSummary(newCart);
    return newCart;
  },

  updateDiscountSummary: (cart: Cart): Cart => {
    const newCart = cloneCart(cart);
    const discountAmount = calculateDiscountAmount(newCart.subtotal, newCart.discountType, newCart.discountValue);
    newCart.discount = discountAmount;
    newCart.subtotalAfterDiscount = calculateSubtotalAfterDiscount(newCart.subtotal, discountAmount);
    return newCart;
  },

  setDiscount: (cart: Cart, discountType: 'percentage' | 'fixed', discountValue: number): Cart => {
    let newCart = cloneCart(cart);
    newCart.discountType = discountType;
    newCart.discountValue = discountValue;
    newCart = CartService.updateDiscountSummary(newCart);
    return newCart;
  },

  clearDiscount: (cart: Cart): Cart => {
    let newCart = cloneCart(cart);
    newCart.discountType = null;
    newCart.discountValue = null;
    newCart = CartService.updateDiscountSummary(newCart);
    return newCart;
  },

  updateGSTSummary: (cart: Cart): Cart => {
    const newCart = cloneCart(cart);
    const gstAmount = calculateGST(newCart.subtotalAfterDiscount, newCart.gstRate);
    
    newCart.tax = gstAmount;
    
    if (newCart.gstMode === 'cgst_sgst') {
      newCart.cgst = calculateCGST(gstAmount);
      newCart.sgst = calculateSGST(gstAmount);
      newCart.igst = 0;
    } else if (newCart.gstMode === 'igst') {
      newCart.igst = calculateIGST(gstAmount);
      newCart.cgst = 0;
      newCart.sgst = 0;
    } else {
      newCart.cgst = 0;
      newCart.sgst = 0;
      newCart.igst = 0;
    }
    
    return newCart;
  },

  setGSTRate: (cart: Cart, gstRate: number): Cart => {
    let newCart = cloneCart(cart);
    newCart.gstRate = gstRate;
    newCart = CartService.updateGSTSummary(newCart);
    return newCart;
  },

  setGSTMode: (cart: Cart, gstMode: 'cgst_sgst' | 'igst'): Cart => {
    let newCart = cloneCart(cart);
    newCart.gstMode = gstMode;
    newCart = CartService.updateGSTSummary(newCart);
    return newCart;
  },

  clearGST: (cart: Cart): Cart => {
    let newCart = cloneCart(cart);
    newCart.gstMode = null;
    newCart.gstRate = null;
    newCart = CartService.updateGSTSummary(newCart);
    return newCart;
  },

  updateBillSummary: (cart: Cart): Cart => {
    let newCart = cloneCart(cart);
    const amountBeforeRound = newCart.subtotalAfterDiscount + newCart.tax;
    newCart.roundOff = calculateRoundOff(amountBeforeRound);
    newCart.grandTotal = calculateGrandTotal(newCart.subtotalAfterDiscount, newCart.tax, newCart.roundOff);
    newCart.payableAmount = calculatePayableAmount(newCart.grandTotal);
    return newCart;
  },

  add: (cart: Cart, product: Product, quantity: number = 1): Cart => {
    let newCart = cloneCart(cart);
    const existingItem = newCart.items.find(item => item.product.id === product.id);
    if (existingItem) {
      return newCart; // no change
    }
    const newItem = createCartItem(product, ensureMinQty(quantity));
    newCart.items.push(newItem);
    newCart = CartService.updateCartSummary(newCart);
    return newCart;
  },

  remove: (cart: Cart, itemId: string | number): Cart => {
    let newCart = cloneCart(cart);
    newCart.items = newCart.items.filter(item => item.product.id !== itemId);
    newCart = CartService.updateCartSummary(newCart);
    return newCart;
  },

  updateQty: (cart: Cart, itemId: string | number, quantity: number): Cart => {
    let newCart = cloneCart(cart);
    const itemIndex = newCart.items.findIndex(item => item.product.id === itemId);
    if (itemIndex !== -1) {
      newCart.items[itemIndex] = {
        ...newCart.items[itemIndex],
        quantity: ensureMinQty(quantity)
      };
    }
    newCart = CartService.updateCartSummary(newCart);
    return newCart;
  },

  increaseQty: (cart: Cart, itemId: string | number): Cart => {
    let newCart = cloneCart(cart);
    const itemIndex = newCart.items.findIndex(item => item.product.id === itemId);
    if (itemIndex !== -1) {
      newCart.items[itemIndex] = {
        ...newCart.items[itemIndex],
        quantity: newCart.items[itemIndex].quantity + 1
      };
    }
    newCart = CartService.updateCartSummary(newCart);
    return newCart;
  },

  decreaseQty: (cart: Cart, itemId: string | number): Cart => {
    let newCart = cloneCart(cart);
    const itemIndex = newCart.items.findIndex(item => item.product.id === itemId);
    if (itemIndex !== -1) {
      newCart.items[itemIndex] = {
        ...newCart.items[itemIndex],
        quantity: ensureMinQty(newCart.items[itemIndex].quantity - 1)
      };
    }
    newCart = CartService.updateCartSummary(newCart);
    return newCart;
  },

  clear: (cart: Cart): Cart => {
    // Return a completely new cart initialized to initial state
    return { ...initialCartState };
  },

  validate: (cart: Cart): CartValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      errors.push('Cart is empty');
      return { isValid: false, errors, warnings };
    }

    cart.items.forEach((item) => {
      if (!item?.product) {
        errors.push('One or more cart items are missing product data');
        return;
      }

      if (!item.product.id) {
        errors.push('Cart item is missing a valid product id');
      }

      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        errors.push(`Invalid quantity for ${item.product.name || 'item'}`);
      }

      const productPrice = Number(item.product.price ?? item.product.sale_rate ?? item.product.mrp ?? 0);
      if (!Number.isFinite(productPrice) || productPrice < 0) {
        errors.push(`Invalid price for ${item.product.name || 'item'}`);
      }

      if (Number(item.product.stock ?? 0) < Number(item.quantity)) {
        errors.push(`Insufficient stock for ${item.product.name || 'item'}`);
      }
    });

    if (cart.items.length > 0 && cart.payableAmount <= 0 && cart.subtotal > 0) {
      warnings.push('Cart total is below payable threshold');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};
