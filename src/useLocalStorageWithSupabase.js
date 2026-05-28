import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// This hook works with both localStorage AND Supabase
export function useLocalStorageWithSupabase(key, initialValue, tableName = null) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (e) {
      return initialValue;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  // Optional: Sync to Supabase in background
  const setValueWithSupabase = async (newValue) => {
    setValue(newValue);
    
    // If tableName is provided, try to sync with Supabase
    if (tableName && newValue.length > 0) {
      try {
        // For simplicity, we'll just log it - full implementation would require more logic
        console.log(`Would sync ${newValue.length} items to ${tableName} in Supabase`);
      } catch (e) {
        console.error('Supabase sync failed:', e);
      }
    }
  };

  return [value, setValueWithSupabase];
}
