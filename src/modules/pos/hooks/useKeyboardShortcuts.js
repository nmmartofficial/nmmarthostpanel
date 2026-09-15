import { useEffect } from 'react';

export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      for (const shortcut of shortcuts) {
        const { key, ctrlKey, shiftKey, altKey, callback } = shortcut;

        const matches =
          e.key.toLowerCase() === key.toLowerCase() &&
          (ctrlKey === undefined || e.ctrlKey === ctrlKey) &&
          (shiftKey === undefined || e.shiftKey === shiftKey) &&
          (altKey === undefined || e.altKey === altKey);

        if (matches) {
          e.preventDefault();
          callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};
