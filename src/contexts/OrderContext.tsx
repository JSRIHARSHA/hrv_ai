import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order, Comment, AuditLog, TimelineEvent, Documents, OrderStatus, ContactInfo } from '../types';
import { mockOrders } from '../data/mockData';
import { useAuth } from './AuthContext';
import { ExcelService } from '../services/excelService';
import { generateOrderId } from '../utils/orderIdGenerator';
import { sendStatusChangeEmail, initializeEmailJS } from '../services/emailService';
import { generateSampleOrders } from '../utils/generateSampleOrders';
import { ordersAPI } from '../services/apiService';
import { supabaseOrdersService } from '../services/supabaseOrdersService';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

interface OrderContextType {
  orders: Order[];
  getOrderById: (orderId: string) => Order | undefined;
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (orderId: string, newStatus: string, note?: string, approverEmail?: string) => void;
  addComment: (orderId: string, message: string, isInternal?: boolean) => void;
  addAuditLog: (orderId: string, fieldChanged: string, oldValue: any, newValue: any, note?: string) => void;
  addTimelineEvent: (orderId: string, event: string, details: string, status?: string) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<Order | null>;
  attachDocument: (orderId: string, documentType: keyof Documents, documentData: string, filename: string) => void;
  deleteDocument: (orderId: string, documentType: keyof Documents) => Promise<void>;
  replaceDocument: (orderId: string, documentType: keyof Documents, documentData: string, filename: string) => Promise<void>;
  isLoading: boolean;
  loadOrdersFromExcel: (file?: File) => Promise<void>;
  saveOrdersToExcel: () => Promise<void>;
  createSampleExcel: () => Promise<void>;
  refreshOrders: () => void;
  generateSampleOrders: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Initialize EmailJS on mount
  useEffect(() => {
    initializeEmailJS();
    
    // Expose generateSampleOrders globally for console access
    (window as any).generateSampleOrders = () => {
      const sampleOrders = generateSampleOrders();
      setOrders(sampleOrders);
      ExcelService.saveOrdersToLocalStorage(sampleOrders);
      console.log(`✅ Generated ${sampleOrders.length} sample orders (2 per status)`);
      console.log('📊 Orders saved to localStorage with key: orders_backup');
      toast.success(`Generated ${sampleOrders.length} sample orders and saved to localStorage!`);
      return sampleOrders;
    };
    
    console.log('💡 Tip: Run generateSampleOrders() in the console to create sample orders');
  }, []);

