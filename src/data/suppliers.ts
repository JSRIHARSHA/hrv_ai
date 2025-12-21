import { ContactInfo } from '../types';
import { suppliersAPI } from '../services/apiService';
import { loadSuppliersFromCSV } from '../services/csvService';

export interface Supplier extends ContactInfo {
  id: string;
  city?: string;
  isActive: boolean;
  specialties: string[];
  rating: number;
  lastOrderDate?: string;
}

// Suppliers will be loaded from CSV
let suppliersCache: Supplier[] | null = null;

/**
 * Get suppliers from Supabase/API (with CSV fallback)
 */
export const getSuppliers = async (): Promise<Supplier[]> => {
  if (suppliersCache) {
    return suppliersCache;
  }
  
  // Check if Supabase is configured
  const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
  
  if (useSupabase) {
    try {
      // Try Supabase first
      const { supabaseSuppliersService } = await import('../services/supabaseSuppliersService');
      const supabaseSuppliers = await supabaseSuppliersService.getAllSuppliers();
      if (supabaseSuppliers && supabaseSuppliers.length > 0) {
        // Convert Supabase format to frontend Supplier format
        const suppliers: Supplier[] = supabaseSuppliers.map((s: any) => ({
          id: s.id || s.supplierId,
          name: s.name,
          address: s.address,
          city: s.city,
          country: s.country,
          email: s.email,
          phone: s.phone,
          gstin: s.gstin,
          isActive: s.isActive !== undefined ? s.isActive : true,
          specialties: s.specialties || [],
          rating: parseFloat(s.rating) || 0,
          lastOrderDate: s.lastOrderDate,
        }));
        suppliersCache = suppliers;
        console.log('✅ Suppliers loaded from Supabase:', suppliers.length);
        return suppliers;
      }
    } catch (error) {
      console.log('❌ Supabase not available, falling back to API/CSV:', error);
    }
  }
  
  try {
    // Try to fetch from API
    const apiSuppliers = await suppliersAPI.getAllSuppliers({ isActive: true });
    if (apiSuppliers && apiSuppliers.length > 0) {
      // Convert API supplier format to frontend Supplier format
      const suppliers: Supplier[] = apiSuppliers.map((s: any) => ({
        id: s.supplierId,
        name: s.name,
        address: s.address,
        city: s.city,
        country: s.country,
        email: s.email,
        phone: s.phone,
        gstin: s.gstin,
        isActive: s.isActive,
        specialties: s.specialties || [],
        rating: parseFloat(s.rating) || 0,
        lastOrderDate: s.lastOrderDate,
      }));
      suppliersCache = suppliers;
      console.log('✅ Suppliers loaded from API');
      return suppliers;
    }
  } catch (error) {
    console.log('API not available, falling back to CSV:', error);
  }
  
  // Fallback to CSV
  try {
    suppliersCache = await loadSuppliersFromCSV();
    console.log('✅ Suppliers loaded from CSV (fallback)');
    return suppliersCache || [];
  } catch (error) {
    console.error('Error loading suppliers from CSV:', error);
    return [];
  }
};

/**
 * Initialize suppliers (load from API or CSV)
 */
export const initializeSuppliers = async (): Promise<void> => {
  if (!suppliersCache) {
    await getSuppliers();
  }
};

/**
 * Get suppliers synchronously (returns cache if available)
 */
export const getSuppliersSync = (): Supplier[] => {
  return suppliersCache ?? [];
};

/**
 * Update suppliers cache
 */
export const setSuppliers = (suppliers: Supplier[]): void => {
  suppliersCache = suppliers;
};

/**
 * Clear suppliers cache (force refresh on next load)
 */
export const clearSuppliersCache = (): void => {
  suppliersCache = null;
};

/**
 * Search suppliers
 */
