import jsPDF from 'jspdf';
import { Order, PDFGenerationData } from '../types';

export interface HRVPDFConfig {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo?: string;
  poPrefix: string;
  terms: string[];
  signatureFields: {
    name: string;
    title: string;
    date: string;
    signature: string;
  };
}

export class HRVPDFGenerator {
  private doc: jsPDF;
  private config: HRVPDFConfig;
  private orderData: any;

  constructor(config?: Partial<HRVPDFConfig>) {
    this.doc = new jsPDF();
    this.config = {
      companyName: 'HRV LIFE SCIENCES PVT. LTD.',
      companyAddress: 'Plot No. 123, Industrial Area, Mumbai - 400001, India',
      companyPhone: '+91-22-12345678',
      companyEmail: 'info@hrvlifesciences.com',
      poPrefix: 'HRV/PO',
      terms: [
        'Payment terms: 30% advance, 70% on delivery',
        'All materials must comply with FDA regulations',
        'Certificate of Analysis (COA) required',
        'Delivery within 30 days from PO acceptance',
        'Quality standards as per USP/EP specifications'
      ],
      signatureFields: {
        name: 'Authorized Signatory',
        title: 'Purchase Manager',
        date: 'Date',
        signature: 'Signature'
      },
      ...config
    };
  }

  generateHRVPO(order: Order, customData?: Partial<PDFGenerationData>): jsPDF {
    const data: PDFGenerationData = {
      orderId: order.orderId,
      supplierInfo: order.supplier,
      customerInfo: order.customer,
      materials: order.materials,
      poNumber: order.poNumber || `${this.config.poPrefix}/${order.orderId}`,
      date: new Date().toLocaleDateString('en-IN'),
      deliveryTerms: order.deliveryTerms || 'FOB',
      totalAmount: order.priceFromSupplier,
      terms: this.config.terms.join('. '),
      ...customData,
    };

    // Store additional order data for use in PDF generation
    this.orderData = {
      ...order,
      poNumber: data.poNumber,
      date: data.date,
      deliveryTerms: data.deliveryTerms,
      incoterms: order.incoterms,
      eta: order.eta,
      notes: order.notes,
      hsnCode: order.hsnCode,
      enquiryNo: order.enquiryNo,
      rfid: order.rfid,
      entity: order.entity,
      paymentDetails: order.paymentDetails,
      freightHandler: order.freightHandler
    };

    this.doc = new jsPDF();
    
    // Generate PDF sections
    this.addHeader(data);
    this.addCompanyInfo(data);
    this.addSupplierInfo(data);
    this.addPODetails(data);
    this.addMaterialsTable(data);
    this.addTotals(data);
    this.addTerms(data);
    this.addSignatureBlock(data);

    return this.doc;
  }

  private addHeader(data: PDFGenerationData): void {
    // Company Logo Area (placeholder for now)
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(20, 20, 50, 20, 'F');
    
    // Company Name
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(this.config.companyName, 20, 35);
    
    // PO Title
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PURCHASE ORDER', 140, 30);
    
    // PO Number (from order data)
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`PO No.: ${data.poNumber}`, 140, 40);
    
    // Date (from order data)
    this.doc.text(`Date: ${data.date}`, 140, 50);
    
    // Delivery Terms (from order data)
    this.doc.text(`Delivery Terms: ${data.deliveryTerms}`, 140, 60);
    