  useEffect(() => {
    // Check if we should use Supabase, API, or localStorage
    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;
    
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        if (useSupabase) {
          // Use Supabase directly
          console.log('🔄 Loading orders from Supabase...');
          try {
            const supabaseOrders = await supabaseOrdersService.getAllOrders();
            setOrders(supabaseOrders);
            // Also save to localStorage as backup
            ExcelService.saveOrdersToLocalStorage(supabaseOrders);
            console.log('✅ Orders loaded from Supabase:', supabaseOrders.length);
          } catch (error: any) {
            console.error('❌ Error loading orders from Supabase:', error);
            const errorMessage = error?.message || error?.details || 'Unknown error';
            const errorCode = error?.code || 'UNKNOWN';
            
            console.error('Full error details:', {
              code: errorCode,
              message: errorMessage,
              details: error?.details,
              hint: error?.hint,
              fullError: error,
            });
            
            // Fallback to localStorage if Supabase fails
            const localOrders = ExcelService.loadOrdersFromLocalStorage();
            setOrders(localOrders);
            console.log('⚠️  Supabase failed, using localStorage backup:', localOrders.length);
            toast.error(`Failed to load from database: ${errorMessage} (Code: ${errorCode}). Using cached data.`, {
              duration: 6000,
            });
          }
        } else if (useLocalStorageOnly) {
          console.log('Using localStorage-only mode (API disabled)');
          // Load from localStorage
          const localOrders = ExcelService.loadOrdersFromLocalStorage();
          
          // Check if we need to regenerate orders for the current user
          const needsRegeneration = localOrders.length < 36 || 
            (user && localOrders.length > 0 && 
             !localOrders.some(order => 
               order.createdBy.userId === user.userId || 
               order.assignedTo.userId === user.userId
             ));
          
          if (needsRegeneration) {
            console.log('Generating 36 sample orders (2 per status) for current user...');
            const userId = user?.userId || 'user1';
            const userName = user?.name || 'Test Employee 1';
            const userRole = (user?.role as 'Employee' | 'Manager' | 'Management') || 'Employee';
            
            const sampleOrders = generateSampleOrders(userId, userName, userRole);
            setOrders(sampleOrders);
            ExcelService.saveOrdersToLocalStorage(sampleOrders);
            console.log(`✅ Generated ${sampleOrders.length} sample orders (2 per status) for user: ${userId} (${userName})`);
          } else {
            const cleanedOrders = localOrders.map(order => {
              if (order.isLocked && (!order.pendingFieldChanges || order.pendingFieldChanges.status !== 'Pending')) {
                return {
                  ...order,
                  isLocked: false,
                  pendingFieldChanges: undefined,
                };
              }
              return order;
            });
            
            setOrders(cleanedOrders);
            ExcelService.saveOrdersToLocalStorage(cleanedOrders);
            console.log('✅ Orders loaded from localStorage:', cleanedOrders.length);
          }
        } else if (useAPI) {
          // Use API to load orders
          console.log('Loading orders from API...');
          try {
            const apiOrders = await ordersAPI.getAllOrders();
            setOrders(apiOrders);
            // Also save to localStorage as backup
            ExcelService.saveOrdersToLocalStorage(apiOrders);
            console.log('✅ Orders loaded from API:', apiOrders.length);
          } catch (error: any) {
            console.error('Error loading orders from API:', error);
            // Fallback to localStorage if API fails
            const localOrders = ExcelService.loadOrdersFromLocalStorage();
            setOrders(localOrders);
            console.log('⚠️  API failed, using localStorage backup:', localOrders.length);
            toast.error('Failed to load orders from server. Using cached data.');
          }
        } else {
          // No backend configured, use localStorage
          console.log('No backend configured, using localStorage');
          const localOrders = ExcelService.loadOrdersFromLocalStorage();
          if (localOrders.length === 0) {
            const sampleOrders = generateSampleOrders();
            setOrders(sampleOrders);
            ExcelService.saveOrdersToLocalStorage(sampleOrders);
          } else {
            setOrders(localOrders);
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        // On error, try to load from localStorage
        const localOrders = ExcelService.loadOrdersFromLocalStorage();
        if (localOrders.length > 0) {
          setOrders(localOrders);
        } else {
          // Last resort: generate sample orders
          const sampleOrders = generateSampleOrders();
          setOrders(sampleOrders);
          ExcelService.saveOrdersToLocalStorage(sampleOrders);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user]);

  // Refresh orders when page becomes visible (user switches back to tab/window)
  // This ensures all users see the latest lock status when they return to the app
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // Page became visible, refresh orders to get latest lock status
        console.log('🔄 Page became visible, refreshing orders...');
        // Check if we should use Supabase, API, or localStorage
        const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
        const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
        const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

        if (useSupabase) {
          try {
            const supabaseOrders = await supabaseOrdersService.getAllOrders();
            setOrders(supabaseOrders);
            ExcelService.saveOrdersToLocalStorage(supabaseOrders);
          } catch (error) {
            console.error('Error refreshing orders on visibility change:', error);
          }
        } else if (useAPI) {
          try {
            const apiOrders = await ordersAPI.getAllOrders();
            setOrders(apiOrders);
            ExcelService.saveOrdersToLocalStorage(apiOrders);
          } catch (error) {
            console.error('Error refreshing orders on visibility change:', error);
          }
        }
      }
    };

    const handleFocus = async () => {
      // Window gained focus, refresh orders
      console.log('🔄 Window gained focus, refreshing orders...');
      const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
      const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
      const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

      if (useSupabase) {
        try {
          const supabaseOrders = await supabaseOrdersService.getAllOrders();
          setOrders(supabaseOrders);
          ExcelService.saveOrdersToLocalStorage(supabaseOrders);
        } catch (error) {
          console.error('Error refreshing orders on focus:', error);
        }
      } else if (useAPI) {
        try {
          const apiOrders = await ordersAPI.getAllOrders();
          setOrders(apiOrders);
          ExcelService.saveOrdersToLocalStorage(apiOrders);
        } catch (error) {
          console.error('Error refreshing orders on focus:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // Empty deps - only set up listeners once

  const getOrderById = (orderId: string): Order | undefined => {
    return orders.find(order => order.orderId === orderId);
  };

  const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
    if (!user) {
      throw new Error('User must be authenticated to create orders');
    }

    // Check if we should use Supabase, API, or localStorage
    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

    // Generate sequential order ID in format YYYY-X (used only if no PO number provided)
    const generatedOrderId = generateOrderId(orders);

    const now = new Date().toISOString();
    const newOrder: Order = {
      // PO number is the canonical Order ID
      orderId: (orderData.poNumber as string) || (orderData.orderId as string) || generatedOrderId,
      createdAt: orderData.createdAt || now,
      updatedAt: orderData.updatedAt || now,
      createdBy: orderData.createdBy || {
        userId: user.userId,
        name: user.name,
        role: user.role
      },
      customer: orderData.customer || {
        name: '',
        address: '',
        country: '',
        email: '',
        phone: '',
        gstin: ''
      },
      // Supplier should be empty/null until user manually selects one
      supplier: orderData.supplier ?? null,
      materialName: orderData.materialName || '',
      materials: orderData.materials || [],
      quantity: orderData.quantity || { value: 1, unit: 'kg' },
      priceToCustomer: orderData.priceToCustomer || { amount: 0, currency: 'USD' },
      priceFromSupplier: orderData.priceFromSupplier || { amount: 0, currency: 'USD' },
      status: orderData.status || 'PO_Received_from_Client',
      documents: orderData.documents || {},
      advancePayment: orderData.advancePayment,
      auditLogs: orderData.auditLogs || [],
      comments: orderData.comments || [],
      assignedTo: orderData.assignedTo || {
        userId: user.userId,
        name: user.name,
        role: user.role
      },
      approvalRequests: orderData.approvalRequests || [],
      timeline: orderData.timeline || [],
      // Ensure poNumber mirrors orderId
      poNumber: (orderData.poNumber as string) || (orderData.orderId as string) || generatedOrderId,
      deliveryTerms: orderData.deliveryTerms,
      incoterms: orderData.incoterms,
      eta: orderData.eta,
      notes: orderData.notes,
      entity: orderData.entity,
      orderType: orderData.orderType,
    };

    if (useSupabase) {
      try {
        // Create order via Supabase
        console.log('Creating order via Supabase...');
        const createdOrder = await supabaseOrdersService.createOrder(newOrder as any);
        
        // Add the new order to the orders list
        setOrders(prevOrders => {
          const updatedOrders = [createdOrder as Order, ...prevOrders];
          // Save to localStorage backup
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        toast.success('Order created successfully!');
        return createdOrder as Order;
      } catch (error: any) {
        console.error('❌ Supabase create order failed:', error);
        const errorMessage = error?.message || error?.details || 'Unknown error';
        const errorCode = error?.code || 'UNKNOWN';
        
        // Show detailed error to user
        toast.error(`Failed to save to database: ${errorMessage} (Code: ${errorCode}). Saving locally.`, {
          duration: 6000,
        });
        
        console.error('Full error details:', {
          code: errorCode,
          message: errorMessage,
          details: error?.details,
          hint: error?.hint,
          fullError: error,
        });
        
        // Fallback to local storage
        setOrders(prevOrders => {
          const updatedOrders = [newOrder, ...prevOrders];
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        return newOrder;
      }
    } else if (useLocalStorageOnly) {
      // Use localStorage only
      setOrders(prevOrders => {
        const updatedOrders = [newOrder, ...prevOrders];
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
      return newOrder;
    } else if (useAPI) {
      try {
        // Try to create order via API
        console.log('Creating order via API...');
        const createdOrder = await ordersAPI.createOrder(newOrder);
        
        // Add the new order to the orders list
        setOrders(prevOrders => {
          const updatedOrders = [createdOrder, ...prevOrders];
          // Save to localStorage backup
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        toast.success('Order created successfully!');
        return createdOrder;
      } catch (error: any) {
        console.error('API create order failed, using local storage:', error);
        toast.error('Failed to save order to server. Saving locally.');
        
        // Fallback to local storage
        setOrders(prevOrders => {
          const updatedOrders = [newOrder, ...prevOrders];
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        return newOrder;
      }
    } else {
      // No backend, use localStorage
      setOrders(prevOrders => {
        const updatedOrders = [newOrder, ...prevOrders];
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
      return newOrder;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, note?: string, approverEmail?: string) => {
    if (!user) return;

    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    // Check if we should use Supabase, API, or localStorage
    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

    const oldStatus = order.status;
    const updatedOrder = {
      ...order,
      status: newStatus as any,
      auditLogs: [
        ...order.auditLogs,
        {
          timestamp: new Date().toISOString(),
          userId: user.userId,
          userName: user.name,
          fieldChanged: 'status',
          oldValue: oldStatus,
          newValue: newStatus,
          note: note || `Status changed to ${newStatus}`,
        },
      ],
      timeline: [
        ...order.timeline,
        {
          id: `timeline-${Date.now()}`,
          timestamp: new Date().toISOString(),
          event: 'Status Updated',
          actor: {
            userId: user.userId,
            name: user.name,
            role: user.role,
          },
          details: note || `Status changed from ${oldStatus} to ${newStatus}`,
          status: newStatus as any,
        },
      ],
    };

    if (useSupabase) {
      try {
        // Update order status via Supabase
        await supabaseOrdersService.updateOrder(orderId, {
          status: newStatus,
          auditLogs: updatedOrder.auditLogs,
          timeline: updatedOrder.timeline,
        } as any);
        
        // Update local state
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => 
            o.orderId === orderId ? updatedOrder : o
          );
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      } catch (error: any) {
        console.error('Supabase update order status failed, using local storage:', error);
        // Fallback to local storage
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => 
            o.orderId === orderId ? updatedOrder : o
          );
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      }
    } else if (useLocalStorageOnly) {
      // Update order status in localStorage only
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(o => 
          o.orderId === orderId ? updatedOrder : o
        );
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
    } else if (useAPI) {
      try {
        // Update order status via API
        await ordersAPI.updateOrderStatus(orderId, newStatus, note);
        
        // Update local state
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => 
            o.orderId === orderId ? updatedOrder : o
          );
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      } catch (error: any) {
        console.error('API update order status failed, using local storage:', error);
        // Fallback to local storage
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => 
            o.orderId === orderId ? updatedOrder : o
          );
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      }
    } else {
      // No backend, use localStorage
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(o => 
          o.orderId === orderId ? updatedOrder : o
        );
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
    }

    // Send email notifications for status changes
    if (newStatus === 'Sent_PO_for_Approval' && approverEmail) {
      sendStatusChangeEmail(updatedOrder, oldStatus as OrderStatus, newStatus as OrderStatus, approverEmail)
        .then(success => {
          if (success) {
            console.log(`✅ Email sent for order ${orderId} to ${approverEmail}`);
          }
        })
        .catch(error => {
          console.error('Email sending failed:', error);
        });
    } else if (newStatus === 'PO_Approved') {
      sendStatusChangeEmail(updatedOrder, oldStatus as OrderStatus, newStatus as OrderStatus)
        .then(success => {
          if (success) {
            console.log(`✅ PO Approved email sent for order ${orderId} to sriharshajvs@gmail.com`);
          }
        })
        .catch(error => {
          console.error('Email sending failed:', error);
        });
    } else if (newStatus === 'PO_Rejected') {
      sendStatusChangeEmail(updatedOrder, oldStatus as OrderStatus, newStatus as OrderStatus, undefined, { rejectionReason: note || 'No comments provided' })
        .then(success => {
          if (success) {
            console.log(`✅ PO Rejected email sent for order ${orderId} to sriharshajvs@gmail.com`);
          }
        })
        .catch(error => {
          console.error('Email sending failed:', error);
        });
    }
  };

  const addComment = async (orderId: string, message: string, isInternal: boolean = true) => {
    if (!user) return;

    // Check if we should use Supabase, API, or localStorage
    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      userName: user.name,
      message,
      isInternal,
    };

    const updatedComments = [...order.comments, newComment];

    if (useSupabase) {
      try {
        // Add comment via Supabase
        await supabaseOrdersService.updateOrder(orderId, {
          comments: updatedComments,
        } as any);
        
        // Update local state
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, comments: updatedComments };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      } catch (error: any) {
        console.error('Supabase add comment failed, using local storage:', error);
        // Fallback to local storage
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, comments: updatedComments };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      }
    } else if (useLocalStorageOnly) {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order => {
          if (order.orderId === orderId) {
            return {
              ...order,
              comments: updatedComments,
            };
          }
          return order;
        });
        
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
    } else if (useAPI) {
      try {
        // Add comment via API
        await ordersAPI.addComment(orderId, message, isInternal);
        
        // Update local state
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(order => {
            if (order.orderId === orderId) {
              return {
                ...order,
                comments: updatedComments,
              };
            }
            return order;
          });
          
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      } catch (error: any) {
        console.error('API add comment failed, using local storage:', error);
        // Fallback to local storage
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(order => {
            if (order.orderId === orderId) {
              return {
                ...order,
                comments: updatedComments,
              };
            }
            return order;
          });
          
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      }
    } else {
      // No backend, use localStorage
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order => {
          if (order.orderId === orderId) {
            return {
              ...order,
              comments: updatedComments,
            };
          }
          return order;
        });
        
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
    }
  };

  const addAuditLog = async (
    orderId: string,
    fieldChanged: string,
    oldValue: any,
    newValue: any,
    note?: string
  ) => {
    if (!user) return;

    // Check if we should use Supabase, API, or localStorage
    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    const newAuditLog: AuditLog = {
      timestamp: new Date().toISOString(),
      userId: user.userId,
      userName: user.name,
      fieldChanged,
      oldValue,
      newValue,
      note,
    };

    const updatedAuditLogs = [...order.auditLogs, newAuditLog];

    if (useSupabase) {
      try {
        await supabaseOrdersService.updateOrder(orderId, {
          auditLogs: updatedAuditLogs,
        } as any);
        
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, auditLogs: updatedAuditLogs };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      } catch (error: any) {
        console.error('Supabase add audit log failed, using local storage:', error);
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, auditLogs: updatedAuditLogs };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      }
    } else if (useAPI) {
      try {
        // API would handle this via updateOrder
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, auditLogs: updatedAuditLogs };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      } catch (error: any) {
        console.error('API add audit log failed, using local storage:', error);
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, auditLogs: updatedAuditLogs };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      }
    } else {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order => {
          if (order.orderId === orderId) {
            return {
              ...order,
              auditLogs: updatedAuditLogs,
            };
          }
          return order;
        });
        
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
    }
  };

  const addTimelineEvent = async (
    orderId: string,
    event: string,
    details: string,
    status?: string
  ) => {
    if (!user) return;

    // Check if we should use Supabase, API, or localStorage
    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    const newTimelineEvent: TimelineEvent = {
      id: `timeline-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event,
      actor: {
        userId: user.userId,
        name: user.name,
        role: user.role,
      },
      details,
      status: status as any,
    };

    const updatedTimeline = [...order.timeline, newTimelineEvent];

    if (useSupabase) {
      try {
        await supabaseOrdersService.updateOrder(orderId, {
          timeline: updatedTimeline,
        } as any);
        
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, timeline: updatedTimeline };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      } catch (error: any) {
        console.error('Supabase add timeline event failed, using local storage:', error);
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, timeline: updatedTimeline };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      }
    } else if (useLocalStorageOnly) {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order => {
          if (order.orderId === orderId) {
            return {
              ...order,
              timeline: updatedTimeline,
            };
          }
          return order;
        });
        
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
    } else if (useAPI) {
      try {
        // Add timeline event via API
        await ordersAPI.addTimelineEvent(orderId, event, details, status);
        
        // Update local state
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(order => {
            if (order.orderId === orderId) {
              return {
                ...order,
                timeline: updatedTimeline,
              };
            }
            return order;
          });
          
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      } catch (error: any) {
        console.error('API add timeline event failed, using local storage:', error);
        // Fallback to local storage
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(order => {
            if (order.orderId === orderId) {
              return {
                ...order,
                timeline: updatedTimeline,
              };
            }
            return order;
          });
          
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      }
    } else {
      // No backend, use localStorage
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order => {
          if (order.orderId === orderId) {
            return {
              ...order,
              timeline: updatedTimeline,
            };
          }
          return order;
        });
        
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<Order | null> => {
    // Check if we should use Supabase, API, or localStorage
    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

    if (useSupabase) {
      try {
        // Update order via Supabase
        console.log('Updating order via Supabase...');
        console.log('📝 Updates being sent:', JSON.stringify(updates, null, 2));
        console.log('📝 isLocked in updates:', updates.isLocked);
        console.log('📝 pendingFieldChanges in updates:', updates.pendingFieldChanges);
        
        const updatedOrder = await supabaseOrdersService.updateOrder(orderId, updates as any);
        
        console.log('✅ Order updated in Supabase:', updatedOrder?.orderId);
        console.log('✅ isLocked in response:', updatedOrder?.isLocked);
        console.log('✅ pendingFieldChanges in response:', updatedOrder?.pendingFieldChanges);
        
        // Update local state
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(order => 
            order.orderId === orderId ? updatedOrder as Order : order
          );
          // Save to localStorage backup
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        toast.success('Order updated successfully!');
        return updatedOrder as Order;
      } catch (error: any) {
        console.error('Supabase update order failed, using local storage:', error);
        toast.error('Failed to update order on database. Changes saved locally.');
        
        // Fallback to local storage
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(order => {
            if (order.orderId === orderId) {
              const merged = { ...order, ...updates };
              return merged;
            }
            return order;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
        
        const updatedOrder = orders.find(o => o.orderId === orderId);
        return updatedOrder ? { ...updatedOrder, ...updates } as Order : null;
      }
    } else if (useLocalStorageOnly) {
      // Update order in localStorage only
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order => {
          if (order.orderId === orderId) {
            const merged = { ...order, ...updates };
            return merged;
          }
          return order;
        });
        
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
      
      const updatedOrder = orders.find(o => o.orderId === orderId);
      return updatedOrder ? { ...updatedOrder, ...updates } as Order : null;
    } else if (useAPI) {
      try {
        // Update order via API
        console.log('Updating order via API...');
        const updatedOrder = await ordersAPI.updateOrder(orderId, updates);
        
        // Update local state
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(order => 
            order.orderId === orderId ? updatedOrder : order
          );
          // Save to localStorage backup
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        toast.success('Order updated successfully!');
        return updatedOrder;
      } catch (error: any) {
        console.error('API update order failed, using local storage:', error);
        toast.error('Failed to update order on server. Changes saved locally.');
        
        // Fallback to local storage
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(order => {
            if (order.orderId === orderId) {
              const merged = { ...order, ...updates };
              return merged;
            }
            return order;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
        
        const updatedOrder = orders.find(o => o.orderId === orderId);
        return updatedOrder ? { ...updatedOrder, ...updates } as Order : null;
      }
    } else {
      // No backend, use localStorage
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order => {
          if (order.orderId === orderId) {
            const merged = { ...order, ...updates };
            return merged;
          }
          return order;
        });
        
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });
      
      const updatedOrder = orders.find(o => o.orderId === orderId);
      return updatedOrder ? { ...updatedOrder, ...updates } as Order : null;
    }
  };

  const loadOrdersFromExcel = async (file?: File) => {
    setIsLoading(true);
    try {
      const excelOrders = await ExcelService.readOrdersFromExcel(file);
      setOrders(excelOrders);
      ExcelService.saveOrdersToLocalStorage(excelOrders);
    } catch (error) {
      console.error('Error loading orders from Excel:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const saveOrdersToExcel = async () => {
    try {
      await ExcelService.writeOrdersToExcel(orders);
    } catch (error) {
      console.error('Error saving orders to Excel:', error);
      throw error;
    }
  };

  const createSampleExcel = async () => {
    try {
      await ExcelService.createSampleExcelFile();
    } catch (error) {
      console.error('Error creating sample Excel:', error);
      throw error;
    }
  };

  const refreshOrders = async () => {
    // Check if we should use Supabase, API, or localStorage
    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

    if (useSupabase) {
      try {
        console.log('🔄 Refreshing orders from Supabase...');
        const supabaseOrders = await supabaseOrdersService.getAllOrders();
        setOrders(supabaseOrders);
        // Also save to localStorage as backup
        ExcelService.saveOrdersToLocalStorage(supabaseOrders);
        console.log('✅ Orders refreshed from Supabase:', supabaseOrders.length);
      } catch (error: any) {
        console.error('❌ Error refreshing orders from Supabase:', error);
        // Fallback to localStorage
        const localOrders = ExcelService.loadOrdersFromLocalStorage();
        if (localOrders.length > 0) {
          setOrders(localOrders);
        }
        toast.error('Failed to refresh orders from database');
      }
    } else if (useLocalStorageOnly) {
      const localOrders = ExcelService.loadOrdersFromLocalStorage();
      if (localOrders.length > 0) {
        setOrders(localOrders);
      }
    } else if (useAPI) {
      try {
        // Refresh orders from API
        const apiOrders = await ordersAPI.getAllOrders();
        setOrders(apiOrders);
        // Also save to localStorage as backup
        ExcelService.saveOrdersToLocalStorage(apiOrders);
        toast.success('Orders refreshed from server');
      } catch (error: any) {
        console.error('Error refreshing orders from API:', error);
        // Fallback to localStorage
        const localOrders = ExcelService.loadOrdersFromLocalStorage();
        if (localOrders.length > 0) {
          setOrders(localOrders);
        }
        toast.error('Failed to refresh orders from server');
      }
    } else {
      // No backend, use localStorage
      const localOrders = ExcelService.loadOrdersFromLocalStorage();
      if (localOrders.length > 0) {
        setOrders(localOrders);
      }
    }
  };

  const attachDocument = async (
    orderId: string, 
    documentType: keyof Documents, 
    documentData: string, 
    filename: string
  ) => {
    if (!user) return;

    // Check if we should use Supabase, API, or localStorage
    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    const newDocument = {
      id: `doc_${Date.now()}`,
      filename,
      uploadedAt: new Date().toISOString(),
      uploadedBy: {
        userId: user.userId,
        name: user.name,
      },
      fileSize: documentData.length,
      mimeType: 'application/pdf',
      data: documentData, // Store the actual document data (base64)
    };

    const updatedDocuments = {
      ...order.documents,
      [documentType]: newDocument,
    };

    if (useSupabase) {
      try {
        await supabaseOrdersService.updateOrder(orderId, {
          documents: updatedDocuments,
        } as any);
        
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, documents: updatedDocuments };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        // Add timeline event
        addTimelineEvent(
          orderId,
          'Document Attached',
          `Generated ${documentType} attached: ${filename}`,
          order.status
        );
      } catch (error: any) {
        console.error('Supabase attach document failed, using local storage:', error);
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, documents: updatedDocuments };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      }
    } else if (useLocalStorageOnly) {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order => {
          if (order.orderId === orderId) {
            return {
              ...order,
              documents: {
                ...order.documents,
                [documentType]: newDocument,
              },
            };
          }
          return order;
        });
        
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        
        // Add timeline event
        const order = prevOrders.find((o: Order) => o.orderId === orderId);
        if (order) {
          addTimelineEvent(
            orderId,
            'Document Attached',
            `Generated ${documentType} attached: ${filename}`,
            order.status
          );
        }
        
        return updatedOrders;
      });
    } else if (useAPI) {
      try {
        // Attach document via API
        await ordersAPI.attachDocument(orderId, documentType, documentData, filename);
        
        // Update local state
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, documents: updatedDocuments };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        // Add timeline event
        addTimelineEvent(
          orderId,
          'Document Attached',
          `Generated ${documentType} attached: ${filename}`,
          order.status
        );
      } catch (error: any) {
        console.error('API attach document failed, using local storage:', error);
        // Fallback to local storage
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, documents: updatedDocuments };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });
      }
    } else {
      // No backend, use localStorage
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(o => {
          if (o.orderId === orderId) {
            return { ...o, documents: updatedDocuments };
          }
          return o;
        });
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });

      // Add timeline event
      addTimelineEvent(
        orderId,
        'Document Attached',
        `Generated ${documentType} attached: ${filename}`,
        order.status
      );
    }
  };

  const deleteDocument = async (
    orderId: string,
    documentType: keyof Documents
  ): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to delete documents');
    }

    // Check if user has permission to delete documents
    const authorizedRoles = ['Manager', 'Management', 'Admin'];
    if (!authorizedRoles.includes(user.role)) {
      toast.error('You do not have permission to delete documents');
      throw new Error('Unauthorized to delete documents');
    }

    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

    const order = orders.find(o => o.orderId === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const updatedDocuments = { ...order.documents };
    const deletedDoc = updatedDocuments[documentType];
    delete updatedDocuments[documentType];

    if (useSupabase) {
      try {
        await supabaseOrdersService.updateOrder(orderId, {
          documents: updatedDocuments,
        } as any);

        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, documents: updatedDocuments };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        // Add timeline event
        addTimelineEvent(
          orderId,
          'Document Deleted',
          `${documentType} deleted: ${deletedDoc?.filename || 'document'}`,
          order.status
        );

        // Add audit log
        addAuditLog(
          orderId,
          `Document: ${documentType}`,
          deletedDoc?.filename || 'document',
          'Deleted',
          `Document deleted by ${user.name}`
        );

        toast.success('Document deleted successfully');
      } catch (error: any) {
        console.error('Supabase delete document failed:', error);
        toast.error('Failed to delete document from database');
        throw error;
      }
    } else if (useLocalStorageOnly) {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(o => {
          if (o.orderId === orderId) {
            return { ...o, documents: updatedDocuments };
          }
          return o;
        });
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });

      addTimelineEvent(
        orderId,
        'Document Deleted',
        `${documentType} deleted: ${deletedDoc?.filename || 'document'}`,
        order.status
      );

      addAuditLog(
        orderId,
        `Document: ${documentType}`,
        deletedDoc?.filename || 'document',
        'Deleted',
        `Document deleted by ${user.name}`
      );

      toast.success('Document deleted successfully');
    } else if (useAPI) {
      try {
        // Call API to delete document
        await ordersAPI.updateOrder(orderId, { documents: updatedDocuments } as any);

        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, documents: updatedDocuments };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        addTimelineEvent(
          orderId,
          'Document Deleted',
          `${documentType} deleted: ${deletedDoc?.filename || 'document'}`,
          order.status
        );

        addAuditLog(
          orderId,
          `Document: ${documentType}`,
          deletedDoc?.filename || 'document',
          'Deleted',
          `Document deleted by ${user.name}`
        );

        toast.success('Document deleted successfully');
      } catch (error: any) {
        console.error('API delete document failed:', error);
        toast.error('Failed to delete document');
        throw error;
      }
    } else {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(o => {
          if (o.orderId === orderId) {
            return { ...o, documents: updatedDocuments };
          }
          return o;
        });
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });

      addTimelineEvent(
        orderId,
        'Document Deleted',
        `${documentType} deleted: ${deletedDoc?.filename || 'document'}`,
        order.status
      );

      addAuditLog(
        orderId,
        `Document: ${documentType}`,
        deletedDoc?.filename || 'document',
        'Deleted',
        `Document deleted by ${user.name}`
      );

      toast.success('Document deleted successfully');
    }
  };

  const replaceDocument = async (
    orderId: string,
    documentType: keyof Documents,
    documentData: string,
    filename: string
  ): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to replace documents');
    }

    // Check if user has permission to replace documents
    const authorizedRoles = ['Manager', 'Management', 'Admin'];
    if (!authorizedRoles.includes(user.role)) {
      toast.error('You do not have permission to replace documents');
      throw new Error('Unauthorized to replace documents');
    }

    const useSupabase = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
    const useLocalStorageOnly = process.env.REACT_APP_USE_LOCALSTORAGE_ONLY === 'true';
    const useAPI = !useLocalStorageOnly && !useSupabase && process.env.REACT_APP_API_URL;

    const order = orders.find(o => o.orderId === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const oldDocument = order.documents[documentType];

    const newDocument = {
      id: `doc_${Date.now()}`,
      filename,
      uploadedAt: new Date().toISOString(),
      uploadedBy: {
        userId: user.userId,
        name: user.name,
      },
      fileSize: documentData.length,
      mimeType: 'application/pdf',
      data: documentData,
    };

    const updatedDocuments = {
      ...order.documents,
      [documentType]: newDocument,
    };

    if (useSupabase) {
      try {
        await supabaseOrdersService.updateOrder(orderId, {
          documents: updatedDocuments,
        } as any);

        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, documents: updatedDocuments };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        addTimelineEvent(
          orderId,
          'Document Replaced',
          `${documentType} replaced: ${oldDocument?.filename || 'previous document'} → ${filename}`,
          order.status
        );

        addAuditLog(
          orderId,
          `Document: ${documentType}`,
          oldDocument?.filename || 'previous document',
          filename,
          `Document replaced by ${user.name}`
        );

        toast.success('Document replaced successfully');
      } catch (error: any) {
        console.error('Supabase replace document failed:', error);
        toast.error('Failed to replace document in database');
        throw error;
      }
    } else if (useLocalStorageOnly) {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(o => {
          if (o.orderId === orderId) {
            return { ...o, documents: updatedDocuments };
          }
          return o;
        });
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });

      addTimelineEvent(
        orderId,
        'Document Replaced',
        `${documentType} replaced: ${oldDocument?.filename || 'previous document'} → ${filename}`,
        order.status
      );

      addAuditLog(
        orderId,
        `Document: ${documentType}`,
        oldDocument?.filename || 'previous document',
        filename,
        `Document replaced by ${user.name}`
      );

      toast.success('Document replaced successfully');
    } else if (useAPI) {
      try {
        await ordersAPI.updateOrder(orderId, { documents: updatedDocuments } as any);

        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(o => {
            if (o.orderId === orderId) {
              return { ...o, documents: updatedDocuments };
            }
            return o;
          });
          ExcelService.saveOrdersToLocalStorage(updatedOrders);
          return updatedOrders;
        });

        addTimelineEvent(
          orderId,
          'Document Replaced',
          `${documentType} replaced: ${oldDocument?.filename || 'previous document'} → ${filename}`,
          order.status
        );

        addAuditLog(
          orderId,
          `Document: ${documentType}`,
          oldDocument?.filename || 'previous document',
          filename,
          `Document replaced by ${user.name}`
        );

        toast.success('Document replaced successfully');
      } catch (error: any) {
        console.error('API replace document failed:', error);
        toast.error('Failed to replace document');
        throw error;
      }
    } else {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(o => {
          if (o.orderId === orderId) {
            return { ...o, documents: updatedDocuments };
          }
          return o;
        });
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });

      addTimelineEvent(
        orderId,
        'Document Replaced',
        `${documentType} replaced: ${oldDocument?.filename || 'previous document'} → ${filename}`,
        order.status
      );

      addAuditLog(
        orderId,
        `Document: ${documentType}`,
        oldDocument?.filename || 'previous document',
        filename,
        `Document replaced by ${user.name}`
      );

      toast.success('Document replaced successfully');
    }
  };

  const generateSampleOrdersHandler = () => {
    const sampleOrders = generateSampleOrders();
    setOrders(sampleOrders);
      ExcelService.saveOrdersToLocalStorage(sampleOrders);
    console.log(`✅ Generated ${sampleOrders.length} sample orders (2 per status)`);
    console.log('📊 Orders saved to localStorage with key: orders_backup');
    toast.success(`Generated ${sampleOrders.length} sample orders! They should appear on the dashboard now.`);
    // Force a page refresh to ensure orders are visible
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const value: OrderContextType = {
    orders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    addComment,
    addAuditLog,
    addTimelineEvent,
    updateOrder,
    attachDocument,
    deleteDocument,
    replaceDocument,
    isLoading,
    loadOrdersFromExcel,
    saveOrdersToExcel,
    createSampleExcel,
    refreshOrders,
    generateSampleOrders: generateSampleOrdersHandler,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