export const searchSuppliers = (query: string, suppliersList?: Supplier[]): Supplier[] => {
  const suppliers = suppliersList || getSuppliersSync();
  if (!query.trim()) return suppliers;
  
  const lowercaseQuery = query.toLowerCase();
  return suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(lowercaseQuery) ||
    supplier.address.toLowerCase().includes(lowercaseQuery) ||
    (supplier.city && supplier.city.toLowerCase().includes(lowercaseQuery)) ||
    supplier.country.toLowerCase().includes(lowercaseQuery) ||
    (supplier.gstin && supplier.gstin.toLowerCase().includes(lowercaseQuery))
  );
};

/**
 * Add a new supplier (via Supabase/API)
 */
export const addSupplier = async (supplierData: Omit<Supplier, 'id'>): Promise<Supplier> => {
  const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
  
  if (useSupabase) {
    try {
      // Try Supabase first
      const { supabaseSuppliersService } = await import('../services/supabaseSuppliersService');
      const newSupplier = await supabaseSuppliersService.createSupplier(supplierData);
      // Update cache
      const suppliers = getSuppliersSync();
      const mappedSupplier: Supplier = {
        id: newSupplier.id || (newSupplier as any).supplierId,
        name: newSupplier.name,
        address: newSupplier.address,
        city: newSupplier.city,
        country: newSupplier.country,
        email: newSupplier.email,
        phone: newSupplier.phone,
        gstin: newSupplier.gstin,
        isActive: newSupplier.isActive !== undefined ? newSupplier.isActive : true,
        specialties: newSupplier.specialties || [],
        rating: newSupplier.rating || 0,
        lastOrderDate: newSupplier.lastOrderDate,
      };
      suppliers.push(mappedSupplier);
      setSuppliers(suppliers);
      console.log('✅ Supplier added to Supabase:', mappedSupplier.name);
      return mappedSupplier;
    } catch (error) {
      console.error('❌ Error adding supplier via Supabase:', error);
      // Fall through to API/local cache
    }
  }
  
  try {
    const newSupplier = await suppliersAPI.createSupplier(supplierData);
    // Update cache
    const suppliers = getSuppliersSync();
    suppliers.push({
      id: newSupplier.supplierId,
      name: newSupplier.name,
      address: newSupplier.address,
      city: newSupplier.city,
      country: newSupplier.country,
      email: newSupplier.email,
      phone: newSupplier.phone,
      gstin: newSupplier.gstin,
      isActive: newSupplier.isActive,
      specialties: newSupplier.specialties || [],
      rating: parseFloat(newSupplier.rating) || 0,
      lastOrderDate: newSupplier.lastOrderDate,
    });
    setSuppliers(suppliers);
    return suppliers[suppliers.length - 1];
  } catch (error) {
    console.error('Error adding supplier via API:', error);
    // Fallback to local cache
    const suppliers = getSuppliersSync();
    const maxId = suppliers.reduce((max, s) => {
      const num = parseInt(s.id.replace('SUP', '') || '0');
      return num > max ? num : max;
    }, 0);
    
    const newSupplier: Supplier = {
      ...supplierData,
      id: `SUP${String(maxId + 1).padStart(3, '0')}`,
      isActive: true,
      rating: 0,
    };
    
    suppliers.push(newSupplier);
    setSuppliers(suppliers);
    return newSupplier;
  }
};

/**
 * Update an existing supplier (via Supabase or API)
 */
