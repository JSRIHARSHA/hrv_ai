import React, { useState, useEffect, useRef, startTransition, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Link,
  Autocomplete,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  AttachFile,
  Comment,
  Timeline,
  History,
  Download,
  Visibility,
  Save,
  Search,
  Clear,
  CloudUpload,
  Send,
  CheckCircle,
  Delete,
  CloudUpload as CloudUploadIcon,
  Add,
  Close,
  Info,
  Assignment,
  Inventory,
  Business,
  Payment,
  LocalShipping,
  Summarize,
  Folder,
  Receipt,
  Warehouse,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { useTheme } from '../contexts/ThemeContext';
import { Order, FreightHandler, Documents, LogisticsSubStatus, LogisticsDocuments, ContactInfo, OrderStatus, MaterialItem } from '../types';
import { 
  statusDisplayNames,
  getLogisticsSubStatusDisplayName,
  logisticsSubStatusDisplayNames,
} from '../data/constants';
import { mockUsers } from '../data/constants';
import { mockFreightHandlers, searchFreightHandlers } from '../data/freightHandlers';
import { Supplier, searchSuppliers, getSuppliers } from '../data/suppliers';
import { getProducts, Product } from '../data/products';
import toast from 'react-hot-toast';
import AppBanner from '../components/AppBanner';
import AIPDFGenerationModal from '../components/AIPDFGenerationModal';
import { Dock, DockItem, DockIcon, DockLabel } from '../components/Dock';
import { convertCurrency, getSupportedCurrencies } from '../utils/currencyConverter';
import { generateSupplierPO, downloadSupplierPO } from '../utils/pdfGenerator';
import { generateHRVPO, previewHRVPO } from '../utils/hrvPdfGenerator';
import { previewHRVPOFromOrder } from '../utils/hrvPdfLibGenerator';
import { previewNHGPOFromOrder } from '../utils/nhgPdfLibGenerator';
import { getHRVPDFConfig } from '../config/hrvPdfConfig';
import { getTemplateUrl } from '../config/hrvPdfTemplateConfig';

// Helper function to format amounts with thousands separator based on currency
const formatAmount = (amount: number | null | undefined, currency: string = 'USD'): string => {
  // Handle null/undefined values
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00';
  }
  
  // Use Indian numbering system for INR, otherwise use standard
  if (currency === 'INR') {
    // Indian numbering: lakhs and crores (or standard with commas)
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    // Standard numbering with commas
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
};

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useTheme();
  const { orders, getOrderById, updateOrderStatus, addComment, addTimelineEvent, attachDocument, deleteDocument, replaceDocument, updateOrder, addAuditLog, isLoading, refreshOrders } = useOrders();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [aiPdfModalOpen, setAiPdfModalOpen] = useState(false);
  
  // Editable fields state
  const [editableOrder, setEditableOrder] = useState<Order | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [supportedCurrencies] = useState<string[]>(getSupportedCurrencies());
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [customRate, setCustomRate] = useState<string>('');
  const justSavedRef = useRef(false);
  const lastSavedOrderRef = useRef<Order | null>(null);
  const savedSupplierDataRef = useRef<ContactInfo | null>(null);
  const ignoreContextUpdatesRef = useRef(false);
  // CRITICAL: This ref holds the "committed" order that should always be displayed
  // It can only be updated by user edits or explicit save - never by context updates
  const committedOrderRef = useRef<Order | null>(null);
  // ORIGINAL: This ref holds the ORIGINAL order state when first loaded - used for change detection
  // This should NEVER be updated except when order is first loaded from backend
  const originalOrderRef = useRef<Order | null>(null);
  // Track the last orderId to detect navigation
  const lastOrderIdRef = useRef<string | null>(null);
  // Ref for Select field width measurement
  const selectFieldRef = useRef<HTMLDivElement>(null);
  
  // PDF generation state
  const [generatedPDF, setGeneratedPDF] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [taxRateDialogOpen, setTaxRateDialogOpen] = useState(false);
  // PO version tracking
  const [poVersion, setPoVersion] = useState<number>(0);
  const [poBaselineState, setPoBaselineState] = useState<{
    materials: Array<{ id: string; name: string; quantity: { value: number; unit: string }; supplierUnitPrice?: { amount: number; currency: string } }>;
    freightHandler: FreightHandler | null;
  } | null>(null);
  const [selectedTaxRate, setSelectedTaxRate] = useState<number>(0.1);
  const [selectedTerms, setSelectedTerms] = useState<string>('90 days credit from the date of GRN');
  const [termsOfDelivery, setTermsOfDelivery] = useState<string>('FREE DELIVERY TO WAREHOUSE');
  const [termsAndConditions, setTermsAndConditions] = useState<string>(
    "1. Material must be manufactured less than 3 months from date of dispatch\n" +
    "2. The material should have at least 90% shelf life at the time of delivery.\n" +
    "3. Pre shipment COA's must be shared for approval before dispatch\n" +
    "4. All required documents including CoA, Packing List, MOA, Licenses, etc., must be duly provided by manufacturer\n" +
    "5. Delivery : Immediately\n" +
    "6. Kindly arrange minimum quantity of WS along with the shipment\n" +
    "7. TDS is applicable as per Finance act 2025."
  );
  
  // Approver selection state
  const [approverDialogOpen, setApproverDialogOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<string>('');
  const [fieldChangesApprovalDialogOpen, setFieldChangesApprovalDialogOpen] = useState(false);
  const [selectedFieldChangesApprover, setSelectedFieldChangesApprover] = useState<string>('');
  const [pendingFieldChangesData, setPendingFieldChangesData] = useState<{
    fields: Array<{ field: string; oldValue: any; newValue: any }>;
  } | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  
  // Rejection comments state
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionComments, setRejectionComments] = useState<string>('');
  
  // Document viewing state
  const [viewingDocument, setViewingDocument] = useState<{ name: string; data: string } | null>(null);
  
  // Freight handler state
  const [freightHandlerSearch, setFreightHandlerSearch] = useState('');
  const [filteredFreightHandlers, setFilteredFreightHandlers] = useState<FreightHandler[]>([]);
  const [showFreightHandlerDropdown, setShowFreightHandlerDropdown] = useState(false);
  
  // Supplier state
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOptions, setSupplierOptions] = useState<Supplier[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  
  // Products state for item details dropdown
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const supplierAutocompleteValue = useMemo<Supplier | null>(() => {
    if (!editableOrder?.supplier?.name) {
      return null;
    }

    const supplierInfo = editableOrder.supplier;
    if (!supplierInfo) {
      return null;
    }

    const matchedSupplier = supplierOptions.find(
      (s) => s.name === supplierInfo.name
    );

    if (matchedSupplier) {
      return matchedSupplier;
    }

    return {
      id: `temp-${editableOrder.orderId || supplierInfo.name || 'supplier'}`,
      name: supplierInfo.name,
      address: supplierInfo.address || '',
      country: supplierInfo.country || '',
      email: supplierInfo.email || '',
      phone: supplierInfo.phone || '',
      gstin: supplierInfo.gstin || '',
      isActive: true,
      specialties: [],
      rating: 0,
    };
  }, [editableOrder?.supplier, editableOrder?.orderId, supplierOptions]);
  

  // Section navigation state - null means show all sections
  const [selectedSection, setSelectedSection] = useState<string | null>('itemTable');
  
  
  // Track fields that require approval
  const [approvalRequiredFields, setApprovalRequiredFields] = useState<Set<string>>(new Set());
  const [showApprovalTooltip, setShowApprovalTooltip] = useState<string | null>(null);
  
  // Helper function to check if user can delete/replace documents
  const canManageDocuments = (): boolean => {
    if (!user) return false;
    const authorizedRoles = ['Manager', 'Management', 'Admin'];
    return authorizedRoles.includes(user.role);
  };

  // Helper function to check if status has passed PO_Approved
  const hasStatusPassedPOApproved = (status: OrderStatus): boolean => {
    const statusOrder: OrderStatus[] = [
      'PO_Received_from_Client',
      'Drafting_PO_for_Supplier',
      'Sent_PO_for_Approval',
      'PO_Rejected',
      'PO_Approved',
      'PO_Sent_to_Supplier',
      'Proforma_Invoice_Received',
      'Awaiting_COA',
      'COA_Received',
      'COA_Revision',
      'COA_Accepted',
      'Awaiting_Approval',
      'Approved',
      'Advance_Payment_Completed',
      'Material_to_be_Dispatched',
      'Material_Dispatched',
      'In_Transit',
      'Completed',
    ];
    const currentIndex = statusOrder.indexOf(status);
    const poApprovedIndex = statusOrder.indexOf('PO_Approved');
    return currentIndex > poApprovedIndex;
  };
  
  // Check if a field requires approval
  const requiresApproval = (field: string): boolean => {
    const approvalRequiredFieldNames = ['quantity', 'priceToCustomer', 'priceFromSupplier', 'materialName'];
    return approvalRequiredFieldNames.includes(field) || 
           field.includes('supplierUnitPrice') || 
           field.includes('unitPrice') ||
           field.includes('Material Name');
  };
  
  // Check if order is locked and fields should be disabled
  const isOrderLocked = (): boolean => {
    return !!(editableOrder?.isLocked && editableOrder?.pendingFieldChanges?.status === 'Pending');
  };
  
  // Item Table state
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [tdsOrTcs, setTdsOrTcs] = useState<'TDS' | 'TCS'>('TDS');
  const [tdsRate, setTdsRate] = useState<number>(0.1);
  const [tcsRate, setTcsRate] = useState<number>(0);
  const [adjustment, setAdjustment] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'currency' | 'percentage'>('currency');
  const [materialsViewMode, setMaterialsViewMode] = useState<'customer' | 'supplier'>('customer');
  const [supplierTaxRate, setSupplierTaxRate] = useState<number>(0.1); // Tax rate for supplier view
  
  // Build status options from constants
  const statusOptions = statusDisplayNames;
  
  // Approver list with email mapping
  const approvers = [
    { name: 'Sowjanya', email: 'sowjanya.kopperla@hrvpharma.com' },
    { name: 'Siva Nagaraju', email: 'sivanagaraju.talari@hrvpharma.com' },
    { name: 'Vedansh', email: 'vedansh.chandak@hrvpharma.com' },
    { name: 'Balajikiran', email: 'balajikiran.botu@hrvpharma.com' },
    { name: 'Admin', email: 'sriharshajvs@gmail.com' },
    { name: 'Admin1', email: 'sriharsha@hrvpharma.com' },
  ];

  // Function to get the next status in the workflow
  const getNextStatus = (currentStatus: string): string | null => {
    const statusArray = Object.keys(statusOptions);
    const currentIndex = statusArray.indexOf(currentStatus);
    
    if (currentIndex < statusArray.length - 1) {
      return statusArray[currentIndex + 1];
    }
    
    return null; // Already at the last status
  };

  // Function to get available statuses (only previous and current statuses)
  const getAvailableStatuses = (currentStatus: string): Record<string, string> => {
    const statusArray = Object.keys(statusOptions);
    const currentIndex = statusArray.indexOf(currentStatus);
    
    // If current status not found, return all statuses (fallback)
    if (currentIndex === -1) {
      return statusOptions;
    }
    
    // Return only statuses up to and including the current status
    const availableStatuses: Record<string, string> = {};
    for (let i = 0; i <= currentIndex; i++) {
      const statusKey = statusArray[i];
      availableStatuses[statusKey] = statusOptions[statusKey as keyof typeof statusOptions];
    }
    
    return availableStatuses;
  };

  // Handle accordion expansion

  useEffect(() => {
    if (!orderId) return;
    
    // CRITICAL: Only reset guards when orderId actually changes (user navigated to different order)
    // This prevents overwriting a save that just happened
    const orderIdChanged = lastOrderIdRef.current !== orderId;
    if (orderIdChanged) {
      console.log('🔄 Order ID changed, resetting guards:', {
        from: lastOrderIdRef.current,
        to: orderId
      });
      // Reset guards only when navigating to a different order
      justSavedRef.current = false;
      ignoreContextUpdatesRef.current = false;
      lastSavedOrderRef.current = null;
      savedSupplierDataRef.current = null;
      lastOrderIdRef.current = orderId;
    }
    
    // If we just saved, don't reload immediately
    if (justSavedRef.current || ignoreContextUpdatesRef.current) {
      console.log('⏸️ Skipping reload - order was just saved');
      return;
    }
    
    const contextOrder = getOrderById(orderId);
    if (!contextOrder) return;
    
    // CRITICAL: Always reload if order lock status changed in context
    // This ensures all users see the latest locked state
    const contextIsLocked = contextOrder.isLocked && contextOrder.pendingFieldChanges?.status === 'Pending';
    const localIsLocked = editableOrder?.isLocked && editableOrder?.pendingFieldChanges?.status === 'Pending';
    
    // If lock status changed in context, reload ONLY if:
    // 1. Context order became locked (another user locked it) - we should reload
    // 2. Context order became unlocked (was approved/rejected) - we should reload
    // BUT NOT if we just saved and locked it ourselves (local is locked, context might not be updated yet)
    if (contextIsLocked !== localIsLocked) {
      // If we just saved and locked it, and context shows unlocked, don't reload yet (race condition)
      // Wait for context to update with our saved state
      if (justSavedRef.current && localIsLocked && !contextIsLocked) {
        console.log('⏸️ Skipping reload - just saved locked order, waiting for context to update');
        return;
      }
      
      console.log('🔒 Lock status changed in context, reloading order:', {
        contextIsLocked,
        localIsLocked,
        orderId
      });
      // Reset guards to allow reload
      justSavedRef.current = false;
      ignoreContextUpdatesRef.current = false;
    }
    
    // Always load from context when orderId changes or when order is not loaded yet
    // This ensures we get the latest state from backend, especially the lock status
    if (orderId && (!editableOrder || editableOrder.orderId !== orderId || contextIsLocked !== localIsLocked)) {
      // Use contextOrder which we already fetched
      if (contextOrder) {
        // If order is locked with pending changes, reconstruct the original state
        let orderToDisplay = JSON.parse(JSON.stringify(contextOrder));
        
        if (contextOrder.isLocked && contextOrder.pendingFieldChanges?.status === 'Pending' && contextOrder.pendingFieldChanges.fields) {
          // Reconstruct original state by applying old values from pending changes
          const originalOrder = JSON.parse(JSON.stringify(contextOrder));
          
          contextOrder.pendingFieldChanges.fields.forEach((change: { field: string; oldValue: any; newValue: any }) => {
            const fieldPath = change.field;
            
            // Handle different field paths
            if (fieldPath.includes('Material') && fieldPath.includes('Name')) {
              // Material name change - find by index or match
              const materialIndex = parseInt(fieldPath.match(/Material (\d+)/)?.[1] || '0') - 1;
              if (originalOrder.materials && originalOrder.materials[materialIndex]) {
                originalOrder.materials[materialIndex].name = change.oldValue;
              }
            } else if (fieldPath.includes('Material') && fieldPath.includes('Quantity')) {
              const materialIndex = parseInt(fieldPath.match(/Material (\d+)/)?.[1] || '0') - 1;
              if (originalOrder.materials && originalOrder.materials[materialIndex]) {
                const [value, unit] = String(change.oldValue).split(' ');
                originalOrder.materials[materialIndex].quantity = {
                  value: parseFloat(value) || 0,
                  unit: unit || 'KG'
                };
              }
            } else if (fieldPath.includes('Material') && fieldPath.includes('Customer Rate')) {
              const materialIndex = parseInt(fieldPath.match(/Material (\d+)/)?.[1] || '0') - 1;
              if (originalOrder.materials && originalOrder.materials[materialIndex]) {
                const match = String(change.oldValue).match(/(\w+) ([\d.]+)/);
                if (match) {
                  originalOrder.materials[materialIndex].unitPrice = {
                    currency: match[1],
                    amount: parseFloat(match[2]) || 0
                  };
                }
              }
            } else if (fieldPath.includes('Material') && fieldPath.includes('Supplier Rate')) {
              const materialIndex = parseInt(fieldPath.match(/Material (\d+)/)?.[1] || '0') - 1;
              if (originalOrder.materials && originalOrder.materials[materialIndex]) {
                if (change.oldValue === 'N/A') {
                  originalOrder.materials[materialIndex].supplierUnitPrice = undefined;
                } else {
                  const match = String(change.oldValue).match(/(\w+) ([\d.]+)/);
                  if (match) {
                    originalOrder.materials[materialIndex].supplierUnitPrice = {
                      currency: match[1],
                      amount: parseFloat(match[2]) || 0
                    };
                  }
                }
              }
            } else if (fieldPath === 'Material Name') {
              originalOrder.materialName = change.oldValue;
            } else if (fieldPath === 'Quantity') {
              const [value, unit] = String(change.oldValue).split(' ');
              originalOrder.quantity = {
                value: parseFloat(value) || 0,
                unit: unit || 'KG'
              };
            } else if (fieldPath === 'Price to Customer') {
              const match = String(change.oldValue).match(/(\w+) ([\d.]+)/);
              if (match) {
                originalOrder.priceToCustomer = {
                  currency: match[1],
                  amount: parseFloat(match[2]) || 0
                };
              }
            } else if (fieldPath === 'Price from Supplier') {
              const match = String(change.oldValue).match(/(\w+) ([\d.]+)/);
              if (match) {
                originalOrder.priceFromSupplier = {
                  currency: match[1],
                  amount: parseFloat(match[2]) || 0
                };
              }
            } else if (fieldPath.startsWith('Customer ')) {
              const customerField = fieldPath.replace('Customer ', '').toLowerCase();
              if (originalOrder.customer) {
                (originalOrder.customer as any)[customerField] = change.oldValue;
              }
            } else if (fieldPath.startsWith('Supplier ')) {
              const supplierField = fieldPath.replace('Supplier ', '').toLowerCase();
              if (originalOrder.supplier) {
                (originalOrder.supplier as any)[supplierField] = change.oldValue;
              }
            } else {
              // Generic field restoration
              (originalOrder as any)[fieldPath.toLowerCase().replace(/\s+/g, '')] = change.oldValue;
            }
          });
          
          // Use the reconstructed original order for display
          orderToDisplay = originalOrder;
        }
        
        // CRITICAL: Preserve lock status from context order
        // The orderToDisplay has original values, but we need to preserve isLocked and pendingFieldChanges
        orderToDisplay.isLocked = contextOrder.isLocked;
        orderToDisplay.pendingFieldChanges = contextOrder.pendingFieldChanges;
        
        // Store ORIGINAL order state - deep clone to prevent reference issues
        originalOrderRef.current = JSON.parse(JSON.stringify(orderToDisplay));
        // Update committed ref as well
        committedOrderRef.current = orderToDisplay;
        setOrder(orderToDisplay);
        setEditableOrder(orderToDisplay);
        
        // Initialize freight handler search if freight handler exists
        if (orderToDisplay.freightHandler) {
          setFreightHandlerSearch(orderToDisplay.freightHandler.name);
        }
        
        // Initialize supplier search if supplier exists - CRITICAL for showing company name after refresh
        if (orderToDisplay.supplier?.name) {
          setSupplierSearch(orderToDisplay.supplier.name);
        } else {
          setSupplierSearch('');
        }
        
        // Also update committed ref to ensure it's in sync
        if (orderToDisplay.supplier) {
          committedOrderRef.current = orderToDisplay;
        }
        
        // Initialize adjustment value if it exists
        if (orderToDisplay.adjustment !== undefined) {
          setAdjustment(orderToDisplay.adjustment);
        } else {
          setAdjustment(0);
        }
        
        // Initialize PO baseline state if PO exists
        if (orderToDisplay.documents?.supplierPO) {
          // Extract version from filename if it exists
          const filename = orderToDisplay.documents.supplierPO.filename || '';
          const versionMatch = filename.match(/_V(\d+)\.pdf$/);
          const extractedVersion = versionMatch ? parseInt(versionMatch[1], 10) : 0;
          setPoVersion(extractedVersion);
          
          // Store baseline state
          if (orderToDisplay.materials) {
            const baselineMaterials = orderToDisplay.materials.map((m: MaterialItem) => ({
              id: m.id,
              name: m.name,
              quantity: { ...m.quantity },
              supplierUnitPrice: m.supplierUnitPrice ? { ...m.supplierUnitPrice } : undefined
            }));
            setPoBaselineState({
              materials: baselineMaterials,
              freightHandler: orderToDisplay.freightHandler ? { ...orderToDisplay.freightHandler } : null
            });
          }
        } else {
          // Reset if no PO exists
          setPoVersion(0);
          setPoBaselineState(null);
        }
      }
    }
  }, [orderId, orders, getOrderById, editableOrder?.isLocked, editableOrder?.pendingFieldChanges?.status]); // Watch orders array and lock status
  
  // Watch for lock status changes in the orders array (when another user locks/unlocks)
  useEffect(() => {
    if (!orderId) return;
    
    // CRITICAL: Don't reload if we just saved - this prevents overwriting our own save
    if (justSavedRef.current || ignoreContextUpdatesRef.current) {
      console.log('⏸️ Skipping lock status check - order was just saved');
      return;
    }
    
    const contextOrder = getOrderById(orderId);
    if (!contextOrder) return;
    
    const contextIsLocked = contextOrder.isLocked && contextOrder.pendingFieldChanges?.status === 'Pending';
    const localIsLocked = editableOrder?.isLocked && editableOrder?.pendingFieldChanges?.status === 'Pending';
    
    // If lock status changed in context, force reload
    // BUT only if we didn't just save (to prevent race conditions)
    if (contextIsLocked !== localIsLocked) {
      // If local is locked but context is not, and we have a saved order ref, don't reload
      // This means we just saved and context hasn't updated yet
      if (localIsLocked && !contextIsLocked && lastSavedOrderRef.current) {
        console.log('⏸️ Skipping reload - just saved locked order, context not updated yet');
        return;
      }
      
      console.log('🔒 Lock status changed detected, forcing reload:', {
        contextIsLocked,
        localIsLocked,
        orderId
      });
      // Reset guards to allow reload
      justSavedRef.current = false;
      ignoreContextUpdatesRef.current = false;
      lastSavedOrderRef.current = null;
      
      // Reload the order
      let orderToDisplay = JSON.parse(JSON.stringify(contextOrder));
      
      // If locked, reconstruct original state
      if (contextOrder.isLocked && contextOrder.pendingFieldChanges?.status === 'Pending' && contextOrder.pendingFieldChanges.fields) {
        const originalOrder = JSON.parse(JSON.stringify(contextOrder));
        
        contextOrder.pendingFieldChanges.fields.forEach((change: { field: string; oldValue: any; newValue: any }) => {
          const fieldPath = change.field;
          
          // Apply old values to reconstruct original state (same logic as above)
          if (fieldPath.includes('Material') && fieldPath.includes('Name')) {
            const materialIndex = parseInt(fieldPath.match(/Material (\d+)/)?.[1] || '0') - 1;
            if (originalOrder.materials && originalOrder.materials[materialIndex]) {
              originalOrder.materials[materialIndex].name = change.oldValue;
            }
          } else if (fieldPath.includes('Material') && fieldPath.includes('Quantity')) {
            const materialIndex = parseInt(fieldPath.match(/Material (\d+)/)?.[1] || '0') - 1;
            if (originalOrder.materials && originalOrder.materials[materialIndex]) {
              const [value, unit] = String(change.oldValue).split(' ');
              originalOrder.materials[materialIndex].quantity = {
                value: parseFloat(value) || 0,
                unit: unit || 'KG'
              };
            }
          } else if (fieldPath.includes('Material') && fieldPath.includes('Customer Rate')) {
            const materialIndex = parseInt(fieldPath.match(/Material (\d+)/)?.[1] || '0') - 1;
            if (originalOrder.materials && originalOrder.materials[materialIndex]) {
              const match = String(change.oldValue).match(/(\w+) ([\d.]+)/);
              if (match) {
                originalOrder.materials[materialIndex].unitPrice = {
                  currency: match[1],
                  amount: parseFloat(match[2]) || 0
                };
              }
            }
          } else if (fieldPath.includes('Material') && fieldPath.includes('Supplier Rate')) {
            const materialIndex = parseInt(fieldPath.match(/Material (\d+)/)?.[1] || '0') - 1;
            if (originalOrder.materials && originalOrder.materials[materialIndex]) {
              if (change.oldValue === 'N/A') {
                originalOrder.materials[materialIndex].supplierUnitPrice = undefined;
              } else {
                const match = String(change.oldValue).match(/(\w+) ([\d.]+)/);
                if (match) {
                  originalOrder.materials[materialIndex].supplierUnitPrice = {
                    currency: match[1],
                    amount: parseFloat(match[2]) || 0
                  };
                }
              }
            }
          } else if (fieldPath === 'Material Name') {
            originalOrder.materialName = change.oldValue;
          } else if (fieldPath === 'Quantity') {
            const [value, unit] = String(change.oldValue).split(' ');
            originalOrder.quantity = {
              value: parseFloat(value) || 0,
              unit: unit || 'KG'
            };
          } else if (fieldPath === 'Price to Customer') {
            const match = String(change.oldValue).match(/(\w+) ([\d.]+)/);
            if (match) {
              originalOrder.priceToCustomer = {
                currency: match[1],
                amount: parseFloat(match[2]) || 0
              };
            }
          } else if (fieldPath === 'Price from Supplier') {
            const match = String(change.oldValue).match(/(\w+) ([\d.]+)/);
            if (match) {
              originalOrder.priceFromSupplier = {
                currency: match[1],
                amount: parseFloat(match[2]) || 0
              };
            }
          } else if (fieldPath.startsWith('Customer ')) {
            const customerField = fieldPath.replace('Customer ', '').toLowerCase();
            if (originalOrder.customer) {
              (originalOrder.customer as any)[customerField] = change.oldValue;
            }
          } else if (fieldPath.startsWith('Supplier ')) {
            const supplierField = fieldPath.replace('Supplier ', '').toLowerCase();
            if (originalOrder.supplier) {
              (originalOrder.supplier as any)[supplierField] = change.oldValue;
            }
          }
        });
        
        orderToDisplay = originalOrder;
      }
      
      // Update refs and state
      originalOrderRef.current = JSON.parse(JSON.stringify(orderToDisplay));
      committedOrderRef.current = orderToDisplay;
      setOrder(orderToDisplay);
      setEditableOrder(orderToDisplay);
      
      // Update supplier search
      if (orderToDisplay.supplier?.name) {
        setSupplierSearch(orderToDisplay.supplier.name);
      }
    }
  }, [orderId, orders, getOrderById, editableOrder?.isLocked, editableOrder?.pendingFieldChanges?.status]);
  
  // Sync order status from context when it changes (but not if we just saved)
  useEffect(() => {
    if (!orderId || justSavedRef.current || ignoreContextUpdatesRef.current) {
      return;
    }
    
    const contextOrder = getOrderById(orderId);
    if (contextOrder && order && contextOrder.status !== order.status) {
      // Status changed in context - update local state
      setOrder(contextOrder);
      setEditableOrder(prev => prev ? { ...prev, status: contextOrder.status } : contextOrder);
      committedOrderRef.current = contextOrder;
    }
  }, [orderId, orders, getOrderById, order?.status]);
  
  // Sync order documents from context when they change (for button enabling)
  useEffect(() => {
    if (!orderId || justSavedRef.current || ignoreContextUpdatesRef.current) {
      return;
    }
    
    const contextOrder = getOrderById(orderId);
    if (contextOrder && editableOrder) {
      // Check if documents have changed
      const contextDocs = JSON.stringify(contextOrder.documents || {});
      const editableDocs = JSON.stringify(editableOrder.documents || {});
      
      if (contextDocs !== editableDocs) {
        // Documents changed in context - update local state
        setEditableOrder(prev => prev ? { ...prev, documents: contextOrder.documents } : contextOrder);
      }
    }
  }, [orderId, orders, getOrderById, editableOrder?.documents]);
  
  // Load all suppliers on mount
  useEffect(() => {
    const loadAllSuppliers = async () => {
      try {
        const suppliers = await getSuppliers();
        setAllSuppliers(suppliers);
        setSupplierOptions(suppliers);
      } catch (error) {
        console.error('Error loading suppliers:', error);
        setAllSuppliers([]);
        setSupplierOptions([]);
      }
    };
    
    loadAllSuppliers();
  }, []);
  
  // Load all products on mount for item details dropdown
  useEffect(() => {
    const loadAllProducts = async () => {
      try {
        const products = await getProducts();
        setAllProducts(products);
        console.log('📦 Loaded products for item details dropdown:', products.length);
      } catch (error) {
        console.error('Error loading products:', error);
        setAllProducts([]);
      }
    };
    
    loadAllProducts();
  }, []);

  // Keep supplierSearch in sync with editableOrder.supplier.name
  useEffect(() => {
    if (editableOrder?.supplier?.name && supplierSearch !== editableOrder.supplier.name) {
      setSupplierSearch(editableOrder.supplier.name);
    } else if (!editableOrder?.supplier?.name && supplierSearch) {
      // Only clear if supplier was actually removed, not just during initial load
      if (editableOrder && !editableOrder.supplier) {
        setSupplierSearch('');
      }
    }
  }, [editableOrder?.supplier?.name]);

  // Update supplier options when search changes - enable type-ahead search
  useEffect(() => {
    if (supplierSearch.trim()) {
      const filtered = searchSuppliers(supplierSearch, allSuppliers);
      setSupplierOptions(filtered);
    } else {
      // Show all suppliers when search is cleared (for dropdown to show options)
      setSupplierOptions(allSuppliers);
    }
  }, [supplierSearch, allSuppliers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showFreightHandlerDropdown && !target.closest('[data-freight-handler-dropdown]')) {
        setShowFreightHandlerDropdown(false);
      }
    };

    if (showFreightHandlerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFreightHandlerDropdown]);

  // Reset selected section if it becomes unavailable based on order status
  useEffect(() => {
    if (!editableOrder && !order) return;
    
    const currentOrder = editableOrder || order;
    if (!currentOrder) return;

    // Check if currently selected section is still available
    const isSectionAvailable = (sectionId: string | null): boolean => {
      if (!sectionId) return true; // null means show all, which is always available
      
      // Always available sections
      if (['orderSummary', 'itemTable', 'customerSupplierInformation', 'freightHandlerInformation', 'documents'].includes(sectionId)) {
        return true;
      }

      // Advance Payment Details - only if order has advancePayment
      if (sectionId === 'advancePaymentDetails') {
        return !!currentOrder.advancePayment;
      }

      // Payment Details - only for specific statuses
      if (sectionId === 'paymentDetails') {
        const status = currentOrder.status;
        return ['Approved', 'Advance_Payment_Completed', 'Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit'].includes(status);
      }

      // Logistics - visible from Material_to_be_Dispatched onwards
      if (sectionId === 'logistics') {
        const status = currentOrder.status;
        const statusOrder: OrderStatus[] = [
          'PO_Received_from_Client',
          'Drafting_PO_for_Supplier',
          'Sent_PO_for_Approval',
          'PO_Rejected',
          'PO_Approved',
          'PO_Sent_to_Supplier',
          'Proforma_Invoice_Received',
          'Awaiting_COA',
          'COA_Received',
          'COA_Revision',
          'COA_Accepted',
          'Awaiting_Approval',
          'Approved',
          'Advance_Payment_Completed',
          'Material_to_be_Dispatched',
          'Material_Dispatched',
          'In_Transit',
          'Completed',
        ];
        const currentIndex = statusOrder.indexOf(status);
        const materialToBeDispatchedIndex = statusOrder.indexOf('Material_to_be_Dispatched');
        return currentIndex >= materialToBeDispatchedIndex && currentIndex !== -1;
      }

      return false;
    };

    if (selectedSection && !isSectionAvailable(selectedSection)) {
      // Reset to first available section (itemTable is always available)
      setSelectedSection('itemTable');
    }
  }, [editableOrder, order, selectedSection]);

  useEffect(() => {
    const action = searchParams.get('action');
    const created = searchParams.get('created');
    
    if (action === 'generate-po' && order) {
      // Handle PDF generation
      handleGeneratePOAI();
    } else if (action === 'send-coa' && order) {
      // Handle COA sending
      handleSendCOA();
    } else if (created === 'true' && order) {
      // Show success message for newly created order
      toast.success(`Order ${order.orderId} created successfully from PDF upload!`);
      // Remove the created parameter from URL
      navigate(`/order/${orderId}`, { replace: true });
    }
  }, [searchParams, order, orderId, navigate]);

  const handleGeneratePOAI = () => {
    setAiPdfModalOpen(true);
    // Navigate back to order detail without action parameter
    navigate(`/order/${orderId}`, { replace: true });
  };

  const handleSendCOA = () => {
    toast.success('COA sending functionality would be implemented here');
    // Navigate back to order detail without action parameter
    navigate(`/order/${orderId}`, { replace: true });
  };

  const handleSendCOAToCustomer = () => {
    if (!editableOrder) return;

    console.log('Current order:', editableOrder.orderId);
    console.log('Order documents:', editableOrder.documents);
    
    // Check if COA document exists
    let coaDocument = editableOrder.documents.coaPreShipment;
    console.log('COA document:', coaDocument);
    
    // If no COA document exists, create a sample one for testing
    if (!coaDocument) {
      console.log('No COA document found, creating sample document for testing...');
      coaDocument = {
        id: 'sample_coa_doc',
        filename: 'sample_coa_document.pdf',
        uploadedAt: new Date().toISOString(),
        uploadedBy: {
          userId: 'user1',
          name: 'System',
        },
        fileSize: 50000,
        mimeType: 'application/pdf',
        data: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSAKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+Cj4+Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVAoxMiAwIFRmCjcyIDcwMCAgVGQKKFRlc3QgQ09BIGRvY3VtZW50IGZvciB0ZXN0aW5nKSBUagoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYKMDAwMDAwMDAwOSAwMDAwMCBuCjAwMDAwMDAwNTggMDAwMDAgbgowMDAwMDAwMTE1IDAwMDAwIG4KMDAwMDAwMDI2NSAwMDAwMCBuCnRyYWlsZXIKPDwKL1NpemUgNQovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMzU2CiUlRU9G'
      };
      toast.success('Using sample COA document for testing. Please upload a real COA document for production use.');
    }

    try {
      // Download the COA document first
      if (coaDocument.data) {
        console.log('Downloading COA document...');
        const downloadLink = document.createElement('a');
        downloadLink.href = coaDocument.data;
        downloadLink.download = coaDocument.filename;
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        console.log('COA document downloaded successfully');
      }

      // Create email subject and body
      const subject = `COA Document - Order ${editableOrder.orderId}`;
      const body = `Dear ${editableOrder.customer.name},

Please find attached the Certificate of Analysis (COA) document for your order ${editableOrder.orderId}.

Order Details:
- Material: ${editableOrder.materialName}
- Quantity: ${editableOrder.quantity.value} ${editableOrder.quantity.unit}
- Order ID: ${editableOrder.orderId}
- COA Document: ${coaDocument.filename}

Please review the attached COA document and let us know if you have any questions.

Best regards,
${editableOrder.assignedTo?.name || 'Order Management Team'}`;

      // Create mailto link (works with default email client)
      const mailtoLink = `mailto:${editableOrder.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      // Open email client with instructions
      setTimeout(() => {
        try {
          window.location.href = mailtoLink;
          
          // Update the order status
          handleFieldChange('status', 'COA_Accepted');
          
          // Add timeline event
          addTimelineEvent(
            editableOrder.orderId,
            'COA Email Prepared',
            `Email prepared for customer with COA document: ${coaDocument?.filename || 'Unknown'}`,
            'COA_Accepted'
          );
          
          toast.success(`COA document downloaded. Email opened. Please manually attach "${coaDocument?.filename || 'the COA file'}" from your Downloads folder before sending.`, {
            duration: 6000,
          });
        } catch (error) {
          console.error('Error opening email client:', error);
          // Copy to clipboard as fallback
          const emailContent = `To: ${editableOrder.customer.email}\nSubject: ${subject}\n\n${body}`;
          navigator.clipboard.writeText(emailContent);
          toast.success('Email content copied to clipboard. Please paste into your email client and attach the downloaded file.');
        }
      }, 500); // Small delay to ensure download completes first
      
    } catch (error) {
      console.error('Error preparing COA email:', error);
      toast.error('Error preparing COA email. Please try again.');
    }
  };

  const handleFileUpload = async (file: File, documentType: 'customerPO' | 'supplierPO' | 'quotation' | 'proformaInvoice' | 'coaPreShipment') => {
    if (isOrderLocked()) {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    if (!editableOrder || !file) return;

    try {
      // Convert file to base64 data URL for storage
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = reader.result as string;
        
        // Attach the document to the order
        attachDocument(editableOrder.orderId, documentType, fileData, file.name);
        
        toast.success(`${file.name} uploaded successfully`);
      };
      reader.onerror = () => {
        toast.error('Error reading file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Error uploading file');
    }
  };

  const handleDeleteDocument = async (documentType: keyof Documents) => {
    if (!editableOrder) return;
    
    if (!canManageDocuments()) {
      toast.error('You do not have permission to delete documents');
      return;
    }

    if (window.confirm(`Are you sure you want to delete this document?`)) {
      try {
        await deleteDocument(editableOrder.orderId, documentType);
        // Update local state
        setEditableOrder(prev => {
          if (!prev) return prev;
          const updatedDocs = { ...prev.documents };
          delete updatedDocs[documentType];
          return { ...prev, documents: updatedDocs };
        });
        setOrder(prev => {
          if (!prev) return prev;
          const updatedDocs = { ...prev.documents };
          delete updatedDocs[documentType];
          return { ...prev, documents: updatedDocs };
        });
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleReplaceDocument = async (file: File, documentType: keyof Documents) => {
    if (!editableOrder) return;
    
    if (!canManageDocuments()) {
      toast.error('You do not have permission to replace documents');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileData = reader.result as string;
        
        try {
          await replaceDocument(editableOrder.orderId, documentType, fileData, file.name);
          // Update local state
          const newDoc = {
            id: `doc_${Date.now()}`,
            filename: file.name,
            uploadedAt: new Date().toISOString(),
            uploadedBy: {
              userId: user?.userId || '',
              name: user?.name || '',
            },
            fileSize: file.size,
            mimeType: file.type,
            data: fileData,
          };
          
          setEditableOrder(prev => {
            if (!prev) return prev;
            return { ...prev, documents: { ...prev.documents, [documentType]: newDoc } };
          });
          setOrder(prev => {
            if (!prev) return prev;
            return { ...prev, documents: { ...prev.documents, [documentType]: newDoc } };
          });
        } catch (error) {
          console.error('Error replacing document:', error);
        }
      };
      reader.onerror = () => {
        toast.error('Error reading file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File read error:', error);
      toast.error('Error reading file');
    }
  };

  const handleAddComment = () => {
    if (isOrderLocked()) {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    if (newComment.trim() && order) {
      addComment(order.orderId, newComment.trim());
      setNewComment('');
      setCommentDialogOpen(false);
      toast.success('Comment added successfully');
    }
  };

  const handleStatusChange = (status?: string) => {
    if (isOrderLocked()) {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    const statusToUpdate = status || newStatus;
    if (statusToUpdate && order && statusToUpdate !== order.status) {
      // Validate entity selection before allowing status change to Drafting_PO_for_Supplier
      if (statusToUpdate === 'Drafting_PO_for_Supplier') {
        if (!editableOrder?.entity) {
          toast.error('Please select Entity (HRV or NHG) before changing status to "Drafting PO for Supplier"');
          setNewStatus('');
          return;
        }
      }
      
      // Show approver selection dialog for "Sent PO for Approval" status
      if (statusToUpdate === 'Sent_PO_for_Approval') {
        setPendingStatus(statusToUpdate);
        setApproverDialogOpen(true);
        return;
      }
      
      // Update local state immediately for instant UI feedback
      const updatedOrder = { ...order, status: statusToUpdate as OrderStatus };
      setOrder(updatedOrder);
      setEditableOrder(prev => prev ? { ...prev, status: statusToUpdate as OrderStatus } : updatedOrder);
      committedOrderRef.current = updatedOrder;
      
      // Update status in context (this will also persist to backend)
      updateOrderStatus(order.orderId, statusToUpdate);
      setNewStatus('');
      toast.success('Status updated successfully');
    }
  };
  
  const handleApproverConfirm = () => {
    if (!selectedApprover || !order || !pendingStatus) {
      toast.error('Please select an approver');
      return;
    }
    
    const approver = approvers.find(a => a.name === selectedApprover);
    if (!approver) return;
    
    // Update local state immediately for instant UI feedback
    const updatedOrder = { ...order, status: pendingStatus as OrderStatus };
    setOrder(updatedOrder);
    setEditableOrder(prev => prev ? { ...prev, status: pendingStatus as OrderStatus } : updatedOrder);
    committedOrderRef.current = updatedOrder;
    
    // Update status and send email with selected approver
    updateOrderStatus(order.orderId, pendingStatus, undefined, approver.email);
    setApproverDialogOpen(false);
    setSelectedApprover('');
    setPendingStatus('');
    setNewStatus('');
    toast.success(`Status updated and email sent to ${approver.name}`);
  };
  
  const handleAcceptPO = () => {
    if (!order) return;
    // Update local state immediately for instant UI feedback
    const updatedOrder = { ...order, status: 'PO_Approved' as OrderStatus };
    setOrder(updatedOrder);
    setEditableOrder(prev => prev ? { ...prev, status: 'PO_Approved' as OrderStatus } : updatedOrder);
    committedOrderRef.current = updatedOrder;
    
    updateOrderStatus(order.orderId, 'PO_Approved');
    toast.success('PO Approved successfully');
  };
  
  const handleRejectPO = () => {
    if (!order) return;
    // Open rejection dialog to collect comments
    setRejectionDialogOpen(true);
  };
  
  const handleConfirmRejection = () => {
    if (!order) return;
    // Update local state immediately for instant UI feedback
    const updatedOrder = { ...order, status: 'PO_Rejected' as OrderStatus };
    setOrder(updatedOrder);
    setEditableOrder(prev => prev ? { ...prev, status: 'PO_Rejected' as OrderStatus } : updatedOrder);
    committedOrderRef.current = updatedOrder;
    
    // Reject changes status to PO Rejected with comments
    updateOrderStatus(order.orderId, 'PO_Rejected', rejectionComments);
    setRejectionDialogOpen(false);
    setRejectionComments('');
    toast.error('PO Rejected');
  };

  const handleGeneratePO = () => {
    if (!editableOrder) return;
    
    // Open terms and conditions dialog (tax rate will come from supplier tab)
    setTaxRateDialogOpen(true);
  };

  const handleSendPOToSupplier = () => {
    if (!editableOrder) return;
    
    // Check if supplier is selected
    if (!editableOrder.supplier) {
      toast.error('Please select a supplier before sending the PO');
      return;
    }

    // Calculate supplier total from materials (use supplier view mode)
    const supplierTotal = editableOrder.materials && editableOrder.materials.length > 0
      ? editableOrder.materials.reduce((sum, item) => sum + (item.supplierTotalPrice?.amount || 0), 0)
      : (editableOrder.priceFromSupplier?.amount || 0);
    
    const supplierCurrency = editableOrder.materials?.[0]?.supplierUnitPrice?.currency || 
                             editableOrder.materials?.[0]?.supplierTotalPrice?.currency || 
                             editableOrder.priceFromSupplier?.currency || 
                             'USD';

    // Prepare email details
    const recipient = editableOrder.supplier.email || '';
    const subject = `Purchase Order ${editableOrder.poNumber || editableOrder.orderId} - ${editableOrder.materialName}`;
    
    // Create email body with order details
    const body = `Dear ${editableOrder.supplier.name},

Please find attached the Purchase Order for the following:

Order ID: ${editableOrder.orderId}
PO Number: ${editableOrder.poNumber || editableOrder.orderId}
Material: ${editableOrder.materialName}
Quantity: ${editableOrder.quantity.value} ${editableOrder.quantity.unit}
Total Amount: ${supplierCurrency} ${formatAmount(supplierTotal, supplierCurrency)}

Please confirm receipt and provide your expected delivery timeline.

Best regards,
${user?.name || 'PharmaSource Pro'}`;

    // Encode URI components
    const mailtoLink = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open mail client
    window.location.href = mailtoLink;
    
    // Log the action
    addTimelineEvent(
      editableOrder.orderId,
      'PO Sent to Supplier',
      `Purchase Order sent to ${editableOrder.supplier.name} via email`,
      'PO_Sent_to_Supplier'
    );
    
    addAuditLog(
      editableOrder.orderId,
      'Email Sent',
      `PO sent to supplier ${editableOrder.supplier.name}`,
      { recipient: editableOrder.supplier.email, subject }
    );
    
    toast.success(`Email draft opened for ${editableOrder.supplier.name}`);
  };

  const handleGeneratePOWithTax = async (terms: string, deliveryTerms: string, conditions: string) => {
    if (!editableOrder) return;
    
    setTaxRateDialogOpen(false);
    setIsGeneratingPDF(true);
    try {
      // Check if PO was previously generated - if so, increment version
      const hasExistingPO = editableOrder.documents?.supplierPO || poBaselineState !== null;
      const newVersion = hasExistingPO ? poVersion + 1 : 1;
      setPoVersion(newVersion);
      
      // Create order copy with selected terms, conditions, and adjustment
      const orderWithTerms = {
        ...editableOrder,
        deliveryTerms: terms,
        incoterms: deliveryTerms, // Store terms of delivery
        notes: conditions, // Store terms and conditions in notes field
        adjustment: adjustment // Include adjustment value from supplier tab
      };
      
      console.log('Generating PDF with adjustment:', adjustment, 'Order adjustment:', orderWithTerms.adjustment);
      
      // Generate PDF based on entity with tax rate from supplier tab, terms, and conditions
      // Calculate average tax rate from materials for PDF (or use first material's tax rate)
      let avgTaxRate = 0;
      if (editableOrder.materials && editableOrder.materials.length > 0) {
        const firstMaterial = editableOrder.materials[0];
        const taxRate = (firstMaterial as any).supplierTaxRate;
        avgTaxRate = taxRate !== undefined && taxRate !== null ? taxRate : 0;
      } else {
        avgTaxRate = supplierTaxRate; // Fallback to state value
      }
      
      const entity = editableOrder.entity || 'HRV';
      let pdfDataURL: string;
      
      if (entity === 'HRV') {
        // Use pdf-lib generator with tax rate from supplier tab
        const templateUrl = getTemplateUrl();
        pdfDataURL = await previewHRVPOFromOrder(templateUrl, orderWithTerms, avgTaxRate, conditions);
      } else {
        // Use NHG pdf-lib generator with tax rate from supplier tab
        pdfDataURL = await previewNHGPOFromOrder(orderWithTerms, avgTaxRate, conditions);
      }
      
      setGeneratedPDF(pdfDataURL);
      
      // Add timeline event with version info
      const versionText = newVersion > 1 ? ` (Version ${newVersion})` : '';
      addTimelineEvent(
        editableOrder.orderId,
        'Supplier PO Generated',
        `Supplier PO${versionText} generated for ${entity} entity with tax rates and terms: ${terms}`,
        'PO_Sent_to_Supplier'
      );
      
      toast.success(`Supplier PO${versionText} generated successfully for ${entity}`);
    } catch (error) {
      toast.error('Error generating Supplier PO');
      console.error('PDF generation error:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleAttachPDF = async () => {
    if (!editableOrder || !generatedPDF) return;
    
    try {
      const entity = editableOrder.entity || 'HRV';
      const filename = `${entity}_Supplier_PO_${editableOrder.orderId}.pdf`;
      
      // Attach the generated PDF to the order documents
      attachDocument(editableOrder.orderId, 'supplierPO', generatedPDF, filename);
      
      // Clear the generated PDF preview
      setGeneratedPDF(null);
      
      toast.success(`Supplier PO attached successfully to order ${editableOrder.orderId}`);
    } catch (error) {
      toast.error('Error attaching Supplier PO');
      console.error('PDF attachment error:', error);
    }
  };

  // Field change handlers
  const handleFieldChange = (field: string, value: any) => {
    // Check if order is locked due to pending approval
    if (editableOrder?.isLocked && editableOrder?.pendingFieldChanges?.status === 'Pending') {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    
    // Check if this field requires approval and status has passed PO_Approved
    const needsApproval = editableOrder && 
                         hasStatusPassedPOApproved(editableOrder.status) && 
                         requiresApproval(field);
    
    if (needsApproval) {
      // Track this field as requiring approval
      setApprovalRequiredFields(prev => {
        const newSet = new Set(prev);
        newSet.add(field);
        return newSet;
      });
      // Show tooltip
      setShowApprovalTooltip(field);
      // Show toast warning
      toast('Editing this field will require approval from Higher Management', {
        icon: '⚠️',
        duration: 4000,
      });
    }
    
    // Always use committedOrderRef as the base, or editableOrder if ref is null
    const baseOrder = committedOrderRef.current || editableOrder;
    if (baseOrder) {
      const updatedOrder = { ...baseOrder };
      
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        // Handle supplier fields - create supplier object if it doesn't exist
        if (parent === 'supplier' && !updatedOrder.supplier) {
          updatedOrder.supplier = {
            name: '',
            address: '',
            country: '',
            email: '',
            phone: '',
            gstin: ''
          };
        }
        (updatedOrder as any)[parent] = {
          ...(updatedOrder as any)[parent],
          [child]: value
        };
      } else {
        (updatedOrder as any)[field] = value;
      }
      
      // Update both state and ref
      committedOrderRef.current = updatedOrder;
      setEditableOrder(updatedOrder);
      setHasChanges(true);
    }
  };

  const handleCurrencyConversion = async (fromField: 'priceToCustomer' | 'priceFromSupplier', toField: 'priceToCustomer' | 'priceFromSupplier') => {
    if (!editableOrder || isConverting) return;

    setIsConverting(true);
    try {
      const fromPrice = editableOrder[fromField];
      const toPrice = editableOrder[toField];
      
      if (fromPrice.currency === toPrice.currency) {
        toast.success('Both prices are already in the same currency');
        return;
      }

      const result = await convertCurrency(
        fromPrice.amount,
        fromPrice.currency,
        toPrice.currency
      );

      const updatedOrder = { ...editableOrder };
      updatedOrder[toField] = {
        ...toPrice,
        amount: result.convertedAmount
      };

      setEditableOrder(updatedOrder);
      setHasChanges(true);
      setConversionRate(result.rate);
      
      // Format currency helper
      const formatCurrencyForToast = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
        }).format(amount);
      };
      toast.success(`Converted ${formatCurrencyForToast(fromPrice.amount, fromPrice.currency)} to ${formatCurrencyForToast(result.convertedAmount, toPrice.currency)} (Rate: ${result.rate.toFixed(4)})`);
    } catch (error) {
      toast.error('Failed to convert currency. Please try again.');
      console.error('Currency conversion error:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const handleCustomRateConversion = () => {
    if (!editableOrder || !customRate) return;

    const rate = parseFloat(customRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error('Please enter a valid conversion rate');
      return;
    }

    const customerPrice = editableOrder.priceToCustomer;
    const supplierPrice = editableOrder.priceFromSupplier;

    if (customerPrice.currency !== supplierPrice.currency) {
      // Convert supplier price to customer currency using custom rate
      const convertedAmount = supplierPrice.amount * rate;
      
      const updatedOrder = { ...editableOrder };
      updatedOrder.priceFromSupplier = {
        ...supplierPrice,
        amount: convertedAmount
      };

      setEditableOrder(updatedOrder);
      setHasChanges(true);
      setConversionRate(rate);
      toast.success(`Applied custom rate ${rate.toFixed(4)} for conversion`);
    }
  };

  const calculateCustomerRate = () => {
    if (!editableOrder || !editableOrder.quantity.value) return 0;
    return editableOrder.priceToCustomer.amount / editableOrder.quantity.value;
  };

  const calculateSupplierRate = () => {
    if (!editableOrder || !editableOrder.quantity.value) return 0;
    return editableOrder.priceFromSupplier.amount / editableOrder.quantity.value;
  };
  
  // Handle field changes approval assignment
  const handleFieldChangesApproverConfirm = async () => {
    if (!selectedFieldChangesApprover || !pendingFieldChangesData || !editableOrder || !user) {
      toast.error('Please select an approver');
      return;
    }
    
    // Close dialog
    setFieldChangesApprovalDialogOpen(false);
    
    // Now proceed with saving the changes
    await handleSaveChangesWithApproval();
  };

  // Save changes with approval assignment
  const handleSaveChangesWithApproval = async () => {
    if (!editableOrder || !order || !pendingFieldChangesData || !selectedFieldChangesApprover || !user) return;
    
    // Get the selected approver from the same list as PO approval
    const approver = approvers.find(a => a.name === selectedFieldChangesApprover);
    
    // Track all field changes for audit logging (reuse the logic from handleSaveChanges)
    const changedFields: { field: string; oldValue: any; newValue: any }[] = [];
    
    // Compare all fields except status, timeline, auditLogs, and comments
    const fieldsToCheck = [
      { key: 'entity', label: 'Entity' },
      { key: 'materialName', label: 'Material Name' },
      { key: 'poNumber', label: 'PO Number' },
      { key: 'rfid', label: 'RFID' },
      { key: 'quantity', label: 'Quantity', transform: (v: any) => `${v.value} ${v.unit}` },
      { key: 'transitType', label: 'Transit Type' },
      { key: 'priceToCustomer', label: 'Price to Customer', transform: (v: any) => `${v.currency} ${v.amount}` },
      { key: 'priceFromSupplier', label: 'Price from Supplier', transform: (v: any) => `${v.currency} ${v.amount}` },
    ];

    fieldsToCheck.forEach(({ key, label, transform }) => {
      const oldValue = (order as any)[key];
      const newValue = (editableOrder as any)[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push({
          field: label,
          oldValue: transform ? transform(oldValue) : oldValue,
          newValue: transform ? transform(newValue) : newValue,
        });
      }
    });

    // Check customer and supplier fields
    if (editableOrder.customer && order.customer) {
      Object.keys(editableOrder.customer).forEach(key => {
        const oldVal = order.customer[key as keyof typeof order.customer];
        const newVal = editableOrder.customer[key as keyof typeof order.customer];
        if (oldVal !== newVal) {
          changedFields.push({
            field: `Customer ${key}`,
            oldValue: oldVal || '',
            newValue: newVal || '',
          });
        }
      });
    }

    if (editableOrder.supplier) {
      const oldSupplier = order.supplier || {};
      Object.keys(editableOrder.supplier).forEach(key => {
        const oldVal = oldSupplier[key as keyof typeof oldSupplier];
        const newVal = editableOrder.supplier?.[key as keyof typeof editableOrder.supplier];
        if (oldVal !== newVal) {
          changedFields.push({
            field: `Supplier ${key}`,
            oldValue: oldVal || '',
            newValue: newVal || '',
          });
        }
      });
    } else if (order.supplier) {
      changedFields.push({
        field: 'Supplier',
        oldValue: order.supplier.name || 'Supplier',
        newValue: '',
      });
    }

    // Check materials changes
    if (editableOrder.materials && order.materials) {
      for (let i = 0; i < editableOrder.materials.length; i++) {
        const editableItem = editableOrder.materials[i];
        const originalItem = order.materials.find(m => m.id === editableItem.id);
        if (originalItem) {
          if (editableItem.name !== originalItem.name) {
            changedFields.push({
              field: `Material ${i + 1} - Name`,
              oldValue: originalItem.name || 'N/A',
              newValue: editableItem.name || 'N/A',
            });
          }
          if (editableItem.quantity.value !== originalItem.quantity.value) {
            changedFields.push({
              field: `Material ${i + 1} - Quantity`,
              oldValue: `${originalItem.quantity.value} ${originalItem.quantity.unit}`,
              newValue: `${editableItem.quantity.value} ${editableItem.quantity.unit}`,
            });
          }
          if (editableItem.unitPrice.amount !== originalItem.unitPrice.amount) {
            changedFields.push({
              field: `Material ${i + 1} - Customer Rate`,
              oldValue: `${originalItem.unitPrice.currency} ${originalItem.unitPrice.amount}`,
              newValue: `${editableItem.unitPrice.currency} ${editableItem.unitPrice.amount}`,
            });
          }
          if (editableItem.supplierUnitPrice?.amount !== originalItem.supplierUnitPrice?.amount) {
            changedFields.push({
              field: `Material ${i + 1} - Supplier Rate`,
              oldValue: originalItem.supplierUnitPrice ? `${originalItem.supplierUnitPrice.currency} ${originalItem.supplierUnitPrice.amount}` : 'N/A',
              newValue: editableItem.supplierUnitPrice ? `${editableItem.supplierUnitPrice.currency} ${editableItem.supplierUnitPrice.amount}` : 'N/A',
            });
          }
        }
      }
    }
    
    // Create pending field changes approval
    const pendingChanges = {
      id: `pending-${Date.now()}`,
      requestedBy: {
        userId: user.userId,
        name: user.name,
      },
      requestedAt: new Date().toISOString(),
      fields: pendingFieldChangesData.fields.map(cf => ({
        field: cf.field,
        oldValue: cf.oldValue,
        newValue: cf.newValue,
      })),
      status: 'Pending' as const,
    };
    
    // Create order to save
    let orderToSave = JSON.parse(JSON.stringify(editableOrder));
    orderToSave.pendingFieldChanges = pendingChanges;
    orderToSave.isLocked = true;
    orderToSave.updatedAt = new Date().toISOString();
    
    // Add timeline event
    addTimelineEvent(
      editableOrder.orderId,
      'Field Changes Pending Approval',
      `Changes to ${pendingFieldChangesData.fields.length} field(s) require approval from ${approver?.name || 'Higher Management'}`,
      editableOrder.status
    );
    
    // Set flags to prevent ANY reloading or overwrites
    justSavedRef.current = true;
    ignoreContextUpdatesRef.current = true;
    
    // Store the saved order and supplier data references to prevent overwrites
    lastSavedOrderRef.current = orderToSave;
    if (orderToSave?.supplier) {
      savedSupplierDataRef.current = { ...orderToSave.supplier };
    } else {
      savedSupplierDataRef.current = null;
    }
    
    // CRITICAL: Update the committed order ref
    committedOrderRef.current = orderToSave;
    
    // Save to context - this updates the backend
    // CRITICAL: Save the ENTIRE order object, not just updates, to ensure all fields including isLocked are persisted
    // This ensures isLocked and pendingFieldChanges are saved to the database
    console.log('💾 Saving ENTIRE order with lock status:', {
      isLocked: orderToSave.isLocked,
      pendingFieldChanges: orderToSave.pendingFieldChanges,
      orderId: orderToSave.orderId,
      hasPendingChanges: !!orderToSave.pendingFieldChanges,
      pendingStatus: orderToSave.pendingFieldChanges?.status
    });
    
    // Save the entire order object to ensure all fields are persisted
    const savedOrder = await updateOrder(editableOrder.orderId, orderToSave);
    
    // CRITICAL: Use savedOrder if available, but ALWAYS preserve lock status from orderToSave
    // The savedOrder might not have isLocked if backend hasn't fully processed it yet
    const orderToDisplay = savedOrder ? { ...savedOrder } : { ...orderToSave };
    
    // CRITICAL: Always preserve isLocked and pendingFieldChanges from our orderToSave
    // This ensures the lock status is never lost, even if backend response is delayed
    orderToDisplay.isLocked = orderToSave.isLocked;
    orderToDisplay.pendingFieldChanges = orderToSave.pendingFieldChanges;
    
    // Update all state and refs with the preserved lock status
    const supplierName = orderToDisplay?.supplier?.name || '';
    setSupplierSearch(supplierName);
    setOrder(orderToDisplay);
    setEditableOrder(orderToDisplay);
    setHasChanges(false);
    setApprovalRequiredFields(new Set());
    
    // Update all refs with preserved lock status
    committedOrderRef.current = orderToDisplay;
    originalOrderRef.current = JSON.parse(JSON.stringify(orderToDisplay));
    lastSavedOrderRef.current = orderToDisplay;
    
    console.log('✅ Order saved with lock status preserved:', {
      isLocked: orderToDisplay.isLocked,
      pendingStatus: orderToDisplay.pendingFieldChanges?.status,
      orderId: orderToDisplay.orderId
    });
    
    // CRITICAL: Keep guards set to prevent immediate reload that would overwrite the locked state
    // The guards will be reset when user navigates to a different order (orderId changes)
    // This ensures the saved locked state is preserved
    // Don't call refreshOrders() here as it causes a race condition - let the context update naturally
    
    // Reset approver selection
    setSelectedFieldChangesApprover('');
    setPendingFieldChangesData(null);
    
    toast.success(`Changes saved. This order is now locked pending approval from ${approver?.name || 'Higher Management'}.`);
  };

  // Handle approval of pending field changes by Management
  const handleApproveFieldChanges = async () => {
    if (!editableOrder || !user || (user.role !== 'Management' && user.role !== 'Admin')) {
      toast.error('Only Management or Admin role users can approve field changes');
      return;
    }
    
    if (!editableOrder.pendingFieldChanges || editableOrder.pendingFieldChanges.status !== 'Pending') {
      toast.error('No pending field changes to approve');
      return;
    }
    
    try {
      // Approve the changes
      const updatedOrder = {
        ...editableOrder,
        pendingFieldChanges: {
          ...editableOrder.pendingFieldChanges,
          status: 'Approved' as const,
          approvedBy: {
            userId: user.userId,
            name: user.name,
          },
          approvedAt: new Date().toISOString(),
        },
        isLocked: false,
      };
      
      // Add timeline event
      addTimelineEvent(
        editableOrder.orderId,
        'Field Changes Approved',
        `Field changes approved by ${user.name}`,
        editableOrder.status
      );
      
      // Add audit log
      editableOrder.pendingFieldChanges.fields.forEach(field => {
        addAuditLog(
          editableOrder.orderId,
          field.field,
          field.oldValue,
          field.newValue,
          `Approved by ${user.name}`
        );
      });
      
      // Update the order
      await updateOrder(editableOrder.orderId, updatedOrder);
      
      // Update local state
      setOrder(updatedOrder);
      setEditableOrder(updatedOrder);
      committedOrderRef.current = updatedOrder;
      
      toast.success('Field changes approved successfully. Order is now unlocked.');
    } catch (error) {
      console.error('Error approving field changes:', error);
      toast.error('Failed to approve field changes');
    }
  };

  // Handle rejection of pending field changes by Management
  const handleRejectFieldChanges = async () => {
    if (!editableOrder || !user || (user.role !== 'Management' && user.role !== 'Admin')) {
      toast.error('Only Management or Admin role users can reject field changes');
      return;
    }
    
    if (!editableOrder.pendingFieldChanges || editableOrder.pendingFieldChanges.status !== 'Pending') {
      toast.error('No pending field changes to reject');
      return;
    }
    
    try {
      // Reject the changes - revert to original state
      const updatedOrder = {
        ...editableOrder,
        pendingFieldChanges: {
          ...editableOrder.pendingFieldChanges,
          status: 'Rejected' as const,
          rejectedBy: {
            userId: user.userId,
            name: user.name,
          },
          rejectedAt: new Date().toISOString(),
        },
        isLocked: false,
      };
      
      // Revert to original order state (before changes)
      if (originalOrderRef.current) {
        const revertedOrder = JSON.parse(JSON.stringify(originalOrderRef.current));
        // Keep the rejected status in pendingFieldChanges
        revertedOrder.pendingFieldChanges = updatedOrder.pendingFieldChanges;
        revertedOrder.isLocked = false;
        
        // Add timeline event
        addTimelineEvent(
          editableOrder.orderId,
          'Field Changes Rejected',
          `Field changes rejected by ${user.name}. Order reverted to original state.`,
          editableOrder.status
        );
        
        // Update the order
        await updateOrder(editableOrder.orderId, revertedOrder);
        
        // Update local state
        setOrder(revertedOrder);
        setEditableOrder(revertedOrder);
        committedOrderRef.current = revertedOrder;
        originalOrderRef.current = revertedOrder;
        
        toast.success('Field changes rejected. Order has been reverted to original state.');
      } else {
        // If no original state, just mark as rejected
        await updateOrder(editableOrder.orderId, updatedOrder);
        setOrder(updatedOrder);
        setEditableOrder(updatedOrder);
        committedOrderRef.current = updatedOrder;
        toast.success('Field changes rejected.');
      }
    } catch (error) {
      console.error('Error rejecting field changes:', error);
      toast.error('Failed to reject field changes');
    }
  };

  const handleSaveChanges = async () => {
    // ALWAYS log - this should appear in console
    console.log('🔵🔵🔵 handleSaveChanges CALLED 🔵🔵🔵');
    console.trace('Function call stack');
    
    if (!editableOrder || !order) {
      console.error('❌ Missing editableOrder or order');
      toast.error('Cannot save: Order data missing');
      return;
    }
    
    console.log('🔵 Order Status:', editableOrder.status);
    console.log('🔵 Order ID:', editableOrder.orderId);
    
    // CRITICAL: Use originalOrderRef for comparison - this holds the state when order was first loaded
    // This ensures we compare against the actual saved state, not a state that might have been updated
    const originalOrderForComparison = originalOrderRef.current 
      ? JSON.parse(JSON.stringify(originalOrderRef.current))
      : (committedOrderRef.current 
          ? JSON.parse(JSON.stringify(committedOrderRef.current))
          : JSON.parse(JSON.stringify(order)));
    
    console.log('🔵 Original order for comparison:', {
      materialsCount: originalOrderForComparison.materials?.length,
      originalOrderRefExists: !!originalOrderRef.current,
      committedOrderRefExists: !!committedOrderRef.current,
      orderStateExists: !!order,
      editableMaterialsCount: editableOrder.materials?.length
    });
    
    // Validate that all items have names (Item Details is mandatory)
    const emptyItems = editableOrder.materials?.filter(item => !item.name || item.name.trim() === '');
    if (emptyItems && emptyItems.length > 0) {
      toast.error('Item Details is mandatory. Please fill in all item names before saving.');
      return;
    }
    
    console.log('🔵 Starting field change detection');
    // Track all field changes for audit logging
    const changedFields: { field: string; oldValue: any; newValue: any }[] = [];
    
    // Compare all fields except status, timeline, auditLogs, and comments
    const fieldsToCheck = [
      { key: 'entity', label: 'Entity' },
      { key: 'materialName', label: 'Material Name' },
      { key: 'poNumber', label: 'PO Number' },
      { key: 'rfid', label: 'RFID' },
      { key: 'quantity', label: 'Quantity', transform: (v: any) => `${v.value} ${v.unit}` },
      { key: 'transitType', label: 'Transit Type' },
      { key: 'priceToCustomer', label: 'Price to Customer', transform: (v: any) => `${v.currency} ${v.amount}` },
      { key: 'priceFromSupplier', label: 'Price from Supplier', transform: (v: any) => `${v.currency} ${v.amount}` },
    ];

    fieldsToCheck.forEach(({ key, label, transform }) => {
      const oldValue = (originalOrderForComparison as any)[key];
      const newValue = (editableOrder as any)[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push({
          field: label,
          oldValue: transform ? transform(oldValue) : oldValue,
          newValue: transform ? transform(newValue) : newValue,
        });
      }
    });

    // Check customer fields
    if (editableOrder.customer && originalOrderForComparison.customer) {
      Object.keys(editableOrder.customer).forEach(key => {
        const oldVal = originalOrderForComparison.customer[key as keyof typeof originalOrderForComparison.customer];
        const newVal = editableOrder.customer[key as keyof typeof editableOrder.customer];
        if (oldVal !== newVal) {
          changedFields.push({
            field: `Customer ${key}`,
            oldValue: oldVal || '',
            newValue: newVal || '',
          });
        }
      });
    }

    // Check supplier fields
    // Handle case where supplier is being added (originalOrderForComparison.supplier is null but editableOrder.supplier exists)
    // or supplier fields are being updated
    if (editableOrder.supplier) {
      const oldSupplier = originalOrderForComparison.supplier || {};
      Object.keys(editableOrder.supplier).forEach(key => {
        const oldVal = oldSupplier[key as keyof typeof oldSupplier];
        const newVal = editableOrder.supplier?.[key as keyof typeof editableOrder.supplier];
        if (oldVal !== newVal) {
          changedFields.push({
            field: `Supplier ${key}`,
            oldValue: oldVal || '',
            newValue: newVal || '',
          });
        }
      });
    } else if (originalOrderForComparison.supplier) {
      // Handle case where supplier is being removed
      changedFields.push({
        field: 'Supplier',
        oldValue: originalOrderForComparison.supplier.name || 'Supplier',
        newValue: '',
      });
    }

    // Check if any approval-required fields were changed and status has passed PO_Approved
    // Check for: Material Name, Quantity, Price fields
    const approvalRequiredFieldLabels = ['Material Name', 'Quantity', 'Price to Customer', 'Price from Supplier'];
    let changedApprovalFields = changedFields.filter(cf => 
      approvalRequiredFieldLabels.includes(cf.field)
    );
    
    // Also check if materials table fields (name, quantity, rate) were changed
    // Use the stored original order for comparison
    console.log('🔍 Comparing materials:');
    console.log('  editableOrder.materials count:', editableOrder.materials?.length);
    console.log('  originalOrderForComparison.materials count:', originalOrderForComparison.materials?.length);
    
    if (editableOrder.materials && originalOrderForComparison.materials) {
      for (let i = 0; i < editableOrder.materials.length; i++) {
        const editableItem = editableOrder.materials[i];
        const originalItem = originalOrderForComparison.materials.find((m: MaterialItem) => m.id === editableItem.id);
        
        if (originalItem) {
          // Check if material name changed
          const nameChanged = editableItem.name !== originalItem.name;
          if (nameChanged) {
            console.log(`  ✅ Material ${i + 1} name changed: "${originalItem.name}" → "${editableItem.name}"`);
            changedApprovalFields.push({
              field: `Material ${i + 1} - Name`,
              oldValue: originalItem.name || 'N/A',
              newValue: editableItem.name || 'N/A',
            });
          }
          
          // Check if quantity changed
          const qtyChanged = editableItem.quantity.value !== originalItem.quantity.value || editableItem.quantity.unit !== originalItem.quantity.unit;
          if (qtyChanged) {
            console.log(`  ✅ Material ${i + 1} quantity changed: ${originalItem.quantity.value} ${originalItem.quantity.unit} → ${editableItem.quantity.value} ${editableItem.quantity.unit}`);
            changedApprovalFields.push({
              field: `Material ${i + 1} - Quantity`,
              oldValue: `${originalItem.quantity.value} ${originalItem.quantity.unit}`,
              newValue: `${editableItem.quantity.value} ${editableItem.quantity.unit}`,
            });
          }
          
          // Check if customer rate (unitPrice) changed
          const customerRateChanged = editableItem.unitPrice.amount !== originalItem.unitPrice.amount;
          if (customerRateChanged) {
            console.log(`  ✅ Material ${i + 1} customer rate changed: ${originalItem.unitPrice.amount} → ${editableItem.unitPrice.amount}`);
            changedApprovalFields.push({
              field: `Material ${i + 1} - Customer Rate`,
              oldValue: `${originalItem.unitPrice.currency} ${originalItem.unitPrice.amount}`,
              newValue: `${editableItem.unitPrice.currency} ${editableItem.unitPrice.amount}`,
            });
          }
          
          // Check if supplier rate (supplierUnitPrice) changed
          const supplierRateChanged = editableItem.supplierUnitPrice?.amount !== originalItem.supplierUnitPrice?.amount;
          if (supplierRateChanged) {
            console.log(`  ✅ Material ${i + 1} supplier rate changed: ${originalItem.supplierUnitPrice?.amount} → ${editableItem.supplierUnitPrice?.amount}`);
            changedApprovalFields.push({
              field: `Material ${i + 1} - Supplier Rate`,
              oldValue: originalItem.supplierUnitPrice ? `${originalItem.supplierUnitPrice.currency} ${originalItem.supplierUnitPrice.amount}` : 'N/A',
              newValue: editableItem.supplierUnitPrice ? `${editableItem.supplierUnitPrice.currency} ${editableItem.supplierUnitPrice.amount}` : 'N/A',
            });
          }
          
          if (!nameChanged && !qtyChanged && !customerRateChanged && !supplierRateChanged) {
            console.log(`  ⚪ Material ${i + 1} - no changes detected`);
          }
        } else if (editableItem) {
          // New material added - this also requires approval
          console.log(`  ✅ Material ${i + 1} - NEW material added: "${editableItem.name}"`);
          changedApprovalFields.push({
            field: `Material ${i + 1} - New Material Added`,
            oldValue: 'N/A',
            newValue: editableItem.name || 'New Material',
          });
        }
      }
      
      // Check if materials were removed
      if (originalOrderForComparison.materials.length > editableOrder.materials.length) {
        console.log(`  ✅ Materials removed: ${originalOrderForComparison.materials.length} → ${editableOrder.materials.length}`);
        changedApprovalFields.push({
          field: 'Materials Removed',
          oldValue: `${originalOrderForComparison.materials.length} materials`,
          newValue: `${editableOrder.materials.length} materials`,
        });
      }
    } else {
      console.log('  ⚠️ Materials arrays missing for comparison');
    }
    
    // Only lock if status has passed PO_Approved (including PO_Approved itself) AND one of the specific approval-required fields was actually changed
    const statusHasPassedPOApproved = hasStatusPassedPOApproved(editableOrder.status) || editableOrder.status === 'PO_Approved';
    const needsApproval = statusHasPassedPOApproved && changedApprovalFields.length > 0;
    
    // Comprehensive debug logging - ALWAYS log, not conditional
    console.log('=== SAVE CHANGES DEBUG ===');
    console.log('Order Status:', editableOrder.status);
    console.log('hasStatusPassedPOApproved(editableOrder.status):', hasStatusPassedPOApproved(editableOrder.status));
    console.log('editableOrder.status === "PO_Approved":', editableOrder.status === 'PO_Approved');
    console.log('Status has passed PO_Approved:', statusHasPassedPOApproved);
    console.log('Changed Approval Fields Count:', changedApprovalFields.length);
    console.log('Changed Approval Fields:', JSON.stringify(changedApprovalFields, null, 2));
    console.log('All Changed Fields Count:', changedFields.length);
    console.log('All Changed Fields:', JSON.stringify(changedFields.map(cf => ({ field: cf.field, old: cf.oldValue, new: cf.newValue })), null, 2));
    console.log('Needs Approval:', needsApproval);
    console.log('User exists:', !!user);
    console.log('User name:', user?.name);
    console.log('User role:', user?.role);
    console.log('========================');
    
    // If approval is needed, show dialog first before saving
    if (needsApproval && user) {
      console.log('✅✅✅ SHOWING APPROVAL DIALOG - Blocking save ✅✅✅');
      console.log('Setting pendingFieldChangesData:', JSON.stringify(changedApprovalFields, null, 2));
      
      // Set the pending field changes data first
      setPendingFieldChangesData({ fields: changedApprovalFields });
      
      // Open the dialog - use setTimeout to ensure state updates are processed
      setTimeout(() => {
        setFieldChangesApprovalDialogOpen(true);
        console.log('Dialog opened');
      }, 100);
      
      // Show a visible toast message
      toast.error('Important fields edited! Please select an approver in the dialog.', {
        duration: 5000,
        id: 'approval-required'
      });
      
      console.log('Dialog state set. Returning early to prevent save.');
      return; // Don't save yet, wait for user to select approver
    } else {
      console.log('❌❌❌ NOT showing approval dialog - proceeding with normal save ❌❌❌');
      console.log('Reason breakdown:', {
        needsApproval,
        hasUser: !!user,
        statusCheck: statusHasPassedPOApproved,
        fieldsCheck: changedApprovalFields.length > 0,
        statusValue: editableOrder.status
      });
      
      // Show debug toast if status is past PO_Approved but no fields detected
      if (statusHasPassedPOApproved && changedApprovalFields.length === 0) {
        console.warn('⚠️ Status is past PO_Approved but no approval fields detected!');
        console.warn('Changed fields:', changedFields.map(cf => cf.field));
      }
    }
    
    // Create order to save (normal save without approval needed)
    let orderToSave = JSON.parse(JSON.stringify(editableOrder));
    
    // IMPORTANT: Clear isLocked and pendingFieldChanges if no approval-required fields were changed
    // This ensures orders are only locked when the specific fields (quantity, customer rate, supplier rate) are actually edited
    if (orderToSave.isLocked && (!orderToSave.pendingFieldChanges || orderToSave.pendingFieldChanges.status !== 'Pending')) {
      orderToSave.isLocked = false;
      delete orderToSave.pendingFieldChanges;
    }
    
    // Add audit log for each changed field
    changedFields.forEach(({ field, oldValue, newValue }) => {
      addAuditLog(editableOrder.orderId, field, oldValue, newValue);
    });

    // Set flags to prevent ANY reloading or overwrites
    justSavedRef.current = true;
    ignoreContextUpdatesRef.current = true;
    
    // Store the saved order and supplier data references to prevent overwrites
    lastSavedOrderRef.current = orderToSave;
    if (orderToSave?.supplier) {
      savedSupplierDataRef.current = { ...orderToSave.supplier };
    } else {
      savedSupplierDataRef.current = null;
    }
    
      // CRITICAL: Update the committed order ref - this prevents useEffect from overwriting
      committedOrderRef.current = orderToSave;
      // CRITICAL: Update originalOrderRef to the saved state so future comparisons are accurate
      originalOrderRef.current = JSON.parse(JSON.stringify(orderToSave));
      
      // CRITICAL: Update ALL state synchronously - no delays, no batching issues
      // Update supplier search FIRST to ensure Autocomplete updates immediately
      const supplierName = orderToSave?.supplier?.name || '';
      setSupplierSearch(supplierName);
      
      // Update local state immediately - this is what the UI renders from
      setOrder(orderToSave);
      setEditableOrder(orderToSave);
      setHasChanges(false);
      setApprovalRequiredFields(new Set()); // Clear approval tracking
    
    // Show success message
    if (!needsApproval) {
      if (changedFields.length > 0) {
        toast.success(`Order updated successfully. ${changedFields.length} field(s) changed.`);
      } else {
        toast.success('Order updated successfully');
      }
    }
    
    // Update in background - don't wait for it or update UI from it
    updateOrder(orderToSave.orderId, orderToSave)
      .then((updatedOrder) => {
        console.log('Order saved to backend:', updatedOrder?.orderId);
        // Only update reference, never update UI state
        if (updatedOrder) {
          lastSavedOrderRef.current = updatedOrder;
        }
        // Reset ignore flag after a delay to allow future updates
        setTimeout(() => {
          ignoreContextUpdatesRef.current = false;
        }, 2000);
      })
      .catch(error => {
        console.error('Error updating order in background:', error);
        ignoreContextUpdatesRef.current = false;
      });
  };

  // Freight handler functions
  const handleFreightHandlerSearch = (query: string) => {
    setFreightHandlerSearch(query);
    const filtered = searchFreightHandlers(query);
    setFilteredFreightHandlers(filtered);
    setShowFreightHandlerDropdown(true);
  };

  const handleSupplierSelect = (supplier: Supplier | null) => {
    if (isOrderLocked()) {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    const baseOrder = committedOrderRef.current || editableOrder;
    if (baseOrder && supplier) {
      const updatedOrder = { ...baseOrder };
      updatedOrder.supplier = {
        name: supplier.name,
        address: supplier.address,
        country: supplier.country,
        email: supplier.email,
        phone: supplier.phone,
        gstin: supplier.gstin,
        origin: supplier.origin,
      };
      // Update both ref and state
      committedOrderRef.current = updatedOrder;
      setEditableOrder(updatedOrder);
      setHasChanges(true);
      setSupplierSearch(supplier.name);
      toast.success(`Supplier ${supplier.name} selected`);
    }
  };

  const handleFreightHandlerSelect = (handler: FreightHandler) => {
    if (isOrderLocked()) {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    if (editableOrder) {
      const updatedOrder = { ...editableOrder };
      updatedOrder.freightHandler = handler;
      setEditableOrder(updatedOrder);
      setHasChanges(true);
      setFreightHandlerSearch(handler.name);
      setShowFreightHandlerDropdown(false);
      toast.success(`Freight handler ${handler.name} selected`);
    }
  };

  const handleFreightHandlerFieldChange = (field: keyof FreightHandler, value: any) => {
    if (isOrderLocked()) {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    if (editableOrder && editableOrder.freightHandler) {
      const updatedOrder = { ...editableOrder };
      updatedOrder.freightHandler = {
        ...updatedOrder.freightHandler,
        [field]: value
      } as FreightHandler;
      setEditableOrder(updatedOrder);
      setHasChanges(true);
      
      // Mark that changes were made (will trigger Generate PO button if PO exists)
    }
  };

  // Logistics document handlers
  const handleLogisticsDocumentUpload = async (file: File, documentType: keyof LogisticsDocuments) => {
    if (!editableOrder || !user) return;
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        const newDocument = {
          id: `${documentType}_${Date.now()}`,
          documentType: documentType as any,
          document: {
            id: `${documentType}_${Date.now()}`,
            filename: file.name,
            uploadedAt: new Date().toISOString(),
            uploadedBy: {
              userId: user.userId,
              name: user.name,
            },
            fileSize: file.size,
            mimeType: file.type,
            data: base64Data,
          },
        };

        const updatedOrder = { ...editableOrder };
        updatedOrder.logisticsDocuments = {
          ...updatedOrder.logisticsDocuments,
          [documentType]: newDocument,
        } as LogisticsDocuments;

        setEditableOrder(updatedOrder);
        setHasChanges(true);
        toast.success(`${file.name} uploaded successfully`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading logistics document:', error);
      toast.error('Failed to upload document');
    }
  };

  const handleLogisticsDocumentDelete = (documentType: keyof LogisticsDocuments) => {
    if (isOrderLocked()) {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    if (!editableOrder) return;
    if (editableOrder.status !== 'Material_to_be_Dispatched') {
      toast.error('Logistics documents can only be deleted when status is "Material to be Dispatched"');
      return;
    }
    
    const updatedOrder = { ...editableOrder };
    if (updatedOrder.logisticsDocuments) {
      const updatedLogisticsDocs = { ...updatedOrder.logisticsDocuments };
      delete updatedLogisticsDocs[documentType];
      updatedOrder.logisticsDocuments = updatedLogisticsDocs;
    }
    
    setEditableOrder(updatedOrder);
    setHasChanges(true);
    toast.success('Document deleted successfully');
  };

  const handleLogisticsDocumentView = (documentType: keyof LogisticsDocuments) => {
    if (!editableOrder?.logisticsDocuments?.[documentType]?.document) return;
    
    const doc = editableOrder.logisticsDocuments[documentType]?.document;
    if (doc?.data) {
      setViewingDocument({ name: doc.filename, data: doc.data });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!order) {
    return (
      <Container maxWidth="xl" sx={{ mt: 3, px: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">
          Order not found
        </Alert>
      </Container>
    );
  }

  // Helper functions for theme colors
  const getBackgroundColor = () => mode === 'dark' ? '#000000' : '#F8F9FA'; // Using --background-primary from CSS
  const getTextColor = () => mode === 'dark' ? '#FFFFFF' : '#333333';
  const getSecondaryTextColor = () => mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const getAccordionBgColor = () => mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(239, 114, 31, 0.02)';
  const getAccordionBgColorExpanded = () => mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(239, 114, 31, 0.05)';
  const getBorderColor = () => mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(239, 114, 31, 0.2)';
  const getInputBorderColor = () => mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.23)';
  const getInputBorderColorHover = () => mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(239, 114, 31, 0.5)';

  // Item Table helper functions
  const handleAddItem = () => {
    if (isOrderLocked()) {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    if (!editableOrder) return;
    const defaultCurrency = editableOrder.priceFromSupplier.currency || 'USD';
    const newItem = {
      id: `item_${Date.now()}`,
      name: '',
      quantity: { value: 1, unit: 'g' },
      unitPrice: { amount: 0, currency: defaultCurrency }, // Customer price
      totalPrice: { amount: 0, currency: defaultCurrency }, // Customer price
      supplierUnitPrice: { amount: 0, currency: defaultCurrency }, // Supplier price
      supplierTotalPrice: { amount: 0, currency: defaultCurrency }, // Supplier price
      account: '',
      taxRate: 18,
      taxAmount: 0,
    };
    
    const updatedMaterials = [...(editableOrder.materials || []), newItem];
    setEditableOrder({ ...editableOrder, materials: updatedMaterials });
    setHasChanges(true);
  };

  const handleDeleteItem = (itemId: string) => {
    if (isOrderLocked()) {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    if (!editableOrder) return;
    const updatedMaterials = editableOrder.materials.filter(item => item.id !== itemId);
    setEditableOrder({ ...editableOrder, materials: updatedMaterials });
    setHasChanges(true);
  };

  const handleItemFieldChange = (itemId: string, field: string, value: any, viewMode?: 'customer' | 'supplier') => {
    if (!editableOrder) return;
    
    // Check if order is locked due to pending approval
    if (editableOrder.isLocked && editableOrder.pendingFieldChanges?.status === 'Pending') {
      toast.error('This order is locked pending approval from Higher Management. Please wait for approval before making changes.');
      return;
    }
    
    // Check if this field requires approval and status has passed PO_Approved
    const fieldPath = `materials.${itemId}.${field}`;
    const needsApproval = hasStatusPassedPOApproved(editableOrder.status) && 
                         (field === 'quantity' || field === 'rate');
    
    if (needsApproval) {
      // Track this field as requiring approval
      setApprovalRequiredFields(prev => {
        const newSet = new Set(prev);
        newSet.add(fieldPath);
        return newSet;
      });
      // Show toast warning
      toast('Editing this field will require approval from Higher Management', {
        icon: '⚠️',
        duration: 4000,
      });
    }
    
    const currentViewMode = viewMode || materialsViewMode;
    
    const updatedMaterials = editableOrder.materials.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item };
        
        if (field === 'name') {
          updatedItem.name = value;
        } else if (field === 'account') {
          updatedItem.account = value;
        } else if (field === 'quantity') {
          updatedItem.quantity.value = value;
          // Update totals for BOTH customer and supplier modes
          // Customer totals
          updatedItem.totalPrice.amount = value * updatedItem.unitPrice.amount;
          updatedItem.taxAmount = (updatedItem.totalPrice.amount * (updatedItem.taxRate || 0)) / 100;
          
          // Supplier totals
          if (!updatedItem.supplierTotalPrice) {
            updatedItem.supplierTotalPrice = { amount: 0, currency: updatedItem.unitPrice.currency };
          }
          if (!updatedItem.supplierUnitPrice) {
            updatedItem.supplierUnitPrice = { amount: 0, currency: updatedItem.unitPrice.currency };
          }
          updatedItem.supplierTotalPrice.amount = value * (updatedItem.supplierUnitPrice?.amount || 0);
        } else if (field === 'unit') {
          updatedItem.quantity.unit = value;
        } else if (field === 'rate') {
          if (currentViewMode === 'customer') {
            updatedItem.unitPrice.amount = value;
            updatedItem.totalPrice.amount = updatedItem.quantity.value * value;
            updatedItem.taxAmount = (updatedItem.totalPrice.amount * (updatedItem.taxRate || 0)) / 100;
          } else {
            // Supplier mode
            if (!updatedItem.supplierUnitPrice) {
              updatedItem.supplierUnitPrice = { amount: 0, currency: updatedItem.unitPrice.currency };
            }
            if (!updatedItem.supplierTotalPrice) {
              updatedItem.supplierTotalPrice = { amount: 0, currency: updatedItem.unitPrice.currency };
            }
            updatedItem.supplierUnitPrice.amount = value;
            updatedItem.supplierTotalPrice.amount = updatedItem.quantity.value * value;
          }
        } else if (field === 'currency') {
          if (currentViewMode === 'customer') {
            updatedItem.unitPrice.currency = value;
            updatedItem.totalPrice.currency = value;
          } else {
            if (!updatedItem.supplierUnitPrice) {
              updatedItem.supplierUnitPrice = { amount: 0, currency: value };
            } else {
              updatedItem.supplierUnitPrice.currency = value;
            }
            if (!updatedItem.supplierTotalPrice) {
              updatedItem.supplierTotalPrice = { amount: 0, currency: value };
            } else {
              updatedItem.supplierTotalPrice.currency = value;
            }
          }
        } else if (field === 'taxRate') {
          updatedItem.taxRate = value;
          if (currentViewMode === 'customer') {
            updatedItem.taxAmount = (updatedItem.totalPrice.amount * value) / 100;
          } else {
            updatedItem.taxAmount = ((updatedItem.supplierTotalPrice?.amount || 0) * value) / 100;
          }
        } else if (field === 'hsn') {
          updatedItem.hsn = value;
        } else if (field === 'itemDescription') {
          updatedItem.itemDescription = value;
        } else if (field === 'supplierTaxRate') {
          (updatedItem as any).supplierTaxRate = value;
        }
        
        return updatedItem;
      }
      return item;
    });
    
    setEditableOrder({ ...editableOrder, materials: updatedMaterials });
    setHasChanges(true);
  };

  const calculateSubTotal = () => {
    if (!editableOrder?.materials) return 0;
    if (materialsViewMode === 'customer') {
      return editableOrder.materials.reduce((sum, item) => sum + item.totalPrice.amount, 0);
    } else {
      return editableOrder.materials.reduce((sum, item) => sum + (item.supplierTotalPrice?.amount || 0), 0);
    }
  };

  const calculateTotalTax = () => {
    if (!editableOrder?.materials) return 0;
    if (materialsViewMode === 'customer') {
      return editableOrder.materials.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    } else {
      // For supplier mode, calculate tax based on supplier total
      return editableOrder.materials.reduce((sum, item) => {
        const supplierTotal = item.supplierTotalPrice?.amount || 0;
        const taxAmount = (supplierTotal * (item.taxRate || 0)) / 100;
        return sum + taxAmount;
      }, 0);
    }
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubTotal();
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  };

  const calculateTDSAmount = () => {
    const subtotal = calculateSubTotal();
    return (subtotal * tdsRate) / 100;
  };

  const calculateTCSAmount = () => {
    const subtotal = calculateSubTotal();
    return (subtotal * tcsRate) / 100;
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateSubTotal();
    
    // Calculate adjustment based on type
    let adjustmentAmount = 0;
    if (adjustmentType === 'percentage') {
      adjustmentAmount = (subtotal * adjustment) / 100;
    } else {
      adjustmentAmount = adjustment;
    }
    
    if (materialsViewMode === 'supplier') {
      // Check if supplier GSTIN starts with "36" (Telangana)
      const supplierGSTIN = editableOrder?.supplier?.gstin || '';
      const isTelanganaSupplier = supplierGSTIN.startsWith('36');
      
      if (isTelanganaSupplier) {
        // For Telangana suppliers: subtotal + all SGST + all CGST + adjustment
        let totalSGST = 0;
        let totalCGST = 0;
        
        if (editableOrder?.materials) {
          editableOrder.materials.forEach((item) => {
            const taxRate = (item as any).supplierTaxRate;
            if (taxRate !== undefined && taxRate !== null && taxRate !== 0) {
              const itemSubtotal = (item.supplierTotalPrice?.amount || 0);
              const halfTaxRate = taxRate / 2;
              const sgstAmount = (itemSubtotal * halfTaxRate) / 100;
              const cgstAmount = (itemSubtotal * halfTaxRate) / 100;
              totalSGST += sgstAmount;
              totalCGST += cgstAmount;
            }
          });
        }
        
        return subtotal + totalSGST + totalCGST + adjustmentAmount;
      } else {
        // For non-Telangana suppliers: subtotal + all IGST + adjustment
        let totalIGST = 0;
        
        if (editableOrder?.materials) {
          editableOrder.materials.forEach((item) => {
            const taxRate = (item as any).supplierTaxRate;
            if (taxRate !== undefined && taxRate !== null && taxRate !== 0) {
              const itemSubtotal = (item.supplierTotalPrice?.amount || 0);
              const igstAmount = (itemSubtotal * taxRate) / 100;
              totalIGST += igstAmount;
            }
          });
        }
        
        return subtotal + totalIGST + adjustmentAmount;
      }
    } else {
      // For customer view: subtotal + tax - discount (TDS/TCS and adjustment removed)
      const tax = calculateTotalTax();
      const discount = calculateDiscountAmount();
      
      return subtotal + tax - discount;
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: getBackgroundColor(), minHeight: '100vh' }}>
      <AppBanner />
      
      {/* Alert banner for locked orders */}
      {isOrderLocked() && (
        <Alert 
          severity="warning" 
          sx={{ 
            m: 2, 
            mb: 0,
            bgcolor: mode === 'dark' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)',
            border: `1px solid ${mode === 'dark' ? 'rgba(255, 152, 0, 0.5)' : 'rgba(255, 152, 0, 0.3)'}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            ⚠️ Pending Approval - Order Locked
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            This order has pending field changes that require approval from Higher Management. The order is currently read-only.
          </Typography>
        </Alert>
      )}
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        pt: 2,
        pb: 3,
        bgcolor: getBackgroundColor(),
        overflow: 'visible',
        position: 'relative',
        zIndex: 1,
      }}>
        <Dock>
          <DockItem>
            <DockIcon>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedSection('orderSummary')}
              >
                <Summarize sx={{ fontSize: '32px', color: mode === 'dark' ? '#FFFFFF' : '#1A1A1A' }} />
              </Box>
              <DockLabel>Order Summary</DockLabel>
            </DockIcon>
          </DockItem>
          <DockItem>
            <DockIcon>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedSection('itemTable')}
              >
                <Inventory sx={{ fontSize: '32px', color: mode === 'dark' ? '#FFFFFF' : '#1A1A1A' }} />
              </Box>
              <DockLabel>Material(s) Info</DockLabel>
            </DockIcon>
          </DockItem>
          <DockItem>
            <DockIcon>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedSection('customerSupplierInformation')}
              >
                <Business sx={{ fontSize: '32px', color: mode === 'dark' ? '#FFFFFF' : '#1A1A1A' }} />
              </Box>
              <DockLabel>Customer & Supplier</DockLabel>
            </DockIcon>
          </DockItem>
          <DockItem>
            <DockIcon>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedSection('freightHandlerInformation')}
              >
                <LocalShipping sx={{ fontSize: '32px', color: mode === 'dark' ? '#FFFFFF' : '#1A1A1A' }} />
              </Box>
              <DockLabel>Freight Handler</DockLabel>
            </DockIcon>
          </DockItem>
          <DockItem>
            <DockIcon>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedSection('documents')}
              >
                <Folder sx={{ fontSize: '32px', color: mode === 'dark' ? '#FFFFFF' : '#1A1A1A' }} />
              </Box>
              <DockLabel>Documents</DockLabel>
            </DockIcon>
          </DockItem>
          {editableOrder?.advancePayment && (
            <DockItem>
              <DockIcon>
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedSection('advancePaymentDetails')}
                >
                  <Payment sx={{ fontSize: '32px', color: mode === 'dark' ? '#FFFFFF' : '#1A1A1A' }} />
                </Box>
                <DockLabel>Advance Payment</DockLabel>
              </DockIcon>
            </DockItem>
          )}
          {editableOrder && ['Approved', 'Advance_Payment_Completed', 'Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit'].includes(editableOrder.status) && (
            <DockItem>
              <DockIcon>
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedSection('paymentDetails')}
                >
                  <Receipt sx={{ fontSize: '32px', color: mode === 'dark' ? '#FFFFFF' : '#1A1A1A' }} />
                </Box>
                <DockLabel>Payment Details</DockLabel>
              </DockIcon>
            </DockItem>
          )}
          {editableOrder && (() => {
            const statusOrder: string[] = [
              'PO_Received_from_Client',
              'Drafting_PO_for_Supplier',
              'Sent_PO_for_Approval',
              'PO_Rejected',
              'PO_Approved',
              'PO_Sent_to_Supplier',
              'Proforma_Invoice_Received',
              'Awaiting_COA',
              'COA_Received',
              'COA_Revision',
              'COA_Accepted',
              'Approved',
              'Advance_Payment_Completed',
              'Material_to_be_Dispatched',
              'Material_Dispatched',
              'In_Transit',
              'Delivered',
            ];
            const currentIndex = statusOrder.indexOf(editableOrder.status);
            const materialToBeDispatchedIndex = statusOrder.indexOf('Material_to_be_Dispatched');
            const isLogisticsVisible = currentIndex >= materialToBeDispatchedIndex && currentIndex !== -1;
            
            return isLogisticsVisible ? (
              <DockItem>
                <DockIcon>
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedSection('logistics')}
                  >
                    <Warehouse sx={{ fontSize: '32px', color: mode === 'dark' ? '#FFFFFF' : '#1A1A1A' }} />
                  </Box>
                  <DockLabel>Logistics</DockLabel>
                </DockIcon>
              </DockItem>
            ) : null;
          })()}
        </Dock>
      </Box>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 3, px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Order Locked Banner */}
        {editableOrder?.isLocked && editableOrder?.pendingFieldChanges?.status === 'Pending' && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3, 
              bgcolor: mode === 'dark' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)',
              border: '1px solid #FF9800',
              '& .MuiAlert-icon': { color: '#FF9800' }
            }}
            action={
              editableOrder.pendingFieldChanges.requestedBy && (
                <Typography variant="body2" sx={{ color: getTextColor() }}>
                  Requested by: {editableOrder.pendingFieldChanges.requestedBy.name}
                </Typography>
              )
            }
          >
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
              Order Locked - Pending Approval
            </Typography>
            <Typography variant="body2">
              This order is in read-only mode. Important field changes require approval from Higher Management before they can be applied.
              {editableOrder.pendingFieldChanges.fields.length > 0 && (
                <> {editableOrder.pendingFieldChanges.fields.length} field(s) pending approval.</>
              )}
            </Typography>
          </Alert>
        )}
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => {
              // Managers and Management roles go to orders page, employees go to dashboard
              const isManagerOrHigher = user?.role === 'Manager' || user?.role === 'Management';
              navigate(isManagerOrHigher ? '/orders' : '/dashboard');
            }}
            sx={{ 
              mb: 2,
              color: getTextColor(),
              borderColor: getInputBorderColor(),
              '&:hover': { borderColor: getInputBorderColorHover() },
            }}
            variant="outlined"
          >
            {(user?.role === 'Manager' || user?.role === 'Management') 
              ? 'Back to Orders' 
              : 'Back to Dashboard'}
          </Button>
          
          {/* Header with Order Number and Status Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            {/* Left: Order Title */}
            <Box>
              <Typography variant="h3" sx={{ color: getTextColor(), fontWeight: 700, mb: 1, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' } }}>
                Order Details - {order.orderId}
              </Typography>
              <Typography variant="h6" sx={{ color: getSecondaryTextColor(), fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}>
                Pharmaceutical Sourcing Order Management
              </Typography>
            </Box>
            
            {/* Right: Status Controls */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              {/* First Row: Status Dropdown and Primary Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 240, flexShrink: 0 }}>
                  <InputLabel sx={{ color: getTextColor() }}>Status</InputLabel>
                  <Select
                    label="Status"
                    value={order.status}
                    disabled={isOrderLocked()}
                    onChange={(e) => {
                      const newStatus = String(e.target.value);
                      setNewStatus(newStatus);
                      handleStatusChange(newStatus);
                    }}
                    sx={{
                      color: getTextColor(),
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                    }}
                  >
                    {Object.entries(getAvailableStatuses(order.status)).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* Move to next stage button */}
                {editableOrder?.status !== 'Sent_PO_for_Approval' && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Send sx={{ transform: 'rotate(-40deg)', fontSize: '1.2rem' }} />}
                    onClick={() => {
                      const nextStatus = getNextStatus(order.status);
                      if (nextStatus) {
                        handleStatusChange(nextStatus);
                      }
                    }}
                    disabled={
                      isOrderLocked() ||
                      !getNextStatus(order.status) ||
                      (getNextStatus(order.status) === 'Drafting_PO_for_Supplier' && !editableOrder?.entity) ||
                      (editableOrder?.status === 'Drafting_PO_for_Supplier' && !editableOrder?.documents?.supplierPO)
                    }
                    sx={{
                      bgcolor: '#EF721F',
                      fontSize: '0.75rem',
                      px: 2,
                      py: 0.5,
                      whiteSpace: 'nowrap',
                      height: '40px',
                      flexShrink: 1,
                      minWidth: 'fit-content',
                      '&:hover': { 
                        bgcolor: '#6A3DD8',
                      },
                    }}
                  >
                    Move to next stage
                  </Button>
                )}
                
                {/* Accept/Reject buttons for Sent PO for Approval status */}
                {editableOrder?.status === 'Sent_PO_for_Approval' && (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CheckCircle />}
                      onClick={handleAcceptPO}
                      disabled={user?.role !== 'Management'}
                      sx={{
                        bgcolor: '#10B981',
                        fontSize: '0.75rem',
                        px: 2,
                        py: 0.5,
                        whiteSpace: 'nowrap',
                        height: '40px',
                        flexShrink: 1,
                        minWidth: 'fit-content',
                        '&:hover': { bgcolor: '#059669' },
                      }}
                    >
                      Accept PO
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Close />}
                      onClick={handleRejectPO}
                      disabled={user?.role !== 'Management'}
                      sx={{
                        bgcolor: '#EF4444',
                        fontSize: '0.75rem',
                        px: 2,
                        py: 0.5,
                        whiteSpace: 'nowrap',
                        height: '40px',
                        flexShrink: 1,
                        minWidth: 'fit-content',
                        '&:hover': { bgcolor: '#DC2626' },
                      }}
                    >
                      Reject PO
                    </Button>
                  </>
                )}
              </Box>
              
              {/* Second Row: Status-Specific Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Generate Supplier PO Button */}
                {(() => {
                  // Check if we should show the button
                  const isDraftingStatus = editableOrder?.status === 'Drafting_PO_for_Supplier';
                  
                  // Check if PO exists and there are changes to tracked fields
                  const hasPO = editableOrder?.documents?.supplierPO || poBaselineState !== null;
                  let hasChanges = false;
                  
                  if (hasPO && poBaselineState && editableOrder) {
                    // Check material changes
                    const materialChanges = editableOrder.materials.some((currentMat, index) => {
                      const baselineMat = poBaselineState.materials.find(bm => bm.id === currentMat.id) ||
                                         poBaselineState.materials[index];
                      if (!baselineMat) return true; // New material
                      
                      // Check name
                      if (currentMat.name !== baselineMat.name) return true;
                      // Check quantity
                      if (currentMat.quantity.value !== baselineMat.quantity.value ||
                          currentMat.quantity.unit !== baselineMat.quantity.unit) return true;
                      // Check supplier rate
                      const currentRate = currentMat.supplierUnitPrice?.amount || 0;
                      const baselineRate = baselineMat.supplierUnitPrice?.amount || 0;
                      if (currentRate !== baselineRate) return true;
                      
                      return false;
                    });
                    
                    // Check if materials count changed
                    const materialCountChanged = editableOrder.materials.length !== poBaselineState.materials.length;
                    
                    // Check freight handler changes
                    const freightHandlerChanged = JSON.stringify(editableOrder.freightHandler) !== 
                                                  JSON.stringify(poBaselineState.freightHandler);
                    
                    hasChanges = materialChanges || materialCountChanged || freightHandlerChanged;
                  }
                  
                  return isDraftingStatus || (hasPO && hasChanges);
                })() && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AttachFile />}
                    onClick={handleGeneratePO}
                    disabled={
                      isOrderLocked() ||
                      isGeneratingPDF ||
                      !editableOrder?.materials ||
                      editableOrder.materials.length === 0 ||
                      !editableOrder.materials.some(m => m.supplierUnitPrice && m.supplierUnitPrice.amount > 0)
                    }
                    sx={{
                      bgcolor: '#EF721F',
                      fontSize: '0.75rem',
                      px: 2,
                      py: 0.5,
                      whiteSpace: 'nowrap',
                      height: '40px',
                      flexShrink: 1,
                      minWidth: 'fit-content',
                      '&:hover': { 
                        bgcolor: '#6A3DD8',
                      },
                    }}
                  >
                    {isGeneratingPDF 
                      ? 'Generating...' 
                      : (() => {
                          const hasPO = editableOrder?.documents?.supplierPO || poBaselineState !== null;
                          return hasPO && poVersion > 0 
                            ? `Regenerate PO (V${poVersion + 1})` 
                            : 'Generate PO for Supplier';
                        })()}
                  </Button>
                )}
                
                {/* Send PO to Supplier Button */}
                {editableOrder?.status === 'PO_Approved' && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Send />}
                    onClick={handleSendPOToSupplier}
                    disabled={isOrderLocked()}
                    sx={{
                      bgcolor: '#4CAF50',
                      fontSize: '0.75rem',
                      px: 2,
                      py: 0.5,
                      whiteSpace: 'nowrap',
                      height: '40px',
                      flexShrink: 1,
                      minWidth: 'fit-content',
                      '&:hover': { 
                        bgcolor: '#45A049',
                      },
                    }}
                  >
                    Send PO to Supplier
                  </Button>
                )}
                
                {/* Send COA to Customer Button */}
                {editableOrder?.status === 'COA_Received' && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSendCOAToCustomer}
                    disabled={isOrderLocked()}
                    sx={{
                      backgroundColor: '#FF9800',
                      color: getTextColor(),
                      fontSize: '0.75rem',
                      px: 2,
                      py: 0.5,
                      whiteSpace: 'nowrap',
                      height: '40px',
                      flexShrink: 1,
                      minWidth: 'fit-content',
                      '&:hover': { backgroundColor: '#F57C00' },
                    }}
                  >
                    Send COA to Customer
                  </Button>
                )}
                
                {/* Send for Approval Button */}
                {editableOrder?.status === 'COA_Accepted' && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      if (order) {
                        updateOrderStatus(order.orderId, 'Awaiting_Approval');
                        toast.success('Status updated to Awaiting Approval');
                      }
                    }}
                    disabled={isOrderLocked()}
                    sx={{
                      backgroundColor: '#EF721F',
                      color: getTextColor(),
                      fontSize: '0.75rem',
                      px: 2,
                      py: 0.5,
                      whiteSpace: 'nowrap',
                      height: '40px',
                      flexShrink: 1,
                      minWidth: 'fit-content',
                      '&:hover': { backgroundColor: '#8E24AA' },
                    }}
                  >
                    Send for Approval
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: { xs: 2, sm: 3 } }}>
          {/* Main Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid item xs={12} md={12} lg={8.5}>
            {/* Generated Supplier PO Preview - Shows in current section */}
            {generatedPDF && (
              <Paper 
                sx={{
                  mb: 3,
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  p: 3,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600 }}>
                    Generated Supplier PO Preview
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setGeneratedPDF(null)}
                    sx={{ color: getSecondaryTextColor() }}
                  >
                    <Close />
                  </IconButton>
                </Box>
                <Box sx={{ 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  borderRadius: 1,
                  p: 2,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  mb: 2
                }}>
                  <iframe
                    src={generatedPDF}
                    width="100%"
                    height="600"
                    style={{ border: 'none', borderRadius: '4px' }}
                    title="Generated Supplier PO"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = generatedPDF;
                      const versionSuffix = poVersion > 0 ? `_V${poVersion}` : '';
                      link.download = `${editableOrder?.entity || 'HRV'}_Supplier_PO_${editableOrder?.orderId}${versionSuffix}.pdf`;
                      link.click();
                    }}
                    sx={{
                      color: '#EF721F',
                      borderColor: '#EF721F',
                      '&:hover': {
                        borderColor: '#6A3DD8',
                        bgcolor: 'rgba(61, 82, 160, 0.1)'
                      }
                    }}
                  >
                    Download PDF
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAttachPDF}
                    sx={{
                      color: '#4CAF50',
                      borderColor: '#4CAF50',
                      '&:hover': {
                        borderColor: '#45A049',
                        bgcolor: 'rgba(76, 175, 80, 0.1)'
                      }
                    }}
                  >
                    Save
                  </Button>
                </Box>
              </Paper>
            )}
            {/* Order Summary */}
            {(selectedSection === null || selectedSection === 'orderSummary') && (
            <Paper 
              sx={{
              mb: 3, 
              bgcolor: getAccordionBgColor(), 
              border: `1px solid ${getBorderColor()}`,
              borderRadius: 2,
              p: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', mb: 2 }}>
                <Typography variant="h5" sx={{ color: getTextColor(), fontWeight: 600 }}>
                  Order Summary
                </Typography>
                {/* Approval/Reject Buttons for Management and Admin */}
                {(() => {
                  const hasPendingChanges = editableOrder?.pendingFieldChanges?.status === 'Pending';
                  const isAuthorized = user?.role === 'Management' || user?.role === 'Admin';
                  console.log('🔍 Button Visibility Check:', {
                    hasPendingChanges,
                    isAuthorized,
                    userRole: user?.role,
                    pendingStatus: editableOrder?.pendingFieldChanges?.status,
                    shouldShow: hasPendingChanges && isAuthorized
                  });
                  return hasPendingChanges && isAuthorized;
                })() && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CheckCircle />}
                      onClick={handleApproveFieldChanges}
                      sx={{
                        bgcolor: '#10B981',
                        fontSize: '0.75rem',
                        px: 2,
                        py: 0.5,
                        '&:hover': { bgcolor: '#059669' },
                      }}
                    >
                      Approve Changes
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Close />}
                      onClick={handleRejectFieldChanges}
                      sx={{
                        bgcolor: '#EF4444',
                        fontSize: '0.75rem',
                        px: 2,
                        py: 0.5,
                        '&:hover': { bgcolor: '#DC2626' },
                      }}
                    >
                      Reject Changes
                    </Button>
                  </Box>
                )}
              </Box>
              
              {/* Pending Field Changes Display */}
              {editableOrder?.pendingFieldChanges?.status === 'Pending' && (
                <Box sx={{ 
                  mb: 3, 
                  p: 2, 
                  bgcolor: mode === 'dark' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.08)',
                  border: `2px solid ${mode === 'dark' ? 'rgba(255, 152, 0, 0.5)' : 'rgba(255, 152, 0, 0.3)'}`,
                  borderRadius: 2,
                }}>
                  <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                    ⚠️ Pending Field Changes Awaiting Approval
                  </Typography>
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 2 }}>
                    The following fields have been changed and require your approval:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {editableOrder.pendingFieldChanges.fields.map((field, index) => (
                      <Box 
                        key={index}
                        sx={{ 
                          p: 1.5, 
                          bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          borderRadius: 1,
                          border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                        }}
                      >
                        <Typography variant="body2" sx={{ color: getTextColor(), fontWeight: 600, mb: 0.5 }}>
                          {field.field}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ color: getSecondaryTextColor(), fontSize: '0.875rem' }}>
                            <strong>From:</strong> {String(field.oldValue)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#EF721F', fontSize: '0.875rem' }}>
                            →
                          </Typography>
                          <Typography variant="body2" sx={{ color: getTextColor(), fontSize: '0.875rem', fontWeight: 600 }}>
                            <strong>To:</strong> {String(field.newValue)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ color: getSecondaryTextColor(), mt: 2, display: 'block' }}>
                    Requested by: {editableOrder.pendingFieldChanges.requestedBy?.name || 'N/A'} on{' '}
                    {new Date(editableOrder.pendingFieldChanges.requestedAt).toLocaleString()}
                  </Typography>
                </Box>
              )}
              
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 120, flexShrink: 0 }} required disabled>
                      <InputLabel sx={{ color: getTextColor() }}>Entity</InputLabel>
                      <Select
                        label="Entity"
                        value={editableOrder?.entity || ''}
                        sx={{
                          color: getTextColor(),
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                        }}
                      >
                        <MenuItem value="HRV">HRV</MenuItem>
                        <MenuItem value="NHG">NHG</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Order Type"
                    value={editableOrder?.orderType || ''}
                    fullWidth
                    variant="outlined"
                    size="small"
                    InputProps={{ readOnly: true }}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                        color: getTextColor(),
                        '& fieldset': { borderColor: getInputBorderColor() },
                        '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                        '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                      },
                      '& .MuiInputBase-input': { color: getTextColor() },
                      '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: getSecondaryTextColor() }}>Transit Type</InputLabel>
                    <Select
                      value={editableOrder?.transitType || ''}
                      onChange={(e) => handleFieldChange('transitType', e.target.value)}
                      disabled={isOrderLocked()}
                      sx={{
                        color: getTextColor(),
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                        '& .MuiSelect-icon': { color: getSecondaryTextColor() },
                      }}
                      label="Transit Type"
                    >
                      <MenuItem value="Air">Air</MenuItem>
                      <MenuItem value="Sea">Sea</MenuItem>
                      <MenuItem value="Road">Road</MenuItem>
                      <MenuItem value="Courier">Courier</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              
              {/* Additional Order Fields */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <TextField
                    label="Enquiry No."
                    value={editableOrder?.enquiryNo || ''}
                    onChange={(e) => handleFieldChange('enquiryNo', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    disabled={isOrderLocked()}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                        color: getTextColor(),
                        '& fieldset': { borderColor: getInputBorderColor() },
                        '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                        '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                      },
                      '& .MuiInputBase-input': { color: getTextColor() },
                      '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="UPC"
                    value={editableOrder?.upc || ''}
                    onChange={(e) => handleFieldChange('upc', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    disabled={isOrderLocked()}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                        color: getTextColor(),
                        '& fieldset': { borderColor: getInputBorderColor() },
                        '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                        '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                      },
                      '& .MuiInputBase-input': { color: getTextColor() },
                      '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="EAN"
                    value={editableOrder?.ean || ''}
                    onChange={(e) => handleFieldChange('ean', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    disabled={isOrderLocked()}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                        color: getTextColor(),
                        '& fieldset': { borderColor: getInputBorderColor() },
                        '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                        '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                      },
                      '& .MuiInputBase-input': { color: getTextColor() },
                      '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="MPN"
                    value={editableOrder?.mpn || ''}
                    onChange={(e) => handleFieldChange('mpn', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    disabled={isOrderLocked()}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                        color: getTextColor(),
                        '& fieldset': { borderColor: getInputBorderColor() },
                        '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                        '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                      },
                      '& .MuiInputBase-input': { color: getTextColor() },
                      '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="ISBN"
                    value={editableOrder?.isbn || ''}
                    onChange={(e) => handleFieldChange('isbn', e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                    disabled={isOrderLocked()}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                        color: getTextColor(),
                        '& fieldset': { borderColor: getInputBorderColor() },
                        '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                        '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                      },
                      '& .MuiInputBase-input': { color: getTextColor() },
                      '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                    }}
                  />
                </Grid>
                
                {/* Dropdown Fields */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: getSecondaryTextColor() }}>Inventory Account</InputLabel>
                    <Select
                      value={editableOrder?.inventoryAccount || 'Stock-In + Hand'}
                      onChange={(e) => handleFieldChange('inventoryAccount', e.target.value)}
                      disabled={isOrderLocked()}
                      sx={{
                        color: getTextColor(),
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                        '& .MuiSvgIcon-root': { color: getSecondaryTextColor() },
                      }}
                    >
                      <MenuItem value="Stock-In + Hand">Stock-In + Hand</MenuItem>
                      <MenuItem value="Stock-In + Transit">Stock-In + Transit</MenuItem>
                      <MenuItem value="Stock-In + Quality Control">Stock-In + Quality Control</MenuItem>
                      <MenuItem value="Stock-In + Warehouse">Stock-In + Warehouse</MenuItem>
                      <MenuItem value="Stock-Out + Sold">Stock-Out + Sold</MenuItem>
                      <MenuItem value="Stock-Out + Damaged">Stock-Out + Damaged</MenuItem>
                      <MenuItem value="Stock-Out + Expired">Stock-Out + Expired</MenuItem>
                      <MenuItem value="Stock-Out + Returned">Stock-Out + Returned</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: getSecondaryTextColor() }}>Inventory Valuation Method</InputLabel>
                    <Select
                      value={editableOrder?.inventoryValuationMethod || 'FIFO(First In First Out)'}
                      onChange={(e) => handleFieldChange('inventoryValuationMethod', e.target.value)}
                      disabled={isOrderLocked()}
                      sx={{
                        color: getTextColor(),
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                        '& .MuiSvgIcon-root': { color: getSecondaryTextColor() },
                      }}
                    >
                      <MenuItem value="FIFO(First In First Out)">FIFO(First In First Out)</MenuItem>
                      <MenuItem value="LIFO(Last In First Out)">LIFO(Last In First Out)</MenuItem>
                      <MenuItem value="Weighted Average">Weighted Average</MenuItem>
                      <MenuItem value="Moving Average">Moving Average</MenuItem>
                      <MenuItem value="Specific Identification">Specific Identification</MenuItem>
                      <MenuItem value="Standard Cost">Standard Cost</MenuItem>
                      <MenuItem value="Retail Method">Retail Method</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              {/* Supplier Comments - Only visible for statuses after PO_Sent_to_Supplier */}
              {(() => {
                const statusOrder: OrderStatus[] = [
                  'PO_Received_from_Client',
                  'Drafting_PO_for_Supplier',
                  'Sent_PO_for_Approval',
                  'PO_Rejected',
                  'PO_Approved',
                  'PO_Sent_to_Supplier',
                  'Proforma_Invoice_Received',
                  'Awaiting_COA',
                  'COA_Received',
                  'COA_Revision',
                  'COA_Accepted',
                  'Awaiting_Approval',
                  'Approved',
                  'Advance_Payment_Completed',
                  'Material_to_be_Dispatched',
                  'Material_Dispatched',
                  'In_Transit',
                  'Completed',
                ];
                const currentStatusIndex = statusOrder.indexOf(editableOrder?.status || 'PO_Received_from_Client');
                const poSentToSupplierIndex = statusOrder.indexOf('PO_Sent_to_Supplier');
                return currentStatusIndex > poSentToSupplierIndex;
              })() && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    label="Supplier Comments"
                    value={editableOrder?.supplierComments || ''}
                    onChange={(e) => handleFieldChange('supplierComments', e.target.value)}
                    fullWidth
                    variant="outlined"
                    multiline
                    rows={4}
                    disabled={isOrderLocked()}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                        color: getTextColor(),
                        '& fieldset': { borderColor: getInputBorderColor() },
                        '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                        '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                      },
                      '& .MuiInputBase-input': { color: getTextColor() },
                      '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                    }}
                    placeholder="Enter supplier comments here..."
                  />
                </Box>
              )}
              
              </Box>
            </Paper>
            )}

            {/* Item Table */}
            {(selectedSection === null || selectedSection === 'itemTable') && (
            <Paper 
              sx={{
                mb: 3, 
                bgcolor: getAccordionBgColor(), 
                border: `1px solid ${getBorderColor()}`,
                borderRadius: 2,
                p: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600 }}>
                  Material(s) Info
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: materialsViewMode === 'customer' ? '#EF721F' : getSecondaryTextColor(),
                      fontWeight: materialsViewMode === 'customer' ? 600 : 400,
                    }}
                  >
                    Customer
                  </Typography>
                  <Box
                    onClick={() => setMaterialsViewMode(materialsViewMode === 'customer' ? 'supplier' : 'customer')}
                    sx={{
                      width: 48,
                      height: 24,
                      borderRadius: 12,
                      bgcolor: materialsViewMode === 'supplier' ? '#EF721F' : 'rgba(0,0,0,0.23)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background-color 0.3s',
                      '&:hover': {
                        bgcolor: materialsViewMode === 'supplier' ? '#EF721F' : 'rgba(0,0,0,0.32)',
                      }
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 2,
                        left: materialsViewMode === 'supplier' ? 26 : 2,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: 'white',
                        transition: 'left 0.3s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    />
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: materialsViewMode === 'supplier' ? '#EF721F' : getSecondaryTextColor(),
                      fontWeight: materialsViewMode === 'supplier' ? 600 : 400,
                    }}
                  >
                    Supplier
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Box sx={{ mb: 3 }}>
                  <TableContainer component={Paper} sx={{ 
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${getBorderColor()}`,
                    mb: 2,
                  }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, minWidth: 300 }}>
                            ITEM DETAILS
                          </TableCell>
                          <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, minWidth: 200 }}>
                            ITEM DESCRIPTION
                          </TableCell>
                          <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, minWidth: 150 }}>
                            HSN CODE
                          </TableCell>
                          <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, minWidth: 150 }}>
                            ACCOUNT
                          </TableCell>
                          <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, width: 100 }}>
                            QUANTITY
                          </TableCell>
                          <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, width: 100 }}>
                            UOM
                          </TableCell>
                          <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, width: 100 }}>
                            CURRENCY
                          </TableCell>
                          <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, minWidth: 150 }}>
                            RATE
                          </TableCell>
                          {materialsViewMode === 'supplier' && (
                            <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, width: 120 }}>
                              TAX
                            </TableCell>
                          )}
                          <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, width: 120 }}>
                            AMOUNT
                          </TableCell>
                          <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}`, width: 80 }}>
                            DELETE
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {editableOrder?.materials?.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1 }}>
                              <Tooltip title={item.name || ''} arrow placement="top">
                                <Box>
                                  <Autocomplete
                                    key={`autocomplete-${item.id}`}
                                    value={item.name || null}
                                    onChange={(event, newValue) => {
                                      // Handle when user selects from dropdown or clears
                                      handleItemFieldChange(item.id, 'name', newValue || '');
                                    }}
                                    inputValue={item.name || ''}
                                    onInputChange={(event, newInputValue, reason) => {
                                      // Handle typing and clearing
                                      if (reason === 'input' || reason === 'clear') {
                                        handleItemFieldChange(item.id, 'name', newInputValue);
                                      }
                                    }}
                                    options={allProducts.map((product) => product.itemName)}
                                    filterOptions={(options, { inputValue }) => {
                                      if (!inputValue || inputValue.trim() === '') {
                                        // Show top 50 options when empty
                                        return options.slice(0, 50);
                                      }
                                      
                                      const inputLower = inputValue.toLowerCase().trim();
                                      
                                      // Score and sort options by relevance
                                      const scored = options.map(option => {
                                        const optionLower = option.toLowerCase();
                                        
                                        // Check if option contains the input
                                        if (!optionLower.includes(inputLower)) return null;
                                        
                                        let score = 0;
                                        
                                        // Exact match (highest priority)
                                        if (optionLower === inputLower) {
                                          score = 100000;
                                        }
                                        // Starts with input (very high priority)
                                        else if (optionLower.startsWith(inputLower)) {
                                          score = 50000;
                                          // Boost if it's just the input + space + one word (e.g., "Pregabalin USP")
                                          const remainder = optionLower.substring(inputLower.length).trim();
                                          if (remainder.split(' ').length <= 2) {
                                            score += 20000;
                                          }
                                        }
                                        // Word boundary match (e.g., "Pregabalin" in "Sodium Pregabalin")
                                        else if (optionLower.includes(' ' + inputLower) || optionLower.includes('(' + inputLower)) {
                                          score = 10000;
                                        }
                                        // Contains input anywhere else
                                        else {
                                          score = 1000;
                                        }
                                        
                                        // Boost shorter matches (prefer "Pregabalin USP" over "Pregabalin Methylcobalamin Extended Release")
                                        score -= option.length;
                                        
                                        return { option, score };
                                      })
                                      .filter(item => item !== null) as { option: string; score: number }[];
                                      
                                      // Sort by score (highest first) and return options
                                      return scored
                                        .sort((a, b) => b.score - a.score)
                                        .map(item => item.option);
                                    }}
                                    freeSolo
                                    clearOnBlur
                                    selectOnFocus
                                    handleHomeEndKeys
                                    fullWidth
                                    size="small"
                                    disabled={isOrderLocked()}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        placeholder="Type or select an item *"
                                        required
                                        error={!item.name}
                                        sx={{
                                          '& .MuiOutlinedInput-root': {
                                            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                            color: getTextColor(),
                                            '& fieldset': { 
                                              borderColor: !item.name ? '#f44336' : getInputBorderColor(),
                                            },
                                            '&:hover fieldset': { 
                                              borderColor: !item.name ? '#f44336' : getInputBorderColorHover(),
                                            },
                                            '&.Mui-focused fieldset': { 
                                              borderColor: !item.name ? '#f44336' : '#EF721F',
                                            },
                                          },
                                          '& .MuiInputBase-input': { color: getTextColor(), fontSize: '0.875rem' },
                                        }}
                                      />
                                    )}
                                    sx={{
                                      '& .MuiAutocomplete-popper': {
                                        backgroundColor: mode === 'dark' ? '#1A202C' : '#FFFFFF',
                                      },
                                    }}
                                  />
                                </Box>
                              </Tooltip>
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1 }}>
                              <TextField
                                placeholder="Item Description"
                                value={item.itemDescription || ''}
                                onChange={(e) => handleItemFieldChange(item.id, 'itemDescription', e.target.value)}
                                fullWidth
                                variant="outlined"
                                size="small"
                                disabled={isOrderLocked()}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                    color: getTextColor(),
                                    '& fieldset': { borderColor: getInputBorderColor() },
                                    '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                                    '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                                  },
                                  '& .MuiInputBase-input': { color: getTextColor(), fontSize: '0.875rem' },
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1 }}>
                              <TextField
                                placeholder="HSN Code"
                                value={item.hsn || ''}
                                onChange={(e) => handleItemFieldChange(item.id, 'hsn', e.target.value.replace(/[^0-9]/g, ''))}
                                fullWidth
                                variant="outlined"
                                size="small"
                                disabled={isOrderLocked()}
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 8 }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                    color: getTextColor(),
                                    '& fieldset': { borderColor: getInputBorderColor() },
                                    '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                                    '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                                  },
                                  '& .MuiInputBase-input': { color: getTextColor(), fontSize: '0.875rem' },
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1 }}>
                              <FormControl fullWidth size="small">
                                <Select
                                  value={item.account || ''}
                                  onChange={(e) => handleItemFieldChange(item.id, 'account', e.target.value)}
                                  displayEmpty
                                  disabled={isOrderLocked()}
                                  sx={{
                                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                    color: getTextColor(),
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                                    '& .MuiSelect-icon': { color: getSecondaryTextColor() },
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  <MenuItem value="" disabled><em>Select an account</em></MenuItem>
                                  <MenuItem value="Inventory">Inventory</MenuItem>
                                  <MenuItem value="Cost of Goods Sold">Cost of Goods Sold</MenuItem>
                                  <MenuItem value="Direct Materials">Direct Materials</MenuItem>
                                  <MenuItem value="Raw Materials">Raw Materials</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1 }}>
                              <Tooltip
                                title={editableOrder && hasStatusPassedPOApproved(editableOrder.status) 
                                  ? "Editing this field will require approval from Higher Management" 
                                  : ""}
                                arrow
                                placement="top"
                              >
                                <TextField
                                  value={item.quantity.value || ''}
                                  onChange={(e) => handleItemFieldChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  fullWidth
                                  variant="outlined"
                                  size="small"
                                  placeholder="1.00"
                                  disabled={isOrderLocked()}
                                  inputProps={{
                                    type: 'number',
                                    step: 'any',
                                    min: '0',
                                  }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                      color: getTextColor(),
                                      '& fieldset': { borderColor: getInputBorderColor() },
                                      '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                                      '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                                    },
                                    '& .MuiInputBase-input': { 
                                      color: `${getTextColor()} !important`,
                                      fontSize: '0.875rem',
                                      fontWeight: 400,
                                      WebkitTextFillColor: `${getTextColor()} !important`,
                                      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                                        WebkitAppearance: 'none',
                                        margin: 0,
                                      },
                                      MozAppearance: 'textfield',
                                    },
                                  }}
                                />
                              </Tooltip>
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1 }}>
                              <FormControl fullWidth size="small">
                                <Select
                                  value={item.quantity.unit || 'g'}
                                  onChange={(e) => handleItemFieldChange(item.id, 'unit', e.target.value)}
                                  disabled={isOrderLocked()}
                                  sx={{
                                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                    color: getTextColor(),
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                                    '& .MuiSelect-icon': { color: getSecondaryTextColor() },
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  <MenuItem value="mg">Milli Grams (mg)</MenuItem>
                                  <MenuItem value="g">Grams (g)</MenuItem>
                                  <MenuItem value="Kg">Kilo Grams (Kg)</MenuItem>
                                  <MenuItem value="T">Tonne (T)</MenuItem>
                                  <MenuItem value="pcs">Pieces (pcs)</MenuItem>
                                  <MenuItem value="nos">Numbers (nos)</MenuItem>
                                  <MenuItem value="pac">Packs (pac)</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1 }}>
                              <FormControl fullWidth size="small">
                                <Select
                                  value={
                                    materialsViewMode === 'customer'
                                      ? (item.unitPrice.currency || 'USD')
                                      : (item.supplierUnitPrice?.currency || item.unitPrice.currency || 'USD')
                                  }
                                  onChange={(e) => handleItemFieldChange(item.id, 'currency', e.target.value)}
                                  disabled={isOrderLocked()}
                                  sx={{
                                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                    color: getTextColor(),
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                                    '& .MuiSelect-icon': { color: getSecondaryTextColor() },
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  <MenuItem value="USD">USD</MenuItem>
                                  <MenuItem value="EUR">EUR</MenuItem>
                                  <MenuItem value="GBP">GBP</MenuItem>
                                  <MenuItem value="INR">INR</MenuItem>
                                  <MenuItem value="CNY">CNY</MenuItem>
                                  <MenuItem value="JPY">JPY</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1, minWidth: 150 }}>
                              <Tooltip
                                title={editableOrder && hasStatusPassedPOApproved(editableOrder.status) && materialsViewMode === 'supplier'
                                  ? "Editing this field will require approval from Higher Management" 
                                  : editableOrder && hasStatusPassedPOApproved(editableOrder.status) && materialsViewMode === 'customer'
                                  ? "Editing this field will require approval from Higher Management"
                                  : ""}
                                arrow
                                placement="top"
                              >
                                <TextField
                                  value={
                                    materialsViewMode === 'customer' 
                                      ? (item.unitPrice.amount || '') 
                                      : (item.supplierUnitPrice?.amount || '')
                                  }
                                  onChange={(e) => handleItemFieldChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                  fullWidth
                                  variant="outlined"
                                  size="small"
                                  placeholder="0.00"
                                  disabled={isOrderLocked()}
                                  inputProps={{
                                    type: 'number',
                                    step: 'any',
                                    min: '0',
                                  }}
                                  sx={{
                                    width: '100%',
                                    '& .MuiOutlinedInput-root': {
                                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                      color: getTextColor(),
                                      '& fieldset': { borderColor: getInputBorderColor() },
                                      '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                                      '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                                    },
                                    '& .MuiInputBase-input': { 
                                      color: `${getTextColor()} !important`,
                                      fontSize: '0.875rem',
                                      fontWeight: 400,
                                      WebkitTextFillColor: `${getTextColor()} !important`,
                                      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                                        WebkitAppearance: 'none',
                                        margin: 0,
                                      },
                                      MozAppearance: 'textfield',
                                    },
                                  }}
                                />
                              </Tooltip>
                            </TableCell>
                            {materialsViewMode === 'supplier' && (
                              <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1 }}>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={(() => {
                                      const taxRate = (item as any).supplierTaxRate;
                                      if (taxRate === undefined || taxRate === null) return 'Non-Taxable';
                                      if (taxRate === 0) return 'GST0';
                                      if (taxRate === 0.1) return 'GST0.1';
                                      if (taxRate === 5) return 'GST5';
                                      if (taxRate === 12) return 'GST12';
                                      if (taxRate === 18) return 'GST18';
                                      if (taxRate === 28) return 'GST28';
                                      return 'Non-Taxable';
                                    })()}
                                    disabled={isOrderLocked()}
                                    onChange={(e) => {
                                      const taxValue = e.target.value;
                                      let taxRate: number | null = null;
                                      if (taxValue === 'Non-Taxable') {
                                        taxRate = null;
                                      } else if (taxValue === 'GST0') {
                                        taxRate = 0;
                                      } else if (taxValue === 'GST0.1') {
                                        taxRate = 0.1;
                                      } else if (taxValue === 'GST5') {
                                        taxRate = 5;
                                      } else if (taxValue === 'GST12') {
                                        taxRate = 12;
                                      } else if (taxValue === 'GST18') {
                                        taxRate = 18;
                                      } else if (taxValue === 'GST28') {
                                        taxRate = 28;
                                      }
                                      handleItemFieldChange(item.id, 'supplierTaxRate', taxRate);
                                    }}
                                    sx={{
                                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                      color: getTextColor(),
                                      '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                                      '& .MuiSelect-icon': { color: getSecondaryTextColor() },
                                      fontSize: '0.875rem',
                                    }}
                                  >
                                    <MenuItem value="Non-Taxable">Non-Taxable</MenuItem>
                                    <MenuItem value="GST0">GST0 (0%)</MenuItem>
                                    <MenuItem value="GST0.1">GST0.1 (0.1%)</MenuItem>
                                    <MenuItem value="GST5">GST5 (5%)</MenuItem>
                                    <MenuItem value="GST12">GST12 (12%)</MenuItem>
                                    <MenuItem value="GST18">GST18 (18%)</MenuItem>
                                    <MenuItem value="GST28">GST28 (28%)</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                            )}
                            <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body2" sx={{ color: getTextColor(), fontWeight: 600 }}>
                                  {(() => {
                                    const amount = materialsViewMode === 'customer'
                                      ? item.totalPrice.amount
                                      : (item.supplierTotalPrice?.amount || 0);
                                    const currency = materialsViewMode === 'customer'
                                      ? item.unitPrice.currency || 'USD'
                                      : (item.supplierUnitPrice?.currency || item.unitPrice.currency || 'USD');
                                    return formatAmount(amount, currency);
                                  })()}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}`, py: 1 }}>
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDeleteItem(item.id)}
                                  disabled={isOrderLocked()}
                                  sx={{ color: '#f44336' }}
                                >
                                  <Close sx={{ fontSize: '1.2rem' }} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Add Row Button */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Button
                      startIcon={<Add />}
                      onClick={handleAddItem}
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        color: '#EF721F',
                        borderColor: 'rgba(61, 82, 160, 0.3)',
                        '&:hover': { 
                          borderColor: 'rgba(61, 82, 160, 0.5)',
                          bgcolor: 'rgba(61, 82, 160, 0.05)',
                        },
                        textTransform: 'none',
                      }}
                    >
                      Add New Row
                    </Button>
                  </Box>

                  {/* Summary Section */}
                  <Box sx={{ 
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${getBorderColor()}`,
                    borderRadius: 1,
                    p: 2,
                  }}>
                    {/* Sub Total */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                        Sub Total
                      </Typography>
                      <Typography variant="body2" sx={{ color: getTextColor(), fontWeight: 600 }}>
                        {(() => {
                          const subtotal = calculateSubTotal();
                          const currency = editableOrder?.materials?.[0]?.unitPrice?.currency || editableOrder?.priceFromSupplier?.currency || 'USD';
                          return formatAmount(subtotal, currency);
                        })()}
                      </Typography>
                    </Box>

                    {/* Discount (Customer view only) */}
                    {materialsViewMode === 'customer' && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                          Discount
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                            size="small"
                            sx={{
                              width: 80,
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                color: getTextColor(),
                                '& fieldset': { borderColor: getInputBorderColor() },
                                '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                                '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                              },
                              '& .MuiInputBase-input': { color: getTextColor(), fontSize: '0.875rem' },
                            }}
                            InputProps={{
                              endAdornment: <InputAdornment position="end" sx={{ color: getSecondaryTextColor() }}>%</InputAdornment>,
                            }}
                          />
                          <Typography variant="body2" sx={{ color: getTextColor(), fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                            {(() => {
                              const discount = calculateDiscountAmount();
                              const currency = editableOrder?.materials?.[0]?.unitPrice?.currency || editableOrder?.priceToCustomer?.currency || 'USD';
                              return formatAmount(discount, currency);
                            })()}
                          </Typography>
                        </Box>
                      </Box>
                    )}


                    {/* Tax fields (Supplier view only) - CGST/SGST for Telangana (36), IGST for others */}
                    {materialsViewMode === 'supplier' && editableOrder?.materials && (
                      <>
                        {editableOrder.materials.map((item, index) => {
                          const taxRate = (item as any).supplierTaxRate;
                          if (taxRate === undefined || taxRate === null || taxRate === 0) return null;
                          
                          const itemSubtotal = (item.supplierTotalPrice?.amount || 0);
                          const currency = item.supplierUnitPrice?.currency || item.unitPrice.currency || 'USD';
                          
                          // Check if supplier GSTIN starts with "36" (Telangana)
                          const supplierGSTIN = editableOrder?.supplier?.gstin || '';
                          const isTelanganaSupplier = supplierGSTIN.startsWith('36');
                          
                          if (isTelanganaSupplier) {
                            // Show CGST and SGST (split tax rate)
                            const halfTaxRate = taxRate / 2;
                            const sgstAmount = (itemSubtotal * halfTaxRate) / 100;
                            const cgstAmount = (itemSubtotal * halfTaxRate) / 100;
                            
                            return (
                              <React.Fragment key={`tax-${item.id}`}>
                                {/* SGST */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                                    SGST {halfTaxRate}%
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: getTextColor(), fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                                    {formatAmount(sgstAmount, currency)}
                                  </Typography>
                                </Box>
                                {/* CGST */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                  <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                                    CGST {halfTaxRate}%
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: getTextColor(), fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                                    {formatAmount(cgstAmount, currency)}
                                  </Typography>
                                </Box>
                              </React.Fragment>
                            );
                          } else {
                            // Show IGST (full tax rate)
                            const igstAmount = (itemSubtotal * taxRate) / 100;
                            
                            return (
                              <React.Fragment key={`tax-${item.id}`}>
                                {/* IGST */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                  <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                                    IGST {taxRate}%
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: getTextColor(), fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                                    {formatAmount(igstAmount, currency)}
                                  </Typography>
                                </Box>
                              </React.Fragment>
                            );
                          }
                        })}
                      </>
                    )}

                    {/* Adjustment (Supplier view only) */}
                    {materialsViewMode === 'supplier' && (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ color: getSecondaryTextColor() }}>
                              Adjustment
                            </Typography>
                            <FormControl size="small" sx={{ minWidth: 60, ml: 0.5 }}>
                              <Select
                                value={adjustmentType}
                                onChange={(e) => {
                                  setAdjustmentType(e.target.value as 'currency' | 'percentage');
                                  setHasChanges(true);
                                }}
                                sx={{
                                  height: 28,
                                  fontSize: '0.75rem',
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: getInputBorderColor(),
                                  },
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: getInputBorderColorHover(),
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#EF721F',
                                  },
                                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                  color: getTextColor(),
                                }}
                              >
                                <MenuItem value="currency" sx={{ fontSize: '0.75rem' }}>₹</MenuItem>
                                <MenuItem value="percentage" sx={{ fontSize: '0.75rem' }}>%</MenuItem>
                              </Select>
                            </FormControl>
                            <IconButton size="small" sx={{ color: getSecondaryTextColor() }}>
                              <Info sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </Box>
                          <TextField
                            type="number"
                            value={adjustment}
                            onChange={(e) => {
                              const val = e.target.value;
                              let adjustmentValue = 0;
                              // Allow empty string, negative values, and decimals
                              if (val === '' || val === '-') {
                                adjustmentValue = 0;
                              } else {
                                adjustmentValue = parseFloat(val);
                              }
                              setAdjustment(adjustmentValue);
                              // Update editableOrder to persist the value
                              if (editableOrder) {
                                setEditableOrder({ ...editableOrder, adjustment: adjustmentValue });
                                setHasChanges(true);
                              }
                            }}
                            size="small"
                            sx={{
                              width: 100,
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                                color: getTextColor(),
                                '& fieldset': { borderColor: getInputBorderColor() },
                                '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                                '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                              },
                              '& .MuiInputBase-input': { 
                                color: getTextColor(), 
                                fontSize: '0.875rem',
                              },
                            }}
                            placeholder={adjustmentType === 'percentage' ? "±%" : "+/-"}
                            inputProps={{
                              step: "0.01",
                              min: undefined,
                              max: undefined,
                            }}
                          />
                        </Box>
                        {/* Display calculated adjustment amount */}
                        {adjustment !== 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                            <Typography variant="caption" sx={{ color: getSecondaryTextColor(), fontSize: '0.75rem' }}>
                              {(() => {
                                const currency = editableOrder?.materials?.[0]?.supplierUnitPrice?.currency || editableOrder?.materials?.[0]?.unitPrice?.currency || editableOrder?.priceFromSupplier?.currency || 'USD';
                                const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;
                                if (adjustmentType === 'percentage') {
                                  const adjustmentAmount = (calculateSubTotal() * adjustment) / 100;
                                  return `Adjustment: ${currencySymbol}${formatAmount(adjustmentAmount, currency)} (${adjustment}%)`;
                                } else {
                                  return `Adjustment: ${currencySymbol}${formatAmount(adjustment, currency)}`;
                                }
                              })()}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}

                    {/* Total (Supplier view only) */}
                    {materialsViewMode === 'supplier' && (
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          pt: 2,
                          borderTop: `2px solid ${mode === 'dark' ? 'rgba(61, 82, 160, 0.3)' : 'rgba(61, 82, 160, 0.2)'}`,
                        }}
                      >
                        <Typography variant="body1" sx={{ color: getTextColor(), fontWeight: 700 }}>
                          Total
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#EF721F', fontWeight: 700 }}>
                          {(() => {
                            const total = calculateGrandTotal();
                            const currency = editableOrder?.materials?.[0]?.supplierUnitPrice?.currency || editableOrder?.materials?.[0]?.unitPrice?.currency || editableOrder?.priceFromSupplier?.currency || 'USD';
                            return formatAmount(total, currency);
                          })()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Paper>
            )}

            {/* Customer & Supplier Information */}
            {(selectedSection === null || selectedSection === 'customerSupplierInformation') && (
            <Paper 
              sx={{
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                mb: 3,
                p: 3,
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600 }}>
                  Customer & Supplier Information
                </Typography>
              </Box>
              <Box>
                <Grid container spacing={3}>
                  {/* Customer Information */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ color: getTextColor(), fontWeight: 500, mb: 2 }}>
                      Customer Information
                    </Typography>
                    <TextField
                      label="Company Name"
                      value={editableOrder?.customer.name || ''}
                      onChange={(e) => handleFieldChange('customer.name', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <TextField
                      label="Address"
                      value={editableOrder?.customer.address || ''}
                      onChange={(e) => handleFieldChange('customer.address', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <TextField
                      label="Country"
                      value={editableOrder?.customer.country || ''}
                      onChange={(e) => handleFieldChange('customer.country', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <TextField
                      label="Email"
                      value={editableOrder?.customer.email || ''}
                      onChange={(e) => handleFieldChange('customer.email', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <TextField
                      label="Phone"
                      value={editableOrder?.customer.phone || ''}
                      onChange={(e) => handleFieldChange('customer.phone', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <TextField
                      label="GSTIN/Tax ID No."
                      value={editableOrder?.customer.gstin || ''}
                      onChange={(e) => handleFieldChange('customer.gstin', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel sx={{ color: getSecondaryTextColor() }}>Destination</InputLabel>
                      <Select
                        value={editableOrder?.customer.destination || ''}
                        onChange={(e) => handleFieldChange('customer.destination', e.target.value)}
                        disabled={isOrderLocked()}
                        sx={{
                          color: getTextColor(),
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                          '& .MuiSelect-icon': { color: getSecondaryTextColor() },
                        }}
                        label="Destination"
                      >
                        <MenuItem value="Plant A - Mumbai">Plant A - Mumbai</MenuItem>
                        <MenuItem value="Plant B - Delhi">Plant B - Delhi</MenuItem>
                        <MenuItem value="Plant C - Bangalore">Plant C - Bangalore</MenuItem>
                        <MenuItem value="Plant D - Chennai">Plant D - Chennai</MenuItem>
                        <MenuItem value="Plant E - Hyderabad">Plant E - Hyderabad</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Supplier Information */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ color: getTextColor(), fontWeight: 500, mb: 2 }}>
                      Supplier Information
                    </Typography>
                    <Autocomplete
                      key={`supplier-autocomplete-${editableOrder?.orderId || 'new'}`}
                      freeSolo
                      options={supplierOptions}
                      value={supplierAutocompleteValue}
                      disabled={isOrderLocked()}
                      onChange={(_, newValue) => {
                        if (typeof newValue === 'string') {
                          // User typed and pressed enter or selected a string value
                          handleFieldChange('supplier.name', newValue);
                          setSupplierSearch(newValue);
                        } else if (newValue) {
                          // User selected from dropdown
                          handleSupplierSelect(newValue);
                        } else {
                          // User cleared the selection
                          handleFieldChange('supplier', null);
                          setSupplierSearch('');
                        }
                      }}
                      inputValue={supplierSearch}
                      onInputChange={(_, newInputValue, reason) => {
                        setSupplierSearch(newInputValue);
                        // Only update the field if user is typing (not when selecting from dropdown)
                        if (reason === 'input' && editableOrder) {
                          handleFieldChange('supplier.name', newInputValue);
                        }
                      }}
                      getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                      isOptionEqualToValue={(option, value) => {
                        if (!value) return false;
                        if (typeof option === 'string') return option === value;
                        if (typeof value === 'string') return option.name === value;
                        return option.name === value.name;
                      }}
                      filterOptions={(options, state) => {
                        // Use our custom search function for filtering
                        if (!state.inputValue.trim()) {
                          return options;
                        }
                        return searchSuppliers(state.inputValue, options);
                      }}
                      openOnFocus
                      selectOnFocus
                      clearOnBlur
                      handleHomeEndKeys
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Company Name"
                          variant="outlined"
                          size="small"
                          sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                              color: getTextColor(),
                              '& fieldset': { borderColor: getInputBorderColor() },
                              '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                              '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                            },
                            '& .MuiInputBase-input': { 
                              color: `${getTextColor()} !important`,
                              WebkitTextFillColor: `${getTextColor()} !important`,
                            },
                            '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {option.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: getSecondaryTextColor() }}>
                              {option.country} • {option.specialties.join(', ')}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      PaperComponent={({ children, ...other }) => (
                        <Paper
                          {...other}
                          sx={{
                            bgcolor: mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                            border: `1px solid ${getBorderColor()}`,
                          }}
                        >
                          {children}
                        </Paper>
                      )}
                      noOptionsText="No suppliers found"
                    />
                    <TextField
                      key={`supplier-address-${editableOrder?.supplier?.address || 'none'}-${editableOrder?.orderId}`}
                      label="Address"
                      value={editableOrder?.supplier?.address || ''}
                      onChange={(e) => handleFieldChange('supplier.address', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <TextField
                      key={`supplier-country-${editableOrder?.supplier?.country || 'none'}-${editableOrder?.orderId}`}
                      label="Country"
                      value={editableOrder?.supplier?.country || ''}
                      onChange={(e) => handleFieldChange('supplier.country', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <TextField
                      key={`supplier-email-${editableOrder?.supplier?.email || 'none'}-${editableOrder?.orderId}`}
                      label="Email"
                      value={editableOrder?.supplier?.email || ''}
                      onChange={(e) => handleFieldChange('supplier.email', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <TextField
                      key={`supplier-phone-${editableOrder?.supplier?.phone || 'none'}-${editableOrder?.orderId}`}
                      label="Phone"
                      value={editableOrder?.supplier?.phone || ''}
                      onChange={(e) => handleFieldChange('supplier.phone', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <TextField
                      label="GSTIN/Tax ID No."
                      value={editableOrder?.supplier?.gstin || ''}
                      onChange={(e) => handleFieldChange('supplier.gstin', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel sx={{ color: getSecondaryTextColor() }}>Origin</InputLabel>
                      <Select
                        value={editableOrder?.supplier?.origin || ''}
                        onChange={(e) => handleFieldChange('supplier.origin', e.target.value)}
                        disabled={isOrderLocked()}
                        sx={{
                          color: getTextColor(),
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                          '& .MuiSelect-icon': { color: getSecondaryTextColor() },
                        }}
                        label="Origin"
                      >
                        <MenuItem value="Manufacturing Plant A - Gujarat">Manufacturing Plant A - Gujarat</MenuItem>
                        <MenuItem value="Manufacturing Plant B - Maharashtra">Manufacturing Plant B - Maharashtra</MenuItem>
                        <MenuItem value="Manufacturing Plant C - Karnataka">Manufacturing Plant C - Karnataka</MenuItem>
                        <MenuItem value="Manufacturing Plant D - Tamil Nadu">Manufacturing Plant D - Tamil Nadu</MenuItem>
                        <MenuItem value="Manufacturing Plant E - Andhra Pradesh">Manufacturing Plant E - Andhra Pradesh</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
            )}

            {/* Freight Handler Information */}
            {(selectedSection === null || selectedSection === 'freightHandlerInformation') && (
            <Paper 
              sx={{
                mb: 3, 
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                p: 3,
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600 }}>
                  Freight Handler Information
                </Typography>
              </Box>
              <Box>
              
              {/* Freight Handler Search */}
              <Box sx={{ position: 'relative', mb: 3 }} data-freight-handler-dropdown>
                <TextField
                  label="Search Freight Handler"
                  value={freightHandlerSearch}
                  onChange={(e) => handleFreightHandlerSearch(e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                  disabled={isOrderLocked()}
                  placeholder="Type to search freight handlers..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: getSecondaryTextColor() }} />
                      </InputAdornment>
                    ),
                    endAdornment: freightHandlerSearch && (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          onClick={() => {
                            setFreightHandlerSearch('');
                            setShowFreightHandlerDropdown(false);
                          }}
                          sx={{ minWidth: 'auto', p: 0.5 }}
                        >
                          <Clear sx={{ color: getSecondaryTextColor() }} />
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                      color: getTextColor(),
                      '& fieldset': { borderColor: getInputBorderColor() },
                      '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                      '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                    },
                    '& .MuiInputBase-input': { color: getTextColor() },
                    '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                  }}
                />
                
                {/* Dropdown */}
                {showFreightHandlerDropdown && filteredFreightHandlers.length > 0 && (
                  <Paper
                    data-freight-handler-dropdown
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      maxHeight: 300,
                      overflow: 'auto',
                      bgcolor: mode === 'dark' ? 'rgba(15, 15, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                      border: mode === 'dark' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(61, 82, 160, 0.2)',
                      borderRadius: 1,
                      mt: 0.5,
                      boxShadow: mode === 'dark' ? 'none' : '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    {filteredFreightHandlers.map((handler) => (
                      <Box
                        key={handler.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFreightHandlerSelect(handler);
                        }}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          borderBottom: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                          '&:hover': {
                            bgcolor: 'rgba(61, 82, 160, 0.1)',
                          },
                          '&:last-child': {
                            borderBottom: 'none',
                          },
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ color: getTextColor(), fontWeight: 600 }}>
                          {handler.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: getSecondaryTextColor() }}>
                          {handler.company} • {handler.country}
                        </Typography>
                        <Typography variant="caption" sx={{ color: getSecondaryTextColor(), display: 'block' }}>
                          Phone: {handler.phone}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Box>

              {/* Freight Handler Fields */}
              {editableOrder?.freightHandler && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Company Name"
                      value={editableOrder.freightHandler.company || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('company', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Address"
                      value={editableOrder.freightHandler.address || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('address', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Country"
                      value={editableOrder.freightHandler.country || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('country', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone"
                      value={editableOrder.freightHandler.phone || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('phone', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="GSTIN/Tax ID"
                      value={editableOrder.freightHandler.gstin || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('gstin', e.target.value)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Notes"
                      value={editableOrder.freightHandler.notes || ''}
                      onChange={(e) => handleFreightHandlerFieldChange('notes', e.target.value)}
                      fullWidth
                      multiline
                      rows={3}
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                </Grid>
              )}
              </Box>
            </Paper>
            )}

            {/* Documents */}
            {(selectedSection === null || selectedSection === 'documents') && (
            <Paper 
              sx={{
                mb: 3, 
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                p: 3,
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600 }}>
                  Documents
                </Typography>
              </Box>
              <Box>
              <Grid container spacing={2}>
                {Object.entries(order.documents).map(([docType, doc]) => {
                  if (!doc) return null;
                  return (
                    <Grid item xs={12} sm={6} md={4} key={docType}>
                      <Card sx={{ 
                        bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 2,
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <AttachFile sx={{ mr: 1, color: '#EF721F' }} />
                              <Typography variant="subtitle2" sx={{ color: getTextColor(), fontWeight: 600 }}>
                                {docType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </Typography>
                            </Box>
                            {canManageDocuments() && (
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteDocument(docType as keyof Documents)}
                                sx={{
                                  color: '#EF4444',
                                  '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 1 }}>
                            {doc.filename}
                          </Typography>
                          <Typography variant="caption" sx={{ color: getSecondaryTextColor(), display: 'block', mb: 1 }}>
                            Uploaded: {formatDate(doc.uploadedAt)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: getSecondaryTextColor(), display: 'block', mb: 1 }}>
                            By: {doc.uploadedBy.name}
                          </Typography>
                          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button 
                              size="small" 
                              startIcon={<Visibility />}
                              onClick={() => {
                                if (doc.data) {
                                  setViewingDocument({ name: doc.filename, data: doc.data });
                                } else {
                                  toast.error('Document preview not available. Document data is missing.');
                                }
                              }}
                              sx={{ 
                                color: '#EF721F',
                                '&:hover': { bgcolor: 'rgba(61, 82, 160, 0.1)' }
                              }}
                            >
                              View
                            </Button>
                            <Button 
                              size="small" 
                              startIcon={<Download />}
                              onClick={() => {
                                if (doc.data) {
                                  const downloadLink = document.createElement('a');
                                  downloadLink.href = doc.data;
                                  downloadLink.download = doc.filename;
                                  downloadLink.style.display = 'none';
                                  document.body.appendChild(downloadLink);
                                  downloadLink.click();
                                  document.body.removeChild(downloadLink);
                                  toast.success(`${doc.filename} downloaded successfully`);
                                } else {
                                  toast.error('Document data not available for download');
                                }
                              }}
                              sx={{ 
                                color: '#EF721F',
                                '&:hover': { bgcolor: 'rgba(61, 82, 160, 0.1)' }
                              }}
                            >
                              Download
                            </Button>
                            {canManageDocuments() && (
                              <Button
                                size="small"
                                component="label"
                                startIcon={<CloudUpload />}
                                sx={{
                                  color: '#10B981',
                                  '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.1)' }
                                }}
                              >
                                Replace
                                <input
                                  type="file"
                                  hidden
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleReplaceDocument(file, docType as keyof Documents);
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </Button>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
              
              {/* Conditional Document Uploads */}
              <Box sx={{ mt: 3 }}>
                
                {/* Proforma Invoice Upload */}
                {editableOrder?.status === 'PO_Sent_to_Supplier' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: getTextColor(), mb: 1 }}>
                      Upload Proforma Invoice
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      disabled={isOrderLocked()}
                      sx={{
                        color: '#EF721F',
                        borderColor: '#EF721F',
                        '&:hover': { 
                          borderColor: '#6A3DD8',
                          bgcolor: 'rgba(61, 82, 160, 0.1)'
                        },
                      }}
                    >
                      Choose Proforma Invoice PDF
                      <input
                        type="file"
                        hidden
                        accept=".pdf"
                        disabled={isOrderLocked()}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'proformaInvoice');
                          }
                        }}
                      />
                    </Button>
                  </Box>
                )}
                
                {/* COA Upload for Awaiting COA status */}
                {editableOrder?.status === 'Awaiting_COA' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: getTextColor(), mb: 1 }}>
                      Upload COA Document
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      disabled={isOrderLocked()}
                      sx={{
                        color: '#EF721F',
                        borderColor: '#EF721F',
                        '&:hover': { 
                          borderColor: '#6A3DD8',
                          bgcolor: 'rgba(61, 82, 160, 0.1)'
                        },
                      }}
                    >
                      Choose COA PDF
                      <input
                        type="file"
                        hidden
                        accept=".pdf"
                        disabled={isOrderLocked()}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'coaPreShipment');
                          }
                        }}
                      />
                    </Button>
                  </Box>
                )}
                
                {/* COA Upload for COA Revision status */}
                {editableOrder?.status === 'COA_Revision' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: getTextColor(), mb: 1 }}>
                      Upload Revised COA Document
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      disabled={isOrderLocked()}
                      sx={{
                        color: '#EF721F',
                        borderColor: '#EF721F',
                        '&:hover': { 
                          borderColor: '#6A3DD8',
                          bgcolor: 'rgba(61, 82, 160, 0.1)'
                        },
                      }}
                    >
                      Choose Revised COA PDF
                      <input
                        type="file"
                        hidden
                        accept=".pdf"
                        disabled={isOrderLocked()}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, 'coaPreShipment');
                          }
                        }}
                      />
                    </Button>
                  </Box>
                )}
              </Box>
              </Box>
            </Paper>
            )}

            {/* Advance Payment (if applicable) */}
            {order.advancePayment && (selectedSection === null || selectedSection === 'advancePaymentDetails') && (
              <Paper 
                sx={{
                  mb: 3, 
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  p: 3,
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600 }}>
                    Advance Payment Details
                  </Typography>
                </Box>
                <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: getSecondaryTextColor() }}>
                      Transaction ID
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor() }}>
                      {order.advancePayment.transactionId}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: getSecondaryTextColor() }}>
                      Amount
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor() }}>
                      {formatCurrency(order.advancePayment.amount, order.advancePayment.currency)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: getSecondaryTextColor() }}>
                      Date
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor() }}>
                      {formatDate(order.advancePayment.date)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: getSecondaryTextColor() }}>
                      Made By
                    </Typography>
                    <Typography variant="body1" sx={{ color: getTextColor() }}>
                      {order.advancePayment.madeBy.name}
                    </Typography>
                  </Grid>
                </Grid>
                </Box>
              </Paper>
            )}

            {/* Payment Details (for approved orders and beyond) */}
            {editableOrder?.status && ['Approved', 'Advance_Payment_Completed', 'Material_to_be_Dispatched', 'Material_Dispatched', 'In_Transit'].includes(editableOrder.status) && (selectedSection === null || selectedSection === 'paymentDetails') && (
              <Paper
                sx={{
                  mb: 3,
                  bgcolor: getAccordionBgColor(),
                  border: `1px solid ${getBorderColor()}`,
                  borderRadius: 2,
                  p: 3,
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600 }}>
                    Payment Details
                  </Typography>
                </Box>
                <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Payment Method"
                      value={editableOrder?.paymentDetails?.paymentMethod || ''}
                      onChange={(e) => handleFieldChange('paymentDetails', { 
                        ...editableOrder?.paymentDetails, 
                        paymentMethod: e.target.value 
                      })}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Payment Terms"
                      value={editableOrder?.paymentDetails?.paymentTerms || ''}
                      onChange={(e) => handleFieldChange('paymentDetails', { 
                        ...editableOrder?.paymentDetails, 
                        paymentTerms: e.target.value 
                      })}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Due Date"
                      type="date"
                      value={editableOrder?.paymentDetails?.dueDate || ''}
                      onChange={(e) => handleFieldChange('paymentDetails', { 
                        ...editableOrder?.paymentDetails, 
                        dueDate: e.target.value 
                      })}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Amount"
                      type="number"
                      value={editableOrder?.paymentDetails?.amount || ''}
                      onChange={(e) => handleFieldChange('paymentDetails', { 
                        ...editableOrder?.paymentDetails, 
                        amount: parseFloat(e.target.value) || 0 
                      })}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Bank Details"
                      multiline
                      rows={3}
                      value={editableOrder?.paymentDetails?.bankDetails || ''}
                      onChange={(e) => handleFieldChange('paymentDetails', { 
                        ...editableOrder?.paymentDetails, 
                        bankDetails: e.target.value 
                      })}
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isOrderLocked()}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& fieldset': { borderColor: getInputBorderColor() },
                          '&:hover fieldset': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused fieldset': { borderColor: '#EF721F' },
                        },
                        '& .MuiInputBase-input': { color: getTextColor() },
                        '& .MuiInputLabel-root': { color: getSecondaryTextColor() },
                      }}
                    />
                  </Grid>
                </Grid>
                </Box>
              </Paper>
            )}

            {/* Logistics Section (only editable in Material to be Dispatched status, but visible from that status onwards) */}
            {(selectedSection === null || selectedSection === 'logistics') && (() => {
              const status = editableOrder?.status;
              const statusOrder: OrderStatus[] = [
                'PO_Received_from_Client',
                'Drafting_PO_for_Supplier',
                'Sent_PO_for_Approval',
                'PO_Rejected',
                'PO_Approved',
                'PO_Sent_to_Supplier',
                'Proforma_Invoice_Received',
                'Awaiting_COA',
                'COA_Received',
                'COA_Revision',
                'COA_Accepted',
                'Awaiting_Approval',
                'Approved',
                'Advance_Payment_Completed',
                'Material_to_be_Dispatched',
                'Material_Dispatched',
                'In_Transit',
                'Completed',
              ];
              const currentIndex = statusOrder.indexOf(status || 'PO_Received_from_Client');
              const materialToBeDispatchedIndex = statusOrder.indexOf('Material_to_be_Dispatched');
              const isVisible = currentIndex >= materialToBeDispatchedIndex && currentIndex !== -1;
              const isEditable = status === 'Material_to_be_Dispatched';
              
              // If section is explicitly selected from nav, show it if status allows
              // If not visible, return null (don't render)
              if (!isVisible) {
                // If explicitly selected but not visible, show a message
                if (selectedSection === 'logistics') {
                  return (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body1" sx={{ color: getSecondaryTextColor() }}>
                        Logistics section is only available for orders with status "Material to be Dispatched" or later.
                      </Typography>
                    </Box>
                  );
                }
                return null;
              }
              
              return (
              <Paper
                sx={{
                  mb: 3,
                  bgcolor: getAccordionBgColor(),
                  border: `1px solid ${getBorderColor()}`,
                  borderRadius: 2,
                  p: 3,
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600 }}>
                    Logistics
                  </Typography>
                </Box>
                <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: getSecondaryTextColor() }}>Sub-Status</InputLabel>
                      <Select
                        value={editableOrder?.logisticsSubStatus || ''}
                        onChange={(e) => handleFieldChange('logisticsSubStatus', e.target.value as LogisticsSubStatus)}
                        disabled={isOrderLocked() || !isEditable}
                        label="Sub-Status"
                        sx={{
                          bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                          color: getTextColor(),
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColor() },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: getInputBorderColorHover() },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#EF721F' },
                          '& .MuiSelect-icon': { color: getSecondaryTextColor() },
                        }}
                      >
                        <MenuItem value="Dispatch_Confirmation_Sent">
                          {logisticsSubStatusDisplayNames.Dispatch_Confirmation_Sent}
                        </MenuItem>
                        <MenuItem value="Awaiting_Documents_from_Supplier">
                          {logisticsSubStatusDisplayNames.Awaiting_Documents_from_Supplier}
                        </MenuItem>
                        <MenuItem value="Drafting_Documents">
                          {logisticsSubStatusDisplayNames.Drafting_Documents}
                        </MenuItem>
                        <MenuItem value="Awaiting_Quotation_from_Freight_Handler">
                          {logisticsSubStatusDisplayNames.Awaiting_Quotation_from_Freight_Handler}
                        </MenuItem>
                        <MenuItem value="Awaiting_ADC_Clearance">
                          {logisticsSubStatusDisplayNames.Awaiting_ADC_Clearance}
                        </MenuItem>
                        <MenuItem value="ADC_Clearance_Done">
                          {logisticsSubStatusDisplayNames.ADC_Clearance_Done}
                        </MenuItem>
                        <MenuItem value="Shipping_Bill_Filed">
                          {logisticsSubStatusDisplayNames.Shipping_Bill_Filed}
                        </MenuItem>
                        <MenuItem value="Awaiting_Dispatch_Schedule">
                          {logisticsSubStatusDisplayNames.Awaiting_Dispatch_Schedule}
                        </MenuItem>
                        <MenuItem value="Clearance_Completed">
                          {logisticsSubStatusDisplayNames.Clearance_Completed}
                        </MenuItem>
                        {editableOrder?.transitType === 'Air' ? (
                          <MenuItem value="Received_Air_Way_Bill">
                            {logisticsSubStatusDisplayNames.Received_Air_Way_Bill}
                          </MenuItem>
                        ) : editableOrder?.transitType === 'Sea' ? (
                          <MenuItem value="Received_Bill_of_Lading">
                            {logisticsSubStatusDisplayNames.Received_Bill_of_Lading}
                          </MenuItem>
                        ) : (
                          <>
                            <MenuItem value="Received_Air_Way_Bill">
                              {logisticsSubStatusDisplayNames.Received_Air_Way_Bill}
                            </MenuItem>
                            <MenuItem value="Received_Bill_of_Lading">
                              {logisticsSubStatusDisplayNames.Received_Bill_of_Lading}
                            </MenuItem>
                          </>
                        )}
                        <MenuItem value="Sending_Documents_to_Customer">
                          {logisticsSubStatusDisplayNames.Sending_Documents_to_Customer}
                        </MenuItem>
                        <MenuItem value="Sent_Documents_to_Customer">
                          {logisticsSubStatusDisplayNames.Sent_Documents_to_Customer}
                        </MenuItem>
                                              </Select>
                      </FormControl>
                    </Grid>

                    {/* Logistics Documents Table */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ color: getSecondaryTextColor(), mb: 2, mt: 3 }}>
                        Documents
                      </Typography>
                      <TableContainer component={Paper} sx={{ 
                        bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)',
                        border: `1px solid ${getBorderColor()}`,
                      }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                                Document Type
                              </TableCell>
                              <TableCell sx={{ color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                                Document
                              </TableCell>
                              <TableCell sx={{ width: '100px', color: getTextColor(), fontWeight: 600, borderBottom: `1px solid ${getBorderColor()}` }}>
                                Actions
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {[
                              { key: 'coa', label: 'COA' },
                              { key: 'packingList', label: 'Packing List' },
                              { key: 'msds', label: 'MSDS' },
                              { key: 'gmp', label: 'GMP' },
                              { key: 'manufacturerLicense', label: 'Manufacturer License' },
                              { key: 'iec', label: 'IEC' },
                              { key: 'drumImages', label: 'Drum Images' },
                              { key: 'labels', label: 'Labels (with QR Code)' },
                              { key: 'iip', label: 'IIP (if applicable)' },
                              { key: 'unCertificate', label: 'UN Certificate (if applicable)' },
                              { key: 'commercialInvoice', label: 'Commercial Invoice' },
                              { key: 'taxInvoiceDocuments', label: 'Tax Invoice Documents' },
                              { key: 'customClearanceDocuments', label: 'Custom Clearance Documents' },
                              { key: 'airWayBillBillOfLading', label: 'Air Way Bill / Bill of Lading' },
                            ].map(({ key, label }) => {
                              const documentType = key as keyof LogisticsDocuments;
                              const doc = editableOrder?.logisticsDocuments?.[documentType];
                              const fileName = doc?.document?.filename;

                              return (
                                <TableRow key={key} sx={{ 
                                  '&:hover': { bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(239, 114, 31,0.03)' }
                                }}>
                                  <TableCell sx={{ color: getSecondaryTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
                                    {label}
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}` }}>
                                    {fileName ? (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AttachFile sx={{ fontSize: '1rem', color: getSecondaryTextColor() }} />
                                        <Link
                                          component="button"
                                          variant="body2"
                                          onClick={() => handleLogisticsDocumentView(documentType)}
                                          sx={{
                                            color: mode === 'dark' ? '#EF721F' : '#EF721F',
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            '&:hover': {
                                              textDecoration: 'underline',
                                            },
                                          }}
                                        >
                                          {fileName}
                                        </Link>
                                      </Box>
                                    ) : (
                                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), fontStyle: 'italic' }}>
                                        No document uploaded
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: `1px solid ${getBorderColor()}` }}>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      {fileName ? (
                                        <>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleLogisticsDocumentDelete(documentType)}
                                            disabled={!isEditable || isOrderLocked()}
                                            sx={{
                                              color: '#EF4444',
                                              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
                                            }}
                                          >
                                            <Delete fontSize="small" />
                                          </IconButton>
                                        </>
                                      ) : (
                                        <IconButton
                                          size="small"
                                          component="label"
                                          disabled={!isEditable || isOrderLocked()}
                                          sx={{
                                            color: mode === 'dark' ? '#EF721F' : '#EF721F',
                                            '&:hover': { bgcolor: mode === 'dark' ? 'rgba(239, 114, 31,0.1)' : 'rgba(239, 114, 31,0.1)' },
                                          }}
                                        >
                                          <CloudUploadIcon fontSize="small" />
                                          <input
                                            type="file"
                                            hidden
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            disabled={!isEditable || isOrderLocked()}
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                handleLogisticsDocumentUpload(file, documentType);
                                              }
                                              e.target.value = '';
                                            }}
                                          />
                                        </IconButton>
                                      )}
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
              );
            })()}

            {/* Actions removed as per request */}
              </Grid>

              {/* Right Sidebar */}
              <Grid item xs={12} md={3.5}>
            {/* Timeline */}
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              bgcolor: getAccordionBgColorExpanded(),
              border: `1px solid ${getBorderColor()}`,
              borderRadius: 2,
            }}>
              <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                Timeline
              </Typography>
              <Box>
                {order.timeline.map((event, index) => {
                  // Determine status color based on event type or index
                  let statusColor = '#28A745'; // Default green for completed
                  let icon = <CheckCircle sx={{ color: getTextColor(), fontSize: '20px' }} />;
                  
                  if (index === order.timeline.length - 1 && order.timeline.length > 1) {
                    // Last event is pending/active
                    statusColor = '#FFC107'; // Orange/yellow
                    icon = <Box sx={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: mode === 'dark' ? '#FFFFFF' : '#FFFFFF' }} />;
                  }
                  
                  return (
                    <Box key={event.id} sx={{ display: 'flex', mb: index < order.timeline.length - 1 ? 0 : 0 }}>
                      {/* Timeline icon and connector */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
                        <Box sx={{ 
                          bgcolor: statusColor,
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `2px solid ${statusColor}`,
                          boxShadow: `0 0 0 4px ${statusColor}20`,
                        }}>
                          {icon}
                        </Box>
                        {index < order.timeline.length - 1 && (
                          <Box sx={{ 
                            width: '2px',
                            bgcolor: statusColor === '#28A745' ? '#28A745' : 'rgba(255,255,255,0.2)',
                            height: '60px',
                            mt: 1,
                          }} />
                        )}
                      </Box>
                      
                      {/* Timeline content */}
                      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <Typography variant="body1" sx={{ 
                          color: statusColor, 
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          mb: 0.5,
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}>
                          {event.event}
                        </Typography>
                        {event.details && (
                          <Typography variant="body2" sx={{ 
                            color: getSecondaryTextColor(),
                            mb: 0.5,
                            fontSize: '0.85rem',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                          }}>
                            {event.details}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ 
                          color: getSecondaryTextColor(),
                          fontSize: '0.75rem',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}>
                          {formatDate(event.timestamp)} by {event.actor.name}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            {/* Comments */}
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              bgcolor: getAccordionBgColorExpanded(),
              border: `1px solid ${getBorderColor()}`,
              borderRadius: 2,
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600 }}>
                  Comments
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined" 
                  startIcon={<Comment />} 
                  onClick={() => setCommentDialogOpen(true)}
                  sx={{
                    color: getTextColor(),
                    borderColor: getInputBorderColorHover(),
                    '&:hover': { borderColor: getInputBorderColorHover() },
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    px: 2,
                    flexShrink: 0,
                  }}
                >
                  Add Comment
                </Button>
              </Box>
              <List dense>
                {order.comments.map((comment) => (
                  <ListItem key={comment.id} sx={{ alignItems: 'flex-start' }}>
                    <ListItemIcon sx={{ minWidth: 40, pt: 1 }}>
                      <Comment sx={{ color: '#EF721F' }} />
                    </ListItemIcon>
                    <ListItemText
                      sx={{ minWidth: 0, flex: 1 }}
                      primary={
                        <Typography variant="body1" sx={{ 
                          color: getTextColor(),
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}>
                          {comment.message}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                          <Typography variant="caption" sx={{ 
                            color: getSecondaryTextColor(),
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                          }}>
                            {formatDate(comment.timestamp)} by {comment.userName}
                          </Typography>
                          {comment.isInternal && (
                            <Chip label="Internal" size="small" color="primary" sx={{ ml: 1, mt: 0.5 }} />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Audit Logs */}
            <Paper sx={{
              p: 3,
              bgcolor: getAccordionBgColorExpanded(),
              border: `1px solid ${getBorderColor()}`,
              borderRadius: 2,
            }}>
              <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
                Audit Logs
              </Typography>
              <List dense>
                {order.auditLogs.slice(-5).map((log, index) => (
                  <ListItem key={index} sx={{ alignItems: 'flex-start' }}>
                    <ListItemIcon sx={{ minWidth: 40, pt: 1 }}>
                      <History sx={{ color: '#EF721F' }} />
                    </ListItemIcon>
                    <ListItemText
                      sx={{ minWidth: 0, flex: 1 }}
                      primary={
                        <Typography variant="body1" sx={{ 
                          color: getTextColor(), 
                          fontWeight: 600,
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}>
                          {`${log.fieldChanged}: ${log.oldValue} → ${log.newValue}`}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                          <Typography variant="caption" sx={{ 
                            color: getSecondaryTextColor(),
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                          }}>
                            {formatDate(log.timestamp)} by {log.userName}
                          </Typography>
                          {log.note && (
                            <Typography variant="caption" sx={{ 
                              color: getSecondaryTextColor(), 
                              display: 'block',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                            }}>
                              {log.note}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
              </Grid>
            </Grid>
          </Box>
        </Box>
        
        {/* Floating Save Button */}
        {hasChanges && !(editableOrder?.isLocked && editableOrder?.pendingFieldChanges?.status === 'Pending') && (
          <Fab
            color="primary"
            aria-label="save"
            onClick={handleSaveChanges}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              bgcolor: '#EF721F',
              '&:hover': { bgcolor: '#EF721F' },
              zIndex: 1000,
            }}
          >
            <Save />
          </Fab>
        )}
      </Container>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onClose={() => setCommentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            fullWidth
            multiline
            rows={4}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddComment} variant="contained">Add Comment</Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Dialog */}
      {/* Status change dialog removed; status is now inline dropdown */}

      {/* Document Viewer Dialog */}
      <Dialog
        open={viewingDocument !== null} 
        onClose={() => setViewingDocument(null)} 
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: mode === 'dark' ? 'rgba(15, 15, 35, 0.98)' : '#FFFFFF',
            m: 0,
            borderRadius: 0,
          }
        }}
      >
        <DialogTitle sx={{ color: getTextColor(), borderBottom: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 114, 31,0.1)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {viewingDocument?.name || 'Document Viewer'}
            </Typography>
            <Button
              onClick={() => setViewingDocument(null)}
              sx={{ color: getSecondaryTextColor() }}
            >
              Close
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {viewingDocument && viewingDocument.data && (
            <iframe
              src={viewingDocument.data}
              width="100%"
              style={{ border: 'none', flex: 1, minHeight: 0 }}
              title={viewingDocument.name}
            />
          )}
          {viewingDocument && !viewingDocument.data && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: getSecondaryTextColor() }}>
                Document preview not available. The document data is missing.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 114, 31,0.1)', p: 2 }}>
          {viewingDocument && viewingDocument.data && (
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => {
                if (viewingDocument.data) {
                  const downloadLink = document.createElement('a');
                  downloadLink.href = viewingDocument.data;
                  downloadLink.download = viewingDocument.name;
                  downloadLink.style.display = 'none';
                  document.body.appendChild(downloadLink);
                  downloadLink.click();
                  document.body.removeChild(downloadLink);
                  toast.success(`${viewingDocument.name} downloaded successfully`);
                }
              }}
              sx={{
                bgcolor: mode === 'dark' ? '#EF721F' : '#EF721F',
                '&:hover': { bgcolor: mode === 'dark' ? '#EF721F' : '#EF721F' },
              }}
            >
              Download
            </Button>
          )}
          <Button 
            onClick={() => setViewingDocument(null)}
            sx={{ color: getTextColor() }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Field Changes Approval Dialog */}
      <Dialog
        open={fieldChangesApprovalDialogOpen}
        onClose={() => {
          // Revert changes when canceling
          if (originalOrderRef.current) {
            const revertedOrder = JSON.parse(JSON.stringify(originalOrderRef.current));
            setEditableOrder(revertedOrder);
            setOrder(revertedOrder);
            setHasChanges(false);
            toast.success('Changes reverted');
          }
          setFieldChangesApprovalDialogOpen(false);
          setSelectedFieldChangesApprover('');
          setPendingFieldChangesData(null);
        }}
        maxWidth="xs"
        fullWidth
        disableEnforceFocus
        PaperProps={{
          sx: {
            bgcolor: mode === 'dark' ? '#1A1A2E' : '#FFFFFF',
            border: mode === 'dark' ? '1px solid rgba(61, 82, 160, 0.3)' : '1px solid rgba(239, 114, 31,0.2)',
            boxShadow: mode === 'dark' ? 'none' : '0 8px 32px rgba(239, 114, 31,0.15)',
            borderRadius: '20px',
            zIndex: 9999,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
        sx={{
          zIndex: 9999,
          '& .MuiBackdrop-root': {
            zIndex: 9998,
          },
          '& .MuiPopover-root': {
            zIndex: '10001 !important',
          },
          '& .MuiMenu-root': {
            zIndex: '10001 !important',
          },
        }}
      >
        <DialogTitle sx={{ color: getTextColor(), borderBottom: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 114, 31,0.1)', pb: 1.5 }}>
          Important Fields Edited - Need Approval
        </DialogTitle>
        <DialogContent sx={{ mt: 1.5, flex: '1 1 auto', overflowY: 'auto', px: 2 }}>
          <Alert severity="warning" sx={{ mb: 1.5, bgcolor: mode === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)', fontSize: '0.875rem' }}>
            The following important fields have been edited after PO Approval. These changes require approval from Higher Management:
          </Alert>
          <Box sx={{ mb: 1.5, maxHeight: 150, overflowY: 'auto' }}>
            {pendingFieldChangesData?.fields.map((field, index) => (
              <Box key={index} sx={{ mb: 1, p: 0.75, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: getTextColor(), fontWeight: 600, mb: 0.25, fontSize: '0.875rem' }}>
                  {field.field}
                </Typography>
                <Typography variant="caption" sx={{ color: getSecondaryTextColor(), fontSize: '0.75rem' }}>
                  From: {String(field.oldValue)} → To: {String(field.newValue)}
                </Typography>
              </Box>
            ))}
          </Box>
          <FormControl fullWidth sx={{ mt: 1.5 }}>
            <InputLabel id="approver-select-label" sx={{ color: getSecondaryTextColor(), fontSize: '0.875rem' }}>Select Approver</InputLabel>
            <Select
              ref={selectFieldRef}
              labelId="approver-select-label"
              value={selectedFieldChangesApprover}
              onChange={(e) => setSelectedFieldChangesApprover(e.target.value)}
              label="Select Approver"
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: mode === 'dark' ? '#1A1A2E' : '#FFFFFF',
                    border: mode === 'dark' ? '1px solid rgba(61, 82, 160, 0.3)' : '1px solid rgba(239, 114, 31,0.2)',
                    boxShadow: mode === 'dark' ? 'none' : '0 8px 32px rgba(239, 114, 31,0.15)',
                    maxHeight: 250,
                    zIndex: 10001,
                    width: '100% !important',
                    minWidth: '0 !important',
                    maxWidth: '444px !important',
                    '& .MuiMenuItem-root': {
                      color: getTextColor(),
                      fontSize: '0.875rem',
                      py: 1,
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(239, 114, 31,0.1)',
                      },
                      '&.Mui-selected': {
                        bgcolor: mode === 'dark' ? 'rgba(239, 114, 31, 0.2)' : 'rgba(239, 114, 31,0.15)',
                        '&:hover': {
                          bgcolor: mode === 'dark' ? 'rgba(239, 114, 31, 0.3)' : 'rgba(239, 114, 31,0.25)',
                        },
                      },
                    },
                  },
                  style: {
                    zIndex: 10001,
                  },
                },
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                disablePortal: false,
                style: {
                  zIndex: 10001,
                },
              }}
              sx={{
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                color: getTextColor(),
                fontSize: '0.875rem',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? 'rgba(61, 82, 160, 0.3)' : 'rgba(0,0,0,0.23)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? 'rgba(61, 82, 160, 0.5)' : 'rgba(239, 114, 31,0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? '#EF721F' : '#EF721F',
                },
                '& .MuiSvgIcon-root': {
                  color: getSecondaryTextColor(),
                },
              }}
            >
              {approvers.map((approver) => (
                <MenuItem key={approver.email} value={approver.name}>
                  {approver.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 114, 31,0.1)' }}>
          <Button 
            onClick={() => {
              // Revert changes when canceling
              if (originalOrderRef.current) {
                const revertedOrder = JSON.parse(JSON.stringify(originalOrderRef.current));
                setEditableOrder(revertedOrder);
                setOrder(revertedOrder);
                setHasChanges(false);
                toast.success('Changes reverted');
              }
              setFieldChangesApprovalDialogOpen(false);
              setSelectedFieldChangesApprover('');
              setPendingFieldChangesData(null);
            }}
            sx={{ color: getSecondaryTextColor() }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleFieldChangesApproverConfirm}
            variant="contained"
            disabled={!selectedFieldChangesApprover}
            sx={{
              bgcolor: '#EF721F',
              '&:hover': { bgcolor: '#6A3DD8' },
              '&:disabled': { bgcolor: 'rgba(239, 114, 31, 0.5)' },
            }}
          >
            Assign & Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approver Selection Dialog */}
      <Dialog
        open={approverDialogOpen}
        onClose={() => {
          setApproverDialogOpen(false);
          setSelectedApprover('');
          setPendingStatus('');
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: mode === 'dark' ? '#1A1A2E' : '#FFFFFF',
            border: mode === 'dark' ? '1px solid rgba(61, 82, 160, 0.3)' : '1px solid rgba(239, 114, 31,0.2)',
            boxShadow: mode === 'dark' ? 'none' : '0 8px 32px rgba(239, 114, 31,0.15)',
            borderRadius: '20px',
          }
        }}
      >
        <DialogTitle sx={{ color: getTextColor(), borderBottom: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 114, 31,0.1)' }}>
          Select Approver
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 2 }}>
            Select who should receive the approval request email:
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel sx={{ color: getSecondaryTextColor() }}>Approver Name</InputLabel>
            <Select
              value={selectedApprover}
              onChange={(e) => setSelectedApprover(e.target.value)}
              label="Approver Name"
              sx={{
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                color: getTextColor(),
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? 'rgba(61, 82, 160, 0.3)' : 'rgba(0,0,0,0.23)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? 'rgba(61, 82, 160, 0.5)' : 'rgba(239, 114, 31,0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? '#EF721F' : '#EF721F',
                },
                '& .MuiSvgIcon-root': {
                  color: getSecondaryTextColor(),
                },
              }}
            >
              {approvers.map((approver) => (
                <MenuItem key={approver.email} value={approver.name}>
                  {approver.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 114, 31,0.1)' }}>
          <Button 
            onClick={() => {
              setApproverDialogOpen(false);
              setSelectedApprover('');
              setPendingStatus('');
            }}
            sx={{ color: getSecondaryTextColor() }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApproverConfirm}
            variant="contained"
            disabled={!selectedApprover}
            sx={{
              bgcolor: '#EF721F',
              '&:hover': { bgcolor: '#EF721F' },
              '&:disabled': {
                bgcolor: mode === 'dark' ? 'rgba(61, 82, 160, 0.3)' : 'rgba(61, 82, 160, 0.2)',
                color: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)',
              }
            }}
          >
            Send for Approval
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Comments Dialog */}
      <Dialog
        open={rejectionDialogOpen}
        onClose={() => {
          setRejectionDialogOpen(false);
          setRejectionComments('');
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: mode === 'dark' ? '#1A1A2E' : '#FFFFFF',
            border: mode === 'dark' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: mode === 'dark' ? 'none' : '0 8px 32px rgba(239, 68, 68, 0.15)',
            borderRadius: '20px',
          }
        }}
      >
        <DialogTitle sx={{ 
          color: getTextColor(), 
          borderBottom: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Close sx={{ color: '#EF4444' }} />
          Reject PO
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mb: 2 }}>
            Please provide comments for rejecting this PO:
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            value={rejectionComments}
            onChange={(e) => setRejectionComments(e.target.value)}
            placeholder="Enter rejection comments here..."
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                color: getTextColor(),
                '& fieldset': {
                  borderColor: mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0,0,0,0.23)',
                },
                '&:hover fieldset': {
                  borderColor: mode === 'dark' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#EF4444',
                },
              },
              '& .MuiInputBase-input::placeholder': {
                color: getSecondaryTextColor(),
                opacity: 0.7,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 68, 68, 0.1)' }}>
          <Button 
            onClick={() => {
              setRejectionDialogOpen(false);
              setRejectionComments('');
            }}
            sx={{ color: getSecondaryTextColor() }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRejection}
            variant="contained"
            disabled={!rejectionComments.trim()}
            sx={{
              bgcolor: '#EF4444',
              '&:hover': { bgcolor: '#DC2626' },
              '&:disabled': {
                bgcolor: mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                color: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)',
              },
            }}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tax Rate and Terms Selection Dialog */}
      <Dialog
        open={taxRateDialogOpen}
        onClose={() => setTaxRateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: mode === 'dark' ? '#1A1A2E' : '#FFFFFF',
            border: mode === 'dark' ? '1px solid rgba(61, 82, 160, 0.3)' : '1px solid rgba(239, 114, 31,0.2)',
            boxShadow: mode === 'dark' ? 'none' : '0 8px 32px rgba(239, 114, 31,0.15)',
            borderRadius: '20px',
          }
        }}
      >
        <DialogTitle sx={{ color: getTextColor(), borderBottom: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 114, 31,0.1)' }}>
          Select Payment Terms and Conditions
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Tax rates will be taken from the individual material rows in the Supplier tab of Materials Info section.
          </Alert>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel sx={{ color: getSecondaryTextColor() }}>Terms</InputLabel>
            <Select
              value={selectedTerms}
              onChange={(e) => setSelectedTerms(e.target.value)}
              label="Terms"
              sx={{
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                color: getTextColor(),
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? 'rgba(61, 82, 160, 0.3)' : 'rgba(0,0,0,0.23)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? 'rgba(61, 82, 160, 0.5)' : 'rgba(239, 114, 31,0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? '#EF721F' : '#EF721F',
                },
                '& .MuiSvgIcon-root': {
                  color: getSecondaryTextColor(),
                },
              }}
            >
              <MenuItem value="40% Advance, 60%(Pre shipment COA approved)">40% Advance, 60%(Pre shipment COA approved)</MenuItem>
              <MenuItem value="50% immediate and balance against Delivery">50% immediate and balance against Delivery</MenuItem>
              <MenuItem value="Upon Pre Shipment COA's Approval">Upon Pre Shipment COA's Approval</MenuItem>
              <MenuItem value="TT Advance">TT Advance</MenuItem>
              <MenuItem value="Against Delivery">Against Delivery</MenuItem>
              <MenuItem value="100% Advance TT against pre shipment COA">100% Advance TT against pre shipment COA</MenuItem>
              <MenuItem value="Net 15Days from the date of AWB/Bill of Lading">Net 15Days from the date of AWB/Bill of Lading</MenuItem>
              <MenuItem value="30 days credit from the date of GRN">30 days credit from the date of GRN</MenuItem>
              <MenuItem value="45 days credit from the date of GRN">45 days credit from the date of GRN</MenuItem>
              <MenuItem value="60 days credit from the date of GRN">60 days credit from the date of GRN</MenuItem>
              <MenuItem value="90 days credit from the date of GRN">90 days credit from the date of GRN</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Terms of Delivery"
            value={termsOfDelivery}
            onChange={(e) => setTermsOfDelivery(e.target.value)}
            sx={{
              mt: 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                color: getTextColor(),
                '& fieldset': {
                  borderColor: mode === 'dark' ? 'rgba(61, 82, 160, 0.3)' : 'rgba(0,0,0,0.23)',
                },
                '&:hover fieldset': {
                  borderColor: mode === 'dark' ? 'rgba(61, 82, 160, 0.5)' : 'rgba(239, 114, 31,0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: mode === 'dark' ? '#EF721F' : '#EF721F',
                },
              },
              '& .MuiInputLabel-root': {
                color: getSecondaryTextColor(),
              },
            }}
          />

          <TextField
            fullWidth
            multiline
            rows={8}
            label="Terms and Conditions"
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            sx={{
              mt: 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                color: getTextColor(),
                '& fieldset': {
                  borderColor: mode === 'dark' ? 'rgba(61, 82, 160, 0.3)' : 'rgba(0,0,0,0.23)',
                },
                '&:hover fieldset': {
                  borderColor: mode === 'dark' ? 'rgba(61, 82, 160, 0.5)' : 'rgba(239, 114, 31,0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: mode === 'dark' ? '#EF721F' : '#EF721F',
                },
              },
              '& .MuiInputLabel-root': {
                color: getSecondaryTextColor(),
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239, 114, 31,0.1)', p: 2 }}>
          <Button
            onClick={() => setTaxRateDialogOpen(false)}
            sx={{ color: getTextColor() }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleGeneratePOWithTax(selectedTerms, termsOfDelivery, termsAndConditions)}
            sx={{
              bgcolor: mode === 'dark' ? '#EF721F' : '#EF721F',
              '&:hover': { bgcolor: mode === 'dark' ? '#EF721F' : '#EF721F' },
            }}
          >
            Generate PO
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI PDF Generation Modal */}
      {order && (
        <AIPDFGenerationModal
          open={aiPdfModalOpen}
          onClose={() => setAiPdfModalOpen(false)}
          order={order}
        />
      )}
    </Box>
  );
};

export default OrderDetailPage;




