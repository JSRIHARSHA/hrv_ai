import { supabase } from './supabaseClient';
import { Product } from '../types';

export const supabaseProductsService = {
  // Get all products
  getAllProducts: async (): Promise<Product[]> => {
    try {
      console.log('📥 Fetching products from Supabase...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('itemName', { ascending: true });
      
      if (error) {
        console.error('❌ Supabase fetch error:', error);
        throw error;
      }
      
      console.log('✅ Fetched products from Supabase:', data?.length || 0);
      return (data || []) as Product[];
    } catch (error: any) {
      console.error('❌ Error fetching products from Supabase:', error);
      throw error;
    }
  },

  // Get product by ID
  getProductById: async (id: string): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Product | null;
    } catch (error: any) {
      console.error('Error fetching product from Supabase:', error);
      throw error;
    }
  },

  // Create product
  createProduct: async (productData: Omit<Product, 'id'>): Promise<Product> => {
    try {
      console.log('📝 Creating product in Supabase:', productData.itemName);
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }
      
      console.log('✅ Product created successfully in Supabase:', data?.id);
      return data as Product;
    } catch (error: any) {
      console.error('❌ Error creating product in Supabase:', error);
      throw error;
    }
  },

  // Update product
  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
    try {
      console.log('📝 Updating product in Supabase:', id);
      console.log('📝 Updates:', JSON.stringify(updates, null, 2));
      
      // Add updatedAt timestamp
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      // First, try to find the product to determine which ID field to use
      let findQuery = supabase.from('products').select('id, productId');
      
      // Try by productId first (if id looks like a productId)
      if (isNaN(Number(id)) || id.includes('-') || id.length > 10) {
        findQuery = findQuery.eq('productId', id);
      } else {
        // Try by database id
        findQuery = findQuery.eq('id', parseInt(id) || id);
      }
      
      const { data: foundProduct, error: findError } = await findQuery.single();
      
      if (findError || !foundProduct) {
        console.error('❌ Product not found:', id);
        console.error('❌ Find error:', findError);
        throw new Error(`Product not found: ${id}`);
      }
      
      console.log('📝 Found product:', foundProduct);
      
      // Use database id for update (more reliable)
      const dbId = foundProduct.id;
      const updateQuery = supabase
        .from('products')
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
      
      console.log('✅ Product updated successfully in Supabase');
      return data as Product;
    } catch (error: any) {
      console.error('❌ Error updating product in Supabase:', error);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Delete product
  deleteProduct: async (id: string): Promise<void> => {
    try {
      console.log('🗑️  Deleting product from Supabase:', id);
      
      // First, find the product to get database id
      let findQuery = supabase.from('products').select('id, productId');
      
      if (isNaN(Number(id)) || id.includes('-') || id.length > 10) {
        findQuery = findQuery.eq('productId', id);
      } else {
        findQuery = findQuery.eq('id', parseInt(id) || id);
      }
      
      const { data: foundProduct, error: findError } = await findQuery.single();
      
      if (findError || !foundProduct) {
        console.error('❌ Product not found:', id);
        throw new Error(`Product not found: ${id}`);
      }
      
      // Use database id for delete (more reliable)
      const dbId = foundProduct.id;
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', dbId);
      
      if (error) {
        console.error('❌ Supabase delete error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        throw error;
      }
      
      console.log('✅ Product deleted successfully from Supabase');
    } catch (error: any) {
      console.error('❌ Error deleting product from Supabase:', error);
      throw error;
    }
  },

  // Bulk create products
  bulkCreateProducts: async (products: Omit<Product, 'id'>[]): Promise<Product[]> => {
    try {
      console.log('📝 Bulk creating products in Supabase:', products.length);
      const { data, error } = await supabase
        .from('products')
        .insert(products)
        .select();
      
      if (error) {
        console.error('❌ Supabase bulk insert error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Data being inserted:', JSON.stringify(products.slice(0, 2), null, 2)); // Log first 2 for debugging
        throw error;
      }
      
      console.log('✅ Products bulk created successfully in Supabase:', data?.length || 0);
      return (data || []) as Product[];
    } catch (error: any) {
      console.error('❌ Error bulk creating products in Supabase:', error);
      throw error;
    }
  },
};

