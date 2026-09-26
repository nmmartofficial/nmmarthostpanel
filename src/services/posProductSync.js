export const POS_PRODUCT_FIELDS = Object.freeze([
  'name',
  'barcode',
  'hsn_code',
  'purchase_rate',
  'mrp',
  'sale_rate',
  'discount_percent',
  'gst_percent',
  'cess_percent',
  'unit_name',
  'item_status',
  'is_active',
  'low_stock_threshold'
]);

export const ADMIN_PRODUCT_FIELDS = Object.freeze([
  'category_id',
  'subcategory_id',
  'brand_id',
  'category_name',
  'subcategory_name',
  'brand_name',
  'category_code',
  'sub_category_code',
  'brand_code',
  'image_url',
  'imagename',
  'picture'
]);

const POS_FIELD_ALIASES = {
  name: ['name', 'itname', 'RawName', 'RawDesc'],
  barcode: ['barcode', 'sku', 'RawCodeNew', 'RawCode'],
  hsn_code: ['hsn_code', 'hsncode'],
  purchase_rate: ['purchase_rate', 'purcrate', 'PurcRate'],
  mrp: ['mrp', 'MRP'],
  sale_rate: ['sale_rate', 'onlinerate', 'Rate'],
  discount_percent: ['discount_percent', 'discperc', 'discountPerc'],
  gst_percent: ['gst_percent', 'gst', 'CGSTPERC'],
  cess_percent: ['cess_percent', 'cess', 'Cess'],
  unit_name: ['unit_name', 'unitcode', 'UnitCode'],
  item_status: ['item_status', 'itemstatus', 'ActiveItem'],
  is_active: ['is_active', 'ActiveItem'],
  low_stock_threshold: ['low_stock_threshold', 'MinStk']
};

const NUMERIC_FIELDS = new Set([
  'purchase_rate',
  'mrp',
  'sale_rate',
  'discount_percent',
  'gst_percent',
  'cess_percent',
  'low_stock_threshold'
]);

export const normalizeProductBarcode = (value) =>
  String(value ?? '').trim();

export const normalizeProductName = (value) =>
  String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const readFirst = (record, keys) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) {
      return record[key];
    }
  }
  return undefined;
};

const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === '';

export const buildPosProductPatch = (rawProduct) => {
  const patch = {};

  POS_PRODUCT_FIELDS.forEach((field) => {
    const value = readFirst(rawProduct, POS_FIELD_ALIASES[field]);

    if (isBlank(value)) return;

    patch[field] = NUMERIC_FIELDS.has(field)
      ? Number(value)
      : field === 'barcode'
        ? normalizeProductBarcode(value)
        : String(value).trim();
  });

  delete patch.stock;
  delete patch.opstock;

  return patch;
};

export const planPosProductSync = ({ posProducts = [], existingProducts = [] } = {}) => {
  const existingByBarcode = new Map();
  const existingByName = new Map();
  const conflicts = [];
  const seenIncomingBarcodes = new Set();
  const plan = [];

  existingProducts.forEach((product) => {
    const barcode = normalizeProductBarcode(product?.barcode);
    const name = normalizeProductName(product?.name || product?.itname);

    if (barcode) existingByBarcode.set(barcode, product);
    if (name) {
      const matches = existingByName.get(name) || [];
      matches.push(product);
      existingByName.set(name, matches);
    }
  });

  posProducts.forEach((rawProduct, index) => {
    const patch = buildPosProductPatch(rawProduct);
    const barcode = normalizeProductBarcode(patch.barcode);
    const name = normalizeProductName(patch.name);

    if (!barcode && !name) {
      conflicts.push({ index, reason: 'Missing barcode and product name', rawProduct });
      return;
    }

    if (barcode && seenIncomingBarcodes.has(barcode)) {
      conflicts.push({ index, barcode, reason: 'Duplicate barcode in POS batch', rawProduct });
      return;
    }
    if (barcode) seenIncomingBarcodes.add(barcode);

    let match = barcode ? existingByBarcode.get(barcode) : null;
    if (!match && name) {
      const nameMatches = existingByName.get(name) || [];
      if (nameMatches.length === 1) {
        match = nameMatches[0];
      } else if (nameMatches.length > 1) {
        conflicts.push({ index, barcode, name, reason: 'Ambiguous normalized product name', rawProduct });
        return;
      }
    }

    if (match) {
      plan.push({ action: 'UPDATE', id: match.id, barcode, patch });
    } else {
      plan.push({ action: 'INSERT', barcode, patch });
    }
  });

  return {
    plan,
    conflicts,
    summary: {
      inserted: plan.filter((entry) => entry.action === 'INSERT').length,
      updated: plan.filter((entry) => entry.action === 'UPDATE').length,
      conflicts: conflicts.length
    }
  };
};

export const applyPosProductSync = async ({ plan = [], repository, dryRun = true } = {}) => {
  if (!repository || typeof repository.insert !== 'function' || typeof repository.update !== 'function') {
    throw new Error('A repository with insert and update methods is required');
  }

  const report = {
    dryRun,
    inserted: [],
    updated: [],
    skipped: [],
    errors: []
  };

  if (dryRun) return report;

  for (const entry of plan) {
    try {
      if (entry.action === 'UPDATE') {
        report.updated.push(await repository.update(entry.id, entry.patch));
      } else if (entry.action === 'INSERT') {
        report.inserted.push(await repository.insert(entry.patch));
      } else {
        report.skipped.push(entry);
      }
    } catch (error) {
      report.errors.push({ entry, error });
    }
  }

  return report;
};
