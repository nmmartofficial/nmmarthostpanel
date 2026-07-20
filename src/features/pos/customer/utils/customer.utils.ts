/**
 * Customer Module Utilities
 * Phase 5 - Step 3 & Step 7
 */

export const normalizeCustomerSearch = (query: string): string => {
  return query.trim().toLowerCase();
};

export const normalizeMobile = (mobile: string | undefined): string => {
  if (!mobile) return '';
  return mobile.trim().toLowerCase();
};

export const safeCustomerCompare = (customerValue: string | undefined, searchValue: string): boolean => {
  if (!customerValue) return false;
  return normalizeCustomerSearch(customerValue).includes(searchValue);
};

export const validateCustomerCode = (customerCode: string): { isValid: boolean; error: string } => {
  if (!customerCode || customerCode.trim().length === 0) {
    return { isValid: false, error: 'Customer code is required' };
  }
  return { isValid: true, error: '' };
};

export const validateCustomerMobile = (mobile: string): { isValid: boolean; error: string } => {
  if (!mobile || mobile.trim().length === 0) {
    return { isValid: false, error: 'Mobile number is required' };
  }
  // Basic mobile validation (10 digits)
  const mobileRegex = /^\d{10}$/;
  if (!mobileRegex.test(mobile.trim())) {
    return { isValid: false, error: 'Mobile number must be 10 digits' };
  }
  return { isValid: true, error: '' };
};

export const validateCustomerEmail = (email: string): { isValid: boolean; error: string } => {
  if (!email || email.trim().length === 0) {
    return { isValid: true, error: '' }; // Email is optional
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Email is invalid' };
  }
  return { isValid: true, error: '' };
};

export const validateCustomer = (customer: {
  customerCode: string;
  name: string;
  mobile: string;
  email?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  const codeValidation = validateCustomerCode(customer.customerCode);
  if (!codeValidation.isValid) {
    errors.customerCode = codeValidation.error;
  }
  
  if (!customer.name || customer.name.trim().length === 0) {
    errors.name = 'Customer name is required';
  }
  
  const mobileValidation = validateCustomerMobile(customer.mobile);
  if (!mobileValidation.isValid) {
    errors.mobile = mobileValidation.error;
  }
  
  if (customer.email) {
    const emailValidation = validateCustomerEmail(customer.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const normalizeCustomerCode = (customerCode: string): string => {
  return customerCode.trim().toUpperCase();
};

export const normalizeCustomerName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ');
};
