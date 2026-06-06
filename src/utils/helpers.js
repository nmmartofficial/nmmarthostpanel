import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for tailwind classes */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Helper: Generate UUID */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
