import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FreightHandler } from '../types';
import { mockFreightHandlers } from '../data/freightHandlers';
import { supabaseFreightHandlersService } from '../services/supabaseFreightHandlersService';
import toast from 'react-hot-toast';

interface FreightHandlerContextType {
  freightHandlers: FreightHandler[];
  getFreightHandlerById: (id: string) => FreightHandler | undefined;
  createFreightHandler: (handler: Omit<FreightHandler, 'id'>) => Promise<FreightHandler>;
  updateFreightHandler: (id: string, updates: Partial<FreightHandler>) => Promise<FreightHandler | null>;
  deleteFreightHandler: (id: string) => Promise<boolean>;
  searchFreightHandlers: (query: string) => FreightHandler[];
}

const FreightHandlerContext = createContext<FreightHandlerContextType | undefined>(undefined);

interface FreightHandlerProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'freight_handlers_backup';

export const FreightHandlerProvider: React.FC<FreightHandlerProviderProps> = ({ children }) => {
  // Initialize with mock data immediately to prevent empty state
  const [freightHandlers, setFreightHandlers] = useState<FreightHandler[]>(mockFreightHandlers);

  // Load freight handlers from Supabase or localStorage on mount
  useEffect(() => {
    const loadFreightHandlers = async () => {
      const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
      
      if (useSupabase) {
        try {
          console.log('🔄 Loading freight handlers from Supabase...');
          const handlers = await supabaseFreightHandlersService.getAllFreightHandlers();
          if (handlers.length > 0) {
            // Map Supabase handlers to frontend format
            // Use freightHandlerId as id if available, otherwise use database id
            const mappedHandlers = handlers.map((h: any) => ({
              ...h,
              id: h.freightHandlerId || h.id, // Use freightHandlerId as the primary id
            }));
            setFreightHandlers(mappedHandlers);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedHandlers));
            console.log('✅ Freight handlers loaded from Supabase:', mappedHandlers.length);
          } else {
            // If Supabase is empty, use mock data and seed it
            console.log('⚠️  Supabase is empty, using mock data and seeding...');
            setFreightHandlers(mockFreightHandlers);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mockFreightHandlers));
            
            // Try to seed mock data to Supabase
            try {
              const handlersToInsert = mockFreightHandlers.map(h => {
                const { id, ...rest } = h;
                return rest;
              });
              await supabaseFreightHandlersService.bulkCreateFreightHandlers(handlersToInsert);
              console.log('✅ Mock freight handlers seeded to Supabase');
            } catch (seedError) {
              console.error('⚠️  Failed to seed freight handlers to Supabase:', seedError);
            }
          }
        } catch (error) {
          console.error('❌ Error loading freight handlers from Supabase:', error);
          // Fallback to localStorage
          try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setFreightHandlers(parsed);
                return;
              }
            }
          } catch (localError) {
            console.error('Error loading from localStorage:', localError);
          }
          // Last resort: use mock data
          setFreightHandlers(mockFreightHandlers);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mockFreightHandlers));
        }
      } else {
        // No Supabase, use localStorage
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setFreightHandlers(parsed);
            } else {
              setFreightHandlers(mockFreightHandlers);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mockFreightHandlers));
            }
          } else {
            setFreightHandlers(mockFreightHandlers);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mockFreightHandlers));
          }
        } catch (error) {
          console.error('Error loading freight handlers:', error);
          setFreightHandlers(mockFreightHandlers);
        }
      }
    };

    loadFreightHandlers();
  }, []);

  // Save to localStorage whenever freight handlers change
  useEffect(() => {
    if (freightHandlers.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freightHandlers));
    }
  }, [freightHandlers]);

  const getFreightHandlerById = (id: string): FreightHandler | undefined => {
    return freightHandlers.find(handler => handler.id === id);
  };

  const createFreightHandler = async (handlerData: Omit<FreightHandler, 'id'>): Promise<FreightHandler> => {
    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    
    if (useSupabase) {
      try {
        const newHandler = await supabaseFreightHandlersService.createFreightHandler(handlerData);
        setFreightHandlers(prev => [...prev, newHandler]);
        toast.success('Freight handler created successfully');
        return newHandler;
      } catch (error: any) {
        console.error('Error creating freight handler in Supabase:', error);
        toast.error('Failed to save to database. Saving locally.');
        // Fallback to local
        const newHandler: FreightHandler = {
          ...handlerData,
          id: `fh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        setFreightHandlers(prev => [...prev, newHandler]);
        return newHandler;
      }
    } else {
      const newHandler: FreightHandler = {
        ...handlerData,
        id: `fh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      setFreightHandlers(prev => [...prev, newHandler]);
      toast.success('Freight handler created successfully');
      return newHandler;
    }
  };

  const updateFreightHandler = async (id: string, updates: Partial<FreightHandler>): Promise<FreightHandler | null> => {
    const handler = freightHandlers.find(h => h.id === id);
    if (!handler) {
      toast.error('Freight handler not found');
      return null;
    }

    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    
    if (useSupabase) {
      try {
        // Get the correct ID to use for Supabase update
        // If handler has freightHandlerId, use that; otherwise use the id
        const updateId = (handler as any).freightHandlerId || handler.id;
        console.log('🔄 Updating freight handler:', { frontendId: id, updateId, handler });
        
        const updatedHandler = await supabaseFreightHandlersService.updateFreightHandler(updateId, updates);
        
        // Map the updated handler to frontend format
        const mappedHandler = {
          ...updatedHandler,
          id: (updatedHandler as any).freightHandlerId || updatedHandler.id,
        };
        
        // Update local state - match by id
        setFreightHandlers(prev => prev.map(h => h.id === id ? mappedHandler : h));
        
        toast.success('Freight handler updated successfully');
        return mappedHandler;
      } catch (error: any) {
        console.error('❌ Error updating freight handler in Supabase:', error);
        console.error('❌ Error code:', error?.code);
        console.error('❌ Error message:', error?.message);
        console.error('❌ Error details:', error?.details);
        console.error('❌ Handler ID:', id);
        console.error('❌ Handler data:', handler);
        toast.error('Failed to update in database. Updating locally.');
        // Fallback to local
        const updatedHandler = { ...handler, ...updates };
        setFreightHandlers(prev => prev.map(h => h.id === id ? updatedHandler : h));
        return updatedHandler;
      }
    } else {
      const updatedHandler = { ...handler, ...updates };
      setFreightHandlers(prev => prev.map(h => h.id === id ? updatedHandler : h));
      toast.success('Freight handler updated successfully');
      return updatedHandler;
    }
  };

  const deleteFreightHandler = async (id: string): Promise<boolean> => {
    const handler = freightHandlers.find(h => h.id === id);
    if (!handler) {
      toast.error('Freight handler not found');
      return false;
    }

    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    
    if (useSupabase) {
      try {
        await supabaseFreightHandlersService.deleteFreightHandler(id);
        setFreightHandlers(prev => prev.filter(h => h.id !== id));
        toast.success('Freight handler deleted successfully');
        return true;
      } catch (error: any) {
        console.error('Error deleting freight handler in Supabase:', error);
        toast.error('Failed to delete from database. Deleting locally.');
        // Fallback to local
        setFreightHandlers(prev => prev.filter(h => h.id !== id));
        return true;
      }
    } else {
      setFreightHandlers(prev => prev.filter(h => h.id !== id));
      toast.success('Freight handler deleted successfully');
      return true;
    }
  };

  const searchFreightHandlers = (query: string): FreightHandler[] => {
    if (!query.trim()) return freightHandlers;
    
    const lowercaseQuery = query.toLowerCase();
    return freightHandlers.filter(handler => 
      handler.name.toLowerCase().includes(lowercaseQuery) ||
      handler.company.toLowerCase().includes(lowercaseQuery) ||
      handler.country.toLowerCase().includes(lowercaseQuery) ||
      handler.phone.toLowerCase().includes(lowercaseQuery) ||
      (handler.gstin && handler.gstin.toLowerCase().includes(lowercaseQuery))
    );
  };

  return (
    <FreightHandlerContext.Provider
      value={{
        freightHandlers,
        getFreightHandlerById,
        createFreightHandler,
        updateFreightHandler,
        deleteFreightHandler,
        searchFreightHandlers,
      }}
    >
      {children}
    </FreightHandlerContext.Provider>
  );
};

export const useFreightHandlers = (): FreightHandlerContextType => {
  const context = useContext(FreightHandlerContext);
  if (!context) {
    throw new Error('useFreightHandlers must be used within a FreightHandlerProvider');
  }
  return context;
};

