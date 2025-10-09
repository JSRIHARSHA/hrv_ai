import jsPDF from 'jspdf';
import { Order, PDFGenerationData, MaterialItem } from '../types';

export class PDFGenerator {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
  }

  generateSupplierPO(order: Order, customData?: Partial<PDFGenerationData>, entity?: 'HRV' | 'NHG'): jsPDF {
    const data: PDFGenerationData = {
      orderId: order.orderId,
      supplierInfo: order.supplier,
      customerInfo: order.customer,
      materials: order.materials,
      poNumber: order.poNumber || `AUTO-${order.orderId}-001`,
      date: new Date().toLocaleDateString(),
      deliveryTerms: order.deliveryTerms || 'FOB',
      totalAmount: order.priceFromSupplier,
      terms: 'Payment: 30% advance, 70% on delivery. All materials must comply with FDA regulations and include Certificate of Analysis (COA).',
      ...customData,
    };

    this.doc = new jsPDF();
    
    // Use entity-specific template or default template
    if (entity === 'HRV') {
      this.addHRVHeader(data);
      this.addHRVSupplierInfo(data);
      this.addHRVCustomerInfo(data);
      this.addHRVPODetails(data);
      this.addHRVMaterialsTable(data);
      this.addHRVTotals(data);
      this.addHRVTerms(data);
      this.addHRVSignatureBlock();
    } else if (entity === 'NHG') {
      this.addNHGHeader(data);
      this.addNHGSupplierInfo(data);
      this.addNHGCustomerInfo(data);
      this.addNHGPODetails(data);
      this.addNHGMaterialsTable(data);
      this.addNHGTotals(data);
      this.addNHGTerms(data);
      this.addNHGSignatureBlock();
    } else {
      // Default template
      this.addHeader(data);
      this.addSupplierInfo(data);
      this.addCustomerInfo(data);
      this.addPODetails(data);
      this.addMaterialsTable(data);
      this.addTotals(data);
      this.addTerms(data);
      this.addSignatureBlock();
    }

    return this.doc;
  }

  private addHeader(data: PDFGenerationData): void {
    // Company Header
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PURCHASE ORDER', 20, 30);

    // PO Number and Date
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`PO Number: ${data.poNumber}`, 20, 45);
    this.doc.text(`Date: ${data.date}`, 20, 55);

    // Delivery Terms
    this.doc.text(`Delivery Terms: ${data.deliveryTerms}`, 20, 65);
  }

  private addSupplierInfo(data: PDFGenerationData): void {
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('SUPPLIER INFORMATION', 20, 85);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.supplierInfo.name, 20, 95);
    this.doc.text(data.supplierInfo.address, 20, 105);
    this.doc.text(data.supplierInfo.country, 20, 115);
    this.doc.text(`Email: ${data.supplierInfo.email}`, 20, 125);
    this.doc.text(`Phone: ${data.supplierInfo.phone}`, 20, 135);
  }

  private addCustomerInfo(data: PDFGenerationData): void {
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('BUYER INFORMATION', 110, 85);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.customerInfo.name, 110, 95);
    this.doc.text(data.customerInfo.address, 110, 105);
    this.doc.text(data.customerInfo.country, 110, 115);
    this.doc.text(`Email: ${data.customerInfo.email}`, 110, 125);
    this.doc.text(`Phone: ${data.customerInfo.phone}`, 110, 135);
  }

  private addPODetails(data: PDFGenerationData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PURCHASE ORDER DETAILS', 20, 155);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Order ID: ${data.orderId}`, 20, 165);
    this.doc.text(`PO Number: ${data.poNumber}`, 20, 175);
    this.doc.text(`Date: ${data.date}`, 20, 185);
    this.doc.text(`Delivery Terms: ${data.deliveryTerms}`, 20, 195);
  }

  private addMaterialsTable(data: PDFGenerationData): void {
    const startY = 210;
    const tableHeaders = ['Item', 'Description', 'SKU', 'Quantity', 'Unit Price', 'Total'];
    const colWidths = [30, 50, 25, 20, 25, 25];
    const colPositions = [20, 50, 100, 125, 145, 170];

    // Table Header
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(20, startY - 5, 175, 10, 'F');
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    colPositions.forEach((x, index) => {
      this.doc.text(tableHeaders[index], x, startY);
    });

    // Table Content
    this.doc.setFont('helvetica', 'normal');
    let currentY = startY + 10;

    data.materials.forEach((material, index) => {
      if (currentY > 250) {
        this.doc.addPage();
        currentY = 20;
      }

      const rowData = [
        (index + 1).toString(),
        material.name,
        material.sku || '',
        `${material.quantity.value} ${material.quantity.unit}`,
        `${material.unitPrice.currency} ${material.unitPrice.amount.toFixed(2)}`,
        `${material.totalPrice.currency} ${material.totalPrice.amount.toFixed(2)}`,
      ];

      colPositions.forEach((x, colIndex) => {
        this.doc.text(rowData[colIndex], x, currentY);
      });

      currentY += 8;
    });
  }

  private addTotals(data: PDFGenerationData): void {
    const startY = 280;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TOTAL AMOUNT:', 120, startY);
    this.doc.text(`${data.totalAmount.currency} ${data.totalAmount.amount.toFixed(2)}`, 150, startY);
  }

  private addTerms(data: PDFGenerationData): void {
    const startY = 300;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TERMS AND CONDITIONS', 20, startY);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    const terms = [
      data.terms || 'Payment: 30% advance, 70% on delivery. All materials must comply with FDA regulations and include Certificate of Analysis (COA).',
      'Delivery: As per agreed timeline',
      'Quality: Material must meet USP/NF pharmaceutical standards',
      'Packaging: FDA-compliant pharmaceutical packaging required',
      'Inspection: Right to inspect and test before dispatch',
      'Compliance: All materials must include COA and regulatory documentation',
      'Storage: Materials must be stored under appropriate pharmaceutical conditions',
    ];

    terms.forEach((term, index) => {
      this.doc.text(`• ${term}`, 20, startY + 15 + (index * 8));
    });
  }

  private addSignatureBlock(): void {
    const startY = 350;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('AUTHORIZED SIGNATURE', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Name: _________________________', 20, startY + 20);
    this.doc.text('Title: _________________________', 20, startY + 30);
    this.doc.text('Date: _________________________', 20, startY + 40);
    this.doc.text('Signature: _____________________', 20, startY + 50);
  }

  // HRV Template Methods
  private addHRVHeader(data: PDFGenerationData): void {
    // HRV Company Header
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('HRV LIFE SCIENCES PVT. LTD.', 20, 30);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Address: [HRV Address]', 20, 40);
    this.doc.text('Phone: [HRV Phone] | Email: [HRV Email]', 20, 50);
    
    // PO Number and Date
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`PURCHASE ORDER: ${data.poNumber}`, 120, 30);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Date: ${data.date}`, 120, 40);
    this.doc.text(`Delivery Terms: ${data.deliveryTerms}`, 120, 50);
  }

  private addHRVSupplierInfo(data: PDFGenerationData): void {
    const startY = 70;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('SUPPLIER INFORMATION', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Company: ${data.supplierInfo.name}`, 20, startY + 10);
    this.doc.text(`Address: ${data.supplierInfo.address}`, 20, startY + 20);
    this.doc.text(`Country: ${data.supplierInfo.country}`, 20, startY + 30);
    this.doc.text(`Email: ${data.supplierInfo.email}`, 20, startY + 40);
    this.doc.text(`Phone: ${data.supplierInfo.phone}`, 20, startY + 50);
  }

  private addHRVCustomerInfo(data: PDFGenerationData): void {
    const startY = 70;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('CUSTOMER INFORMATION', 120, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Company: ${data.customerInfo.name}`, 120, startY + 10);
    this.doc.text(`Address: ${data.customerInfo.address}`, 120, startY + 20);
    this.doc.text(`Country: ${data.customerInfo.country}`, 120, startY + 30);
    this.doc.text(`Email: ${data.customerInfo.email}`, 120, startY + 40);
    this.doc.text(`Phone: ${data.customerInfo.phone}`, 120, startY + 50);
  }

  private addHRVPODetails(data: PDFGenerationData): void {
    const startY = 140;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ORDER DETAILS', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Order ID: ${data.orderId}`, 20, startY + 10);
    this.doc.text(`PO Number: ${data.poNumber}`, 20, startY + 20);
    this.doc.text(`Date: ${data.date}`, 20, startY + 30);
    this.doc.text(`Delivery Terms: ${data.deliveryTerms}`, 20, startY + 40);
  }

  private addHRVMaterialsTable(data: PDFGenerationData): void {
    const startY = 200;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('MATERIALS', 20, startY);
    
    // Table headers
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Material Name', 20, startY + 15);
    this.doc.text('SKU', 80, startY + 15);
    this.doc.text('Quantity', 120, startY + 15);
    this.doc.text('Unit Price', 160, startY + 15);
    this.doc.text('Total', 200, startY + 15);
    
    // Table content
    this.doc.setFont('helvetica', 'normal');
    let currentY = startY + 25;
    
    data.materials.forEach((material, index) => {
      if (currentY > 250) {
        this.doc.addPage();
        currentY = 30;
      }
      
      this.doc.text(material.name, 20, currentY);
      this.doc.text(material.sku || '-', 80, currentY);
      this.doc.text(`${material.quantity.value} ${material.quantity.unit}`, 120, currentY);
      this.doc.text(`${material.unitPrice.currency} ${material.unitPrice.amount.toFixed(2)}`, 160, currentY);
      this.doc.text(`${material.totalPrice.currency} ${material.totalPrice.amount.toFixed(2)}`, 200, currentY);
      
      currentY += 10;
    });
  }

  private addHRVTotals(data: PDFGenerationData): void {
    const startY = 280;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`TOTAL AMOUNT: ${data.totalAmount.currency} ${data.totalAmount.amount.toFixed(2)}`, 20, startY);
  }

  private addHRVTerms(data: PDFGenerationData): void {
    const startY = 300;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TERMS AND CONDITIONS', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const terms = data.terms?.split('. ') || ['Standard terms apply'];
    terms.forEach((term, index) => {
      this.doc.text(`• ${term}`, 20, startY + 15 + (index * 8));
    });
  }

  private addHRVSignatureBlock(): void {
    const startY = 350;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('AUTHORIZED SIGNATURE', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Name: _________________________', 20, startY + 20);
    this.doc.text('Title: _________________________', 20, startY + 30);
    this.doc.text('Date: _________________________', 20, startY + 40);
    this.doc.text('Signature: _____________________', 20, startY + 50);
  }

  // NHG Template Methods
  private addNHGHeader(data: PDFGenerationData): void {
    // NHG Company Header
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('NHG LIFE SCIENCES PVT. LTD.', 20, 30);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Address: [NHG Address]', 20, 40);
    this.doc.text('Phone: [NHG Phone] | Email: [NHG Email]', 20, 50);
    
    // PO Number and Date
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`PURCHASE ORDER: ${data.poNumber}`, 120, 30);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Date: ${data.date}`, 120, 40);
    this.doc.text(`Delivery Terms: ${data.deliveryTerms}`, 120, 50);
  }

  private addNHGSupplierInfo(data: PDFGenerationData): void {
    const startY = 70;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('SUPPLIER INFORMATION', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Company: ${data.supplierInfo.name}`, 20, startY + 10);
    this.doc.text(`Address: ${data.supplierInfo.address}`, 20, startY + 20);
    this.doc.text(`Country: ${data.supplierInfo.country}`, 20, startY + 30);
    this.doc.text(`Email: ${data.supplierInfo.email}`, 20, startY + 40);
    this.doc.text(`Phone: ${data.supplierInfo.phone}`, 20, startY + 50);
  }

  private addNHGCustomerInfo(data: PDFGenerationData): void {
    const startY = 70;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('CUSTOMER INFORMATION', 120, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Company: ${data.customerInfo.name}`, 120, startY + 10);
    this.doc.text(`Address: ${data.customerInfo.address}`, 120, startY + 20);
    this.doc.text(`Country: ${data.customerInfo.country}`, 120, startY + 30);
    this.doc.text(`Email: ${data.customerInfo.email}`, 120, startY + 40);
    this.doc.text(`Phone: ${data.customerInfo.phone}`, 120, startY + 50);
  }

  private addNHGPODetails(data: PDFGenerationData): void {
    const startY = 140;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ORDER DETAILS', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Order ID: ${data.orderId}`, 20, startY + 10);
    this.doc.text(`PO Number: ${data.poNumber}`, 20, startY + 20);
    this.doc.text(`Date: ${data.date}`, 20, startY + 30);
    this.doc.text(`Delivery Terms: ${data.deliveryTerms}`, 20, startY + 40);
  }

  private addNHGMaterialsTable(data: PDFGenerationData): void {
    const startY = 200;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('MATERIALS', 20, startY);
    
    // Table headers
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Material Name', 20, startY + 15);
    this.doc.text('SKU', 80, startY + 15);
    this.doc.text('Quantity', 120, startY + 15);
    this.doc.text('Unit Price', 160, startY + 15);
    this.doc.text('Total', 200, startY + 15);
    
    // Table content
    this.doc.setFont('helvetica', 'normal');
    let currentY = startY + 25;
    
    data.materials.forEach((material, index) => {
      if (currentY > 250) {
        this.doc.addPage();
        currentY = 30;
      }
      
      this.doc.text(material.name, 20, currentY);
      this.doc.text(material.sku || '-', 80, currentY);
      this.doc.text(`${material.quantity.value} ${material.quantity.unit}`, 120, currentY);
      this.doc.text(`${material.unitPrice.currency} ${material.unitPrice.amount.toFixed(2)}`, 160, currentY);
      this.doc.text(`${material.totalPrice.currency} ${material.totalPrice.amount.toFixed(2)}`, 200, currentY);
      
      currentY += 10;
    });
  }

  private addNHGTotals(data: PDFGenerationData): void {
    const startY = 280;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`TOTAL AMOUNT: ${data.totalAmount.currency} ${data.totalAmount.amount.toFixed(2)}`, 20, startY);
  }

  private addNHGTerms(data: PDFGenerationData): void {
    const startY = 300;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TERMS AND CONDITIONS', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const terms = data.terms?.split('. ') || ['Standard terms apply'];
    terms.forEach((term, index) => {
      this.doc.text(`• ${term}`, 20, startY + 15 + (index * 8));
    });
  }

  private addNHGSignatureBlock(): void {
    const startY = 350;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('AUTHORIZED SIGNATURE', 20, startY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Name: _________________________', 20, startY + 20);
    this.doc.text('Title: _________________________', 20, startY + 30);
    this.doc.text('Date: _________________________', 20, startY + 40);
    this.doc.text('Signature: _____________________', 20, startY + 50);
  }

  downloadPDF(filename: string = 'supplier-po.pdf'): void {
    this.doc.save(filename);
  }

  getPDFBlob(): Blob {
    return this.doc.output('blob');
  }

  getPDFDataURL(): string {
    return this.doc.output('dataurlstring');
  }
}

// Utility functions for PDF operations
export const generateSupplierPO = (order: Order, customData?: Partial<PDFGenerationData>, entity?: 'HRV' | 'NHG'): jsPDF => {
  const generator = new PDFGenerator();
  return generator.generateSupplierPO(order, customData, entity);
};

export const downloadSupplierPO = (order: Order, customData?: Partial<PDFGenerationData>, entity?: 'HRV' | 'NHG'): void => {
  const generator = new PDFGenerator();
  generator.generateSupplierPO(order, customData, entity);
  const entityPrefix = entity ? `${entity}_` : '';
  generator.downloadPDF(`${entityPrefix}Supplier_PO_${order.orderId}.pdf`);
};

export const previewSupplierPO = (order: Order, customData?: Partial<PDFGenerationData>, entity?: 'HRV' | 'NHG'): string => {
  const generator = new PDFGenerator();
  generator.generateSupplierPO(order, customData, entity);
  return generator.getPDFDataURL();
};
