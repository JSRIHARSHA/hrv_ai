import { supabase } from './supabaseClient';
import { FreightHandler } from '../types';

export const supabaseFreightHandlersService = {
  // Get all freight handlers
  getAllFreightHandlers: async (): Promise<FreightHandler[]> => {
    try {
      console.log('📥 Fetching freight handlers from Supabase...');
      const { data, error } = await supabase
        .from('freight_handlers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('❌ Supabase fetch error:', error);
        throw error;
      }
      
      console.log('✅ Fetched freight handlers from Supabase:', data?.length || 0);
      return (data || []) as FreightHandler[];
    } catch (error: any) {
      console.error('❌ Error fetching freight handlers from Supabase:', error);
      throw error;
    }
  },

  // Get freight handler by ID
  getFreightHandlerById: async (id: string): Promise<FreightHandler | null> => {
    try {
      const { data, error } = await supabase
        .from('freight_handlers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as FreightHandler | null;
    } catch (error: any) {
      console.error('Error fetching freight handler from Supabase:', error);
      throw error;
    }
  },

  // Create freight handler
  createFreightHandler: async (handlerData: Omit<FreightHandler, 'id'>): Promise<FreightHandler> => {
    try {
      console.log('📝 Creating freight handler in Supabase:', handlerData.name);
      const { data, error } = await supabase
        .from('freight_handlers')
        .insert([handlerData])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }
      
      console.log('✅ Freight handler created successfully in Supabase:', data?.id);
      return data as FreightHandler;
    } catch (error: any) {
      console.error('❌ Error creating freight handler in Supabase:', error);
      throw error;
    }
  },

  // Update freight handler
  updateFreightHandler: async (id: string, updates: Partial<FreightHandler>): Promise<FreightHandler> => {
    try {
      console.log('📝 Updating freight handler in Supabase:', id);
      console.log('📝 Updates:', JSON.stringify(updates, null, 2));
      
      // Add updatedAt timestamp
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      // First, try to find the handler to determine which ID field to use
      let query = supabase.from('freight_handlers').select('id, freightHandlerId');
      
      // Try by freightHandlerId first (if id looks like "fh-")
      if (id.startsWith('fh-')) {
        query = query.eq('freightHandlerId', id);
      } else {
        // Try by database id
        query = query.eq('id', parseInt(id) || id);
      }
      
      const { data: foundHandler, error: findError } = await query.single();
      
      if (findError || !foundHandler) {
        console.error('❌ Handler not found:', id);
        console.error('❌ Find error:', findError);
        throw new Error(`Freight handler not found: ${id}`);
      }
      
      console.log('📝 Found handler:', foundHandler);
      
      // Use database id for update (more reliable)
      const dbId = foundHandler.id;
      const updateQuery = supabase
        .from('freight_handlers')
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
      
      console.log('✅ Freight handler updated successfully in Supabase');
      return data as FreightHandler;
    } catch (error: any) {
      console.error('❌ Error updating freight handler in Supabase:', error);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Delete freight handler
  deleteFreightHandler: async (id: string): Promise<void> => {
    try {
      console.log('🗑️  Deleting freight handler from Supabase:', id);
      
      // First, find the handler to get database id
      let findQuery = supabase.from('freight_handlers').select('id, freightHandlerId');
      
      if (id.startsWith('fh-')) {
        findQuery = findQuery.eq('freightHandlerId', id);
      } else {
        findQuery = findQuery.eq('id', parseInt(id) || id);
      }
      
      const { data: foundHandler, error: findError } = await findQuery.single();
      
      if (findError || !foundHandler) {
        console.error('❌ Freight handler not found:', id);
        throw new Error(`Freight handler not found: ${id}`);
      }
      
      // Use database id for delete (more reliable)
      const dbId = foundHandler.id;
      const { error } = await supabase
        .from('freight_handlers')
        .delete()
        .eq('id', dbId);
      
      if (error) {
        console.error('❌ Supabase delete error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        throw error;
      }
      
      console.log('✅ Freight handler deleted successfully from Supabase');
    } catch (error: any) {
      console.error('❌ Error deleting freight handler from Supabase:', error);
      throw error;
    }
  },

  // Bulk create freight handlers
  bulkCreateFreightHandlers: async (handlers: Omit<FreightHandler, 'id'>[]): Promise<FreightHandler[]> => {
    try {
      console.log('📝 Bulk creating freight handlers in Supabase:', handlers.length);
      const { data, error } = await supabase
        .from('freight_handlers')
        .insert(handlers)
        .select();
      
      if (error) {
        console.error('❌ Supabase bulk insert error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Data being inserted:', JSON.stringify(handlers.slice(0, 2), null, 2)); // Log first 2 for debugging
        throw error;
      }
      
      console.log('✅ Freight handlers bulk created successfully in Supabase:', data?.length || 0);
      return (data || []) as FreightHandler[];
    } catch (error: any) {
      console.error('❌ Error bulk creating freight handlers in Supabase:', error);
      throw error;
    }
  },
};

