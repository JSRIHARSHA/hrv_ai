import * as XLSX from 'xlsx';
import { Order } from '../types';
import { SampleExcelGenerator } from './sampleExcelGenerator';

export interface ExcelOrderData {
  orderId: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  createdByRole: string;
  customerName: string;
  customerAddress: string;
  customerCountry: string;
  customerEmail: string;
  customerPhone: string;
  customerGstin: string;
  supplierName: string;
  supplierAddress: string;
  supplierCountry: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierGstin: string;
  materialName: string;
  materialsJson: string; // JSON string of materials array
  quantityValue: number;
  quantityUnit: string;
  priceToCustomerAmount: number;
  priceToCustomerCurrency: string;
  priceFromSupplierAmount: number;
  priceFromSupplierCurrency: string;
  status: string;
  documentsJson: string; // JSON string of documents object
  assignedTo: string;
  assignedToName: string;
  assignedToRole: string;
  poNumber: string;
  deliveryTerms: string;
  incoterms: string;
  eta: string;
  notes: string;
  hsnCode: string;
  enquiryNo: string;
  upc: string;
  ean: string;
  mpn: string;
  isbn: string;
  inventoryAccount: string;
  inventoryValuationMethod: string;
  supplierPOGenerated: boolean;
  supplierPOSent: boolean;
  timelineJson: string; // JSON string of timeline array
  auditLogsJson: string; // JSON string of audit logs array
  commentsJson: string; // JSON string of comments array
  paymentDetailsJson: string; // JSON string of payment details
  rfid: string;
  entity: string;
}

export class ExcelService {
  private static readonly EXCEL_FILE_NAME = 'orders_data.xlsx';
  private static readonly SHEET_NAME = 'Orders';

  /**
   * Convert Order object to Excel row format
   */
  private static orderToExcelRow(order: Order): ExcelOrderData {
    return {
      orderId: order.orderId,
      createdAt: order.createdAt,
      createdBy: order.createdBy.userId,
      createdByName: order.createdBy.name,
      createdByRole: order.createdBy.role,
      customerName: order.customer.name,
      customerAddress: order.customer.address,
      customerCountry: order.customer.country,
      customerEmail: order.customer.email,
      customerPhone: order.customer.phone,
      customerGstin: order.customer.gstin || '',
      supplierName: order.supplier?.name || '',
      supplierAddress: order.supplier?.address || '',
      supplierCountry: order.supplier?.country || '',
      supplierEmail: order.supplier?.email || '',
      supplierPhone: order.supplier?.phone || '',
      supplierGstin: order.supplier?.gstin || '',
      materialName: order.materialName,
      materialsJson: JSON.stringify(order.materials),
      quantityValue: order.quantity.value,
      quantityUnit: order.quantity.unit,
      priceToCustomerAmount: order.priceToCustomer.amount,
      priceToCustomerCurrency: order.priceToCustomer.currency,
      priceFromSupplierAmount: order.priceFromSupplier.amount,
      priceFromSupplierCurrency: order.priceFromSupplier.currency,
      status: order.status,
      documentsJson: JSON.stringify(order.documents),
      assignedTo: order.assignedTo.userId,
      assignedToName: order.assignedTo.name,
      assignedToRole: order.assignedTo.role,
      poNumber: order.poNumber || '',
      deliveryTerms: order.deliveryTerms || '',
      incoterms: order.incoterms || '',
      eta: order.eta || '',
      notes: order.notes || '',
      hsnCode: order.hsnCode || '',
      enquiryNo: order.enquiryNo || '',
      upc: order.upc || '',
      ean: order.ean || '',
      mpn: order.mpn || '',
      isbn: order.isbn || '',
      inventoryAccount: order.inventoryAccount || '',
      inventoryValuationMethod: order.inventoryValuationMethod || '',
      supplierPOGenerated: order.supplierPOGenerated || false,
      supplierPOSent: order.supplierPOSent || false,
      timelineJson: JSON.stringify(order.timeline),
      auditLogsJson: JSON.stringify(order.auditLogs),
      commentsJson: JSON.stringify(order.comments),
      paymentDetailsJson: JSON.stringify(order.paymentDetails || {}),
      rfid: order.rfid || '',
      entity: order.entity || '',
    };
  }

