import React, { useState, useEffect, useMemo } from 'react';
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

/* =========================================================
   HELPERS
   ========================================================= */

const parseStoredOrderItems = (items) => {
  if (Array.isArray(items)) return items;

  if (typeof items !== 'string') return [];

  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const getValidProductImage = (value) => {
  const image = String(value ?? '').trim();

  if (!image) return '';

  const lower = image.toLowerCase();

  if (
    lower === 'null' ||
    lower === 'undefined' ||
    lower.includes('/products/null')
  ) {
    return '';
  }

  return image;
};

const getProductRate = (product) =>
  Number(
    product?.sale_rate ??
      product?.onlinerate ??
      product?.online_rate ??
      product?.retail_rate ??
      product?.restrate ??
      product?.mrp ??
      0
  );

const normalizeOrderItem = (
  item,
  index = 0,
  product = null,
  orderId = ''
) => {
  const productId = Number(
    item?.product_id ??
      item?.productId ??
      product?.id ??
      0
  );

  const quantity = Number(
    item?.quantity ??
      item?.qty ??
      1
  );

  const unitPrice = Number(
    item?.unit_price ??
      item?.rate ??
      item?.price ??
      getProductRate(product)
  );

  const lineTotal = Number(
    item?.line_total ??
      item?.total ??
      unitPrice * quantity
  );

  const productName =
    item?.name ??
    item?.product_name ??
    product?.name ??
    `Product #${productId || ''}`;

  const imageUrl =
    getValidProductImage(item?.image_url) ||
    getValidProductImage(item?.picture) ||
    getValidProductImage(product?.image_url) ||
    getValidProductImage(product?.picture);

  return {
    ...item,

    id:
      item?.id ??
      `${orderId || 'order'}-${productId || 'item'}-${index}`,

    product_id:
      Number.isFinite(productId)
        ? productId
        : null,

    product_name: String(productName),

    quantity:
      Number.isFinite(quantity) &&
      quantity > 0
        ? quantity
        : 1,

    rate:
      Number.isFinite(unitPrice)
        ? unitPrice
        : 0,

    total:
      Number.isFinite(lineTotal)
        ? lineTotal
        : 0,

    image_url: imageUrl
  };
};

const escapePrintHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/* =========================================================
   FETCH STORED ORDER ITEMS
   PRIMARY SOURCE = public.orders.items
   ========================================================= */

const fetchStoredOrderItems = async (orderId) => {
  /*
   * PRIMARY:
   * Directly read orders.items from Supabase.
   */
  try {
    const { data, error } = await supabase
      .from(DB_SCHEMA.ORDERS.table)
      .select('id,items')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error(
        'Direct orders.items fetch failed:',
        error
      );
    }

    const items = parseStoredOrderItems(
      data?.items
    );

    if (items.length > 0) {
      return items;
    }
  } catch (error) {
    console.error(
      'Direct orders.items fetch exception:',
      error
    );
  }

  /*
   * SECONDARY:
   * dbSync fallback.
   */
  try {
    const syncedRows = await dbSync.fetch(
      DB_SCHEMA.ORDERS.table,
      {
        eq: {
          column: 'id',
          value: orderId
        },
        includeDeleted: true
      }
    );

    const items = parseStoredOrderItems(
      syncedRows?.[0]?.items
    );

    if (items.length > 0) {
      return items;
    }
  } catch (error) {
    console.error(
      'dbSync orders.items fetch failed:',
      error
    );
  }

  /*
   * LAST FALLBACK:
   * legacy order_items table.
   */
  try {
    const lineItems = await dbSync.fetch(
      DB_SCHEMA.ORDER_ITEMS.table,
      {
        eq: {
          column: 'order_id',
          value: orderId
        },
        includeDeleted: true
      }
    );

    if (
      Array.isArray(lineItems) &&
      lineItems.length > 0
    ) {
      return lineItems;
    }
  } catch (error) {
    console.error(
      'order_items fallback failed:',
      error
    );
  }

  return [];
};