    // Additional order details if available
    if (this.orderData?.incoterms) {
      this.doc.text(`Incoterms: ${this.orderData.incoterms}`, 140, 70);
    }
    if (this.orderData?.eta) {
      this.doc.text(`ETA: ${this.orderData.eta}`, 140, 80);
    }
  }

  private addCompanyInfo(data: PDFGenerationData): void {
    const startY = 70;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('FROM:', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(this.config.companyName, 20, startY + 10);
    this.doc.text(this.config.companyAddress, 20, startY + 20);
    this.doc.text(`Phone: ${this.config.companyPhone}`, 20, startY + 30);
    this.doc.text(`Email: ${this.config.companyEmail}`, 20, startY + 40);
  }

  private addSupplierInfo(data: PDFGenerationData): void {
    const startY = 100; // Adjusted for additional header info
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TO:', 120, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.supplierInfo.name, 120, startY + 10);
    this.doc.text(data.supplierInfo.address, 120, startY + 20);
    this.doc.text(`Country: ${data.supplierInfo.country}`, 120, startY + 30);
    this.doc.text(`Phone: ${data.supplierInfo.phone}`, 120, startY + 40);
    this.doc.text(`Email: ${data.supplierInfo.email}`, 120, startY + 50);
    
    // Add additional supplier details if available
    if (this.orderData?.hsnCode) {
      this.doc.text(`HSN Code: ${this.orderData.hsnCode}`, 120, startY + 60);
    }
    if (this.orderData?.enquiryNo) {
      this.doc.text(`Enquiry No: ${this.orderData.enquiryNo}`, 120, startY + 70);
    }
  }

  private addPODetails(data: PDFGenerationData): void {
    const startY = 180; // Adjusted for additional supplier info
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ORDER DETAILS', 20, startY);
    
    // Draw a box around order details
    this.doc.setDrawColor(0, 0, 0);
    this.doc.rect(20, startY + 5, 170, 40);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Order ID: ${data.orderId}`, 25, startY + 15);
    this.doc.text(`PO Number: ${data.poNumber}`, 25, startY + 25);
    this.doc.text(`Date: ${data.date}`, 100, startY + 15);
    this.doc.text(`Delivery Terms: ${data.deliveryTerms}`, 100, startY + 25);
    
    // Add additional order details
    if (this.orderData?.rfid) {
      this.doc.text(`RFID: ${this.orderData.rfid}`, 25, startY + 35);
    }
    if (this.orderData?.entity) {
      this.doc.text(`Entity: ${this.orderData.entity}`, 100, startY + 35);
    }
  }

  private addMaterialsTable(data: PDFGenerationData): void {
    const startY = 230; // Adjusted for additional PO details
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('MATERIALS', 20, startY);
    
    // Table headers with background
    this.doc.setFillColor(220, 220, 220);
    this.doc.rect(20, startY + 5, 170, 15, 'F');
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Sr. No.', 25, startY + 15);
    this.doc.text('Material Name', 45, startY + 15);
    this.doc.text('SKU', 100, startY + 15);
    this.doc.text('Qty', 130, startY + 15);
    this.doc.text('Unit Price', 150, startY + 15);
    this.doc.text('Total', 170, startY + 15);
    
    // Table content - use actual order materials
    this.doc.setFont('helvetica', 'normal');
    let currentY = startY + 25;
    let totalAmount = 0;
    
    // Use the actual materials from the order
    const materials = data.materials || [];
    
    materials.forEach((material, index) => {
      if (currentY > 280) {
        this.doc.addPage();
        currentY = 30;
      }
      
      // Alternate row colors
      if (index % 2 === 0) {
        this.doc.setFillColor(250, 250, 250);
        this.doc.rect(20, currentY - 5, 170, 10, 'F');
      }
      
      this.doc.text((index + 1).toString(), 25, currentY);
      this.doc.text(material.name, 45, currentY);
      this.doc.text(material.sku || '-', 100, currentY);
      this.doc.text(`${material.quantity.value} ${material.quantity.unit}`, 130, currentY);
      this.doc.text(`${material.unitPrice.currency} ${material.unitPrice.amount.toFixed(2)}`, 150, currentY);
      this.doc.text(`${material.totalPrice.currency} ${material.totalPrice.amount.toFixed(2)}`, 170, currentY);
      
      totalAmount += material.totalPrice.amount;
      currentY += 10;
    });
    
    // If no materials, show a message
    if (materials.length === 0) {
      this.doc.text('No materials specified', 25, currentY);
      currentY += 10;
    }
    
    // Total row
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(20, currentY - 5, 170, 10, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TOTAL:', 150, currentY);
    this.doc.text(`${data.totalAmount.currency} ${totalAmount.toFixed(2)}`, 170, currentY);
  }

  private addTotals(data: PDFGenerationData): void {
    const startY = 320; // Adjusted for materials table
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('AMOUNT DETAILS', 20, startY);
    
    // Draw a box around totals
    this.doc.setDrawColor(0, 0, 0);
    this.doc.rect(20, startY + 5, 170, 35);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    // Calculate totals from materials
    const materials = data.materials || [];
    const subtotal = materials.reduce((sum, material) => sum + material.totalPrice.amount, 0);
    const tax = 0; // You can add tax calculation logic here if needed
    
    this.doc.text(`Subtotal: ${data.totalAmount.currency} ${subtotal.toFixed(2)}`, 25, startY + 15);
    this.doc.text(`Tax (if applicable): ${data.totalAmount.currency} ${tax.toFixed(2)}`, 25, startY + 25);
    
    // Add payment details if available
    if (this.orderData?.paymentDetails) {
      const payment = this.orderData.paymentDetails;
      if (payment.paymentMethod) {
        this.doc.text(`Payment Method: ${payment.paymentMethod}`, 25, startY + 35);
      }
      if (payment.paymentTerms) {
        this.doc.text(`Payment Terms: ${payment.paymentTerms}`, 25, startY + 45);
      }
    }
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`TOTAL AMOUNT: ${data.totalAmount.currency} ${data.totalAmount.amount.toFixed(2)}`, 25, startY + 55);
  }

  private addTerms(data: PDFGenerationData): void {
    const startY = 370; // Adjusted for totals section
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TERMS AND CONDITIONS', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    this.config.terms.forEach((term, index) => {
      this.doc.text(`${index + 1}. ${term}`, 20, startY + 15 + (index * 8));
    });
    
    // Add order notes if available
    if (this.orderData?.notes) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('SPECIAL NOTES:', 20, startY + 15 + (this.config.terms.length * 8) + 10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(this.orderData.notes, 20, startY + 15 + (this.config.terms.length * 8) + 20);
    }
  }

  private addSignatureBlock(data: PDFGenerationData): void {
    const startY = 450; // Adjusted for terms section
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('AUTHORIZED SIGNATURE', 20, startY);
    
    // Signature box
    this.doc.setDrawColor(0, 0, 0);
    this.doc.rect(20, startY + 10, 170, 50);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`${this.config.signatureFields.name}: _________________________`, 25, startY + 25);
    this.doc.text(`${this.config.signatureFields.title}: _________________________`, 25, startY + 35);
    this.doc.text(`${this.config.signatureFields.date}: _________________________`, 25, startY + 45);
    this.doc.text(`${this.config.signatureFields.signature}: _____________________`, 25, startY + 55);
    
    // Add freight handler information if available
    if (this.orderData?.freightHandler) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('FREIGHT HANDLER:', 25, startY + 65);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`${this.orderData.freightHandler.name}`, 25, startY + 75);
      this.doc.text(`Phone: ${this.orderData.freightHandler.phone}`, 25, startY + 85);
    }
  }

  downloadPDF(filename: string = 'hrv-supplier-po.pdf'): void {
    this.doc.save(filename);
  }

  getPDFDataURL(): string {
    return this.doc.output('dataurlstring');
  }
}

// Utility functions
export const generateHRVPO = (order: Order, customData?: Partial<PDFGenerationData>, config?: Partial<HRVPDFConfig>): jsPDF => {
  const generator = new HRVPDFGenerator(config);
  return generator.generateHRVPO(order, customData);
};

export const downloadHRVPO = (order: Order, customData?: Partial<PDFGenerationData>, config?: Partial<HRVPDFConfig>): void => {
  const generator = new HRVPDFGenerator(config);
  generator.generateHRVPO(order, customData);
  generator.downloadPDF(`HRV_PO_${order.orderId}.pdf`);
};

export const previewHRVPO = (order: Order, customData?: Partial<PDFGenerationData>, config?: Partial<HRVPDFConfig>): string => {
  const generator = new HRVPDFGenerator(config);
  generator.generateHRVPO(order, customData);
  return generator.getPDFDataURL();
};
