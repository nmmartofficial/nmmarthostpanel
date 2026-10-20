import { calcCartLineTotal, roundTo } from './calculations.js';

const normalizeCode = (value) => String(value ?? '').trim().toUpperCase();
const isActive = (record) => record?.is_active === true || String(record?.is_active).toLowerCase() === 'true';
const finiteNonNegative = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const isWithinValidity = (record, now) => {
  const nowTime = new Date(now).getTime();
  if (!Number.isFinite(nowTime)) return false;

  if (record.valid_from) {
    const start = new Date(record.valid_from).getTime();
    if (!Number.isFinite(start) || nowTime < start) return false;
  }
  if (record.valid_to) {
    const endValue = String(record.valid_to);
    const end = /^\d{4}-\d{2}-\d{2}$/.test(endValue)
      ? new Date(`${endValue}T23:59:59.999Z`).getTime()
      : new Date(endValue).getTime();
    if (!Number.isFinite(end) || nowTime > end) return false;
  }
  return true;
};

const matchesTarget = (product, targetType, targetId) => {
  const type = String(targetType ?? '').trim().toLowerCase();
  if (!type || type === 'all') return true;
  if (targetId === null || targetId === undefined || String(targetId).trim() === '') return false;
  if (['product', 'products', 'item'].includes(type)) return String(product?.id) === String(targetId);
  if (['category', 'categories'].includes(type)) return String(product?.category_id) === String(targetId);
  if (['subcategory', 'subcategories'].includes(type)) return String(product?.subcategory_id) === String(targetId);
  return false;
};

const allocateDiscount = (eligibleLines, requestedAmount) => {
  const eligibleTotal = eligibleLines.reduce((sum, line) => sum + line.amount, 0);
  const discountAmount = roundTo(Math.min(eligibleTotal, requestedAmount), 2);
  const itemDiscounts = {};
  if (eligibleTotal <= 0 || discountAmount <= 0) {
    return { discountAmount: 0, itemDiscounts, freeQuantities: {} };
  }

  let allocated = 0;
  eligibleLines.forEach((line, index) => {
    const amount = index === eligibleLines.length - 1
      ? roundTo(discountAmount - allocated, 2)
      : roundTo(discountAmount * (line.amount / eligibleTotal), 2);
    const safeAmount = Math.min(line.amount, Math.max(0, amount));
    allocated = roundTo(allocated + safeAmount, 2);
    itemDiscounts[String(line.product.id)] = roundTo(
      (itemDiscounts[String(line.product.id)] || 0) + safeAmount,
      2
    );
  });

  return { discountAmount: roundTo(allocated, 2), itemDiscounts, freeQuantities: {} };
};

const buildDiscountCandidate = (record, kind, eligibleLines, eligibleTotal) => {
  const rawValue = finiteNonNegative(record.discount_value);
  if (rawValue === null || rawValue <= 0) return null;

  const type = kind === 'coupon'
    ? String(record.discount_type ?? '').trim().toLowerCase()
    : String(record.offer_type ?? '').trim().toLowerCase();
  const isPercentage = ['percentage', 'percent', 'percentage_discount'].includes(type);
  const isFixed = kind === 'coupon'
    ? ['flat', 'fixed', 'amount'].includes(type)
    : ['discount', 'fixed', 'flat', 'amount'].includes(type);

  let requestedAmount;
  if (isPercentage) {
    if (rawValue > 100) return null;
    requestedAmount = eligibleTotal * rawValue / 100;
  } else if (isFixed) {
    requestedAmount = rawValue;
  } else {
    return null;
  }

  const maxDiscount = finiteNonNegative(record.max_discount);
  if (kind === 'coupon' && maxDiscount !== null && maxDiscount > 0) {
    requestedAmount = Math.min(requestedAmount, maxDiscount);
  }
  const allocation = allocateDiscount(eligibleLines, requestedAmount);
  if (allocation.discountAmount <= 0) return null;

  return {
    kind,
    id: record.id,
    code: kind === 'coupon' ? String(record.code ?? '') : null,
    title: record.title || record.description || (kind === 'coupon' ? record.code : 'Offer'),
    type,
    discountAmount: allocation.discountAmount,
    itemDiscounts: allocation.itemDiscounts,
    freeQuantities: allocation.freeQuantities
  };
};

