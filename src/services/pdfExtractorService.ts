import { Order, MaterialItem, FreightHandler, ContactInfo, TimelineEvent, OrderStatus } from '../types';

export interface PDFExtractionResult {
  success: boolean;
  data: {
    PO_NUMBER?: string;
    PO_ISSUER_NAME?: string;
    PO_ISSUER_ADDRESS?: string;
    GSTIN?: string;
    CONTACT_NUMBER?: string;
    MATERIAL?: string;
    QUANTITY?: number;
    UNIT_PRICE?: string;
    TOTAL_AMOUNT?: string;
    CURRENCY?: string;
    MANUFACTURER?: string;
    DELIVERY_TERMS?: string;
    PAYMENT_TERMS?: string;
    ORDER_DATE?: string;
  };
  confidence: number;
  model_info: {
    name: string;
    detected_format: string;
    extraction_method: string;
  };
  text_length: number;
  entities_found: number;
  error?: string;
}

export class PDFExtractorService {
  private static instance: PDFExtractorService;
  private pythonScriptPath: string;

  private constructor() {
    this.pythonScriptPath = 'universal_pdf_extractor.py';
  }

  public static getInstance(): PDFExtractorService {
    if (!PDFExtractorService.instance) {
      PDFExtractorService.instance = new PDFExtractorService();
    }
    return PDFExtractorService.instance;
  }

