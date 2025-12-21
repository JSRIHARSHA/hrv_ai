import { Product } from '../types';
import * as XLSX from 'xlsx';

// Re-export Product type for convenience
export type { Product } from '../types';

const STORAGE_KEY = 'products_backup';
let productsCache: Product[] | null = null;

/**
 * Load products from CSV file
 */
const loadProductsFromCSV = async (): Promise<Product[]> => {
  try {
    const response = await fetch('/HRV GLobal Items Master file.csv');
    if (!response.ok) {
      throw new Error('Failed to load CSV file');
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    if (lines.length < 2) {
      return [];
    }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Parse data rows
    const products: Product[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle CSV parsing with quoted fields
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim()); // Add last value
      
      if (values.length < headers.length) continue;
      
      const product: Product = {
        id: `product-${i}`,
        itemId: values[headers.indexOf('Item ID')] || '',
        itemName: values[headers.indexOf('Item Name')] || '',
        sku: values[headers.indexOf('SKU')] || '',
        upc: values[headers.indexOf('UPC')] || undefined,
        hsnSac: values[headers.indexOf('HSN/SAC')] || undefined,
        categoryName: values[headers.indexOf('Category Name')] || undefined,
        productType: values[headers.indexOf('Product Type')] || undefined,
        unitName: values[headers.indexOf('Unit Name')] || undefined,
        defaultSalesUnitName: values[headers.indexOf('Default Sales Unit Name')] || undefined,
        defaultPurchaseUnitName: values[headers.indexOf('Default Purchase Unit Name')] || undefined,
        vendor: values[headers.indexOf('Vendor')] || undefined,
        warehouseName: values[headers.indexOf('Warehouse Name')] || undefined,
        status: values[headers.indexOf('Status')] || undefined,
        taxable: values[headers.indexOf('Taxable')]?.toLowerCase() === 'true',
        intraStateTaxRate: values[headers.indexOf('Intra State Tax Rate')] ? parseFloat(values[headers.indexOf('Intra State Tax Rate')]) : undefined,
        interStateTaxRate: values[headers.indexOf('Inter State Tax Rate')] ? parseFloat(values[headers.indexOf('Inter State Tax Rate')]) : undefined,
        inventoryAccount: values[headers.indexOf('Inventory Account')] || undefined,
        reorderPoint: values[headers.indexOf('Reorder Point')] ? parseFloat(values[headers.indexOf('Reorder Point')]) : undefined,
        stockOnHand: values[headers.indexOf('Stock On Hand')] ? parseFloat(values[headers.indexOf('Stock On Hand')]) : undefined,
        itemType: values[headers.indexOf('Item Type')] || undefined,
      };
      
      // Only add if itemName is not empty
      if (product.itemName) {
        products.push(product);
      }
    }
    
    return products;
  } catch (error) {
    console.error('Error loading products from CSV:', error);
    return [];
  }
};

/**
 * Get products (load from CSV or cache)
 */
export const getProducts = async (): Promise<Product[]> => {
  if (productsCache) {
    return productsCache;
  }
  
  // Try to load from localStorage first
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      productsCache = JSON.parse(stored);
      if (productsCache && productsCache.length > 0) {
        return productsCache;
      }
    }
  } catch (error) {
    console.error('Error loading products from localStorage:', error);
  }
  
  // Load from CSV
  productsCache = await loadProductsFromCSV();
  
  // Save to localStorage
  if (productsCache && productsCache.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(productsCache));
  }
  
  return productsCache || [];
};

/**
 * Initialize products
 */
export const initializeProducts = async (): Promise<void> => {
  if (!productsCache) {
    await getProducts();
  }
};

/**
 * Get products synchronously (returns cache if available)
 */
export const getProductsSync = (): Product[] => {
  return productsCache ?? [];
};

/**
 * Update products cache
 */
export const setProducts = (products: Product[]): void => {
  productsCache = products;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
};

/**
 * Search products
 */
export const searchProducts = (query: string, productsList?: Product[]): Product[] => {
  const products = productsList || getProductsSync();
  if (!query.trim()) return products;
  
  const lowercaseQuery = query.toLowerCase();
  return products.filter(product => 
    product.itemName.toLowerCase().includes(lowercaseQuery) ||
    product.sku.toLowerCase().includes(lowercaseQuery) ||
    (product.itemId && product.itemId.toLowerCase().includes(lowercaseQuery)) ||
    (product.hsnSac && product.hsnSac.toLowerCase().includes(lowercaseQuery)) ||
    (product.categoryName && product.categoryName.toLowerCase().includes(lowercaseQuery)) ||
    (product.vendor && product.vendor.toLowerCase().includes(lowercaseQuery))
  );
};

/**
 * Get product by ID
 */
export const getProductById = (id: string): Product | undefined => {
  const products = getProductsSync();
  return products.find(p => p.id === id);
};

/**
 * Add product
 */
export const addProduct = (product: Omit<Product, 'id'>): Product => {
  const products = getProductsSync();
  const newProduct: Product = {
    ...product,
    id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  const updatedProducts = [...products, newProduct];
  setProducts(updatedProducts);
  return newProduct;
};

/**
 * Update product (via Supabase or local)
 */
export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product | null> => {
  const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
  
  if (useSupabase) {
    try {
      const { supabaseProductsService } = await import('../services/supabaseProductsService');
      // The service will handle finding by productId or database id
      // Just pass the id we have - service will figure it out
      const updatedProduct = await supabaseProductsService.updateProduct(id, updates);
      
      // Update cache - map the updated product back to frontend format
      const products = getProductsSync();
      const index = products.findIndex(p => {
        const pId = (p as any).productId || p.id;
        const updatedId = (updatedProduct as any).productId || updatedProduct.id;
        return p.id === id || pId === id || pId === updatedId;
      });
      
      if (index !== -1) {
        products[index] = {
          ...products[index],
          ...updatedProduct,
          id: products[index].id, // Keep original frontend id
        };
        setProducts(products);
        return products[index];
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating product via Supabase:', error);
      // Fallback to local cache
      const products = getProductsSync();
      const index = products.findIndex(p => p.id === id);
      if (index === -1) return null;
      const updatedProduct = { ...products[index], ...updates };
      const updatedProducts = [...products];
      updatedProducts[index] = updatedProduct;
      setProducts(updatedProducts);
      return updatedProduct;
    }
  } else {
    // Local only
    const products = getProductsSync();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    const updatedProduct = { ...products[index], ...updates };
    const updatedProducts = [...products];
    updatedProducts[index] = updatedProduct;
    setProducts(updatedProducts);
    return updatedProduct;
  }
};

/**
 * Delete product
 */
export const deleteProduct = (id: string): boolean => {
  const products = getProductsSync();
  const filteredProducts = products.filter(p => p.id !== id);
  if (filteredProducts.length === products.length) return false;
  
  setProducts(filteredProducts);
  return true;
};

