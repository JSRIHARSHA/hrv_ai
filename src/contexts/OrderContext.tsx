import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order, Comment, AuditLog, TimelineEvent, Documents } from '../types';
import { mockOrders } from '../data/mockData';
import { useAuth } from './AuthContext';
import { ExcelService } from '../services/excelService';
import { ordersAPI } from '../services/apiService';
import { generateOrderId } from '../utils/orderIdGenerator';

interface OrderContextType {
  orders: Order[];
  getOrderById: (orderId: string) => Order | undefined;
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (orderId: string, newStatus: string, note?: string) => void;
  addComment: (orderId: string, message: string, isInternal?: boolean) => void;
  addAuditLog: (orderId: string, fieldChanged: string, oldValue: any, newValue: any, note?: string) => void;
  addTimelineEvent: (orderId: string, event: string, details: string, status?: string) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  attachDocument: (orderId: string, documentType: keyof Documents, documentData: string, filename: string) => void;
  isLoading: boolean;
  loadOrdersFromExcel: (file?: File) => Promise<void>;
  saveOrdersToExcel: () => Promise<void>;
  createSampleExcel: () => Promise<void>;
  refreshOrders: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Try to load from API first, then fallback to localStorage, then mock data
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Try to load from API if user is authenticated
        if (user) {
          try {
            const apiOrders = await ordersAPI.getUserOrders();
            if (apiOrders && apiOrders.length > 0) {
              setOrders(apiOrders);
              // Backup to localStorage
              ExcelService.saveOrdersToLocalStorage(apiOrders);
              console.log('✅ Orders loaded from API');
              setIsLoading(false);
              return;
            }
          } catch (apiError) {
            console.log('API not available, falling back to localStorage:', apiError);
          }
        }
        
        // Try to load from localStorage backup
        const localOrders = ExcelService.loadOrdersFromLocalStorage();
        if (localOrders.length > 0) {
          setOrders(localOrders);
          console.log('✅ Orders loaded from localStorage');
        } else {
          // Fallback to mock data
          setOrders(mockOrders);
          // Save mock data to localStorage as backup
          ExcelService.saveOrdersToLocalStorage(mockOrders);
          console.log('✅ Orders loaded from mock data');
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        setOrders(mockOrders);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user]);

  const getOrderById = (orderId: string): Order | undefined => {
    return orders.find(order => order.orderId === orderId);
  };

  const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
    if (!user) {
      throw new Error('User must be authenticated to create orders');
    }

    // Generate sequential order ID in format YYYY-X
    const generatedOrderId = generateOrderId(orders);

    const newOrder: Order = {
      orderId: orderData.orderId || generatedOrderId,
      createdAt: new Date().toISOString(),
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
      supplier: orderData.supplier || {
        name: '',
        address: '',
        country: '',
        email: '',
        phone: '',
        gstin: ''
      },
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
      poNumber: orderData.poNumber,
      deliveryTerms: orderData.deliveryTerms,
      incoterms: orderData.incoterms,
      eta: orderData.eta,
      notes: orderData.notes
    };

    try {
      // Try to create order via API
      const createdOrder = await ordersAPI.createOrder(newOrder);
      
      // Add the new order to the orders list
      setOrders(prevOrders => {
        const updatedOrders = [createdOrder, ...prevOrders];
        // Save to localStorage backup
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });

      return createdOrder;
    } catch (error) {
      console.log('API create order failed, using local storage:', error);
      
      // Fallback to local storage
      setOrders(prevOrders => {
        const updatedOrders = [newOrder, ...prevOrders];
        // Save to localStorage backup
        ExcelService.saveOrdersToLocalStorage(updatedOrders);
        return updatedOrders;
      });

      return newOrder;
    }
  };

  const updateOrderStatus = (orderId: string, newStatus: string, note?: string) => {
    if (!user) return;

    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => {
        if (order.orderId === orderId) {
          const oldStatus = order.status;
          const newOrder = {
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
          return newOrder;
        }
        return order;
      });
      
      // Save to localStorage backup
      ExcelService.saveOrdersToLocalStorage(updatedOrders);
      return updatedOrders;
    });
  };

  const addComment = (orderId: string, message: string, isInternal: boolean = true) => {
    if (!user) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      userName: user.name,
      message,
      isInternal,
    };

    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => {
        if (order.orderId === orderId) {
          return {
            ...order,
            comments: [...order.comments, newComment],
          };
        }
        return order;
      });
      
      // Save to localStorage backup
      ExcelService.saveOrdersToLocalStorage(updatedOrders);
      return updatedOrders;
    });
  };

  const addAuditLog = (
    orderId: string,
    fieldChanged: string,
    oldValue: any,
    newValue: any,
    note?: string
  ) => {
    if (!user) return;

    const newAuditLog: AuditLog = {
      timestamp: new Date().toISOString(),
      userId: user.userId,
      userName: user.name,
      fieldChanged,
      oldValue,
      newValue,
      note,
    };

    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => {
        if (order.orderId === orderId) {
          return {
            ...order,
            auditLogs: [...order.auditLogs, newAuditLog],
          };
        }
        return order;
      });
      
      // Save to localStorage backup
      ExcelService.saveOrdersToLocalStorage(updatedOrders);
      return updatedOrders;
    });
  };

  const addTimelineEvent = (
    orderId: string,
    event: string,
    details: string,
    status?: string
  ) => {
    if (!user) return;

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

    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => {
        if (order.orderId === orderId) {
          return {
            ...order,
            timeline: [...order.timeline, newTimelineEvent],
          };
        }
        return order;
      });
      
      // Save to localStorage backup
      ExcelService.saveOrdersToLocalStorage(updatedOrders);
      return updatedOrders;
    });
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => {
        if (order.orderId === orderId) {
          return { ...order, ...updates };
        }
        return order;
      });
      
      // Save to localStorage backup
      ExcelService.saveOrdersToLocalStorage(updatedOrders);
      return updatedOrders;
    });
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

  const refreshOrders = () => {
    const localOrders = ExcelService.loadOrdersFromLocalStorage();
    if (localOrders.length > 0) {
      setOrders(localOrders);
    }
  };

  const attachDocument = (
    orderId: string, 
    documentType: keyof Documents, 
    documentData: string, 
    filename: string
  ) => {
    if (!user) return;

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
      
      // Save to localStorage backup
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
    isLoading,
    loadOrdersFromExcel,
    saveOrdersToExcel,
    createSampleExcel,
    refreshOrders,
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