  /**
   * Extract data from PDF using the backend API
   */
  public async extractFromPDF(pdfFile: File): Promise<PDFExtractionResult> {
    return new Promise((resolve, reject) => {
      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('pdf', pdfFile);

        // Call backend API
        // Ensure API_BASE_URL always ends with /api
        let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        API_BASE_URL = API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
        if (!API_BASE_URL.endsWith('/api')) {
          API_BASE_URL = API_BASE_URL + '/api';
        }
        fetch(`${API_BASE_URL}/extract-pdf`, {
          method: 'POST',
          body: formData,
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          console.error('Backend API error:', error);
          // Fallback to simulation if backend is not available
          console.log('Falling back to simulation mode...');
          this.simulatePDFExtraction(pdfFile).then(resolve).catch(reject);
        });
      } catch (error) {
        reject(new Error(`PDF extraction failed: ${error}`));
      }
    });
  }

  /**
   * Simulate PDF extraction for demo purposes
   * In a real implementation, this would call the Python script via a backend API
   */
  private async simulatePDFExtraction(pdfFile: File): Promise<PDFExtractionResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return mock extracted data based on common pharmaceutical PO patterns
    const mockData: PDFExtractionResult = {
      success: true,
      data: {
        PO_NUMBER: `PO${Date.now().toString().slice(-6)}`,
        PO_ISSUER_NAME: 'Sample Pharmaceutical Company',
        PO_ISSUER_ADDRESS: '123 Pharma Street, Medical City, MC 12345',
        GSTIN: '29ABCDE1234F1Z5',
        CONTACT_NUMBER: '+91-9876543210',
        MATERIAL: 'Simethicone Emulsion USP',
        QUANTITY: 1300,
        UNIT_PRICE: '6.00',
        TOTAL_AMOUNT: '7800.00',
        CURRENCY: 'USD',
        MANUFACTURER: 'Generic Manufacturer Ltd.',
        DELIVERY_TERMS: 'FOB Destination',
        PAYMENT_TERMS: 'Net 30 days',
        ORDER_DATE: new Date().toLocaleDateString('en-GB')
      },
      confidence: 0.95,
      model_info: {
        name: 'Universal PDF Extractor',
        detected_format: 'pharmaceutical_po',
        extraction_method: 'Multi-strategy pattern matching'
      },
      text_length: 1500,
      entities_found: 12
    };

    return mockData;
  }

  /**
   * Convert extracted PDF data to Order object
   */
  public convertExtractedDataToOrder(
    extractedData: PDFExtractionResult, 
    uploadedBy: string, 
    selectedSupplier?: ContactInfo, 
    pdfFileData?: string,
    entity?: 'HRV' | 'NHG',
    poNumber?: string
  ): Order {
    const data = extractedData.data;
    
    // Use selected supplier from dropdown, or create supplier from extracted data as fallback
    const supplier: ContactInfo = selectedSupplier || {
      name: data.PO_ISSUER_NAME || 'Unknown Supplier',
      address: data.PO_ISSUER_ADDRESS || 'Address not provided',
      country: 'India', // Default, could be extracted from address
      email: 'supplier@example.com', // Default email
      phone: data.CONTACT_NUMBER || 'N/A',
      gstin: data.GSTIN || undefined
    };

    // Create material item from extracted data
    const totalAmount = parseFloat(data.TOTAL_AMOUNT || '0');
    const extractedCurrency = data.CURRENCY || 'USD';
    const material: MaterialItem = {
      id: `material_${Date.now()}`,
      name: data.MATERIAL || 'Unknown Material',
      description: data.MATERIAL || 'Material description not available',
      quantity: {
        value: data.QUANTITY || 1,
        unit: 'Kg'
      },
      unitPrice: {
        amount: parseFloat(data.UNIT_PRICE || '0'),
        currency: extractedCurrency
      },
      totalPrice: {
        amount: totalAmount,
        currency: extractedCurrency
      },
      supplierUnitPrice: {
        amount: 0,
        currency: extractedCurrency
      },
      supplierTotalPrice: {
        amount: 0,
        currency: extractedCurrency
      },
      hsn: 'N/A', // Could be extracted from PDF if available
      account: '',
      taxRate: 18, // Default tax rate
      taxAmount: (totalAmount * 0.18) // Calculate 18% tax by default
    };

    // Create order from extracted data
    // Note: orderId will be auto-generated by createOrder in format YYYY-X
    const order: Order = {
      orderId: '', // Will be generated by createOrder function
      createdAt: new Date().toISOString(),
      createdBy: {
        userId: uploadedBy,
        name: 'System User',
        role: 'Employee' as any
      },
      status: 'PO_Received_from_Client' as OrderStatus,
      
      // Customer information - populate from extracted PDF data
      customer: {
        name: data.PO_ISSUER_NAME || 'Pharmaceutical Customer',
        address: data.PO_ISSUER_ADDRESS || 'Customer Address',
        country: 'India',
        email: 'customer@example.com',
        phone: data.CONTACT_NUMBER || 'Customer Contact',
        gstin: data.GSTIN || 'CUSTOMER_GSTIN'
      },
      
      // Supplier information - only set if provided, otherwise null
      supplier: supplier || null,
      
      // Material information
      materialName: data.MATERIAL || 'Unknown Material',
      materials: [material],
      
      // Pricing information
      priceFromSupplier: {
        amount: 0, // To be filled by user
        currency: data.CURRENCY || 'USD'
      },
      priceToCustomer: {
        amount: parseFloat(data.TOTAL_AMOUNT || '0'), // From PDF
        currency: data.CURRENCY || 'USD'
      },
      
      // Quantity information
      quantity: {
        value: data.QUANTITY || 1,
        unit: 'Kg'
      },
      
      // Additional information
      rfid: undefined,
      entity: entity || 'HRV' as 'HRV' | 'NHG',
      poNumber: poNumber || data.PO_NUMBER || `PO-${Date.now()}`,
      
      // Documents
      documents: {
        customerPO: {
          id: `doc_${Date.now()}`,
          filename: 'uploaded_po.pdf',
          uploadedAt: new Date().toISOString(),
          uploadedBy: {
            userId: uploadedBy,
            name: 'System User'
          },
          fileSize: pdfFileData ? pdfFileData.length : 0,
          mimeType: 'application/pdf',
          data: pdfFileData, // Add the base64 data
        }
      },
      
      // Comments and logs
      comments: [],
      auditLogs: [],
      timeline: [
        {
          id: `timeline_${Date.now()}`,
          timestamp: new Date().toISOString(),
          event: 'Order Created',
          details: 'Order created from PDF upload using AI extraction',
          actor: {
            userId: uploadedBy,
            name: 'System User',
            role: 'Employee' as any
          }
        }
      ],
      
      // Approval information
      approvalRequests: [],
      
      // Assigned to
      assignedTo: {
        userId: uploadedBy,
        name: 'System User',
        role: 'Employee' as any
      },
      
      // Freight handler (default)
      freightHandler: {
        id: 'default_freight',
        name: 'Default Freight Handler',
        company: 'Default Freight Company',
        address: 'Default Address',
        country: 'India',
        phone: 'Default Contact',
        gstin: 'DEFAULT_GSTIN'
      }
    };

    return order;
  }

}

export default PDFExtractorService;
