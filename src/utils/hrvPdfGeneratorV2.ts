import jsPDF from 'jspdf';
import { Order } from '../types';

export interface HRVOrderData {
  po_number: string;
  po_date: string;
  supplier_name: string;
  supplier_address: string;
  supplier_gstin: string;
  freight_name: string;
  freight_address: string;
  freight_gstin: string;
  currency: string;
  line_items: Array<{
    description: string;
    hsn: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  }>;
}

export class HRVPDFGeneratorV2 {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
  }

  /**
   * Replicates the HRV PO FORMAT.pdf template and fills it with order data.
   * Includes Freight Forwarder details and IGST calculation.
   */
  fillPOTemplate(orderData: HRVOrderData): jsPDF {
    // Step 1: Create new PDF document
    this.doc = new jsPDF();
    
    // Step 2: Define text color & size
    const textColor = [0, 0, 0]; // Black color
    const fontSize = 10;

    // Step 3: Define field positions (matching Python code coordinates)
    const positions = {
      po_number: { x: 410, y: 150 },
      po_date: { x: 500, y: 150 },

      supplier_name: { x: 100, y: 220 },
      supplier_address: { x: 100, y: 240 },
      supplier_gstin: { x: 100, y: 260 },

      // Freight Forwarder Section (below supplier)
      freight_name: { x: 100, y: 300 },
      freight_address: { x: 100, y: 320 },
      freight_gstin: { x: 100, y: 340 },

      // Line items start area
      item_description: { x: 90, y: 420 },
      hsn_code: { x: 300, y: 420 },
      quantity: { x: 380, y: 420 },
      unit: { x: 420, y: 420 },
      rate: { x: 470, y: 420 },
      amount: { x: 540, y: 420 },

      // Totals section
      igst: { x: 520, y: 660 },
      total: { x: 520, y: 700 },
      currency: { x: 200, y: 720 },
    };

    // Step 4: Write static order fields
    this.doc.setFontSize(11);
    this.doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    this.doc.text(`PO No: ${orderData.po_number}`, positions.po_number.x, positions.po_number.y);
    this.doc.text(`Date: ${orderData.po_date}`, positions.po_date.x, positions.po_date.y);

    // Supplier Info
    this.doc.setFontSize(fontSize);
    this.doc.text(orderData.supplier_name, positions.supplier_name.x, positions.supplier_name.y);
    this.doc.text(orderData.supplier_address, positions.supplier_address.x, positions.supplier_address.y);
    this.doc.text(`GSTIN: ${orderData.supplier_gstin}`, positions.supplier_gstin.x, positions.supplier_gstin.y);

    // Freight Forwarder Info
    this.doc.text(`Freight Forwarder: ${orderData.freight_name}`, positions.freight_name.x, positions.freight_name.y);
    this.doc.text(orderData.freight_address, positions.freight_address.x, positions.freight_address.y);
    this.doc.text(`GSTIN: ${orderData.freight_gstin}`, positions.freight_gstin.x, positions.freight_gstin.y);

    // Step 5: Write line item(s)
    const startY = 420;
    const lineGap = 22;
    
    orderData.line_items.forEach((item, i) => {
      const y = startY + i * lineGap;
      this.doc.text(item.description, positions.item_description.x, y);
      this.doc.text(item.hsn, positions.hsn_code.x, y);
      this.doc.text(item.quantity.toString(), positions.quantity.x, y);
      this.doc.text(item.unit, positions.unit.x, y);
      this.doc.text(item.rate.toFixed(2), positions.rate.x, y);
      this.doc.text(item.amount.toFixed(2), positions.amount.x, y);
    });

    // Step 6: Calculate IGST (0.1%) and Total
    const totalAmount = orderData.line_items.reduce((sum, item) => sum + item.amount, 0);
    const igst = Math.round(totalAmount * 0.001 * 100) / 100; // Round to 2 decimal places
    const grandTotal = Math.round((totalAmount + igst) * 100) / 100;

    // Step 7: Write totals
    this.doc.text(`IGST (0.1%): ₹${igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 
                  positions.igst.x, positions.igst.y);
    this.doc.text(`Total: ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 
                  positions.total.x, positions.total.y);
    this.doc.text(`Currency: ${orderData.currency}`, positions.currency.x, positions.currency.y);

    console.log(`✅ New filled PO generated`);
    console.log(`📊 Calculated IGST: ₹${igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Total: ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);

    return this.doc;
  }

  /**
   * Convert Order data to HRVOrderData format
   */
  convertOrderToHRVData(order: Order): HRVOrderData {
    return {
      po_number: order.poNumber || `HRVPOR${new Date().getFullYear()}-${String(order.orderId).slice(-4)}`,
      po_date: new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      supplier_name: order.supplier?.name || 'N/A',
      supplier_address: order.supplier?.address || 'N/A',
      supplier_gstin: order.supplier?.gstin || 'N/A',
      freight_name: order.freightHandler?.name || 'N/A',
      freight_address: order.freightHandler?.address || 'N/A',
      freight_gstin: order.freightHandler?.gstin || 'N/A',
      currency: order.priceFromSupplier.currency || 'INR',
      line_items: order.materials.map(material => ({
        description: material.name,
        hsn: material.hsn || 'N/A',
        quantity: material.quantity.value,
        unit: material.quantity.unit,
        rate: material.unitPrice.amount,
        amount: material.totalPrice.amount
      }))
    };
  }

  /**
   * Generate PDF from Order object
   */
  generateFromOrder(order: Order): jsPDF {
    const hrvData = this.convertOrderToHRVData(order);
    return this.fillPOTemplate(hrvData);
  }

  downloadPDF(filename: string = 'hrv-po-filled.pdf'): void {
    this.doc.save(filename);
  }

  getPDFDataURL(): string {
    return this.doc.output('dataurlstring');
  }
}

// Utility functions
export const generateHRVPOFromOrder = (order: Order): jsPDF => {
  const generator = new HRVPDFGeneratorV2();
  return generator.generateFromOrder(order);
};

export const downloadHRVPOFromOrder = (order: Order, filename?: string): void => {
  const generator = new HRVPDFGeneratorV2();
  generator.generateFromOrder(order);
  generator.downloadPDF(filename || `HRV_PO_${order.orderId}.pdf`);
};

export const previewHRVPOFromOrder = (order: Order): string => {
  const generator = new HRVPDFGeneratorV2();
  generator.generateFromOrder(order);
  return generator.getPDFDataURL();
};

// Example usage function (for testing)
export const createSampleHRVOrder = (): HRVOrderData => {
  return {
    po_number: "HRVPOR2526-0106",
    po_date: "06 Oct 2025",
    supplier_name: "Indovedic Nutrients Pvt. Ltd.",
    supplier_address: "Plot No.12, 2nd Phase, KIADB Industrial Area, Tumkur, Karnataka",
    supplier_gstin: "29AACCI8313B1ZU",
    freight_name: "BlueDart Logistics Ltd.",
    freight_address: "Cargo Zone, Hyderabad Airport, Telangana, India",
    freight_gstin: "36AABCD3456K1ZT",
    currency: "INR",
    line_items: [
      {
        description: "Ubidecarenone (CO ENZYME Q 10)",
        hsn: "29146200",
        quantity: 300,
        unit: "kg",
        rate: 14750.30,
        amount: 4425090.00
      }
    ]
  };
};
