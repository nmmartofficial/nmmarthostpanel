import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Custom hook for Supabase with fallback to localStorage
export function useSupabase(tableName, initialValue = []) {
  const [data, setData] = useState(initialValue)
  const [loading, setLoading] = useState(true)

  // Fetch data from Supabase on mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Try to fetch from Supabase
      const { data: supabaseData, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching from Supabase:', error)
        // Fallback to localStorage
        const localData = localStorage.getItem(`nm_${tableName}`)
        if (localData) {
          setData(JSON.parse(localData))
        }
      } else if (supabaseData) {
        setData(supabaseData)
        // Also save to localStorage for backup
        localStorage.setItem(`nm_${tableName}`, JSON.stringify(supabaseData))
      }
    } catch (err) {
      console.error('Error:', err)
      // Fallback to localStorage
      const localData = localStorage.getItem(`nm_${tableName}`)
      if (localData) {
        setData(JSON.parse(localData))
      }
    } finally {
      setLoading(false)
    }
  }

  const setDataWithSupabase = async (newValue) => {
    try {
      // First update local state
      setData(newValue)
      
      // Save to localStorage for backup
      localStorage.setItem(`nm_${tableName}`, JSON.stringify(newValue))
      
      // Try to sync with Supabase
      // For simplicity, we'll handle insert/update/delete in specific functions
      // But this keeps the API the same as useLocalStorage
    } catch (err) {
      console.error('Error syncing to Supabase:', err)
    }
  }

  return [data, setDataWithSupabase, loading]
}

// Helper functions for CRUD operations
export const supabaseCRUD = {
  // Insert a new record
  insert: async (tableName, record) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert([record])
        .select()
      
      if (error) throw error
      return data
    } catch (err) {
      console.error('Error inserting into Supabase:', err)
      throw err
    }
  },

  // Update a record
  update: async (tableName, id, updates) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data
    } catch (err) {
      console.error('Error updating in Supabase:', err)
      throw err
    }
  },

  // Delete a record
  delete: async (tableName, id) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    } catch (err) {
      console.error('Error deleting from Supabase:', err)
      throw err
    }
  }
}
