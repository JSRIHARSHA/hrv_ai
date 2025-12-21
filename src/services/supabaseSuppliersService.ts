import { supabase } from './supabaseClient';
import { Supplier } from '../data/suppliers';

export const supabaseSuppliersService = {
  // Get all suppliers
  getAllSuppliers: async (): Promise<Supplier[]> => {
    try {
      console.log('📥 Fetching suppliers from Supabase...');
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('❌ Supabase fetch error:', error);
        throw error;
      }
      
      console.log('✅ Fetched suppliers from Supabase:', data?.length || 0);
      return (data || []) as Supplier[];
    } catch (error: any) {
      console.error('❌ Error fetching suppliers from Supabase:', error);
      throw error;
    }
  },

  // Get supplier by ID
  getSupplierById: async (id: string): Promise<Supplier | null> => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Supplier | null;
    } catch (error: any) {
      console.error('Error fetching supplier from Supabase:', error);
      throw error;
    }
  },

  // Create supplier
  createSupplier: async (supplierData: Omit<Supplier, 'id'>): Promise<Supplier> => {
    try {
      console.log('📝 Creating supplier in Supabase:', supplierData.name);
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierData])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }
      
      console.log('✅ Supplier created successfully in Supabase:', data?.id);
      return data as Supplier;
    } catch (error: any) {
      console.error('❌ Error creating supplier in Supabase:', error);
      throw error;
    }
  },

  // Update supplier
  updateSupplier: async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
    try {
      console.log('📝 Updating supplier in Supabase:', id);
      console.log('📝 Updates:', JSON.stringify(updates, null, 2));
      
      // Add updatedAt timestamp
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      // First, try to find the supplier to determine which ID field to use
      let findQuery = supabase.from('suppliers').select('id, supplierId');
      
      // Try by supplierId first (if id looks like "SUP001")
      if (id.startsWith('SUP')) {
        findQuery = findQuery.eq('supplierId', id);
      } else {
        // Try by database id
        findQuery = findQuery.eq('id', parseInt(id) || id);
      }
      
      const { data: foundSupplier, error: findError } = await findQuery.single();
      
      if (findError || !foundSupplier) {
        console.error('❌ Supplier not found:', id);
        console.error('❌ Find error:', findError);
        throw new Error(`Supplier not found: ${id}`);
      }
      
      console.log('📝 Found supplier:', foundSupplier);
      
      // Use database id for update (more reliable)
      const dbId = foundSupplier.id;
      const updateQuery = supabase
        .from('suppliers')
        .update(updatesWithTimestamp)
        .eq('id', dbId);
      
      const { data, error } = await updateQuery.select().single();
      
      if (error) {
        console.error('❌ Supabase update error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Update ID used:', dbId);
        throw error;
      }
      
      console.log('✅ Supplier updated successfully in Supabase');
      return data as Supplier;
    } catch (error: any) {
      console.error('❌ Error updating supplier in Supabase:', error);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Delete supplier
  deleteSupplier: async (id: string): Promise<void> => {
    try {
      console.log('🗑️  Deleting supplier from Supabase:', id);
      
      // First, find the supplier to get database id
      let findQuery = supabase.from('suppliers').select('id, supplierId');
      
      if (id.startsWith('SUP')) {
        findQuery = findQuery.eq('supplierId', id);
      } else {
        findQuery = findQuery.eq('id', parseInt(id) || id);
      }
      
      const { data: foundSupplier, error: findError } = await findQuery.single();
      
      if (findError || !foundSupplier) {
        console.error('❌ Supplier not found:', id);
        throw new Error(`Supplier not found: ${id}`);
      }
      
      // Use database id for delete (more reliable)
      const dbId = foundSupplier.id;
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', dbId);
      
      if (error) {
        console.error('❌ Supabase delete error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        throw error;
      }
      
      console.log('✅ Supplier deleted successfully from Supabase');
    } catch (error: any) {
      console.error('❌ Error deleting supplier from Supabase:', error);
      throw error;
    }
  },

  // Bulk create suppliers
  bulkCreateSuppliers: async (suppliers: Omit<Supplier, 'id'>[]): Promise<Supplier[]> => {
    try {
      console.log('📝 Bulk creating suppliers in Supabase:', suppliers.length);
      const { data, error } = await supabase
        .from('suppliers')
        .insert(suppliers)
        .select();
      
      if (error) {
        console.error('❌ Supabase bulk insert error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Data being inserted:', JSON.stringify(suppliers.slice(0, 2), null, 2)); // Log first 2 for debugging
        throw error;
      }
      
      console.log('✅ Suppliers bulk created successfully in Supabase:', data?.length || 0);
      return (data || []) as Supplier[];
    } catch (error: any) {
      console.error('❌ Error bulk creating suppliers in Supabase:', error);
      throw error;
    }
  },
};

