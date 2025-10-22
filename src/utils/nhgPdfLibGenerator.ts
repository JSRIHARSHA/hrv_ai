import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import { Order, MaterialItem } from "../types";

// NHGOrderData interface
interface NHGOrderData {
  po_number: string;
  po_date: string;
  supplier_name: string;
  supplier_address: string;
  supplier_gstin: string;
  freight_name: string;
  freight_address: string;
  freight_gstin: string;
  supplier_country?: string;
  currency: string;
  line_items: Array<{
    description: string;
    hsn: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  }>;
  taxRate?: number;
}

/**
 * Generate a filled PO using NHG PO FORMAT.pdf by auto-detecting keyword anchors.
 */
export async function generateFilledPO(templateUrl: string, orderData: NHGOrderData): Promise<Blob> {
  const existingPdfBytes = await fetch(templateUrl).then((res) => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const [page] = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const textColor = rgb(0, 0, 0);

  // Helper to draw text
  const drawText = (text: string, x: number, y: number, size: number = 10) =>
    page.drawText(String(text || ""), { x, y, size, font, color: textColor });

  // Step 1: Extract text positions (anchor detection)
  const anchors = await extractKeywordPositions(page);

  // Step 2: Compute IGST (using selected tax rate) and Total
  const totalAmount = orderData.line_items.reduce((sum, i) => sum + i.amount, 0);
  const taxRate = orderData.taxRate || 0.1; // Default to 0.1% if not specified
  const igst = +(totalAmount * (taxRate / 100)).toFixed(2); // Convert percentage to decimal
  const grandTotal = +(totalAmount + igst).toFixed(2);

  // Step 3: Map anchors to values
  const fieldMap: Record<string, string> = {
    "PO No:": orderData.po_number,
    "Date:": orderData.po_date,
    "Supplier Name:": orderData.supplier_name,
    "Supplier Address:": orderData.supplier_address,
    "GSTIN:": orderData.supplier_gstin,
    "Freight Forwarder:": orderData.freight_name,
    "Freight Address:": orderData.freight_address,
    "Freight GSTIN:": orderData.freight_gstin,
    "Country of Origin:": orderData.supplier_country || 'India',
    "Transaction Currency:": orderData.currency,
    "IGST:": `Rs.${igst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    "Total:": `Rs.${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  };

  // Step 4: Write values beside detected anchors
  const offsetX = 60; // how far to the right of keyword
  Object.entries(anchors).forEach(([label, { x, y }]) => {
    if (fieldMap[label]) drawText(fieldMap[label], x + offsetX, y);
  });

  // Step 5: Write line items (below "Description" header if found)
  const descAnchor = anchors["Description"] || { x: 80, y: 470 };
  let currentY = descAnchor.y - 20;
  const gap = 15;
  orderData.line_items.forEach((item, i) => {
    drawText(String(i + 1), descAnchor.x - 20, currentY);
    drawText(item.description, descAnchor.x, currentY);
    drawText(item.hsn, descAnchor.x + 220, currentY);
    drawText(String(item.quantity), descAnchor.x + 300, currentY);
    drawText(item.unit, descAnchor.x + 345, currentY);
    drawText(item.rate.toFixed(2), descAnchor.x + 400, currentY);
    drawText(item.amount.toFixed(2), descAnchor.x + 470, currentY);
    currentY -= gap;
  });

  // Step 6: Save and return blob
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  
  return blob;
}

/**
 * Extract keyword positions from a page (for anchor mapping).
 * Since pdf-lib doesn't support getTextContent(), we'll use predefined positions.
 */
async function extractKeywordPositions(page: any): Promise<Record<string, { x: number; y: number }>> {
  // Since pdf-lib doesn't support text extraction, we'll use predefined positions
  // based on the NHG PO FORMAT template layout
  const anchors: Record<string, { x: number; y: number }> = {
    "PO No:": { x: 50, y: 750 },
    "Date:": { x: 50, y: 730 },
    "Supplier Name:": { x: 50, y: 680 },
    "Supplier Address:": { x: 50, y: 665 },
    "GSTIN:": { x: 50, y: 650 },
    "Freight Forwarder:": { x: 50, y: 620 },
    "Freight Address:": { x: 50, y: 605 },
    "Freight GSTIN:": { x: 50, y: 590 },
    "Country of Origin:": { x: 450, y: 680 },
    "Transaction Currency:": { x: 450, y: 665 },
    "Description": { x: 80, y: 520 },
    "IGST:": { x: 400, y: 200 },
    "Total:": { x: 400, y: 185 },
  };

  return anchors;
}

// Download the filled PO
export async function downloadFilledPO(templateUrl: string, orderData: NHGOrderData, filename?: string): Promise<void> {
  const blob = await generateFilledPO(templateUrl, orderData);
  saveAs(blob, filename || `PO_${orderData.po_number}.pdf`);
}

// Preview the filled PO (returns data URL for iframe)
export async function previewFilledPO(templateUrl: string, orderData: NHGOrderData): Promise<string> {
  const blob = await generateFilledPO(templateUrl, orderData);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// Convert Order to NHGOrderData
export function convertOrderToNHGData(order: Order, taxRate: number = 0.1): NHGOrderData {
  return {
    po_number: order.poNumber || `NHG${Date.now()}`,
    po_date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
    supplier_name: order.supplier?.name || 'N/A',
    supplier_address: order.supplier?.address || 'N/A',
    supplier_gstin: order.supplier?.gstin || 'N/A',
    freight_name: order.freightHandler?.name || 'N/A',
    freight_address: order.freightHandler?.address || 'N/A',
    freight_gstin: order.freightHandler?.gstin || 'N/A',
    supplier_country: order.supplier?.country || 'India',
    currency: order.priceFromSupplier.currency,
    line_items: order.materials.map(material => ({
      description: material.name,
      hsn: material.hsn || 'N/A',
      quantity: material.quantity.value,
      unit: material.quantity.unit,
      rate: material.unitPrice.amount,
      amount: material.totalPrice.amount
    })),
    taxRate: taxRate,
  };
}

// Preview NHG PO from Order (main function to be used in components)
export async function previewNHGPOFromOrder(order: Order, taxRate: number = 0.1): Promise<string> {
  const templateUrl = '/NHG_PO_FORMAT.pdf';
  const orderData = convertOrderToNHGData(order, taxRate);
  return await previewFilledPO(templateUrl, orderData);
}
