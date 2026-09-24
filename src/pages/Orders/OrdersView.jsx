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

const getOrderAddress = (order) =>
  order?.delivery_address ||
  order?.shipping_address ||
  order?.landmark ||
  '';

const getValidImageUrl = (item, product = null) => {
  const raw =
    item?.image_url ??
    item?.picture ??
    product?.image_url ??
    product?.picture ??
    '';

  const image = String(raw || '').trim();

  if (!image) return '';

  if (
    image.includes('/products/null') ||
    image.endsWith('/products/') ||
    image === 'null' ||
    image === 'undefined'
  ) {
    return '';
  }

  return image;
};

const getItemName = (item, product = null) =>
  item?.product_name ??
  item?.name ??
  product?.name ??
  product?.item_name ??
  (item?.product_id
    ? `Product #${item.product_id}`
    : 'Unknown Product');

const escapePrintHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/*
 * IMPORTANT:
 * orders.items is the primary source because the current orders
 * schema contains an items JSONB column with the complete snapshot.
 *
 * order_items remains only as a fallback for older orders.
 */
const fetchStoredOrderItems = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from(DB_SCHEMA.ORDERS.table)
      .select('id,items')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('orders.items fetch failed:', error);
    }

    const items = parseStoredOrderItems(data?.items);

    if (items.length > 0) {
      return items;
    }
  } catch (error) {
    console.error('orders.items fetch failed:', error);
  }

  try {
    const syncedRows = await dbSync.fetch(DB_SCHEMA.ORDERS.table, {
      eq: {
        column: 'id',
        value: orderId
      },
      select: 'id,items',
      includeDeleted: true,
      rawTable: true
    });

    const syncedItems = parseStoredOrderItems(
      syncedRows?.[0]?.items
    );

    if (syncedItems.length > 0) {
      return syncedItems;
    }
  } catch (error) {
    console.error('Synced orders.items fallback failed:', error);
  }

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
    console.error('order_items fallback failed:', error);
  }

  try {
    const { data, error } = await supabase
      .from(DB_SCHEMA.ORDER_ITEMS.table)
      .select('*')
      .eq('order_id', orderId)
      .order('id', {
        ascending: true
      });

    if (error) {
      console.error(
        'Direct order line-item fallback failed:',
        error
      );

      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(
      'Direct order line-item fallback failed:',
      error
    );

    return [];
  }
};

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

  const safeOrders = Array.isArray(orders)
    ? orders
    : [];

  /*
   * ---------------------------------------------------------
   * FILTERED ORDERS
   * ---------------------------------------------------------
   */
  const filteredOrders = useMemo(() => {
    let result = [...safeOrders];

    if (filter) {
      result = result.filter(
        (o) =>
          String(o?.order_status || '')
            .toLowerCase() ===
          String(filter).toLowerCase()
      );
    }

    if (paymentFilter !== 'All') {
      result = result.filter((o) => {
        const method = String(
          o?.payment_method ||
            o?.payment_mode ||
            'Cash'
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
      result = result.filter((o) => {
        if (!o?.created_at) return false;

        return (
          new Date(
            o.created_at
          ).toDateString() ===
          now.toDateString()
        );
      });
    } else if (dateFilter === '1 Month') {
      const oneMonthAgo = new Date();

      oneMonthAgo.setMonth(
        now.getMonth() - 1
      );

      result = result.filter(
        (o) =>
          new Date(o.created_at) >=
          oneMonthAgo
      );
    } else if (dateFilter === '2 Months') {
      const twoMonthsAgo = new Date();

      twoMonthsAgo.setMonth(
        now.getMonth() - 2
      );

      result = result.filter(
        (o) =>
          new Date(o.created_at) >=
          twoMonthsAgo
      );
    } else if (dateFilter === '4 Months') {
      const fourMonthsAgo = new Date();

      fourMonthsAgo.setMonth(
        now.getMonth() - 4
      );

      result = result.filter(
        (o) =>
          new Date(o.created_at) >=
          fourMonthsAgo
      );
    } else if (dateFilter === 'Full Year') {
      result = result.filter(
        (o) =>
          new Date(
            o.created_at
          ).getFullYear() ===
          now.getFullYear()
      );
    }

    if (searchTerm.trim()) {
      const search = searchTerm
        .trim()
        .toLowerCase();

      result = result.filter((o) => {
        const orderNumber = String(
          o?.order_number ||
            o?.order_no ||
            o?.id ||
            ''
        ).toLowerCase();

        const mobile = String(
          o?.user_mobile ||
            o?.customer_phone ||
            ''
        ).toLowerCase();

        return (
          orderNumber.includes(search) ||
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

  const totalFilteredSales = useMemo(() => {
    return filteredOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order?.total_amount ??
            order?.total ??
            0
        ),
      0
    );
  }, [filteredOrders]);

  /*
   * ---------------------------------------------------------
   * SELECTED ORDER
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (!selectedOrder) return;

    fetchOrderItems(selectedOrder.id);

    setEditFormData({
      ...selectedOrder,
      address: getOrderAddress(selectedOrder)
    });
  }, [selectedOrder]);

  /*
   * ---------------------------------------------------------
   * ORDER ITEM SUMMARIES
   *
   * Main source:
   * order.items
   *
   * Fallback:
   * fetchStoredOrderItems()
   * ---------------------------------------------------------
   */
  useEffect(() => {
    let active = true;

    const loadOrderItemSummaries =
      async () => {
        const result = {};

        for (const order of safeOrders) {
          if (!order?.id) continue;

          let items =
            parseStoredOrderItems(
              order?.items
            );

          if (items.length === 0) {
            items =
              await fetchStoredOrderItems(
                order.id
              ).catch(() => []);
          }

          const summary = items
            .map((item) => {
              const name =
                item?.product_name ??
                item?.name ??
                '';

              const quantity = Number(
                item?.quantity ??
                  item?.qty ??
                  1
              );

              if (!name) return '';

              return quantity > 1
                ? `${name} x${quantity}`
                : name;
            })
            .filter(Boolean)
            .join(', ');

          result[order.id] = summary;
        }

        if (active) {
          setOrderItemSummaries(result);
        }
      };

    loadOrderItemSummaries().catch(
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
  }, [safeOrders]);

  /*
   * ---------------------------------------------------------
   * FETCH ORDER ITEMS FOR DETAIL MODAL
   * ---------------------------------------------------------
   */
  const fetchOrderItems = async (
    orderId
  ) => {
    setLoadingItems(true);

    try {
      let sourceItems = [];

      /*
       * First priority:
       * selectedOrder.items
       */
      const inlineItems =
        parseStoredOrderItems(
          selectedOrder?.items
        );

      if (inlineItems.length > 0) {
        sourceItems = inlineItems;
      }

      /*
       * Second priority:
       * direct orders.items
       */
      if (sourceItems.length === 0) {
        sourceItems =
          await fetchStoredOrderItems(
            orderId
          );
      }

      /*
       * Product master lookup only for additional
       * image/name/rate fallback.
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

      const products =
        productIds.length > 0
          ? await dbSync.fetch(
              DB_SCHEMA.PRODUCTS.table,
              {
                in: {
                  column: 'id',
                  values: productIds
                },
                includeDeleted: true
              }
            )
          : [];

      const productsById =
        new Map(
          (products || []).map(
            (product) => [
              Number(product.id),
              product
            ]
          )
        );

      const normalizedItems =
        sourceItems.map(
          (item, index) => {
            const productId = Number(
              item?.product_id ??
                item?.productId
            );

            const product =
              productsById.get(
                productId
              );

            const quantity = Number(
              item?.quantity ??
                item?.qty ??
                1
            );

            const rate = Number(
              item?.rate ??
                item?.unit_price ??
                item?.price ??
                getProductRate(product)
            );

            const total = Number(
              item?.total ??
                item?.line_total ??
                rate * quantity
            );

            return {
              ...item,

              id:
                item?.id ??
                `${orderId}-${productId || index}`,

              product_id:
                productId,

              product_name:
                getItemName(
                  item,
                  product
                ),

              quantity,

              rate,

              total,

              image_url:
                getValidImageUrl(
                  item,
                  product
                )
            };
          }
        );

      setOrderItems(
        normalizedItems
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

  /*
   * ---------------------------------------------------------
   * PRINT BILL
   * ---------------------------------------------------------
   */
  const printOrderBill = async (
    order,
    items = null
  ) => {
    let printableItems = items;

    if (
      !Array.isArray(
        printableItems
      ) ||
      printableItems.length === 0
    ) {
      printableItems =
        parseStoredOrderItems(
          order?.items ??
            order?.order_items
        );
    }

    if (
      !Array.isArray(
        printableItems
      ) ||
      printableItems.length === 0
    ) {
      printableItems =
        await fetchStoredOrderItems(
          order.id
        );
    }

    printableItems =
      Array.isArray(
        printableItems
      )
        ? printableItems
        : [];

    const rows =
      printableItems
        .map((item) => {
          const name =
            item?.product_name ||
            item?.name ||
            `Product #${
              item?.product_id || ''
            }`;

          const quantity = Number(
            item?.quantity ??
              item?.qty ??
              1
          );

          const rate = Number(
            item?.rate ??
              item?.unit_price ??
              item?.price ??
              0
          );

          const total = Number(
            item?.total ??
              item?.line_total ??
              rate * quantity
          );

          const rawImage =
            String(
              item?.image_url ||
                item?.picture ||
                ''
            );

          const image =
            rawImage.includes(
              '/products/null'
            )
              ? ''
              : rawImage;

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
              <td>₹${rate.toFixed(
                2
              )}</td>
              <td>₹${total.toFixed(
                2
              )}</td>
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

    const totalAmount = Number(
      order?.total_amount ??
        order?.total ??
        0
    );

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>
            Bill ${escapePrintHtml(
              order?.order_number ||
                order?.order_no ||
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
              gap: 20px;
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
                  order?.order_number ||
                    order?.order_no ||
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
                  order?.created_at
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
              ₹${totalAmount.toFixed(2)}
            </span>
          </div>

          <p
            style="
              text-align:center;
              margin-top:28px;
            "
          >
            Thank you. Visit again.
          </p>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () =>
      printWindow.print();

    setTimeout(
      () => printWindow.print(),
      250
    );
  };

  /*
   * ---------------------------------------------------------
   * UPDATE STATUS
   * ---------------------------------------------------------
   */
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

      await fetchInitialData();

      if (selectedOrder?.id === id) {
        setSelectedOrder(
          (current) =>
            current
              ? {
                  ...current,
                  order_status: status
                }
              : current
        );
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
   * ---------------------------------------------------------
   * EDIT / SAVE BILL
   *
   * IMPORTANT:
   * public.orders does NOT have "address".
   * Use delivery_address.
   * ---------------------------------------------------------
   */
  const handleEditSave = async () => {
    try {
      const address =
        editFormData?.address ??
        editFormData?.delivery_address ??
        editFormData?.shipping_address ??
        '';

      const payload = {
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
          address
      };

      const res =
        await handleERPAction(
          DB_SCHEMA.ORDERS.table,
          ACTION_TYPES.UPDATE,
          payload
        );

      if (res?.success) {
        const updatedOrder = {
          ...selectedOrder,
          ...editFormData,
          delivery_address: address,
          address
        };

        alert(
          'Bill updated successfully!'
        );

        setIsEditing(false);
        setSelectedOrder(
          updatedOrder
        );

        await fetchInitialData(
          true,
          true
        );
      } else {
        throw new Error(
          res?.error ||
            'Unable to update bill'
        );
      }
    } catch (error) {
      console.error(
        'Edit order error:',
        error
      );

      alert(
        'Update failed: ' +
          (error?.message ||
            'Unknown error')
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * RETURN ORDER
   *
   * orders table does not have return_reason /
   * return_amount columns.
   *
   * Therefore return details are stored in notes,
   * while order_status becomes "returned".
   * ---------------------------------------------------------
   */
  const handleReturnOrder =
    async (e) => {
      e.preventDefault();

      try {
        const existingNotes =
          String(
            selectedOrder?.notes ||
              ''
          ).trim();

        const returnNote =
          `Returned Order. Reason: ${
            returnReason ||
            'Not specified'
          }. Return Amount: ₹${
            returnAmount ||
            selectedOrder?.total_amount ||
            0
          }`;

        const newNotes =
          existingNotes
            ? `${existingNotes}\n${returnNote}`
            : returnNote;

        await handleERPAction(
          DB_SCHEMA.ORDERS.table,
          ACTION_TYPES.UPDATE,
          {
            id: selectedOrder.id,
            order_status: 'returned',
            notes: newNotes
          }
        );

        /*
         * Put returned quantity back into stock.
         */
        await Promise.all(
          orderItems.map(
            async (item) => {
              try {
                if (
                  !Number.isFinite(
                    Number(
                      item?.product_id
                    )
                  )
                ) {
                  return;
                }

                const quantity =
                  Number(
                    item?.quantity || 0
                  );

                if (quantity <= 0) {
                  return;
                }

                await handleERPAction(
                  null,
                  ACTION_TYPES.ADJUST_STOCK,
                  {
                    product_id:
                      Number(
                        item.product_id
                      ),

                    change_qty:
                      quantity,

                    change_type:
                      'return',

                    narration:
                      `Return from Order #${
                        selectedOrder?.order_number ||
                        selectedOrder?.id
                      }`,

                    reference_number:
                      selectedOrder?.order_number ||
                      String(
                        selectedOrder?.id
                      )
                  }
                );
              } catch (adjErr) {
                console.error(
                  'Stock adjustment for return failed:',
                  adjErr
                );
              }
            }
          )
        );

        await fetchInitialData();

        setShowReturnModal(false);
        setReturnReason('');
        setReturnAmount('');

        setSelectedOrder(
          (current) =>
            current
              ? {
                  ...current,
                  order_status:
                    'returned',
                  notes: newNotes
                }
              : current
        );

        alert(
          'Order Returned Successfully!'
        );
      } catch (error) {
        console.error(
          'Return order error:',
          error
        );

        alert(
          'Return Failed: ' +
            (error?.message ||
              'Unknown error')
        );
      }
    };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">

      {/* =====================================================
          STATS SUMMARY
      ====================================================== */}
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

      {/* =====================================================
          SEARCH & FILTERS
      ====================================================== */}
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
          ].map((m) => (
            <button
              key={m}
              onClick={() =>
                setPaymentFilter(m)
              }
              className={cn(
                'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border',
                paymentFilter === m
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================
          ORDERS TABLE
      ====================================================== */}
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
                        {Number(
                          order.total_amount ??
                            order.total ??
                            0
                        ).toFixed(2)}
                      </td>

                      <td className="px-4 py-2.5">

                        <span
                          className={cn(
                            'text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border',
                            String(
                              order.payment_method ||
                                order.payment_mode ||
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
                          onClick={async () => {
                            await printOrderBill(
                              order
                            );
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all"
                        >
                          <Printer
                            size={14}
                          />
                        </button>

                        <button
                          onClick={async () => {
                            if (
                              window.confirm(
                                'ARE YOU SURE? This will permanently delete this Bill History!'
                              )
                            ) {
                              await handleERPAction(
                                DB_SCHEMA.ORDERS.table,
                                ACTION_TYPES.DELETE,
                                {
                                  id: order.id
                                }
                              );

                              await fetchInitialData();
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2
                            size={14}
                          />
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
      ====================================================== */}
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
                    selectedOrder.order_status !==
                      'returned' && (
                      <button
                        onClick={() => {
                          setReturnAmount(
                            selectedOrder.total_amount ||
                              selectedOrder.total ||
                              ''
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

                  /* =================================================
                     EDIT MODE
                  ================================================== */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

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
                                      e.target
                                        .value
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
                                editFormData.user_mobile ||
                                editFormData.customer_phone ||
                                ''
                              }
                              onChange={(e) =>
                                setEditFormData(
                                  {
                                    ...editFormData,
                                    user_mobile:
                                      e.target
                                        .value
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
                                editFormData.address ??
                                editFormData.delivery_address ??
                                editFormData.shipping_address ??
                                ''
                              }
                              onChange={(e) =>
                                setEditFormData(
                                  {
                                    ...editFormData,
                                    address:
                                      e.target
                                        .value,
                                    delivery_address:
                                      e.target
                                        .value
                                  }
                                )
                              }
                              className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-bold h-20"
                            />
                          </div>

                        </div>
                      </div>

                    </div>

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
                                        e.target
                                          .value
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
                                editFormData.payment_method ||
                                editFormData.payment_mode ||
                                'Cash'
                              }
                              onChange={(e) =>
                                setEditFormData(
                                  {
                                    ...editFormData,
                                    payment_method:
                                      e.target
                                        .value
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
                                      e.target
                                        .value
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

                  /* =================================================
                     VIEW MODE
                  ================================================== */
                  <>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      <div className="space-y-4">

                        {/* CUSTOMER */}
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

                        {/* ADDRESS */}
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

                        {/* PAYMENT */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">

                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CreditCard size={12} />
                            Payment Details
                          </h4>

                          <div className="flex justify-between items-center mb-2">

                            <span className="text-[9px] font-black text-slate-400 uppercase">
                              Method:
                            </span>

                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">
                              {selectedOrder.payment_method ||
                                selectedOrder.payment_mode ||
                                'Cash'}
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
                                    ''
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

                        {/* STATUS */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">

                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Truck size={12} />
                            Logistics Status
                          </h4>

                          <select
                            value={
                              selectedOrder.order_status ||
                              'pending'
                            }
                            onChange={(e) =>
                              updateStatus(
                                selectedOrder.id,
                                e.target.value
                              )
                            }
                            className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700 focus:ring-2 focus:ring-blue-500 transition-all"
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

                    {/* =================================================
                        ORDER ITEMS
                    ================================================== */}
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

                                      {item.image_url ? (

                                        <img
                                          src={
                                            item.image_url
                                          }
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
                                            size={
                                              16
                                            }
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
                                selectedOrder.total_amount ??
                                selectedOrder.total ??
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

              {/* =====================================================
                  FOOTER
              ====================================================== */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

                {isEditing ? (

                  <>
                    <button
                      onClick={() =>
                        setIsEditing(false)
                      }
                      className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={
                        handleEditSave
                      }
                      className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 hover:translate-y-[-1px] transition-all"
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
                      className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Close
                    </button>

                    <button
                      onClick={async () => {
                        await printOrderBill(
                          selectedOrder,
                          orderItems
                        );
                      }}
                      className="px-6 py-2 bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-200 hover:translate-y-[-1px] transition-all"
                    >
                      <Printer
                        size={14}
                      />
                      Print Receipt
                    </button>

                    <button
                      onClick={async () => {
                        await printOrderBill(
                          selectedOrder,
                          orderItems
                        );
                      }}
                      className="px-6 py-2 bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-200 hover:translate-y-[-1px] transition-all"
                    >
                      <Printer
                        size={14}
                      />
                      Print GST Invoice
                    </button>
                  </>
                )}

              </div>

            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* =========================================================
          RETURN ORDER MODAL
      ========================================================== */}
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

                  <h3 className="text-sm font-black text-orange-800 uppercase tracking-tighter">
                    Return Order
                  </h3>

                  <button
                    onClick={() =>
                      setShowReturnModal(
                        false
                      )
                    }
                    className="p-2 hover:bg-orange-100 rounded-lg transition-all"
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

                  <div className="space-y-4">

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
                          {Number(
                            selectedOrder.total_amount ??
                              selectedOrder.total ??
                              0
                          ).toFixed(2)}
                        </span>

                      </div>

                    </div>

                    <div className="space-y-1.5">

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

                    <div className="space-y-1.5">

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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none h-24 resize-none"
                        required
                      />

                    </div>

                  </div>

                  <div className="flex justify-end gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        setShowReturnModal(
                          false
                        )
                      }
                      className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="px-6 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200 hover:translate-y-[-1px] transition-all"
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