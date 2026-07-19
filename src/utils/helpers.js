import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for tailwind classes */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Helper: Generate a safe unique ID */
export const generateUUID = () => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    try {
      return globalThis.crypto.randomUUID();
    } catch {
      // fall back to a safe local implementation
    }
  }

  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${timePart}-${randomPart}`;
};