export const updateSupplier = async (id: string, supplierData: Partial<Supplier>): Promise<Supplier | null> => {
  const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
  
  if (useSupabase) {
    try {
      const { supabaseSuppliersService } = await import('../services/supabaseSuppliersService');
      // The service will handle finding by supplierId or database id
      // Just pass the id we have - service will figure it out
      const updatedSupplier = await supabaseSuppliersService.updateSupplier(id, supplierData);
      
      // Update cache - map the updated supplier back to frontend format
      const suppliers = getSuppliersSync();
      const index = suppliers.findIndex(s => {
        const sId = (s as any).supplierId || s.id;
        const updatedId = (updatedSupplier as any).supplierId || updatedSupplier.id;
        return s.id === id || sId === id || sId === updatedId;
      });
      
      if (index !== -1) {
        suppliers[index] = {
          id: (updatedSupplier as any).supplierId || updatedSupplier.id || suppliers[index].id,
          name: updatedSupplier.name,
          address: updatedSupplier.address,
          city: updatedSupplier.city,
          country: updatedSupplier.country,
          email: updatedSupplier.email,
          phone: updatedSupplier.phone,
          gstin: updatedSupplier.gstin,
          isActive: updatedSupplier.isActive,
          specialties: updatedSupplier.specialties || [],
          rating: updatedSupplier.rating || 0,
          lastOrderDate: (updatedSupplier as any).lastOrderDate,
        };
        setSuppliers(suppliers);
        return suppliers[index];
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating supplier via Supabase:', error);
      // Fallback to local cache
      const suppliers = getSuppliersSync();
      const index = suppliers.findIndex(s => s.id === id);
      if (index === -1) return null;
      suppliers[index] = { ...suppliers[index], ...supplierData };
      setSuppliers(suppliers);
      return suppliers[index];
    }
  } else {
    try {
      const updatedSupplier = await suppliersAPI.updateSupplier(id, supplierData);
      // Update cache
      const suppliers = getSuppliersSync();
      const index = suppliers.findIndex(s => s.id === id);
      if (index !== -1) {
        suppliers[index] = {
          id: updatedSupplier.supplierId,
          name: updatedSupplier.name,
          address: updatedSupplier.address,
          city: updatedSupplier.city,
          country: updatedSupplier.country,
          email: updatedSupplier.email,
          phone: updatedSupplier.phone,
          gstin: updatedSupplier.gstin,
          isActive: updatedSupplier.isActive,
          specialties: updatedSupplier.specialties || [],
          rating: parseFloat(updatedSupplier.rating) || 0,
          lastOrderDate: updatedSupplier.lastOrderDate,
        };
        setSuppliers(suppliers);
        return suppliers[index];
      }
      return null;
    } catch (error) {
      console.error('Error updating supplier via API:', error);
      // Fallback to local cache
      const suppliers = getSuppliersSync();
      const index = suppliers.findIndex(s => s.id === id);
      if (index === -1) return null;
      suppliers[index] = { ...suppliers[index], ...supplierData };
      setSuppliers(suppliers);
      return suppliers[index];
    }
  }
};

/**
 * Delete a supplier (via Supabase/API)
 */
export const deleteSupplier = async (id: string): Promise<boolean> => {
  const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
  
  if (useSupabase) {
    try {
      const { supabaseSuppliersService } = await import('../services/supabaseSuppliersService');
      await supabaseSuppliersService.deleteSupplier(id);
      // Update cache
      const suppliers = getSuppliersSync();
      const index = suppliers.findIndex(s => s.id === id);
      if (index !== -1) {
        suppliers.splice(index, 1);
        setSuppliers(suppliers);
      }
      console.log('✅ Supplier deleted from Supabase');
      return true;
    } catch (error) {
      console.error('❌ Error deleting supplier via Supabase:', error);
      // Fall through to API/local cache
    }
  }
  
  try {
    await suppliersAPI.deleteSupplier(id);
    // Update cache
    const suppliers = getSuppliersSync();
    const index = suppliers.findIndex(s => s.id === id);
    if (index !== -1) {
      suppliers.splice(index, 1);
      setSuppliers(suppliers);
    }
    return true;
  } catch (error) {
    console.error('Error deleting supplier via API:', error);
    // Fallback to local cache
    const suppliers = getSuppliersSync();
    const index = suppliers.findIndex(s => s.id === id);
    if (index === -1) return false;
    suppliers.splice(index, 1);
    setSuppliers(suppliers);
    return true;
  }
};

