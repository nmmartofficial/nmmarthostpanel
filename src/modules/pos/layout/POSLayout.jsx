
import React, { useState, useMemo } from 'react';
import { POSProvider, usePOS } from '../context/POSContext';
import POSHeader from './POSHeader';
import CategorySidebar from '../sidebar/CategorySidebar';
import ProductSearch from '../search/ProductSearch';
import ProductGrid from '../products/ProductGrid';
import CustomerPanel from '../customer/CustomerPanel';
import CartPanel from '../cart/CartPanel';
import BottomToolbar from './BottomToolbar';
import products from '../data/products';
import categories from '../data/categories';
import {
  PaymentDialog,
  HoldBillDialog,
  DiscountDialog,
  QuantityDialog,
  CustomerDialog,
  BarcodeDialog,
  ReturnDialog,
} from '../dialogs';

export default function POSLayout() {
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [discount, setDiscount] = useState({ type: 'none', value: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openDialogs, setOpenDialogs] = useState({
    payment: false,
    holdBill: false,
    discount: false,
    quantity: null,
    customer: false,
    barcode: false,
    return: false,
  });

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const addToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...product, quantity, discount: null }];
    });
  };

  const updateQuantity = (id, qty) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((i) => i.id !== id);
      return prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i));
    });
  };

  const removeItem = (id) => setCart((prev) => prev.filter((i) => i.id !== id));
  const clearCart = () => {
    setCart([]);
    setDiscount({ type: 'none', value: 0 });
    setCustomer(null);
  };

  const selectCategory = (id) => setSelectedCategory(id);

  const openDialog = (name, data = null) =>
    setOpenDialogs((prev) => ({ ...prev, [name]: data !== undefined ? data : true }));
  const closeDialog = (name) =>
    setOpenDialogs((prev) => ({ ...prev, [name]: name === 'quantity' ? null : false }));

  const posContextValue = {
    cart,
    customer,
    discount,
    searchQuery,
    selectedCategory,
    products,
    categories,
    filteredProducts,
    openDialogs,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    setCustomer,
    setDiscount,
    setSearchQuery,
    selectCategory,
    openDiscountDialog: () => openDialog('discount'),
    openPaymentDialog: () => openDialog('payment'),
    openHoldBillDialog: () => openDialog('holdBill'),
    openReturnDialog: () => openDialog('return'),
    openBarcodeDialog: () => openDialog('barcode'),
    openCustomerDialog: () => openDialog('customer'),
    openQuantityDialog: (product) => openDialog('quantity', product),
    closeDialog,
  };

  return (
    <POSProvider value={posContextValue}>
      <div className="h-screen flex flex-col bg-gray-50">
        <POSHeader />
        <div className="flex flex-1 overflow-hidden">
          <CategorySidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <ProductSearch />
            <ProductGrid />
          </div>
          <div className="flex flex-col">
            <CustomerPanel />
            <CartPanel />
          </div>
        </div>
        <BottomToolbar />
        <Dialogs />
      </div>
    </POSProvider>
  );
}

function Dialogs() {
  const pos = usePOS();
  return (
    <>
      <PaymentDialog
        isOpen={pos.openDialogs.payment}
        onClose={() => pos.closeDialog('payment')}
      />
      <HoldBillDialog
        isOpen={pos.openDialogs.holdBill}
        onClose={() => pos.closeDialog('holdBill')}
      />
      <DiscountDialog
        isOpen={pos.openDialogs.discount}
        onClose={() => pos.closeDialog('discount')}
      />
      {pos.openDialogs.quantity && (
        <QuantityDialog
          product={pos.openDialogs.quantity}
          isOpen={true}
          onClose={() => pos.closeDialog('quantity')}
        />
      )}
      <CustomerDialog
        isOpen={pos.openDialogs.customer}
        onClose={() => pos.closeDialog('customer')}
      />
      <BarcodeDialog
        isOpen={pos.openDialogs.barcode}
        onClose={() => pos.closeDialog('barcode')}
      />
      <ReturnDialog
        isOpen={pos.openDialogs.return}
        onClose={() => pos.closeDialog('return')}
      />
    </>
  );
}
