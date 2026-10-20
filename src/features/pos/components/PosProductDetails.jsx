import React from 'react';
import { Barcode, ImageOff, Package } from 'lucide-react';
import { usePOS } from '../../../context';
import { formatCurrency } from '../../../utils/pos';
import { getCartUnitPrice } from '../../../utils/pos/calculations';
import { resolveProductImageUrl } from '../../../utils/productImage';

const getValue = (record, ...keys) => {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return null;
};

const formatOptionalCurrency = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? formatCurrency(amount) : null;
};

const getLabel = (value, records, idKey) => {
  if (value !== null && value !== undefined && String(value).trim()) return value;
  const record = records?.find((item) => String(item.id) === String(idKey));
  return record?.name || record?.category_name || record?.brand_name || null;
};

const Detail = ({ label, value }) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="truncate text-xs font-semibold text-slate-700">{value}</dd>
    </div>
  );
};

const PosProductDetails = () => {
  const { selectedProduct, products, categories, brands } = usePOS();
  if (!selectedProduct) return null;

  const product = (products || []).find((item) => String(item.id) === String(selectedProduct.id));
  if (!product) return null;

  const name = getValue(product, 'itname', 'name', 'item_name') || 'Unnamed item';
  const imageUrl = resolveProductImageUrl(product);
  const category = getLabel(getValue(product, 'category_name', 'item_category'), categories, product.category_id);
  const subcategory = getValue(product, 'subcategory_name', 'sub_category_name');
  const brand = getLabel(getValue(product, 'brand_name', 'brand'), brands, product.brand_id);
  const sku = getValue(product, 'sku', 'item_code', 'kcode', 'k_code', 'dtcode');
  const barcode = getValue(product, 'barcode');
  const description = getValue(product, 'description', 'itemdescription', 'item_description');
  const variant = getValue(product, 'variant_name', 'variant', 'size', 'weight', 'pack_size', 'pack');
  const unit = getValue(product, 'unit_name', 'unitcode', 'unit');
  const mrp = getValue(product, 'mrp');
  const sellingPrice = getCartUnitPrice(product);
  const stockValue = getValue(product, 'stock');
  const stock = stockValue === null ? null : Number(stockValue);
  const stockLabel = stock !== null && Number.isFinite(stock)
    ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(stock)
    : 'Unavailable';
  const lowStockThreshold = Number(getValue(product, 'low_stock_threshold'));
  const stockStatus = String(getValue(product, 'stock_status') || '').toLowerCase();
  const discount = getValue(product, 'discount_percent', 'discount_pct', 'discperc');
  const discountAmount = getValue(product, 'discount_amount');
  const discountValue = getValue(product, 'discount');
  const discountType = getValue(product, 'discount_type');
  const gst = getValue(product, 'gst_percent', 'gst_pct', 'gst');
  const hsn = getValue(product, 'hsn_code', 'hsncode');
  const batch = getValue(product, 'batch_no');
  const expiry = getValue(product, 'expiry_date');
  const serial = getValue(product, 'serial_no', 'serial_number');
  const availabilityValue = getValue(product, 'is_available', 'item_status', 'itemstatus');
  const availabilityText = String(availabilityValue).toLowerCase();
  let availability = availabilityValue;
  if (stock !== null && Number.isFinite(stock)) {
    if (stock <= 0) {
      availability = 'Out of stock';
    } else if ((Number.isFinite(lowStockThreshold) && lowStockThreshold > 0 && stock <= lowStockThreshold)
      || ['low', 'low_stock'].includes(stockStatus)) {
      availability = 'Low stock';
    } else {
      availability = 'In stock';
    }
  } else if (typeof availabilityValue === 'boolean') {
    availability = availabilityValue ? 'Available' : 'Unavailable';
  } else if (['false', '0', 'inactive', 'unavailable', 'out of stock'].includes(availabilityText)) {
    availability = 'Unavailable';
  }
  const unavailable = availability === 'Out of stock' || availability === 'Unavailable';
  const lowStock = availability === 'Low stock';

  return (
    <section
      aria-label="Selected item details"
      aria-live="polite"
      className="border-b border-slate-200 bg-white px-3 py-3 sm:px-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-contain"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="flex flex-col items-center text-slate-300" aria-label="No product image">
              <Package size={22} />
              <ImageOff size={10} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Product</p>
              <h2 className="break-words text-sm font-semibold leading-snug text-slate-900">{name}</h2>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                {barcode && <span className="inline-flex items-center gap-1"><Barcode size={11} />{barcode}</span>}
                {sku && <span>SKU: {sku}</span>}
                {brand && <span>{brand}</span>}
                {category && <span>{category}{subcategory ? ` / ${subcategory}` : ''}</span>}
                {variant && <span>{variant}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-slate-100 pt-2 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Selling price</p>
                {formatOptionalCurrency(sellingPrice)
                  ? <strong className="text-base font-bold text-primary-700">{formatOptionalCurrency(sellingPrice)}</strong>
                  : <span className="text-xs font-semibold text-slate-400">Price unavailable</span>}
              </div>
              {formatOptionalCurrency(mrp) && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">MRP</p>
                  <span className="text-xs font-medium text-slate-500">
                    {sellingPrice !== null && Number(mrp) > sellingPrice ? <s>{formatOptionalCurrency(mrp)}</s> : formatOptionalCurrency(mrp)}
                  </span>
                </div>
              )}
              {availability && (
                <span className={`rounded px-2 py-1 text-[10px] font-semibold ${
                unavailable
                    ? 'bg-red-50 text-red-700'
                  : lowStock
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {availability}
                </span>
              )}
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-2 sm:grid-cols-3 xl:grid-cols-5">
            <Detail label="Stock" value={stockLabel} />
            <Detail label="Unit" value={unit} />
            <Detail label="Offer / discount" value={discount !== null
              ? `${discount}%`
              : discountAmount !== null
                ? formatOptionalCurrency(discountAmount)
                : discountValue !== null
                  ? `${discountValue}${discountType ? ` ${discountType}` : ''}`
                  : null}
            />
            <Detail label="GST" value={gst !== null ? `${gst}%` : null} />
            <Detail label="HSN" value={hsn} />
            <Detail label="Batch" value={batch} />
            <Detail label="Expiry" value={expiry} />
            <Detail label="Serial" value={serial} />
            {description && (
              <div className="col-span-full min-w-0">
                <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Description</dt>
                <dd className="text-xs text-slate-600">{description}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
};

export default PosProductDetails;