/* =========================================================
   MAIN
   ========================================================= */

export default function OrdersView({
  orders,
  filter,
  fetchInitialData,
  appConfig
}) {
  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [orderItems, setOrderItems] =
    useState([]);

  const [orderItemSummaries, setOrderItemSummaries] =
    useState({});

  const [loadingItems, setLoadingItems] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState('');

  const [dateFilter, setDateFilter] =
    useState('Today');

  const [paymentFilter, setPaymentFilter] =
    useState('All');

  const [isEditing, setIsEditing] =
    useState(false);

  const [editFormData, setEditFormData] =
    useState({});

  const [showReturnModal, setShowReturnModal] =
    useState(false);

  const [returnReason, setReturnReason] =
    useState('');

  const [returnAmount, setReturnAmount] =
    useState('');

  /* =========================================================
     ORDER FIELD HELPERS
     ========================================================= */

  const getOrderStatus = (order) =>
    String(
      order?.order_status ??
        order?.status ??
        'pending'
    ).toLowerCase();

  const getPaymentMethod = (order) =>
    order?.payment_method ??
    order?.payment_mode ??
    'Cash';

  const getOrderTotal = (order) =>
    Number(
      order?.total_amount ??
        order?.total ??
        0
    );

  const getOrderAddress = (order) =>
    order?.delivery_address ??
    order?.shipping_address ??
    '';

  /* =========================================================
     FILTER
     ========================================================= */

  const filteredOrders = useMemo(() => {
    let result = Array.isArray(orders)
      ? orders
      : [];

    if (filter) {
      result = result.filter(
        (order) =>
          getOrderStatus(order) ===
          String(filter).toLowerCase()
      );
    }

    if (paymentFilter !== 'All') {
      result = result.filter((order) => {
        const method = String(
          getPaymentMethod(order)
        ).toLowerCase();

        if (
          paymentFilter ===
          'Self-Checkout'
        ) {
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
          ).toDateString() ===
          now.toDateString()
        );
      });
    }

    if (dateFilter === '1 Month') {
      const date = new Date();

      date.setMonth(
        date.getMonth() - 1
      );

      result = result.filter(
        (order) =>
          new Date(order.created_at) >=
          date
      );
    }

    if (dateFilter === '2 Months') {
      const date = new Date();

      date.setMonth(
        date.getMonth() - 2
      );

      result = result.filter(
        (order) =>
          new Date(order.created_at) >=
          date
      );
    }

    if (dateFilter === '4 Months') {
      const date = new Date();

      date.setMonth(
        date.getMonth() - 4
      );

      result = result.filter(
        (order) =>
          new Date(order.created_at) >=
          date
      );
    }

    if (dateFilter === 'Full Year') {
      result = result.filter(
        (order) =>
          new Date(
            order.created_at
          ).getFullYear() ===
          now.getFullYear()
      );
    }

    const search =
      searchTerm.trim().toLowerCase();

    if (search) {
      result = result.filter((order) => {
        const bill = String(
          order?.order_number ??
            order?.order_no ??
            order?.order_id_str ??
            ''
        ).toLowerCase();

        const mobile = String(
          order?.user_mobile ??
            order?.customer_phone ??
            ''
        ).toLowerCase();

        return (
          bill.includes(search) ||
          mobile.includes(search)
        );
      });
    }

    return result;
  }, [
    orders,
    filter,
    dateFilter,
    paymentFilter,
    searchTerm
  ]);

  /* =========================================================
     TOTAL
     ========================================================= */

  const totalFilteredSales =
    useMemo(() => {
      return filteredOrders.reduce(
        (sum, order) =>
          sum + getOrderTotal(order),
        0
      );
    }, [filteredOrders]);

  /* =========================================================
     SELECTED ORDER
     ========================================================= */

  useEffect(() => {
    if (!selectedOrder) {
      setOrderItems([]);
      return;
    }

    fetchOrderItems(
      selectedOrder.id,
      selectedOrder
    );

    setEditFormData({
      ...selectedOrder,
      delivery_address:
        getOrderAddress(selectedOrder)
    });
  }, [selectedOrder]);

  /* =========================================================
     ORDER ITEM SUMMARY
     
     IMPORTANT:
     Directly fetch orders.items for all visible orders.
     This fixes "ITEM DETAILS UNAVAILABLE".
     ========================================================= */

  useEffect(() => {
    let active = true;

    const loadSummaries = async () => {
      const safeOrders =
        Array.isArray(orders)
          ? orders
          : [];

      if (safeOrders.length === 0) {
        setOrderItemSummaries({});
        return;
      }

      const orderIds = safeOrders
        .map((order) => order?.id)
        .filter(
          (id) =>
            id !== null &&
            id !== undefined
        );

      let storedOrders = [];

      /*
       * Fetch all orders.items directly.
       */
      try {
        const { data, error } =
          await supabase
            .from(DB_SCHEMA.ORDERS.table)
            .select('id,items')
            .in('id', orderIds);

        if (error) {
          console.error(
            'Bulk orders.items fetch failed:',
            error
          );
        } else {
          storedOrders =
            Array.isArray(data)
              ? data
              : [];
        }
      } catch (error) {
        console.error(
          'Bulk order items error:',
          error
        );
      }

      /*
       * Make:
       * order id -> items
       */
      const storedItemsByOrderId =
        new Map(
          storedOrders.map(
            (order) => [
              String(order.id),
              parseStoredOrderItems(
                order.items
              )
            ]
          )
        );

      const summaryEntries =
        await Promise.all(
          safeOrders.map(
            async (order) => {
              /*
               * First use items already
               * present in the orders prop.
               */
              let items =
                parseStoredOrderItems(
                  order?.items
                );

              /*
               * Then use directly fetched
               * orders.items.
               */
              if (items.length === 0) {
                items =
                  storedItemsByOrderId.get(
                    String(order.id)
                  ) || [];
              }

              /*
               * Last fallback.
               */
              if (items.length === 0) {
                items =
                  await fetchStoredOrderItems(
                    order.id
                  );
              }

              const normalized =
                items.map(
                  (item, index) =>
                    normalizeOrderItem(
                      item,
                      index,
                      null,
                      order.id
                    )
                );

              const summary =
                normalized
                  .filter(
                    (item) =>
                      item.product_name
                  )
                  .map((item) =>
                    item.quantity > 1
                      ? `${item.product_name} x${item.quantity}`
                      : item.product_name
                  )
                  .join(', ');

              return {
                orderId: order.id,
                summary
              };
            }
          )
        );

      if (!active) return;

      const summaries =
        Object.fromEntries(
          summaryEntries.map(
            ({
              orderId,
              summary
            }) => [
              orderId,
              summary
            ]
          )
        );

      setOrderItemSummaries(
        summaries
      );
    };

    loadSummaries().catch(
      (error) => {
        console.error(
          'Order item summary error:',
          error
        );

        if (active) {
          setOrderItemSummaries({});
        }
      }
    );

    return () => {
      active = false;
    };
  }, [orders]);

  /* =========================================================
     FETCH ORDER ITEMS
     ========================================================= */

  const fetchOrderItems = async (
    orderId,
    orderOverride = null
  ) => {
    setLoadingItems(true);

    try {
      const order =
        orderOverride ||
        selectedOrder;

      /*
       * PRIMARY SOURCE:
       * orders.items
       */
      let sourceItems =
        parseStoredOrderItems(
          order?.items
        );

      /*
       * If items are not present
       * in selectedOrder, fetch directly.
       */
      if (sourceItems.length === 0) {
        sourceItems =
          await fetchStoredOrderItems(
            orderId
          );
      }

      /*
       * Product IDs for optional
       * product-master lookup.
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
        } catch (error) {
          console.error(
            'Product lookup failed:',
            error
          );
        }
      }

      const productsById =
        new Map(
          (products || []).map(
            (product) => [
              Number(product.id),
              product
            ]
          )
        );

      const normalized =
        sourceItems.map(
          (item, index) => {
            const productId =
              Number(
                item?.product_id ??
                  item?.productId
              );

            const product =
              productsById.get(
                productId
              ) || null;

            return normalizeOrderItem(
              item,
              index,
              product,
              orderId
            );
          }
        );

      setOrderItems(
        normalized
      );
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

  /* =========================================================
     PRINT
     ========================================================= */

  const printOrderBill = async (
    order,
    items = null
  ) => {
    let printableItems =
      Array.isArray(items)
        ? items
        : [];

    /*
     * Prefer orders.items.
     */
    if (printableItems.length === 0) {
      printableItems =
        parseStoredOrderItems(
          order?.items
        );
    }

    /*
     * Direct fallback.
     */
    if (printableItems.length === 0) {
      printableItems =
        await fetchStoredOrderItems(
          order.id
        );
    }

    const rows =
      printableItems
        .map((rawItem, index) => {
          const item =
            normalizeOrderItem(
              rawItem,
              index,
              null,
              order.id
            );

          const image =
            getValidProductImage(
              item.image_url
            );

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
                <span>
                  ${escapePrintHtml(
                    item.product_name
                  )}
                </span>
              </td>

              <td>
                ${item.quantity}
              </td>

              <td>
                ₹${Number(
                  item.rate
                ).toFixed(2)}
              </td>

              <td>
                ₹${Number(
                  item.total
                ).toFixed(2)}
              </td>
            </tr>
          `;
        })
        .join('');

    const printWindow =
      window.open(
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

    const billNumber =
      order?.order_number ??
      order?.order_no ??
      order?.order_id_str ??
      order?.id;

    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>
          Bill ${escapePrintHtml(
            billNumber
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
            margin: 7px 0;
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

        <h2>
          Customer Bill
        </h2>

        <div class="meta">

          <p>
            <span>Bill No</span>
            <strong>
              #${escapePrintHtml(
                billNumber
              )}
            </strong>
          </p>

          <p>
            <span>Customer</span>
            <strong>
              ${escapePrintHtml(
                order.customer_name ||
                  'Walk-in'
              )}
            </strong>
          </p>

          <p>
            <span>Mobile</span>
            <strong>
              ${escapePrintHtml(
                order.user_mobile ||
                  order.customer_phone ||
                  '-'
              )}
            </strong>
          </p>

          <p>
            <span>Date</span>
            <strong>
              ${escapePrintHtml(
                order.created_at
                  ? new Date(
                      order.created_at
                    ).toLocaleString()
                  : '-'
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
          <span>
            Grand Total
          </span>

          <span>
            ₹${getOrderTotal(
              order
            ).toFixed(2)}
          </span>
        </div>

        <p
          style="
            text-align:center;
            margin-top:28px
          "
        >
          Thank you. Visit again.
        </p>

      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
    };

    setTimeout(() => {
      try {
        printWindow.print();
      } catch (_) {}
    }, 250);
  };

  /* =========================================================
     STATUS
     ========================================================= */

  const updateStatus = async (
    id,
    status
  ) => {
    try {
      await handleERPAction(
        DB_SCHEMA.ORDERS.table,
        ACTION_TYPES.UPDATE,
        {
          id,
          order_status: status
        }
      );

      setSelectedOrder(
        (previous) =>
          previous
            ? {
                ...previous,
                order_status: status
              }
            : previous
      );

      fetchInitialData();

      alert(
        'Status Updated'
      );
    } catch (error) {
      console.error(
        'Status update failed:',
        error
      );

      alert(
        'Update Error: ' +
          (error?.message || '')
      );
    }
  };

  /* =========================================================
     EDIT
     ========================================================= */

  const handleEditSave = async () => {
    try {
      const deliveryAddress =
        editFormData.delivery_address ??
        editFormData.shipping_address ??
        '';

      const res =
        await handleERPAction(
          DB_SCHEMA.ORDERS.table,
          ACTION_TYPES.UPDATE,
          {
            id: selectedOrder.id,

            total_amount:
              editFormData.total_amount,

            payment_method:
              editFormData.payment_method ??
              editFormData.payment_mode,

            payment_status:
              editFormData.payment_status,

            customer_name:
              editFormData.customer_name,

            user_mobile:
              editFormData.user_mobile ??
              editFormData.customer_phone,

            delivery_address:
              deliveryAddress
          }
        );

      if (!res?.success) {
        throw new Error(
          res?.error ||
            'Update failed'
        );
      }

      const updatedOrder = {
        ...selectedOrder,
        ...editFormData,
        delivery_address:
          deliveryAddress
      };

      setSelectedOrder(
        updatedOrder
      );

      setIsEditing(false);

      fetchInitialData(
        true,
        true
      );

      alert(
        'Bill updated successfully!'
      );
    } catch (error) {
      console.error(
        'Edit order failed:',
        error
      );

      alert(
        'Update failed: ' +
          (error?.message ||
            'Unknown error')
      );
    }
  };

  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">

      {/* STATS */}

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

      {/* FILTERS */}

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
          ].map((f) => (
            <button
              key={f}
              onClick={() =>
                setDateFilter(f)
              }
              className={cn(
                'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all border',
                dateFilter === f
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {f}
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
          ].map((method) => (
            <button
              key={method}
              onClick={() =>
                setPaymentFilter(
                  method
                )
              }
              className={cn(
                'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border',
                paymentFilter ===
                  method
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200'
              )}
            >
              {method}
            </button>
          ))}

        </div>

      </div>

      {/* ORDERS TABLE */}

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
                  (order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >

                      <td className="px-4 py-2.5 font-black text-blue-700 text-[10px]">
                        #
                        {order.order_number ||
                          order.order_no ||
                          order.order_id_str ||
                          order.id}
                      </td>

                      <td className="px-4 py-2.5">

                        <p className="text-[10px] font-bold text-slate-800 leading-none">
                          {order.user_mobile ||
                            order.customer_phone ||
                            'No mobile'}
                        </p>

                        <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                          {order.customer_name ||
                            order.user_mobile ||
                            order.customer_phone ||
                            'Walk-in'}
                        </p>

                      </td>

                      <td className="px-4 py-2.5 max-w-[280px]">

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
                          ] ||
                            'Loading item details...'}
                        </p>

                      </td>

                      <td className="px-4 py-2.5 text-[10px] font-black text-slate-800">
                        ₹
                        {getOrderTotal(
                          order
                        ).toFixed(2)}
                      </td>

                      <td className="px-4 py-2.5">

                        <span
                          className={cn(
                            'text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border',

                            String(
                              getPaymentMethod(
                                order
                              )
                            ).toLowerCase() ===
                              'cash'
                              ? 'bg-orange-50 text-orange-600 border-orange-100'
                              : 'bg-blue-50 text-blue-600 border-blue-100'
                          )}
                        >
                          {getPaymentMethod(
                            order
                          )}
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
                          title="View"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() =>
                            printOrderBill(
                              order,
                              parseStoredOrderItems(
                                order.items
                              )
                            )
                          }
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all"
                          title="Print"
                        >
                          <Printer size={14} />
                        </button>

                        <button
                          onClick={async () => {
                            if (
                              window.confirm(
                                'ARE YOU SURE? This will permanently delete this Bill History!'
                              )
                            ) {
                              try {
                                await handleERPAction(
                                  DB_SCHEMA.ORDERS.table,
                                  ACTION_TYPES.DELETE,
                                  {
                                    id: order.id
                                  }
                                );

                                fetchInitialData();
                              } catch (error) {
                                alert(
                                  'Delete failed: ' +
                                    (error?.message ||
                                      '')
                                );
                              }
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                          title="Delete"
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

      {/* =====================================================
          ORDER DETAIL MODAL
          ===================================================== */}

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
                      selectedOrder.order_no ||
                      selectedOrder.id}

                  </h3>

                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {selectedOrder.created_at
                      ? new Date(
                          selectedOrder.created_at
                        ).toLocaleString()
                      : '-'}
                  </p>

                </div>

                <div className="flex items-center gap-2">

                  {!isEditing &&
                    getOrderStatus(
                      selectedOrder
                    ) !== 'returned' && (
                      <button
                        onClick={() => {
                          setReturnAmount(
                            getOrderTotal(
                              selectedOrder
                            )
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

                    {/* CUSTOMER EDIT */}

                    <div className="space-y-4">

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">

                        <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3">
                          Customer Info
                        </h4>

                        <div className="space-y-3">

                          <div>

                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">
                              Name
                            </label>

                            <input
                              type="text"
                              value={
                                editFormData.customer_name ||
                                ''
                              }
                              onChange={(e) =>
                                setEditFormData(
                                  {
                                    ...editFormData,
                                    customer_name:
                                      e.target.value
                                  }
                                )
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
                                setEditFormData(
                                  {
                                    ...editFormData,
                                    user_mobile:
                                      e.target.value
                                  }
                                )
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
                                setEditFormData(
                                  {
                                    ...editFormData,
                                    delivery_address:
                                      e.target.value
                                  }
                                )
                              }
                              className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-bold h-20"
                            />

                          </div>

                        </div>

                      </div>

                    </div>

                    {/* BILLING EDIT */}

                    <div className="space-y-4">

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">

                        <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3">
                          Billing Info
                        </h4>

                        <div className="space-y-3">

                          <div>

                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">
                              Total Amount
                            </label>

                            <input
                              type="number"
                              value={
                                editFormData.total_amount ??
                                editFormData.total ??
                                0
                              }
                              onChange={(e) =>
                                setEditFormData(
                                  {
                                    ...editFormData,
                                    total_amount:
                                      Number(
                                        e.target.value
                                      )
                                  }
                                )
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
                                editFormData.payment_mode ??
                                'Cash'
                              }
                              onChange={(e) =>
                                setEditFormData(
                                  {
                                    ...editFormData,
                                    payment_method:
                                      e.target.value
                                  }
                                )
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
                                editFormData.payment_status ||
                                'pending'
                              }
                              onChange={(e) =>
                                setEditFormData(
                                  {
                                    ...editFormData,
                                    payment_status:
                                      e.target.value
                                  }
                                )
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

                    </div>

                  </div>

                ) : (

                  <>

                    {/* CUSTOMER / ADDRESS / PAYMENT */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      <div className="space-y-4">

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">

                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <User size={12} />
                            Customer Info
                          </h4>

                          <p className="text-[11px] font-black text-slate-800 uppercase">
                            {selectedOrder.customer_name ||
                              selectedOrder.user_mobile ||
                              selectedOrder.customer_phone ||
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
                            {getOrderAddress(
                              selectedOrder
                            ) ||
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
                              {getPaymentMethod(
                                selectedOrder
                              )}
                            </span>

                          </div>

                          <div className="flex justify-between items-center">

                            <span className="text-[9px] font-black text-slate-400 uppercase">
                              Status:
                            </span>

                            <span
                              className={cn(
                                'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',

                                String(
                                  selectedOrder.payment_status ||
                                    'pending'
                                ).toLowerCase() ===
                                  'paid'
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-orange-100 text-orange-600'
                              )}
                            >
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
                            value={getOrderStatus(
                              selectedOrder
                            )}
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

                    {/* PRODUCTS */}

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
                              (item) => (
                                <tr
                                  key={
                                    item.id
                                  }
                                >

                                  <td className="px-4 py-3">

                                    <div className="flex items-center gap-3">

                                      {getValidProductImage(
                                        item.image_url
                                      ) ? (

                                        <img
                                          src={getValidProductImage(
                                            item.image_url
                                          )}
                                          alt={
                                            item.product_name
                                          }
                                          className="w-10 h-10 rounded-lg object-contain border border-slate-100 bg-white"
                                          onError={(
                                            e
                                          ) => {
                                            e.currentTarget.style.display =
                                              'none';
                                          }}
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
                                          {item.product_id ||
                                            '-'}
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
                                    ).toFixed(
                                      2
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-right text-[10px] font-black text-slate-800">
                                    ₹
                                    {Number(
                                      item.total ||
                                        0
                                    ).toFixed(
                                      2
                                    )}
                                  </td>

                                </tr>
                              )
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
                                getOrderTotal(
                                  selectedOrder
                                )
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
                            {getOrderTotal(
                              selectedOrder
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

                    <button
                      onClick={() =>
                        printOrderBill(
                          selectedOrder,
                          orderItems
                        )
                      }
                      className="px-6 py-2 bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <Printer size={14} />
                      Print GST Invoice
                    </button>

                  </>

                )}

              </div>

            </motion.div>

          </div>
        )}

      </AnimatePresence>

      {/* =====================================================
          RETURN MODAL
          ===================================================== */}

      <AnimatePresence>

        {showReturnModal &&
          selectedOrder && (

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >

                <div className="p-4 bg-orange-50 border-b border-orange-200 flex items-center justify-between">

                  <h3 className="text-sm font-black text-orange-800 uppercase">
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
                  onSubmit={async (e) => {
                    e.preventDefault();

                    try {
                      await handleERPAction(
                        DB_SCHEMA.ORDERS.table,
                        ACTION_TYPES.UPDATE,
                        {
                          id: selectedOrder.id,
                          order_status:
                            'returned',
                          return_reason:
                            returnReason,
                          return_amount:
                            returnAmount
                        }
                      );

                      await Promise.all(
                        orderItems.map(
                          async (item) => {
                            try {
                              await handleERPAction(
                                null,
                                ACTION_TYPES.ADJUST_STOCK,
                                {
                                  product_id:
                                    item.product_id,

                                  change_qty:
                                    Number(
                                      item.quantity ||
                                        0
                                    ),

                                  change_type:
                                    'return',

                                  narration:
                                    `Return from Order #${selectedOrder.order_number}`,

                                  reference_number:
                                    selectedOrder.order_number
                                }
                              );
                            } catch (error) {
                              console.error(
                                'Return stock adjustment failed:',
                                error
                              );
                            }
                          }
                        )
                      );

                      fetchInitialData();

                      setShowReturnModal(
                        false
                      );

                      setReturnReason(
                        ''
                      );

                      setReturnAmount(
                        ''
                      );

                      setSelectedOrder(
                        (previous) =>
                          previous
                            ? {
                                ...previous,
                                order_status:
                                  'returned'
                              }
                            : previous
                      );

                      alert(
                        'Order Returned Successfully!'
                      );
                    } catch (error) {
                      alert(
                        'Return Failed: ' +
                          (error?.message ||
                            '')
                      );
                    }
                  }}
                  className="p-6 space-y-6"
                >

                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">

                    <div className="flex items-center gap-3 mb-2">

                      <span className="text-[9px] font-black text-slate-500 uppercase">
                        Order #:
                      </span>

                      <span className="text-[11px] font-black text-slate-800">
                        {selectedOrder.order_number ||
                          selectedOrder.order_no ||
                          selectedOrder.id}
                      </span>

                    </div>

                    <div className="flex items-center gap-3">

                      <span className="text-[9px] font-black text-slate-500 uppercase">
                        Total Amount:
                      </span>

                      <span className="text-[13px] font-black text-orange-700">
                        ₹
                        {getOrderTotal(
                          selectedOrder
                        ).toFixed(2)}
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none mt-1"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none h-24 resize-none mt-1"
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