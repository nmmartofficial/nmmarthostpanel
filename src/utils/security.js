/**
 * NM MART - SECURITY UTILITIES
 * Comprehensive security helpers for input validation, sanitization, and XSS protection
 */

/**
 * XSS Sanitization: Removes or encodes dangerous HTML characters
 */
export const sanitizeHTML = (input) => {
  if (!input) return input;
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Validate PIN format (4-20 alphanumeric)
 */
export const validatePIN = (pin) => {
  const pinStr = String(pin || '');
  const regex = /^[a-zA-Z0-9]{4,20}$/;
  return regex.test(pinStr);
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate phone number (10-digit Indian format)
 */
export const validatePhone = (phone) => {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(String(phone));
};

/**
 * Validate numeric fields (positive numbers)
 */
export const validatePositiveNumber = (num) => {
  const n = Number(num);
  return !isNaN(n) && n >= 0;
};

/**
 * Sanitize text input (trim + remove dangerous chars)
 */
export const sanitizeText = (text) => {
  if (!text) return text;
  return String(text).trim().replace(/[<>&"]/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;'
  }[c]));
};

/**
 * Validate password strength (at least 8 chars, 1 letter, 1 number)
 */
export const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasLetter) {
    return { valid: false, message: 'Password must contain at least one letter' };
  }
  
  if (!hasNumber) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  
  return { valid: true, message: 'Strong password' };
};

/**
 * Generate secure random PIN (6 digits)
 */
export const generateSecurePIN = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Session storage with encryption (simple encoding for demo)
 * Note: For production, use proper encryption libraries
 */
const isValidBase64 = (value) => {
  if (typeof value !== 'string' || value.length === 0) return false;

  const trimmed = value.trim();
  if (trimmed.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed)) return false;

  const padding = trimmed.match(/=*$/)[0].length;
  if (padding > 2) return false;

  return true;
};

const encodeValue = (value) => {
  const jsonString = JSON.stringify(value);
  const uint8Array = new TextEncoder().encode(jsonString);
  let binaryString = '';

  uint8Array.forEach((byte) => {
    binaryString += String.fromCharCode(byte);
  });

  return btoa(binaryString);
};

const decodeValue = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return null;

  if (!isValidBase64(value)) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  try {
    const binaryString = atob(value);
    const uint8Array = new Uint8Array(binaryString.length);

    for (let index = 0; index < binaryString.length; index += 1) {
      uint8Array[index] = binaryString.charCodeAt(index);
    }

    const decodedText = new TextDecoder().decode(uint8Array);
    return JSON.parse(decodedText);
  } catch {
    return null;
  }
};

export const safeJsonParse = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;

  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  try {
    const parsedValue = decodeValue(trimmed);

    if (parsedValue === null || parsedValue === undefined) {
      return fallback;
    }

    if (typeof parsedValue === 'string') {
      if (parsedValue === trimmed) {
        return fallback;
      }

      try {
        return JSON.parse(parsedValue);
      } catch {
        return fallback;
      }
    }

    return parsedValue;
  } catch {
    return fallback;
  }
};

export const secureStorage = {
  setItem: (key, value) => {
    try {
      const encoded = encodeValue(value);
      localStorage.setItem(key, encoded);
    } catch (e) {
      if (import.meta.env.DEV) console.error('Secure storage encode error:', e);
    }
  },
  
  getItem: (key) => {
    try {
      const storedValue = localStorage.getItem(key);
      if (!storedValue) return null;

      const parsedValue = decodeValue(storedValue);

      if (parsedValue === null || parsedValue === undefined) {
        localStorage.removeItem(key);
        return null;
      }

      if (typeof storedValue === 'string' && !isValidBase64(storedValue)) {
        try {
          localStorage.setItem(key, encodeValue(parsedValue));
        } catch {}
      }

      return parsedValue;
    } catch (e) {
      if (import.meta.env.DEV) console.error('Secure storage decode error:', e);
      try { localStorage.removeItem(key); } catch {}
      return null;
    }
  },
  
  removeItem: (key) => {
    localStorage.removeItem(key);
  },
  
  clear: () => {
    const secureKeys = ['nm_admin_auth', 'nm_auth_session', 'nm_user_data', 'nm_auth_time', 'nm_login_attempts'];
    secureKeys.forEach(key => localStorage.removeItem(key));
  }
};

/**
 * Check if connection is secure (HTTPS)
 */
export const isSecureConnection = () => {
  return window.location.protocol === 'https:';
};

/**
 * Force HTTPS (redirect if not on HTTPS)
 */
export const forceHTTPS = () => {
  if (!isSecureConnection() && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    window.location.href = `https://${window.location.host}${window.location.pathname}`;
  }
};

/**
 * Rate Limiter for login attempts
 */
export class LoginRateLimiter {
  constructor(maxAttempts = 5, lockoutDurationMinutes = 5) {
    this.maxAttempts = maxAttempts;
    this.lockoutDuration = lockoutDurationMinutes * 60 * 1000;
  }
  
  getAttempts() {
    const data = secureStorage.getItem('nm_login_attempts') || { count: 0, timestamp: 0 };
    return data;
  }
  
  isLockedOut() {
    const { count, timestamp } = this.getAttempts();
    if (count >= this.maxAttempts) {
      const remaining = this.lockoutDuration - (Date.now() - timestamp);
      if (remaining > 0) {
        return { locked: true, remainingSeconds: Math.ceil(remaining / 1000) };
      }
    }
    return { locked: false };
  }
  
  recordAttempt(success) {
    if (success) {
      secureStorage.removeItem('nm_login_attempts');
    } else {
      const current = this.getAttempts();
      secureStorage.setItem('nm_login_attempts', {
        count: current.count + 1,
        timestamp: Date.now()
      });
    }
  }
  
  getRemainingAttempts() {
    const { count } = this.getAttempts();
    return Math.max(0, this.maxAttempts - count);
  }
}

/**
 * Input sanitization middleware for forms
 */
export const sanitizeFormData = (data) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeFormData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Validate product data
 */
export const validateProduct = (product) => {
  const errors = [];
  
  if (!product.name || String(product.name).trim() === '') {
    errors.push('Product name is required');
  }
  
  if (!validatePositiveNumber(product.mrp)) {
    errors.push('MRP must be a positive number');
  }
  
  if (!validatePositiveNumber(product.sale_rate)) {
    errors.push('Sale rate must be a positive number');
  }
  
  if (Number(product.sale_rate) > Number(product.mrp)) {
    errors.push('Sale rate cannot be higher than MRP');
  }
  
  if (!validatePositiveNumber(product.stock)) {
    errors.push('Stock must be a positive number');
  }
  
  return { valid: errors.length === 0, errors };
};

/**
 * Prevent clickjacking
 */
export const preventClickjacking = () => {
  if (window.self !== window.top) {
    window.top.location.href = window.self.location.href;
  }
};
