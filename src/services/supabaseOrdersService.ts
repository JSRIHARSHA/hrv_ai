import { supabase } from './supabaseClient';

export interface SupabaseOrder {
  id?: number;
  orderId: string;
  createdAt: string;
  createdBy: any;
  customer: any;
  supplier: any;
  materialName: string;
  materials: any[];
  quantity: any;
  priceToCustomer: any;
  priceFromSupplier: any;
  status: string;
  documents?: any;
  advancePayment?: any;
  auditLogs?: any[];
  comments?: any[];
  assignedTo: any;
  approvalRequests?: any[];
  timeline?: any[];
  poNumber?: string;
  deliveryTerms?: string;
  incoterms?: string;
  eta?: string;
  notes?: string;
  entity?: string;
  orderType?: string;
  isLocked?: boolean;
  pendingFieldChanges?: any;
  [key: string]: any;
}

export const supabaseOrdersService = {
  // Get all orders
  getAllOrders: async (filters?: any) => {
    try {
      console.log('📥 Fetching orders from Supabase...');
      
      // Check authentication state
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      console.log('🔐 Auth session:', session ? 'Authenticated' : 'Not authenticated');
      if (authError) {
        console.warn('⚠️  Auth check error (this is OK if using anon key):', authError);
      }
      
      // CRITICAL: Select all columns including isLocked and pendingFieldChanges
      // Use select('*') to get all columns, but explicitly verify lock fields are included
      let query = supabase.from('orders').select('*').order('createdAt', { ascending: false });
      
      // Apply filters if provided
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.entity) {
        query = query.eq('entity', filters.entity);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Supabase fetch error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        
        // If it's an RLS error, provide helpful message
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          console.error('🚨 RLS POLICY ERROR: Orders table has RLS enabled but policies may not allow access.');
          console.error('💡 Solution: Run FIX_ORDERS_VISIBILITY.sql in Supabase SQL Editor');
        }
        
        throw error;
      }
      
      console.log('✅ Fetched orders from Supabase:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📋 Sample order IDs:', data.slice(0, 3).map((o: any) => o.orderId));
      }
      
      // Filter by assignedTo or createdBy if needed (JSONB filtering)
      let orders = data || [];
      
      if (filters?.assignedTo) {
        orders = orders.filter(order => 
          order.assignedTo?.userId === filters.assignedTo
        );
      }
      
      if (filters?.createdBy) {
        orders = orders.filter(order => 
          order.createdBy?.userId === filters.createdBy
        );
      }
      
      return orders;
    } catch (error: any) {
      console.error('❌ Error fetching orders from Supabase:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Get order by ID
  getOrderById: async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('orderId', orderId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching order from Supabase:', error);
      throw error;
    }
  },

  // Create order
  createOrder: async (orderData: SupabaseOrder) => {
    try {
      console.log('📝 Creating order in Supabase:', orderData.orderId);
      console.log('📝 Order data:', JSON.stringify(orderData, null, 2));
      
      // Ensure createdAt and updatedAt are set
      const now = new Date().toISOString();
      const orderDataWithTimestamps = {
        ...orderData,
        createdAt: orderData.createdAt || now,
        updatedAt: orderData.updatedAt || now,
      };
      
      console.log('📝 Order data with timestamps:', JSON.stringify(orderDataWithTimestamps, null, 2));
      
      const { data, error } = await supabase
        .from('orders')
        .insert([orderDataWithTimestamps])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase insert error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        throw error;
      }
      
      console.log('✅ Order created successfully in Supabase:', data?.orderId);
      return data;
    } catch (error: any) {
      console.error('❌ Error creating order in Supabase:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Update order
  updateOrder: async (orderId: string, updates: Partial<SupabaseOrder>) => {
    try {
      console.log('📝 Updating order in Supabase:', orderId);
      console.log('📝 Updates:', JSON.stringify(updates, null, 2));
      
      // CRITICAL: Include ALL fields from updates, especially isLocked and pendingFieldChanges
      // The spread operator should include everything, but we explicitly verify lock fields are present
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: updates.updatedAt || new Date().toISOString(),
      };
      
      // CRITICAL: Explicitly verify and log lock-related fields
      if (updates.isLocked !== undefined) {
        updatesWithTimestamp.isLocked = updates.isLocked;
        console.log('🔒 isLocked field included in update:', updates.isLocked);
      }
      if (updates.pendingFieldChanges !== undefined) {
        updatesWithTimestamp.pendingFieldChanges = updates.pendingFieldChanges;
        console.log('🔒 pendingFieldChanges field included in update:', JSON.stringify(updates.pendingFieldChanges));
      }
      
      console.log('📝 Updates with timestamp (all fields):', JSON.stringify(updatesWithTimestamp, null, 2));
      console.log('📝 isLocked in updatesWithTimestamp:', updatesWithTimestamp.isLocked);
      console.log('📝 pendingFieldChanges in updatesWithTimestamp:', updatesWithTimestamp.pendingFieldChanges);
      
      // First, try to find the order to verify it exists
      const { data: foundOrder, error: findError } = await supabase
        .from('orders')
        .select('id, orderId')
        .eq('orderId', orderId)
        .single();
      
      if (findError || !foundOrder) {
        console.error('❌ Order not found:', orderId);
        console.error('❌ Find error:', findError);
        throw new Error(`Order not found: ${orderId}`);
      }
      
      console.log('📝 Found order:', foundOrder);
      
      // Use database id for update (more reliable)
      const dbId = foundOrder.id;
      
      // CRITICAL: Log exactly what we're sending to Supabase
      console.log('📤 Sending to Supabase - isLocked:', updatesWithTimestamp.isLocked);
      console.log('📤 Sending to Supabase - pendingFieldChanges:', JSON.stringify(updatesWithTimestamp.pendingFieldChanges));
      console.log('📤 Full update payload keys:', Object.keys(updatesWithTimestamp));
      
      const { data, error } = await supabase
        .from('orders')
        .update(updatesWithTimestamp)
        .eq('id', dbId)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase update error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Update ID used:', dbId);
        console.error('❌ Update payload that failed:', JSON.stringify(updatesWithTimestamp, null, 2));
        
        // If error is about missing columns, provide helpful message
        if (error.message?.includes('column') || error.hint?.includes('column')) {
          console.error('🚨 DATABASE SCHEMA ISSUE: The orders table may be missing isLocked or pendingFieldChanges columns!');
          console.error('💡 Solution: Run this SQL in Supabase SQL Editor:');
          console.error('   ALTER TABLE orders ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN DEFAULT false;');
          console.error('   ALTER TABLE orders ADD COLUMN IF NOT EXISTS "pendingFieldChanges" JSONB;');
        }
        
        throw error;
      }
      
      console.log('✅ Order updated successfully in Supabase');
      console.log('✅ Response - isLocked:', data?.isLocked);
      console.log('✅ Response - pendingFieldChanges:', data?.pendingFieldChanges);
      console.log('✅ Full response keys:', Object.keys(data || {}));
      
      // CRITICAL: Verify that isLocked and pendingFieldChanges are in the response
      if (data && updatesWithTimestamp.isLocked !== undefined && data.isLocked !== updatesWithTimestamp.isLocked) {
        console.warn('⚠️ WARNING: isLocked was sent but not returned in response!');
        console.warn('⚠️ This suggests the database column may not exist or RLS is blocking it.');
        // Manually add it back to the response
        data.isLocked = updatesWithTimestamp.isLocked;
      }
      if (data && updatesWithTimestamp.pendingFieldChanges !== undefined && !data.pendingFieldChanges) {
        console.warn('⚠️ WARNING: pendingFieldChanges was sent but not returned in response!');
        // Manually add it back to the response
        data.pendingFieldChanges = updatesWithTimestamp.pendingFieldChanges;
      }
      
      return data;
    } catch (error: any) {
      console.error('❌ Error updating order in Supabase:', error);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Delete order
  deleteOrder: async (orderId: string) => {
    try {
      console.log('🗑️  Deleting order from Supabase:', orderId);
      
      // First, find the order to get database id
      const { data: foundOrder, error: findError } = await supabase
        .from('orders')
        .select('id, orderId')
        .eq('orderId', orderId)
        .single();
      
      if (findError || !foundOrder) {
        console.error('❌ Order not found:', orderId);
        throw new Error(`Order not found: ${orderId}`);
      }
      
      // Use database id for delete (more reliable)
      const dbId = foundOrder.id;
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', dbId);
      
      if (error) {
        console.error('❌ Supabase delete error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        throw error;
      }
      
      console.log('✅ Order deleted successfully from Supabase');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error deleting order from Supabase:', error);
      throw error;
    }
  },
};

