import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const generateUUID = () => {
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${timePart}-${randomPart}`;
};

export const generateNumericId = () => {
  const hi = Date.now() & 0x7fffffff;
  const lo = Math.floor(Math.random() * 0xffffffff);
  return (hi * 0x100000000 + lo) >>> 0;
};

export const normalizeDbId = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) && Number.isInteger(n) ? n : String(val);
};
