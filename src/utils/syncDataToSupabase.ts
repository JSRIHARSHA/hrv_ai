/**
 * Sync all data from CSVs and application to Supabase
 * This ensures Supabase is up to date with all data sources
 */

import { supabaseProductsService } from '../services/supabaseProductsService';
import { supabaseSuppliersService } from '../services/supabaseSuppliersService';
import { supabaseFreightHandlersService } from '../services/supabaseFreightHandlersService';
import { getProducts } from '../data/products';
import { getSuppliers } from '../data/suppliers';
import { mockFreightHandlers } from '../data/freightHandlers';
import { ExcelService } from '../services/excelService';
import toast from 'react-hot-toast';

export interface SyncResult {
  products: { synced: number; errors: number };
  suppliers: { synced: number; errors: number };
  freightHandlers: { synced: number; errors: number };
  orders: { synced: number; errors: number };
}

/**
 * Sync all data to Supabase
 */
export const syncAllDataToSupabase = async (): Promise<SyncResult> => {
  const result: SyncResult = {
    products: { synced: 0, errors: 0 },
    suppliers: { synced: 0, errors: 0 },
    freightHandlers: { synced: 0, errors: 0 },
    orders: { synced: 0, errors: 0 },
  };

  console.log('🔄 Starting data sync to Supabase...');

  try {
    // 1. Sync Products from CSV
    console.log('📦 Syncing products from CSV...');
    try {
      const products = await getProducts();
      if (products.length > 0) {
        const existingProducts = await supabaseProductsService.getAllProducts();
        
        // Transform products to match backend schema
        const now = new Date().toISOString();
        
        // Get existing product keys for comparison (check productId, itemId, and sku)
        const existingProductIds = new Set(
          existingProducts.map(p => (p as any).productId)
        );
        const existingItemIds = new Set(
          existingProducts.map(p => p.itemId).filter(Boolean)
        );
        const existingSkus = new Set(
          existingProducts.map(p => p.sku).filter(Boolean)
        );

        // Generate unique productIds and filter out existing products
        const seenProductIds = new Set<string>();
        const timestamp = Date.now();
        const productsToSync = products
          .map((p, index) => {
            const { id, ...rest } = p;
            
            // Skip if product already exists (check by itemId or sku)
            if (p.itemId && existingItemIds.has(p.itemId)) {
              return null; // Skip - already exists
            }
            if (p.sku && existingSkus.has(p.sku)) {
              return null; // Skip - already exists
            }
            
            // Generate unique productId
            // Priority: itemId > sku > generated
            let productId = p.itemId || p.sku || `PROD-${timestamp}-${index}`;
            
            // If productId already exists in database, make it unique
            if (existingProductIds.has(productId)) {
              productId = `${productId}-${timestamp}-${index}`;
            }
            
            // If productId already seen in this batch, make it unique
            if (seenProductIds.has(productId)) {
              productId = `${productId}-${index}`;
            }
            seenProductIds.add(productId);
            
            const productData: any = {
              ...rest,
              productId: productId, // Required unique field
              isActive: true, // Required field, always set to true
              taxable: rest.taxable !== undefined ? rest.taxable : true, // Default value
              status: rest.status || 'Active', // Default value
              createdAt: now, // Required by database
              updatedAt: now, // Required by database
            };
            return productData;
          })
          .filter((p): p is any => p !== null); // Remove nulls (existing products)

        if (productsToSync.length > 0) {
          await supabaseProductsService.bulkCreateProducts(productsToSync);
          result.products.synced = productsToSync.length;
          console.log(`✅ Synced ${productsToSync.length} new products`);
        } else {
          console.log('✅ All products already synced');
          result.products.synced = 0;
        }
      }
    } catch (error: any) {
      console.error('❌ Error syncing products:', error);
      result.products.errors = 1;
    }

    // 2. Sync Suppliers from CSV
    console.log('🏭 Syncing suppliers from CSV...');
    try {
      const suppliers = await getSuppliers();
      if (suppliers.length > 0) {
        const existingSuppliers = await supabaseSuppliersService.getAllSuppliers();
        
        // Transform suppliers to match backend schema
        const now = new Date().toISOString();
        const suppliersToSync = suppliers.map((s, index) => {
          const { id, ...rest } = s;
          return {
            ...rest,
            supplierId: s.id || `SUP-${Date.now()}-${index}`, // Required unique field
            isActive: rest.isActive !== undefined ? rest.isActive : true, // Required field
            specialties: rest.specialties || [], // Default value
            rating: rest.rating || 0, // Default value
            createdAt: now, // Required by database
            updatedAt: now, // Required by database
          };
        });

        // Get existing supplier keys (supplierId or name) for comparison
        const existingKeys = new Set(
          existingSuppliers.map(s => (s as any).supplierId || s.name || s.id)
        );

        // Filter out suppliers that already exist
        const newSuppliers = suppliersToSync.filter(
          s => !existingKeys.has(s.supplierId || s.name)
        );

        if (newSuppliers.length > 0) {
          await supabaseSuppliersService.bulkCreateSuppliers(newSuppliers);
          result.suppliers.synced = newSuppliers.length;
          console.log(`✅ Synced ${newSuppliers.length} new suppliers`);
        } else {
          console.log('✅ All suppliers already synced');
          result.suppliers.synced = 0;
        }
      }
    } catch (error: any) {
      console.error('❌ Error syncing suppliers:', error);
      result.suppliers.errors = 1;
    }

    // 3. Sync Freight Handlers from mock data
    console.log('🚚 Syncing freight handlers...');
    try {
      const existingHandlers = await supabaseFreightHandlersService.getAllFreightHandlers();
      
      // Transform freight handlers to match backend schema
      const now = new Date().toISOString();
      const handlersToSync = mockFreightHandlers.map((h, index) => {
        const { id, ...rest } = h;
        return {
          ...rest,
          freightHandlerId: h.id || `FH-${Date.now()}-${index}`, // Required unique field
          isActive: true, // Required field
          createdAt: now, // Required by database
          updatedAt: now, // Required by database
        };
      });

      // Get existing handler keys (freightHandlerId or name) for comparison
      const existingKeys = new Set(
        existingHandlers.map(h => (h as any).freightHandlerId || h.name || h.id)
      );

      // Filter out handlers that already exist
      const newHandlers = handlersToSync.filter(
        h => !existingKeys.has(h.freightHandlerId || h.name)
      );

      if (newHandlers.length > 0) {
        await supabaseFreightHandlersService.bulkCreateFreightHandlers(newHandlers);
        result.freightHandlers.synced = newHandlers.length;
        console.log(`✅ Synced ${newHandlers.length} new freight handlers`);
      } else {
        console.log('✅ All freight handlers already synced');
        result.freightHandlers.synced = 0;
      }
    } catch (error: any) {
      console.error('❌ Error syncing freight handlers:', error);
      result.freightHandlers.errors = 1;
    }

    // 4. Sync Orders from localStorage
    console.log('📋 Syncing orders from localStorage...');
    try {
      const localOrders = ExcelService.loadOrdersFromLocalStorage();
      if (localOrders.length > 0) {
        const { supabaseOrdersService } = await import('../services/supabaseOrdersService');
        const existingOrders = await supabaseOrdersService.getAllOrders();
        
        // Get existing order keys (orderId) for comparison
        const existingKeys = new Set(
          existingOrders.map(o => o.orderId)
        );

        // Filter out orders that already exist
        const newOrders = localOrders.filter(
          o => !existingKeys.has(o.orderId)
        );

        if (newOrders.length > 0) {
          // Insert orders one by one (bulk insert might fail due to size)
          let synced = 0;
          for (const order of newOrders) {
            try {
              // Remove any Supabase-specific fields
              const { id, ...orderData } = order as any;
              await supabaseOrdersService.createOrder(orderData);
              synced++;
            } catch (error: any) {
              console.error(`❌ Error syncing order ${order.orderId}:`, error);
              result.orders.errors++;
            }
          }
          result.orders.synced = synced;
          console.log(`✅ Synced ${synced} new orders`);
        } else {
          console.log('✅ All orders already synced');
          result.orders.synced = 0;
        }
      }
    } catch (error: any) {
      console.error('❌ Error syncing orders:', error);
      result.orders.errors = 1;
    }

    console.log('🎉 Data sync complete!', result);
    return result;
  } catch (error: any) {
    console.error('❌ Fatal error during sync:', error);
    throw error;
  }
};

/**
 * Sync data and show toast notification
 */
export const syncDataWithNotification = async () => {
  try {
    toast.loading('Syncing data to Supabase...', { id: 'sync' });
    const result = await syncAllDataToSupabase();
    
    const totalSynced = 
      result.products.synced + 
      result.suppliers.synced + 
      result.freightHandlers.synced + 
      result.orders.synced;
    
    const totalErrors = 
      result.products.errors + 
      result.suppliers.errors + 
      result.freightHandlers.errors + 
      result.orders.errors;

    if (totalErrors > 0) {
      toast.error(
        `Sync complete with errors. Synced: ${totalSynced}, Errors: ${totalErrors}`,
        { id: 'sync', duration: 5000 }
      );
    } else if (totalSynced > 0) {
      toast.success(
        `Successfully synced ${totalSynced} items to Supabase!`,
        { id: 'sync', duration: 4000 }
      );
    } else {
      toast.success('All data is already up to date!', { id: 'sync', duration: 3000 });
    }
  } catch (error: any) {
    toast.error('Failed to sync data: ' + (error.message || 'Unknown error'), {
      id: 'sync',
      duration: 5000,
    });
  }
};

