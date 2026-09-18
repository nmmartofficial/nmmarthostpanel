export const normalizeProductName = (value) => {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

export const normalizeBarcode = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export const validateProductReferenceData = ({
  categories = [],
  subcategories = [],
  brands = [],
  brandId,
  categoryId,
  subCategoryId,
  requireBrand = true
}) => {
  if (requireBrand && brandId == null) {
    return { isValid: false, field: 'brand', message: 'Brand not found.' };
  }

  const brandExists = !requireBrand || brands.some((brand) => Number(brand?.id) === Number(brandId));
  if (!brandExists) {
    return { isValid: false, field: 'brand', message: 'Brand not found.' };
  }

  if (categoryId == null || categoryId === '' || Number.isNaN(Number(categoryId))) {
    return { isValid: false, field: 'mainCategory', message: 'Main Category not found.' };
  }

  const categoryExists = categories.some((category) => Number(category?.id) === Number(categoryId));
  if (!categoryExists) {
    return { isValid: false, field: 'mainCategory', message: 'Main Category not found.' };
  }

  if (subCategoryId == null || subCategoryId === '' || Number.isNaN(Number(subCategoryId))) {
    return { isValid: false, field: 'subCategory', message: 'Sub Category not found.' };
  }

  const subcategoryExists = subcategories.some((subcategory) => Number(subcategory?.id) === Number(subCategoryId));
  if (!subcategoryExists) {
    return { isValid: false, field: 'subCategory', message: 'Sub Category not found.' };
  }

  const subcategoryBelongsToSelectedCategory = subcategories.some(
    (subcategory) =>
      Number(subcategory?.id) === Number(subCategoryId) &&
      Number(subcategory?.category_id) === Number(categoryId)
  );

  if (!subcategoryBelongsToSelectedCategory) {
    return { isValid: false, field: 'subCategory', message: 'Sub Category does not belong to the selected Main Category.' };
  }

  return { isValid: true };
};

export const checkProductDuplicate = ({
  products = [],
  productId = null,
  itemName,
  barcode,
  brandId,
  categoryId,
  subCategoryId
}) => {
  const normalizedName = normalizeProductName(itemName);
  const normalizedBarcode = normalizeBarcode(barcode);

  for (const product of products) {
    if (!product || String(product.id) === String(productId)) continue;

    if (product.is_active === false || product.is_active === 'Inactive' || product.is_active === 'inactive') {
      continue;
    }

    const candidateName = normalizeProductName(product.name || product.itname || '');
    const candidateBarcode = normalizeBarcode(product.barcode || '');

    if (normalizedName && candidateName && normalizedName === candidateName) {
      return {
        isDuplicate: true,
        field: 'itemName',
        message: 'Item Name already exists.'
      };
    }

    if (normalizedBarcode && candidateBarcode && normalizedBarcode === candidateBarcode) {
      return {
        isDuplicate: true,
        field: 'barcode',
        message: 'Barcode already exists.'
      };
    }

    const sameFullIdentity =
      normalizedName &&
      candidateName &&
      normalizedName === candidateName &&
      normalizedBarcode &&
      candidateBarcode &&
      Number(product.brand_id ?? product.brandId) === Number(brandId) &&
      Number(product.category_id ?? product.categoryId) === Number(categoryId) &&
      Number(product.subcategory_id ?? product.subCategoryId) === Number(subCategoryId);

    if (sameFullIdentity) {
      return {
        isDuplicate: true,
        field: 'identity',
        message: 'A product with this exact identity already exists.'
      };
    }
  }

  return { isDuplicate: false };
};
