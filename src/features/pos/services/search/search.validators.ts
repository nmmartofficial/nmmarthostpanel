import { MIN_QUERY_LENGTH, MAX_QUERY_LENGTH } from './search.constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateSearchQuery = (query: string): ValidationResult => {
  const errors: string[] = [];
  const trimmedQuery = query.trim();
  
  if (trimmedQuery.length < MIN_QUERY_LENGTH) {
    errors.push(`Query must be at least ${MIN_QUERY_LENGTH} character(s)`);
  }
  
  if (trimmedQuery.length > MAX_QUERY_LENGTH) {
    errors.push(`Query must be at most ${MAX_QUERY_LENGTH} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateSearchFilters = (): ValidationResult => {
  return { isValid: true, errors: [] };
};

export const validateSearchOptions = (): ValidationResult => {
  return { isValid: true, errors: [] };
};