const buildBogoCandidate = (offer, eligibleLines) => {
  const buyQty = finiteNonNegative(offer.buy_qty);
  const getQty = finiteNonNegative(offer.get_qty);
  if (!Number.isInteger(buyQty) || !Number.isInteger(getQty) || buyQty <= 0 || getQty <= 0) return null;

  const itemDiscounts = {};
  const freeQuantities = {};
  let discountAmount = 0;
  eligibleLines.forEach((line) => {
    const quantity = finiteNonNegative(line.product.quantity);
    if (quantity === null) return;
    const freeQty = Math.floor(quantity / (buyQty + getQty)) * getQty;
    if (freeQty <= 0) return;
    const unitPrice = line.amount / quantity;
    const itemDiscount = roundTo(Math.min(line.amount, unitPrice * freeQty), 2);
    const key = String(line.product.id);
    freeQuantities[key] = freeQty;
    itemDiscounts[key] = itemDiscount;
    discountAmount += itemDiscount;
  });

  discountAmount = roundTo(discountAmount, 2);
  return discountAmount > 0
    ? {
        kind: 'offer',
        id: offer.id,
        code: null,
        title: offer.title || offer.description || 'Buy X Get Y',
        type: 'bogo',
        discountAmount,
        itemDiscounts,
        freeQuantities
      }
    : null;
};

const isEligible = (record, subtotal, now) => {
  if (!isActive(record) || !isWithinValidity(record, now)) return false;
  const minimum = finiteNonNegative(record.min_order_amount) ?? 0;
  return subtotal >= minimum;
};

export const selectBestPOSPromotion = ({
  cart = [],
  offers = [],
  coupons = [],
  couponCode = '',
  now = new Date()
} = {}) => {
  const lines = (Array.isArray(cart) ? cart : [])
    .map((product) => ({ product, amount: calcCartLineTotal(product) }))
    .filter((line) => Number.isFinite(line.amount) && line.amount > 0);
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const candidates = [];
  const normalizedCode = normalizeCode(couponCode);
  let couponError = '';

  (Array.isArray(offers) ? offers : []).forEach((offer) => {
    if (!isEligible(offer, subtotal, now)) return;
    const eligibleLines = lines.filter(({ product }) =>
      matchesTarget(product, offer.applies_to_type, offer.applies_to_id)
    );
    const eligibleTotal = eligibleLines.reduce((sum, line) => sum + line.amount, 0);
    if (eligibleTotal <= 0) return;

    const type = String(offer.offer_type ?? '').trim().toLowerCase();
    const candidate = type === 'bogo'
      ? buildBogoCandidate(offer, eligibleLines)
      : buildDiscountCandidate(offer, 'offer', eligibleLines, eligibleTotal);
    if (candidate) candidates.push(candidate);
  });

  if (normalizedCode) {
    const coupon = (Array.isArray(coupons) ? coupons : []).find(
      (entry) => normalizeCode(entry.code) === normalizedCode
    );
    if (!coupon) {
      couponError = 'Coupon code not found';
    } else if (!isEligible(coupon, subtotal, now)) {
      couponError = 'Coupon is inactive, expired, or the minimum order is not met';
    } else if (
      finiteNonNegative(coupon.usage_limit) > 0
      && finiteNonNegative(coupon.used_count) >= finiteNonNegative(coupon.usage_limit)
    ) {
      couponError = 'Coupon usage limit has been reached';
    } else {
      const eligibleLines = lines.filter(({ product }) =>
        matchesTarget(product, coupon.applies_to, coupon.applies_to_id)
      );
      const eligibleTotal = eligibleLines.reduce((sum, line) => sum + line.amount, 0);
      const candidate = eligibleTotal > 0
        ? buildDiscountCandidate(coupon, 'coupon', eligibleLines, eligibleTotal)
        : null;
      if (candidate) candidates.push(candidate);
      else couponError = 'Coupon has no valid discount for these items';
    }
  }

  candidates.sort((left, right) =>
    right.discountAmount - left.discountAmount
    || left.kind.localeCompare(right.kind)
    || String(left.id).localeCompare(String(right.id))
  );

  return { selected: candidates[0] || null, couponError };
};
