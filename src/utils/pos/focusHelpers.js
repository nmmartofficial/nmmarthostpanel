/**
 * POS Focus Management Utilities
 */

/**
 * Checks if any input element currently has focus
 */
export const isInputFocused = () => {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tags = ['INPUT', 'TEXTAREA', 'SELECT'];
  return tags.includes(activeElement.tagName) || activeElement.isContentEditable;
};

/**
 * Safely focuses an element by ref
 */
export const safeFocus = (ref) => {
  if (ref && ref.current && typeof ref.current.focus === 'function') {
    // Small delay to ensure DOM is ready and event propagation finished
    setTimeout(() => ref.current.focus(), 10);
    return true;
  }
  return false;
};

/**
 * Recovers focus to a primary element (usually barcode input)
 */
export const recoverFocus = (primaryRef) => {
  if (!isInputFocused()) {
    safeFocus(primaryRef);
  }
};
