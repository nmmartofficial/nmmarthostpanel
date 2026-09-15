export const generateBarcode = (prefix = '8901') => {
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  const base = `${prefix}${random}`;
  const checksum = calculateChecksum(base);
  return `${base}${checksum}`;
};

const calculateChecksum = (code) => {
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum;
};

export const validateBarcode = (barcode) => {
  if (!barcode || barcode.length < 8 || barcode.length > 14) return false;
  const base = barcode.slice(0, -1);
  const checksum = parseInt(barcode.slice(-1), 10);
  return calculateChecksum(base) === checksum;
};
