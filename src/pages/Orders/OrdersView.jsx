import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Eye,
  Printer,
  Trash2,
  X,
  Edit2,
  User,
  MapPin,
  CreditCard,
  Truck,
  RefreshCw,
  Undo2,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../../erpController';
import { dbSync } from '../../dbSync';
import { DB_SCHEMA } from '../../dbSchema';
import { supabase } from '../../supabase';

const parseStoredOrderItems = (items) => {
  if (Array.isArray(items)) {
    return items;
  }

  if (typeof items !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getProductRate = (product) => {
  return Number(
    product?.sale_rate ??
    product?.onlinerate ??
    product?.online_rate ??
    product?.retail_rate ??
    product?.restrate ??
    product?.mrp ??
    0
  );
};

const getValidImageUrl = (item) => {
  const image =
    item?.image_url ??
    item?.picture ??
    '';

  if (!image) {
    return '';
  }

  const value = String(image).trim();

  if (!value) {
    return '';
  }

  if (value.includes('/products/null')) {
    return '';
  }

  if (value === 'null' || value === 'undefined') {
    return '';
  }

  return value;
};

const escapePrintHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export default function OrdersView({
  orders,
  filter,
  fetchInitialData,
  appConfig
}) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [orderItemSummaries, setOrderItemSummaries] = useState({});
  const [loadingItems, setLoadingItems] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('Today');
  const [paymentFilter, setPaymentFilter] = useState('All');

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnAmount, setReturnAmount] = useState('');

  /*
   * ============================================================
   * ORDER ITEM SUMMARY
   * ============================================================
   *
   * orders.items is the primary source.
   *
   * Example:
   * [
   *   {
   *     name: "TATA POHA 500g",
   *     quantity: 2,
   *     image_url: "",
   *     line_total: 134,
   *     product_id: 10616,
   *     unit_price: 67
   *   }
   * ]
   */
  useEffect(() => {
    const summaries = {};

    safeOrders.forEach((order) => {
      const items = parseStoredOrderItems(order?.items);

      const summary = items
        .map((item) => {
          const name = String(
            item?.name ??
            item?.product_name ??
            ''
          ).trim();

          const quantity =
            Number(
              item?.quantity ??
              item?.qty ??
              1
            ) || 1;

          if (!name) {
            return '';
          }

          return quantity > 1
            ? `${name} x${quantity}`
            : name;
        })
        .filter(Boolean)
        .join(', ');

      summaries[order.id] = summary;
    });

    setOrderItemSummaries(summaries);
  }, [orders]);

  /*
   * ============================================================
   * FILTERED ORDERS
   * ============================================================
   */
  const filteredOrders = useMemo(() => {
    let result = [...safeOrders];

    if (filter) {
      result = result.filter(
        (order) =>
          String(order?.order_status ?? '')
            .toLowerCase() ===
          String(filter).toLowerCase()
      );
    }

    if (paymentFilter !== 'All') {
      result = result.filter((order) => {
        const method = String(
          order?.payment_method ?? 'Cash'
        ).toLowerCase();

        if (paymentFilter === 'Self-Checkout') {
          return (
            method.includes('self') ||
            method.includes('app')
          );
        }

        return (
          method ===
          paymentFilter.toLowerCase()
        );
      });
    }

    const now = new Date();

    if (dateFilter === 'Today') {
      result = result.filter((order) => {
        if (!order?.created_at) {
          return false;
        }

        return (
          new Date(
            order.created_at
          ).toDateString() === now.toDateString()
        );
      });
    }

    if (dateFilter === '1 Month') {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);

      result = result.filter(
        (order) =>
          new Date(order.created_at) >= date
      );
    }

    if (dateFilter === '2 Months') {
      const date = new Date();
      date.setMonth(date.getMonth() - 2);

      result = result.filter(
        (order) =>
          new Date(order.created_at) >= date
      );
    }

    if (dateFilter === '4 Months') {
      const date = new Date();
      date.setMonth(date.getMonth() - 4);

      result = result.filter(
        (order) =>
          new Date(order.created_at) >= date
      );
    }

    if (dateFilter === 'Full Year') {
      result = result.filter(
        (order) =>
          new Date(
            order.created_at
          ).getFullYear() === now.getFullYear()
      );
    }

    if (searchTerm.trim()) {
      const search = searchTerm
        .trim()
        .toLowerCase();

      result = result.filter((order) => {
        const billNo = String(
          order?.order_number ?? ''
        ).toLowerCase();

        const mobile = String(
          order?.user_mobile ??
          order?.customer_phone ??
          ''
        ).toLowerCase();

        return (
          billNo.includes(search) ||
          mobile.includes(search)
        );
      });
    }

    return result;
  }, [
    safeOrders,
    filter,
    dateFilter,
    paymentFilter,
    searchTerm
  ]);

  /*
   * ============================================================
   * TOTAL
   * ============================================================
   */
  const totalFilteredSales = useMemo(() => {
    return filteredOrders.reduce(
      (sum, order) =>
        sum +
        (Number(order?.total_amount) || 0),
      0
    );
  }, [filteredOrders]);

  /*
   * ============================================================
   * LOAD ORDER DETAIL
   * ============================================================
   */
  useEffect(() => {
    if (!selectedOrder) {
      setOrderItems([]);
      return;
    }

    setEditFormData({
      ...selectedOrder
    });

    fetchOrderItems(
      selectedOrder.id,
      selectedOrder
    );
  }, [selectedOrder]);

  const fetchOrderItems = async (
    orderId,
    order = null
  ) => {
    setLoadingItems(true);

    try {
      /*
       * FIRST SOURCE:
       * orders.items
       */
      let sourceItems =
        parseStoredOrderItems(
          order?.items
        );

      /*
       * FALLBACK:
       * Directly fetch the same order row from Supabase.
       *
       * This is only used when the orders prop does not
       * already contain items.
       */
      if (sourceItems.length === 0) {
        const { data, error } = await supabase
          .from(DB_SCHEMA.ORDERS.table)
          .select('id,items')
          .eq('id', orderId)
          .maybeSingle();

        if (error) {
          console.error(
            'Order items fetch failed:',
            error
          );
        } else {
          sourceItems =
            parseStoredOrderItems(
              data?.items
            );
        }
      }

      /*
       * Product IDs from JSON snapshot.
       */
      const productIds = [
        ...new Set(
          sourceItems
            .map((item) =>
              Number(
                item?.product_id ??
                item?.productId
              )
            )
            .filter(Number.isFinite)
        )
      ];

      /*
       * Fetch product master only for missing
       * rate/image information.
       */
      let products = [];

      if (productIds.length > 0) {
        try {
          products =
            await dbSync.fetch(
              DB_SCHEMA.PRODUCTS.table,
              {
                in: {
                  column: 'id',
                  values: productIds
                },
                includeDeleted: true
              }
            );
        } catch (productError) {
          console.error(
            'Product master fetch failed:',
            productError
          );
        }
      }

      const productsById = new Map(
        (products || []).map((product) => [
          Number(product.id),
          product
        ])
      );

      /*
       * Normalize items for UI.
       */
      const normalizedItems =
        sourceItems.map(
          (item, index) => {
            const productId = Number(
              item?.product_id ??
              item?.productId
            );

            const product =
              productsById.get(productId);

            const quantity =
              Number(
                item?.quantity ??
                item?.qty ??
                1
              ) || 1;

            const rate =
              Number(
                item?.unit_price ??
                item?.rate ??
                item?.price ??
                getProductRate(product)
              ) || 0;

            const total =
              Number(
                item?.line_total ??
                item?.total
              ) ||
              rate * quantity;

            const imageUrl =
              getValidImageUrl(item) ||
              getValidImageUrl(product);

            const productName = String(
              item?.name ??
              item?.product_name ??
              product?.name ??
              `Product #${productId || ''}`
            ).trim();

            return {
              ...item,
              id:
                item?.id ??
                `${orderId}-${productId || index}`,
              product_id: productId,
              product_name: productName,
              quantity,
              rate,
              total,
              image_url: imageUrl
            };
          }
        );

      setOrderItems(normalizedItems);
    } catch (error) {
      console.error(
        'Error fetching order items:',
        error
      );

      setOrderItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  /*
   * ============================================================
   * PRINT
   * ============================================================
   */
  const printOrderBill = async (
    order,
    items = null
  ) => {
    let printableItems =
      Array.isArray(items) &&
      items.length > 0
        ? items
        : parseStoredOrderItems(
            order?.items
          );

    const rows = printableItems
      .map((item) => {
        const name =
          item?.product_name ??
          item?.name ??
          `Product #${item?.product_id ?? ''}`;

        const quantity =
          Number(
            item?.quantity ??
            item?.qty ??
            1
          ) || 1;

        const rate =
          Number(
            item?.rate ??
            item?.unit_price ??
            item?.price ??
            0
          ) || 0;

        const total =
          Number(
            item?.total ??
            item?.line_total
          ) ||
          rate * quantity;

        const image =
          getValidImageUrl(item);

        return `
          <tr>
            <td>
              ${
                image
                  ? `<img src="${escapePrintHtml(
                      image
                    )}" class="item-image" />`
                  : ''
              }
              <span>${escapePrintHtml(
                name
              )}</span>
            </td>
            <td>${quantity}</td>
            <td>₹${rate.toFixed(2)}</td>
            <td>₹${total.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const printWindow = window.open(
      '',
      '_blank',
      'width=520,height=760'
    );

    if (!printWindow) {
      alert(
        'Please allow pop-ups to print the bill.'
      );
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>
          Bill ${escapePrintHtml(
            order?.order_number ||
              order?.id
          )}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            color: #111;
            margin: 24px;
            font-size: 13px;
          }

          h1 {
            margin: 0 0 4px;
            font-size: 22px;
            text-align: center;
          }

          h2 {
            margin: 0 0 18px;
            font-size: 14px;
            text-align: center;
          }

          .meta {
            border-bottom: 1px solid #111;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }

          .meta p {
            display: flex;
            justify-content: space-between;
          }

          .items {
            width: 100%;
            border-collapse: collapse;
          }

          .items th,
          .items td {
            border-bottom: 1px solid #ddd;
            padding: 8px 4px;
            text-align: right;
            vertical-align: middle;
          }

          .items th:first-child,
          .items td:first-child {
            text-align: left;
          }

          .item-image {
            width: 34px;
            height: 34px;
            object-fit: contain;
            vertical-align: middle;
            margin-right: 7px;
          }

          .total {
            margin-top: 16px;
            border-top: 2px solid #111;
            padding-top: 10px;
            font-size: 16px;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
          }

          @media print {
            body {
              margin: 10mm;
            }
          }
        </style>
      </head>

      <body>
        <h1>
          ${escapePrintHtml(
            appConfig?.shop_name ||
              'NM MART'
          )}
        </h1>

        <h2>Customer Bill</h2>

        <div class="meta">
          <p>
            <span>Bill No</span>
            <strong>
              #${escapePrintHtml(
                order?.order_number ||
                  order?.id
              )}
            </strong>
          </p>

          <p>
            <span>Customer</span>
            <strong>
              ${escapePrintHtml(
                order?.customer_name ||
                  'Walk-in'
              )}
            </strong>
          </p>

          <p>
            <span>Mobile</span>
            <strong>
              ${escapePrintHtml(
                order?.user_mobile ||
                  order?.customer_phone ||
                  '-'
              )}
            </strong>
          </p>

          <p>
            <span>Date</span>
            <strong>
              ${escapePrintHtml(
                new Date(
                  order?.created_at
                ).toLocaleString()
              )}
            </strong>
          </p>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows ||
              `
                <tr>
                  <td colspan="4">
                    No item details found
                  </td>
                </tr>
              `
            }
          </tbody>
        </table>

        <div class="total">
          <span>Grand Total</span>
          <span>
            ₹${Number(
              order?.total_amount || 0
            ).toFixed(2)}
          </span>
        </div>

        <p style="text-align:center;margin-top:28px">
          Thank you. Visit again.
        </p>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  /*
   * ============================================================
   * STATUS
   * ============================================================
   */
  const updateStatus = async (
    id,
    status
  ) => {
    try {
      const result =
        await handleERPAction(
          DB_SCHEMA.ORDERS.table,
          ACTION_TYPES.UPDATE,
          {
            id,
            order_status: status
          }
        );

      if (
        result &&
        result.success === false
      ) {
        throw new Error(
          result.error ||
            'Status update failed'
        );
      }

      await fetchInitialData?.();

      if (selectedOrder?.id === id) {
        setSelectedOrder({
          ...selectedOrder,
          order_status: status
        });
      }

      alert('Status Updated');
    } catch (error) {
      console.error(
        'Status update error:',
        error
      );

      alert(
        'Update Error: ' +
          (error?.message || '')
      );
    }
  };

  /*
   * ============================================================
   * EDIT SAVE
   * ============================================================
   */
  const handleEditSave = async () => {
    try {
      const result =
        await handleERPAction(
          DB_SCHEMA.ORDERS.table,
          ACTION_TYPES.UPDATE,
          {
            id: selectedOrder.id,
            total_amount:
              editFormData.total_amount,
            payment_method:
              editFormData.payment_method,
            payment_status:
              editFormData.payment_status,
            customer_name:
              editFormData.customer_name,
            user_mobile:
              editFormData.user_mobile,
            delivery_address:
              editFormData.delivery_address ??
              editFormData.shipping_address ??
              ''
          }
        );

      if (
        !result ||
        result.success === false
      ) {
        throw new Error(
          result?.error ||
            'Update failed'
        );
      }

      alert(
        'Bill updated successfully!'
      );

      setIsEditing(false);

      setSelectedOrder({
        ...selectedOrder,
        ...editFormData
      });

      await fetchInitialData?.(
        true,
        true
      );
    } catch (error) {
      console.error(
        'Bill update error:',
        error
      );

      alert(
        'Update failed: ' +
          (error?.message || '')
      );
    }
  };

  /*
   * ============================================================
   * DELETE
   * ============================================================
   */
  const deleteOrder = async (
    order
  ) => {
    const confirmed = window.confirm(
      'ARE YOU SURE? This will permanently delete this Bill History!'
    );

    if (!confirmed) {
      return;
    }

    try {
      const result =
        await handleERPAction(
          DB_SCHEMA.ORDERS.table,
          ACTION_TYPES.DELETE,
          {
            id: order.id
          }
        );

      if (
        result &&
        result.success === false
      ) {
        throw new Error(
          result.error ||
            'Delete failed'
        );
      }

      await fetchInitialData?.();
    } catch (error) {
      console.error(
        'Delete order error:',
        error
      );

      alert(
        'Delete failed: ' +
          (error?.message || '')
      );
    }
  };

  /*
   * ============================================================
   * RETURN
   * ============================================================
   */
  const handleReturnOrder = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedOrder) {
      return;
    }

    try {
      await handleERPAction(
        DB_SCHEMA.ORDERS.table,
        ACTION_TYPES.UPDATE,
        {
          id: selectedOrder.id,
          order_status: 'returned'
        }
      );

      for (const item of orderItems) {
        try {
          await handleERPAction(
            null,
            ACTION_TYPES.ADJUST_STOCK,
            {
              product_id:
                item.product_id,
              change_qty:
                Number(
                  item.quantity || 0
                ),
              change_type: 'return',
              narration:
                `Return from Order #${selectedOrder.order_number}`,
              reference_number:
                selectedOrder.order_number
            }
          );
        } catch (stockError) {
          console.error(
            'Return stock adjustment failed:',
            stockError
          );
        }
      }

      await fetchInitialData?.();

      setShowReturnModal(false);
      setReturnReason('');
      setReturnAmount('');

      alert(
        'Order Returned Successfully!'
      );
    } catch (error) {
      console.error(
        'Return failed:',
        error
      );

      alert(
        'Return Failed: ' +
          (error?.message || '')
      );
    }
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */
  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">

      {/* SUMMARY */}
      <div className="bg-blue-600 p-4 rounded-xl text-white shadow-lg flex justify-between items-center flex-shrink-0">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
            Report for {dateFilter}
          </p>

          <h3 className="text-xl font-black tracking-tighter">
            Total Sales: ₹
            {totalFilteredSales.toLocaleString()}
          </h3>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
            Bills Found
          </p>

          <h3 className="text-xl font-black tracking-tighter">
            {filteredOrders.length}
          </h3>
        </div>
      </div>

      {/* SEARCH / FILTER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />

          <input
            type="text"
            placeholder="Search Bill No / Mobile"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {[
            'Today',
            '1 Month',
            '2 Months',
            '4 Months',
            'Full Year',
            'All'
          ].map((value) => (
            <button
              key={value}
              onClick={() =>
                setDateFilter(value)
              }
              className={cn(
                'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all border',
                dateFilter === value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Pay:
          </span>

          {[
            'All',
            'Cash',
            'UPI',
            'Self-Checkout'
          ].map((value) => (
            <button
              key={value}
              onClick={() =>
                setPaymentFilter(value)
              }
              className={cn(
                'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border',
                paymentFilter === value
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200'
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {/* ORDER TABLE */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">

          <table className="w-full text-left border-collapse">

            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200">

                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">
                  Bill #
                </th>

                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">
                  Customer / Mobile
                </th>

                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">
                  Order Items
                </th>

                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">
                  Amount
                </th>

                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">
                  Method
                </th>

                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest text-right">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {filteredOrders.length > 0 ? (

                filteredOrders.map(
                  (order, index) => (
                    <tr
                      key={order.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >

                      <td className="px-4 py-2.5 font-black text-blue-700 text-[10px]">
                        #
                        {order.order_number ||
                          order.order_no ||
                          order.id ||
                          index + 1}
                      </td>

                      <td className="px-4 py-2.5">

                        <p className="text-[10px] font-bold text-slate-800 leading-none">
                          {order.user_mobile ||
                            order.customer_phone ||
                            'No mobile'}
                        </p>

                        <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                          {order.customer_name ||
                            'Walk-in'}
                        </p>

                      </td>

                      <td className="px-4 py-2.5 max-w-[320px]">

                        <p
                          className="text-[9px] font-black text-slate-700 uppercase truncate"
                          title={
                            orderItemSummaries[
                              order.id
                            ] || ''
                          }
                        >
                          {orderItemSummaries[
                            order.id
                          ] || 'No item details'}
                        </p>

                      </td>

                      <td className="px-4 py-2.5 text-[10px] font-black text-slate-800">
                        ₹
                        {Number(
                          order.total_amount ||
                            order.total ||
                            0
                        )}
                      </td>

                      <td className="px-4 py-2.5">

                        <span
                          className={cn(
                            'text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border',
                            String(
                              order.payment_method ||
                                'Cash'
                            ).toLowerCase() ===
                              'cash'
                              ? 'bg-orange-50 text-orange-600 border-orange-100'
                              : 'bg-blue-50 text-blue-600 border-blue-100'
                          )}
                        >
                          {order.payment_method ||
                            order.payment_mode ||
                            'Cash'}
                        </span>

                      </td>

                      <td className="px-4 py-2.5 text-right space-x-1">

                        <button
                          onClick={() =>
                            setSelectedOrder(
                              order
                            )
                          }
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() =>
                            printOrderBill(
                              order
                            )
                          }
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all"
                        >
                          <Printer size={14} />
                        </button>

                        <button
                          onClick={() =>
                            deleteOrder(
                              order
                            )
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2 size={14} />
                        </button>

                      </td>

                    </tr>
                  )
                )

              ) : (

                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest"
                  >
                    No orders found for this selection
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>
      </div>

      {/* ORDER DETAIL MODAL */}
      <AnimatePresence>

        {selectedOrder && (

          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">

            <motion.div
              initial={{
                scale: 0.95,
                opacity: 0
              }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              exit={{
                scale: 0.95,
                opacity: 0
              }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >

              {/* HEADER */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">

                <div>

                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                    {isEditing
                      ? 'Edit Bill'
                      : 'Order Details'}
                    : #
                    {selectedOrder.order_number ||
                      selectedOrder.id}
                  </h3>

                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {selectedOrder.created_at
                      ? new Date(
                          selectedOrder.created_at
                        ).toLocaleString()
                      : ''}
                  </p>

                </div>

                <div className="flex items-center gap-2">

                  {!isEditing && (
                    <button
                      onClick={() => {
                        setReturnAmount(
                          selectedOrder.total_amount ||
                            0
                        );
                        setShowReturnModal(
                          true
                        );
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-[10px] font-black uppercase border border-orange-100"
                    >
                      <Undo2 size={12} />
                      Return Order
                    </button>
                  )}

                  {!isEditing && (
                    <button
                      onClick={() =>
                        setIsEditing(true)
                      }
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase border border-blue-100"
                    >
                      <Edit2 size={12} />
                      Edit Bill
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedOrder(
                        null
                      );
                      setIsEditing(false);
                    }}
                    className="p-2 hover:bg-white rounded-lg border border-slate-200 transition-all"
                  >
                    <X size={18} />
                  </button>

                </div>
              </div>

              {/* BODY */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {isEditing ? (

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">

                      <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                        Customer Info
                      </h4>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">
                          Name
                        </label>

                        <input
                          type="text"
                          value={
                            editFormData.customer_name ??
                            ''
                          }
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              customer_name:
                                e.target.value
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">
                          Mobile
                        </label>

                        <input
                          type="text"
                          value={
                            editFormData.user_mobile ??
                            editFormData.customer_phone ??
                            ''
                          }
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              user_mobile:
                                e.target.value
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">
                          Address
                        </label>

                        <textarea
                          value={
                            editFormData.delivery_address ??
                            editFormData.shipping_address ??
                            ''
                          }
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              delivery_address:
                                e.target.value
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-bold h-20"
                        />
                      </div>

                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">

                      <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                        Billing Info
                      </h4>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">
                          Total Amount
                        </label>

                        <input
                          type="number"
                          value={
                            editFormData.total_amount ??
                            0
                          }
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              total_amount:
                                Number(
                                  e.target.value
                                )
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-bold font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">
                          Payment Method
                        </label>

                        <select
                          value={
                            editFormData.payment_method ??
                            'Cash'
                          }
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              payment_method:
                                e.target.value
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-black uppercase"
                        >
                          <option value="Cash">
                            Cash
                          </option>
                          <option value="UPI">
                            UPI
                          </option>
                          <option value="Online">
                            Online
                          </option>
                          <option value="Credit">
                            Credit
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">
                          Payment Status
                        </label>

                        <select
                          value={
                            editFormData.payment_status ??
                            'pending'
                          }
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              payment_status:
                                e.target.value
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-black uppercase"
                        >
                          <option value="paid">
                            Paid
                          </option>
                          <option value="pending">
                            Pending
                          </option>
                          <option value="unpaid">
                            Unpaid
                          </option>
                        </select>
                      </div>

                    </div>

                  </div>

                ) : (

                  <>
                    {/* CUSTOMER / PAYMENT */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      <div className="space-y-4">

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">

                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <User size={12} />
                            Customer Info
                          </h4>

                          <p className="text-[11px] font-black text-slate-800 uppercase">
                            {selectedOrder.customer_name ||
                              'Walk-in Customer'}
                          </p>

                          <p className="text-[10px] font-bold text-slate-500 mt-1">
                            Mobile:{' '}
                            {selectedOrder.user_mobile ||
                              selectedOrder.customer_phone ||
                              'Not provided'}
                          </p>

                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">

                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <MapPin size={12} />
                            Address
                          </h4>

                          <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">
                            {selectedOrder.delivery_address ||
                              selectedOrder.shipping_address ||
                              'No address provided'}
                          </p>

                        </div>

                      </div>

                      <div className="space-y-4">

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">

                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CreditCard size={12} />
                            Payment Details
                          </h4>

                          <div className="flex justify-between items-center mb-2">

                            <span className="text-[9px] font-black text-slate-400 uppercase">
                              Method:
                            </span>

                            <span className="text-[10px] font-black text-slate-800 uppercase">
                              {selectedOrder.payment_method ||
                                selectedOrder.payment_mode ||
                                'Cash'}
                            </span>

                          </div>

                          <div className="flex justify-between items-center">

                            <span className="text-[9px] font-black text-slate-400 uppercase">
                              Status:
                            </span>

                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {selectedOrder.payment_status ||
                                'pending'}
                            </span>

                          </div>

                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">

                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Truck size={12} />
                            Logistics Status
                          </h4>

                          <select
                            value={
                              selectedOrder.order_status ??
                              'pending'
                            }
                            onChange={(e) =>
                              updateStatus(
                                selectedOrder.id,
                                e.target.value
                              )
                            }
                            className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700"
                          >
                            <option value="pending">
                              Pending
                            </option>

                            <option value="confirmed">
                              Confirmed
                            </option>

                            <option value="packed">
                              Packed
                            </option>

                            <option value="out_for_delivery">
                              Out for Delivery
                            </option>

                            <option value="delivered">
                              Delivered
                            </option>

                            <option value="cancelled">
                              Cancelled
                            </option>

                            <option value="returned">
                              Returned
                            </option>
                          </select>

                        </div>

                      </div>

                    </div>

                    {/* ITEMS */}
                    <div className="border border-slate-100 rounded-xl overflow-hidden">

                      <table className="w-full text-left">

                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">

                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              Product
                            </th>

                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                              Qty
                            </th>

                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                              Rate
                            </th>

                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                              Total
                            </th>

                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-50">

                          {loadingItems ? (

                            <tr>
                              <td
                                colSpan="4"
                                className="px-4 py-8 text-center"
                              >
                                <RefreshCw
                                  className="animate-spin mx-auto text-blue-500"
                                  size={20}
                                />
                              </td>
                            </tr>

                          ) : orderItems.length === 0 ? (

                            <tr>
                              <td
                                colSpan="4"
                                className="px-4 py-8 text-center text-[10px] font-black text-slate-400 uppercase"
                              >
                                No item details found for this order
                              </td>
                            </tr>

                          ) : (

                            orderItems.map(
                              (item) => {

                                const image =
                                  getValidImageUrl(
                                    item
                                  );

                                return (
                                  <tr
                                    key={
                                      item.id
                                    }
                                  >

                                    <td className="px-4 py-3">

                                      <div className="flex items-center gap-3">

                                        {image ? (

                                          <img
                                            src={image}
                                            alt={
                                              item.product_name
                                            }
                                            className="w-10 h-10 rounded-lg object-contain border border-slate-100 bg-white"
                                          />

                                        ) : (

                                          <div className="w-10 h-10 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300">
                                            <Package
                                              size={16}
                                            />
                                          </div>

                                        )}

                                        <div>

                                          <span className="text-[10px] font-bold text-slate-700 uppercase">
                                            {
                                              item.product_name
                                            }
                                          </span>

                                          <span className="block text-[8px] font-bold text-slate-400 mt-1">
                                            ID:{' '}
                                            {
                                              item.product_id
                                            }
                                          </span>

                                        </div>

                                      </div>

                                    </td>

                                    <td className="px-4 py-3 text-center text-[10px] font-black text-slate-800">
                                      {
                                        item.quantity
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-right text-[10px] font-bold text-slate-600">
                                      ₹
                                      {Number(
                                        item.rate ||
                                          0
                                      ).toFixed(2)}
                                    </td>

                                    <td className="px-4 py-3 text-right text-[10px] font-black text-slate-800">
                                      ₹
                                      {Number(
                                        item.total ||
                                          0
                                      ).toFixed(2)}
                                    </td>

                                  </tr>
                                );
                              }
                            )

                          )}

                        </tbody>

                      </table>

                    </div>

                    {/* TOTALS */}
                    <div className="flex justify-end">

                      <div className="w-full md:w-64 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">

                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>
                            Subtotal:
                          </span>

                          <span>
                            ₹
                            {Number(
                              selectedOrder.subtotal ??
                                selectedOrder.total_amount ??
                                0
                            ).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                          <span>
                            Discount:
                          </span>

                          <span>
                            -₹
                            {Number(
                              selectedOrder.discount ||
                                0
                            ).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>
                            Delivery:
                          </span>

                          <span>
                            +₹
                            {Number(
                              selectedOrder.delivery_charge ||
                                0
                            ).toFixed(2)}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-800 uppercase tracking-tighter">

                          <span>
                            Grand Total:
                          </span>

                          <span>
                            ₹
                            {Number(
                              selectedOrder.total_amount ??
                                selectedOrder.total ??
                                0
                            ).toFixed(2)}
                          </span>

                        </div>

                      </div>

                    </div>
                  </>

                )}

              </div>

              {/* FOOTER */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

                {isEditing ? (

                  <>
                    <button
                      onClick={() =>
                        setIsEditing(false)
                      }
                      className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={
                        handleEditSave
                      }
                      className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Save Changes
                    </button>
                  </>

                ) : (

                  <>
                    <button
                      onClick={() =>
                        setSelectedOrder(
                          null
                        )
                      }
                      className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Close
                    </button>

                    <button
                      onClick={() =>
                        printOrderBill(
                          selectedOrder,
                          orderItems
                        )
                      }
                      className="px-6 py-2 bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <Printer size={14} />
                      Print Receipt
                    </button>
                  </>

                )}

              </div>

            </motion.div>

          </div>

        )}

      </AnimatePresence>

      {/* RETURN MODAL */}
      <AnimatePresence>

        {showReturnModal &&
          selectedOrder && (

            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">

              <motion.div
                initial={{
                  scale: 0.95,
                  opacity: 0
                }}
                animate={{
                  scale: 1,
                  opacity: 1
                }}
                exit={{
                  scale: 0.95,
                  opacity: 0
                }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >

                <div className="p-4 bg-orange-50 border-b border-orange-200 flex items-center justify-between">

                  <h3 className="text-sm font-black text-orange-800 uppercase tracking-tighter">
                    Return Order
                  </h3>

                  <button
                    onClick={() =>
                      setShowReturnModal(
                        false
                      )
                    }
                    className="p-2 hover:bg-orange-100 rounded-lg"
                  >
                    <X size={18} />
                  </button>

                </div>

                <form
                  onSubmit={
                    handleReturnOrder
                  }
                  className="p-6 space-y-6"
                >

                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">

                    <div className="flex items-center gap-3 mb-2">

                      <span className="text-[9px] font-black text-slate-500 uppercase">
                        Order #:
                      </span>

                      <span className="text-[11px] font-black text-slate-800">
                        {selectedOrder.order_number ||
                          selectedOrder.id}
                      </span>

                    </div>

                    <div className="flex items-center gap-3">

                      <span className="text-[9px] font-black text-slate-500 uppercase">
                        Total Amount:
                      </span>

                      <span className="text-[13px] font-black text-orange-700">
                        ₹
                        {selectedOrder.total_amount ||
                          0}
                      </span>

                    </div>

                  </div>

                  <div>

                    <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest ml-1">
                      Return Amount
                    </label>

                    <input
                      type="number"
                      value={
                        returnAmount
                      }
                      onChange={(e) =>
                        setReturnAmount(
                          e.target.value
                        )
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />

                  </div>

                  <div>

                    <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest ml-1">
                      Reason for Return
                    </label>

                    <textarea
                      value={
                        returnReason
                      }
                      onChange={(e) =>
                        setReturnReason(
                          e.target.value
                        )
                      }
                      placeholder="Enter reason for return..."
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none h-24 resize-none"
                    />

                  </div>

                  <div className="flex justify-end gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        setShowReturnModal(
                          false
                        )
                      }
                      className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="px-6 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Confirm Return
                    </button>

                  </div>

                </form>

              </motion.div>

            </div>

          )}

      </AnimatePresence>

    </div>
  );
}