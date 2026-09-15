export const normalizeBarcode = (barcode: string): string => {
  return barcode.trim().replace(/\s+/g, '');
};

export const validateBarcode = (barcode: string): { isValid: boolean; errors: string[] } => {
  const normalized = normalizeBarcode(barcode);
  const errors: string[] = [];

  if (!normalized) {
    errors.push('Barcode cannot be empty');
  }

  return { isValid: errors.length === 0, errors };
};