  /**
   * Convert Excel row to Order object
   */
  private static excelRowToOrder(row: ExcelOrderData): Order {
    return {
      orderId: row.orderId,
      createdAt: row.createdAt,
      createdBy: {
        userId: row.createdBy,
        name: row.createdByName,
        role: row.createdByRole as any,
      },
      customer: {
        name: row.customerName,
        address: row.customerAddress,
        country: row.customerCountry,
        email: row.customerEmail,
        phone: row.customerPhone,
        gstin: row.customerGstin,
      },
      supplier: {
        name: row.supplierName,
        address: row.supplierAddress,
        country: row.supplierCountry,
        email: row.supplierEmail,
        phone: row.supplierPhone,
        gstin: row.supplierGstin,
      },
      materialName: row.materialName,
      materials: JSON.parse(row.materialsJson || '[]'),
      quantity: {
        value: row.quantityValue,
        unit: row.quantityUnit,
      },
      priceToCustomer: {
        amount: row.priceToCustomerAmount,
        currency: row.priceToCustomerCurrency,
      },
      priceFromSupplier: {
        amount: row.priceFromSupplierAmount,
        currency: row.priceFromSupplierCurrency,
      },
      status: row.status as any,
      documents: JSON.parse(row.documentsJson || '{}'),
      assignedTo: {
        userId: row.assignedTo,
        name: row.assignedToName,
        role: row.assignedToRole as any,
      },
      poNumber: row.poNumber,
      deliveryTerms: row.deliveryTerms,
      incoterms: row.incoterms,
      eta: row.eta,
      notes: row.notes,
      hsnCode: row.hsnCode,
      enquiryNo: row.enquiryNo,
      upc: row.upc,
      ean: row.ean,
      mpn: row.mpn,
      isbn: row.isbn,
      inventoryAccount: row.inventoryAccount,
      inventoryValuationMethod: row.inventoryValuationMethod,
      supplierPOGenerated: row.supplierPOGenerated,
      supplierPOSent: row.supplierPOSent,
      timeline: JSON.parse(row.timelineJson || '[]'),
      auditLogs: JSON.parse(row.auditLogsJson || '[]'),
      comments: JSON.parse(row.commentsJson || '[]'),
      approvalRequests: [],
      paymentDetails: JSON.parse(row.paymentDetailsJson || '{}'),
      rfid: row.rfid,
      entity: row.entity as 'HRV' | 'NHG' | undefined,
    };
  }

  /**
   * Read orders from Excel file
   */
  static async readOrdersFromExcel(file?: File): Promise<Order[]> {
    try {
      let workbook: XLSX.WorkBook;
      
      if (file) {
        // Read from uploaded file
        const data = await file.arrayBuffer();
        workbook = XLSX.read(data, { type: 'array' });
      } else {
        // Try to read from default file path (for demo purposes)
        // In a real app, you might want to store this in localStorage or use a file picker
        const defaultData = this.getDefaultExcelData();
        workbook = XLSX.read(defaultData, { type: 'binary' });
      }

      const worksheet = workbook.Sheets[this.SHEET_NAME];
      if (!worksheet) {
        throw new Error(`Sheet "${this.SHEET_NAME}" not found`);
      }

      const jsonData = XLSX.utils.sheet_to_json<ExcelOrderData>(worksheet);
      return jsonData.map(row => this.excelRowToOrder(row));
    } catch (error) {
      console.error('Error reading Excel file:', error);
      throw new Error('Failed to read Excel file');
    }
  }

  /**
   * Write orders to Excel file
   */
  static async writeOrdersToExcel(orders: Order[]): Promise<void> {
    try {
      const excelData = orders.map(order => this.orderToExcelRow(order));
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, this.SHEET_NAME);

      // Generate Excel file and trigger download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.EXCEL_FILE_NAME;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error writing Excel file:', error);
      throw new Error('Failed to write Excel file');
    }
  }

  /**
   * Save orders to localStorage as backup
   */
  static saveOrdersToLocalStorage(orders: Order[]): void {
    try {
      localStorage.setItem('orders_backup', JSON.stringify(orders));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  /**
   * Load orders from localStorage backup
   */
  static loadOrdersFromLocalStorage(): Order[] {
    try {
      const data = localStorage.getItem('orders_backup');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return [];
    }
  }

  /**
   * Get default Excel data for demo purposes
   */
  private static getDefaultExcelData(): string {
    // This would contain the binary data of a default Excel file
    // For now, we'll return empty data and let the user upload their own file
    return '';
  }

  /**
   * Create a sample Excel file with default data
   */
  static async createSampleExcelFile(): Promise<void> {
    SampleExcelGenerator.createSampleExcelFile();
  }

  /**
   * Validate Excel file format
   */
  static validateExcelFile(file: File): boolean {
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Get Excel file template headers
   */
  static getExcelHeaders(): string[] {
    return [
      'orderId', 'createdAt', 'createdBy', 'createdByName', 'createdByRole',
      'customerName', 'customerAddress', 'customerCountry', 'customerEmail', 'customerPhone', 'customerGstin',
      'supplierName', 'supplierAddress', 'supplierCountry', 'supplierEmail', 'supplierPhone', 'supplierGstin',
      'materialName', 'materialsJson', 'quantityValue', 'quantityUnit',
      'priceToCustomerAmount', 'priceToCustomerCurrency', 'priceFromSupplierAmount', 'priceFromSupplierCurrency',
      'status', 'documentsJson', 'assignedTo', 'assignedToName', 'assignedToRole',
      'poNumber', 'deliveryTerms', 'incoterms', 'eta', 'notes',
      'hsnCode', 'enquiryNo', 'upc', 'ean', 'mpn', 'isbn',
      'inventoryAccount', 'inventoryValuationMethod', 'supplierPOGenerated', 'supplierPOSent',
      'timelineJson', 'auditLogsJson', 'commentsJson', 'paymentDetailsJson',
      'rfid', 'entity'
    ];
  }
}
