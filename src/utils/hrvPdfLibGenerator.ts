import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import { Order } from '../types';

// Interface for HRV Order Data
interface HRVOrderData {
  po_number: string;
  po_date: string;
  manufacturer_vendor: string; // Combined: name, address, gstin
  supplier_country?: string;
  freight_forwarder: string; // Combined: name, address, gstin
  line_items: Array<{
    description: string;
    itemDescription?: string; // Item description to show below material name
    hsn: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  }>;
  currency: string;
  taxRate?: number;
  terms?: string;
  terms_of_delivery?: string;
  terms_and_conditions?: string; // Terms and conditions text
  adjustment?: number; // Adjustment value (+/-)
}

/**
 * Convert number to words (Indian numbering system)
 * @param num The number to convert
 * @returns The number in words
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return ones[hundred] + ' Hundred' + (rest > 0 ? ' ' + convertLessThanThousand(rest) : '');
  }
  
  // Handle negative numbers
  const isNegative = num < 0;
  num = Math.abs(num);
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = num.toFixed(2).split('.');
  const integer = parseInt(integerPart);
  const decimal = parseInt(decimalPart);
  
  let result = '';
  
  if (integer === 0) {
    result = 'Zero';
  } else {
    // Indian numbering: Crores, Lakhs, Thousands, Hundreds
    const crore = Math.floor(integer / 10000000);
    const lakh = Math.floor((integer % 10000000) / 100000);
    const thousand = Math.floor((integer % 100000) / 1000);
    const hundred = integer % 1000;
    
    if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
    if (hundred > 0) result += convertLessThanThousand(hundred);
    
    result = result.trim();
  }
  
  // Add decimal part (paise) if present
  if (decimal > 0) {
    result += ' and ' + convertLessThanThousand(decimal) + ' Paise';
  }
  
  return (isNegative ? 'Minus ' : '') + result + ' Only';
}

/**
 * Split address into multiple lines
 * Wraps text to fit approximately half page width (50-55 chars per line)
 * @param address Full address string
 * @param maxLines Maximum number of lines (default 4)
 * @param maxCharsPerLine Maximum characters per line (default 50 for half page width)
 */
function splitAddressIntoLines(address: string, maxLines: number = 4, maxCharsPerLine: number = 50): string[] {
  if (!address) return [];
  
  // Split by common delimiters (comma, semicolon)
  const parts = address.split(/[,;]+/).map(p => p.trim()).filter(p => p.length > 0);
  
  if (parts.length === 0) return [];
  
  // Build lines by adding parts until character limit is reached
  const lines: string[] = [];
  let currentLine = '';
  
  for (const part of parts) {
    const testLine = currentLine ? `${currentLine}, ${part}` : part;
    
    // Check if adding this part would exceed the character limit
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      // Current line is full, save it and start a new line
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = part;
      
      // If we've reached max lines, stop adding new lines
      if (lines.length >= maxLines - 1) {
        // Add any remaining parts to the last line
        break;
      }
    }
  }
  
  // Add the last line
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * Generate a filled PO using HRV PO FORMAT.pdf by auto-detecting keyword anchors.
 */
export async function generateFilledPO(templateUrl: string, orderData: HRVOrderData, order?: Order): Promise<Blob> {
  try {
    console.log('Starting PDF generation with template:', templateUrl);
    console.log('Order data:', orderData);
    
    const existingPdfBytes = await fetch(templateUrl).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch template: ${res.statusText}`);
      return res.arrayBuffer();
    });
    
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const [page] = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const textColor = rgb(0, 0, 0);

    // Helper to draw text with error handling
    const drawText = (text: string, x: number, y: number, size: number = 10) => {
      try {
        const textStr = String(text || "");
        page.drawText(textStr, { x, y, size, font, color: textColor });
      } catch (err) {
        console.error(`Error drawing text "${text}" at (${x}, ${y}):`, err);
        throw err;
      }
    };

  // Step 1: Extract text positions (anchor detection)
  const anchors = await extractKeywordPositions(page);

  // Helper function to format amounts with thousands separator based on currency (same as OrderDetailPage)
  const formatAmount = (amount: number, currency: string = 'USD'): string => {
    if (currency === 'INR') {
      return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  // Step 2: Compute taxes (SGST/CGST or IGST) based on supplier GSTIN and Total
  const totalAmount = orderData.line_items.reduce((sum, i) => sum + i.amount, 0);
  
  // Check if supplier GSTIN starts with "36" (Telangana)
  const supplierGSTIN = order?.supplier?.gstin || '';
  const isTelanganaSupplier = supplierGSTIN.startsWith('36');
  
  interface TaxEntry {
    rate: number;
    amount: number;
  }
  const sgstEntries: TaxEntry[] = [];
  const cgstEntries: TaxEntry[] = [];
  const igstEntries: TaxEntry[] = [];
  let totalSGST = 0;
  let totalCGST = 0;
  let totalIGST = 0;
  
  if (order && order.materials) {
    // Group by tax rate to combine amounts with same rate
    const taxRateMap = new Map<number, number>();
    
    order.materials.forEach((material, index) => {
      const taxRate = (material as any).supplierTaxRate;
      if (taxRate !== undefined && taxRate !== null && taxRate !== 0) {
        const itemAmount = orderData.line_items[index]?.amount || 0;
        
        if (isTelanganaSupplier) {
          // Calculate CGST and SGST (split tax rate)
          const halfTaxRate = taxRate / 2;
          const sgstAmount = +(itemAmount * (halfTaxRate / 100)).toFixed(2);
          const cgstAmount = +(itemAmount * (halfTaxRate / 100)).toFixed(2);
          
          // Accumulate amounts by tax rate
          const existingSGST = taxRateMap.get(halfTaxRate) || 0;
          taxRateMap.set(halfTaxRate, existingSGST + sgstAmount);
          
          totalSGST += sgstAmount;
          totalCGST += cgstAmount;
        } else {
          // Calculate IGST (full tax rate)
          const igstAmount = +(itemAmount * (taxRate / 100)).toFixed(2);
          
          // Accumulate amounts by tax rate
          const existingIGST = taxRateMap.get(taxRate) || 0;
          taxRateMap.set(taxRate, existingIGST + igstAmount);
          
          totalIGST += igstAmount;
        }
      }
    });
    
    // Convert map to sorted array of entries
    const sortedRates = Array.from(taxRateMap.entries()).sort((a, b) => a[0] - b[0]);
    if (isTelanganaSupplier) {
      sortedRates.forEach(([rate, amount]) => {
        sgstEntries.push({ rate, amount });
        cgstEntries.push({ rate, amount }); // CGST amount is same as SGST
      });
    } else {
      sortedRates.forEach(([rate, amount]) => {
        igstEntries.push({ rate, amount });
      });
    }
  }
  
  // If no materials have tax, use the old taxRate as fallback (for backward compatibility)
  if (isTelanganaSupplier && totalSGST === 0 && totalCGST === 0) {
    const taxRate = orderData.taxRate || 18;
    const halfTaxRate = taxRate / 2;
    const sgstAmount = +(totalAmount * (halfTaxRate / 100)).toFixed(2);
    const cgstAmount = +(totalAmount * (halfTaxRate / 100)).toFixed(2);
    totalSGST = sgstAmount;
    totalCGST = cgstAmount;
    sgstEntries.push({ rate: halfTaxRate, amount: sgstAmount });
    cgstEntries.push({ rate: halfTaxRate, amount: cgstAmount });
  } else if (!isTelanganaSupplier && totalIGST === 0) {
    const taxRate = orderData.taxRate || 18;
    const igstAmount = +(totalAmount * (taxRate / 100)).toFixed(2);
    totalIGST = igstAmount;
    igstEntries.push({ rate: taxRate, amount: igstAmount });
  }
  
  const adjustmentValue = orderData.adjustment || 0;
  console.log('Supplier GSTIN:', supplierGSTIN, 'Is Telangana:', isTelanganaSupplier);
  console.log('Total SGST:', totalSGST, 'Total CGST:', totalCGST, 'Total IGST:', totalIGST);
  const grandTotal = isTelanganaSupplier 
    ? +(totalAmount + totalSGST + totalCGST + adjustmentValue).toFixed(2)
    : +(totalAmount + totalIGST + adjustmentValue).toFixed(2);

  // Step 3: Map anchors to values
  const fieldMap: Record<string, string> = {
      "PO No.": orderData.po_number,
      "Date": orderData.po_date,
      "Terms": orderData.terms || 'As per agreement',
      "Manufacturer/Vendor": orderData.manufacturer_vendor,
      "Freight Forwarder": orderData.freight_forwarder,
      "Country of Origin": orderData.supplier_country || 'India',
      "Country of Beneficiary": orderData.supplier_country || 'India',
      "Transaction Currency": `${orderData.currency} - ${orderData.currency === 'INR' ? 'Indian Rupee' : orderData.currency}`,
      "Terms of Delivery": orderData.terms_of_delivery || "Free Delivery to Warehouse", // From dialog or default value
      "Sub-Total": formatAmount(totalAmount, orderData.currency),
      // Note: SGST and CGST will be written separately below (multiple lines)
      "SGST": '', // Will be written separately for each tax rate
      "SGST Amount": '', // Will be written separately for each tax rate
      "CGST": '', // Will be written separately for each tax rate
      "CGST Amount": '', // Will be written separately for each tax rate
      // IGST and IGST Amount removed - not displayed (only SGST and CGST are shown)
      "IGST": '', // Removed - not displayed
      "IGST Amount": '', // Removed - not displayed
      "Adjustment Label": "Adjustment",
      "Adjustment": formatAmount(adjustmentValue, orderData.currency),
      "Total": formatAmount(grandTotal, orderData.currency),
      "Amount in words": numberToWords(grandTotal),
    };
    
    console.log('Field map:', fieldMap);
    console.log('Amount in words:', numberToWords(grandTotal));

    // Step 4: Write values at exact positions (no offset needed)
    console.log('Writing field values...');
    Object.entries(anchors).forEach(([label, { x, y }]) => {
      // Explicitly skip IGST and IGST Amount - they should not be displayed
      if (label === "IGST" || label === "IGST Amount") return;
      
      if (fieldMap[label]) {
        // Skip multi-line fields and labels with custom font sizes (will be handled separately)
        if (label === "Manufacturer/Vendor" || label === "Freight Forwarder" || label === "Terms of Delivery" || label === "Terms" || label === "SGST" || label === "CGST" || label === "Adjustment Label" || label === "Amount in words") return;
        
        console.log(`Writing ${label}: "${fieldMap[label]}" at (${x}, ${y})`);
        drawText(fieldMap[label], x, y);
      }
    });
    
    // Step 4.3: Write Terms (payment terms - properly split into 2 lines)
    const termsAnchor = anchors["Terms"];
    if (termsAnchor && fieldMap["Terms"]) {
      const termsText = fieldMap["Terms"];
      console.log('Terms text to write:', termsText);
      // Conservative char limit based on box width (page width 595.42 - x position 462.49 = ~133pts available)
      // At 9pt font, ~5-6pts per char, so max ~20 chars to be safe
      const maxCharsPerLine = 20; // Max characters per line to fit in box at 9pt
      const fontSize = 9; // Increased font size for better readability
      
      if (termsText.length > maxCharsPerLine) {
        // Split into 2 lines by adding words until we reach limit
        const words = termsText.split(' ');
        let line1 = '';
        let line2 = '';
        
        for (const word of words) {
          // Once we start adding to line2, keep adding to line2
          if (line2) {
            line2 += ' ' + word;
          } else {
            const testLine1 = line1 + (line1 ? ' ' : '') + word;
            
            // Add to line1 only if it doesn't exceed the character limit
            if (testLine1.length <= maxCharsPerLine) {
              line1 = testLine1;
            } else {
              // Start line2
              line2 = word;
            }
          }
        }
        
        console.log(`Terms Line 1: "${line1}" (${line1.length} chars)`);
        console.log(`Terms Line 2: "${line2}" (${line2.length} chars)`);
        
        drawText(line1, termsAnchor.x, termsAnchor.y, fontSize);
        if (line2) {
          drawText(line2, termsAnchor.x, termsAnchor.y - 12, fontSize); // 12 points below for better separation
        }
      } else {
        drawText(termsText, termsAnchor.x, termsAnchor.y, fontSize);
      }
    }
    
    // Step 4.4: Write Terms of Delivery (split into 2 lines if needed)
    const deliveryAnchor = anchors["Terms of Delivery"];
    if (deliveryAnchor && fieldMap["Terms of Delivery"]) {
      const deliveryText = fieldMap["Terms of Delivery"];
      const maxCharsPerLine = 20; // Max characters per line to fit in box
      
      if (deliveryText.length > maxCharsPerLine) {
        // Split into 2 lines with proper word wrapping
        const words = deliveryText.split(' ');
        let line1 = '';
        let line2 = '';
        let line1Complete = false;
        
        for (const word of words) {
          if (!line1Complete) {
            // Try to add word to line1
            const testLine = line1 ? `${line1} ${word}` : word;
            if (testLine.length <= maxCharsPerLine) {
              line1 = testLine;
            } else {
              // Line1 is full, start line2
              line1Complete = true;
              line2 = word;
            }
          } else {
            // Add remaining words to line2
            line2 = line2 ? `${line2} ${word}` : word;
          }
        }
        
        console.log('Terms of Delivery Line 1:', line1);
        console.log('Terms of Delivery Line 2:', line2);
        
        drawText(line1, deliveryAnchor.x, deliveryAnchor.y);
        if (line2) {
          drawText(line2, deliveryAnchor.x, deliveryAnchor.y - 10); // 10 points below
        }
      } else {
        drawText(deliveryText, deliveryAnchor.x, deliveryAnchor.y);
      }
    }
    
    // Step 4.5: Write taxes (SGST/CGST or IGST) and Adjustment Label with reduced font size
    const igstAnchor = anchors["IGST"] || anchors["SGST"];
    const igstAmountAnchor = anchors["IGST Amount"] || anchors["SGST Amount"];
    let gstCurrentY = (igstAnchor?.y || 0) + 19.5; // Move up by 19.5 points (15 + 2 + 1 + 1.5 = 19.5)
    const lineHeight = 10; // Vertical spacing between lines (reduced for tighter spacing)
    const gstFontSize = 8; // Reduced font size from 9pt to 8pt (for both labels and values)
    
    if (isTelanganaSupplier) {
      // Write SGST entries (one line per tax rate)
      sgstEntries.forEach((entry) => {
        const sgstLabel = `SGST ${entry.rate}%`;
        if (igstAnchor) {
          drawText(sgstLabel, igstAnchor.x, gstCurrentY, gstFontSize);
        }
        if (igstAmountAnchor) {
          drawText(formatAmount(entry.amount, orderData.currency), igstAmountAnchor.x, gstCurrentY, gstFontSize);
        }
        gstCurrentY -= lineHeight;
      });
      
      // Write CGST entries (one line per tax rate, below SGST)
      cgstEntries.forEach((entry) => {
        const cgstLabel = `CGST ${entry.rate}%`;
        if (igstAnchor) {
          drawText(cgstLabel, igstAnchor.x, gstCurrentY, gstFontSize);
        }
        if (igstAmountAnchor) {
          drawText(formatAmount(entry.amount, orderData.currency), igstAmountAnchor.x, gstCurrentY, gstFontSize);
        }
        gstCurrentY -= lineHeight;
      });
    } else {
      // Write IGST entries (one line per tax rate)
      igstEntries.forEach((entry) => {
        const igstLabel = `IGST ${entry.rate}%`;
        if (igstAnchor) {
          drawText(igstLabel, igstAnchor.x, gstCurrentY, gstFontSize);
        }
        if (igstAmountAnchor) {
          drawText(formatAmount(entry.amount, orderData.currency), igstAmountAnchor.x, gstCurrentY, gstFontSize);
        }
        gstCurrentY -= lineHeight;
      });
    }
    
    const adjustmentLabelAnchor = anchors["Adjustment Label"];
    if (adjustmentLabelAnchor && fieldMap["Adjustment Label"]) {
      drawText(fieldMap["Adjustment Label"], adjustmentLabelAnchor.x, adjustmentLabelAnchor.y, 9);
    }
    
    // Step 4.6: Write Amount in words (multi-line if needed, 9pt font)
    const amountInWordsAnchor = anchors["Amount in words"];
    if (amountInWordsAnchor && fieldMap["Amount in words"]) {
      const amountText = fieldMap["Amount in words"];
      const maxCharsPerLine = 60; // Wider for amount in words section
      const fontSize = 9;
      const lineGap = 11; // Spacing between lines
      
      // Split text into lines if too long
      const words = amountText.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if (testLine.length <= maxCharsPerLine) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      // Draw each line
      lines.forEach((line, index) => {
        drawText(line, amountInWordsAnchor.x, amountInWordsAnchor.y - (index * lineGap), fontSize);
      });
    }
    
    // Step 4.7: Write multi-line Manufacturer/Vendor
    const vendorAnchor = anchors["Manufacturer/Vendor"];
    if (vendorAnchor && order && order.supplier) {
      const lineHeight = 12; // Increased space between lines for better readability
      drawText(order.supplier.name, vendorAnchor.x, vendorAnchor.y);
      
      // Split address into up to 4 lines, max 50 chars per line (half page width)
      const addressParts = splitAddressIntoLines(order.supplier.address, 4, 50);
      addressParts.forEach((part, index) => {
        drawText(part, vendorAnchor.x, vendorAnchor.y - ((index + 1) * lineHeight));
      });
      
      // Add GSTIN below address if available
      if (order.supplier.gstin) {
        drawText(`GSTIN: ${order.supplier.gstin}`, vendorAnchor.x, vendorAnchor.y - ((addressParts.length + 1) * lineHeight));
      }
    } else if (vendorAnchor) {
      // Fallback to combined string from orderData
      drawText(orderData.manufacturer_vendor, vendorAnchor.x, vendorAnchor.y);
    }
    
    // Step 4.6: Write multi-line Freight Forwarder
    const freightAnchor = anchors["Freight Forwarder"];
    if (freightAnchor && order?.freightHandler) {
      const lineHeight = 12; // Increased space between lines for better readability
      drawText(order.freightHandler.name, freightAnchor.x, freightAnchor.y);
      
      // Split address into up to 4 lines, max 50 chars per line (half page width)
      const addressParts = splitAddressIntoLines(order.freightHandler.address, 4, 50);
      addressParts.forEach((part, index) => {
        drawText(part, freightAnchor.x, freightAnchor.y - ((index + 1) * lineHeight));
      });
      
      // Add GSTIN below address if available
      if (order.freightHandler.gstin) {
        drawText(`GSTIN: ${order.freightHandler.gstin}`, freightAnchor.x, freightAnchor.y - ((addressParts.length + 1) * lineHeight));
      }
    } else if (freightAnchor) {
      // Fallback to combined string from orderData
      drawText(orderData.freight_forwarder, freightAnchor.x, freightAnchor.y);
    }

    // Step 5: Write line items (with flipped Y coordinates)
    console.log('Writing line items...');
    const descAnchor = anchors["Item & Description"] || { x: 79.5, y: 401.50 };
    const hsnAnchor = anchors["HSN"] || { x: 318.15, y: 401.50 };
    const qtyAnchor = anchors["Qty"] || { x: 394.46, y: 401.50 };
    const rateAnchor = anchors["Rate"] || { x: 457.76, y: 401.50 };
    const amountAnchor = anchors["Amount"] || { x: 522.34, y: 401.50 };
    
    // First line item starts 27.23 points BELOW header (in flipped coords, subtract from y)
    // From extracted PDF: line item at y=467.42, header at y=440.19, difference = 27.23
    // In flipped coords: header is at 401.50, so first item should be at 401.50 - 27.23 = 374.27
    let currentY = descAnchor.y - 27.23; // 374.27
    const lineGap = 9.22; // Gap between line items
    
    orderData.line_items.forEach((item, i) => {
      // Serial number slightly to the left of description
      drawText(String(i + 1), descAnchor.x - 23, currentY);
      drawText(item.description, descAnchor.x, currentY);
      
      // Draw item description below material name in smaller font if it exists
      if (item.itemDescription) {
        const smallFontSize = 8; // Smaller font size for item description
        try {
          const textStr = String(item.itemDescription || "");
          page.drawText(textStr, { 
            x: descAnchor.x, 
            y: currentY - 7, // Position below material name with more spacing
            size: smallFontSize, 
            font, 
            color: textColor 
          });
        } catch (err) {
          console.error(`Error drawing item description "${item.itemDescription}":`, err);
        }
      }
      
      // Only render HSN if it exists (exclude for freight charges)
      if (item.hsn) {
        drawText(item.hsn, hsnAnchor.x, currentY);
      }
      
      // Only render quantity and unit if quantity > 0 (exclude for freight charges)
      if (item.quantity > 0) {
        drawText(`${item.quantity.toFixed(2)}`, qtyAnchor.x, currentY);
        if (item.unit) {
          drawText(item.unit, qtyAnchor.x, currentY - lineGap); // Unit on next line (subtract in flipped coords)
        }
      }
      
      drawText(formatAmount(item.rate, orderData.currency), rateAnchor.x, currentY);
      drawText(formatAmount(item.amount, orderData.currency), amountAnchor.x, currentY);
      currentY -= lineGap * 2; // Move down (subtract in flipped coordinate system)
    });

    // Step 6: Write Terms and Conditions (multi-line text below Terms and Conditions anchor)
    const tcAnchor = anchors["Terms and Conditions"];
    if (tcAnchor && orderData.terms_and_conditions) {
      const tcLines = orderData.terms_and_conditions.split('\n');
      let tcY = tcAnchor.y - 12; // Start 12 points below the anchor
      const tcLineHeight = 10; // Space between condition lines
      const tcFontSize = 8; // Slightly smaller font for readability
      
      tcLines.forEach((line, index) => {
        if (line.trim()) {
          drawText(line.trim(), tcAnchor.x, tcY, tcFontSize);
          tcY -= tcLineHeight; // Move down for next line
        }
      });
    }

    // Step 7: Save and return blob
    console.log('Saving PDF...');
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    console.log('PDF generated successfully');
  
  return blob;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Extract keyword positions from a page (for anchor mapping).
 * Since pdf-lib doesn't support getTextContent(), we'll use predefined positions.
 */
async function extractKeywordPositions(page: any): Promise<Record<string, { x: number; y: number }>> {
  // Coordinates extracted from actual HRV PO FORMAT PDF
  // Y coordinates are flipped (PDF origin is bottom-left: y = 841.69 - extracted_y)
  const pageHeight = 841.69;
  const anchors: Record<string, { x: number; y: number }> = {
    "PO No.": { x: 462.49, y: pageHeight - 201.5 },    // 648.25
    "Date": { x: 462.49, y: pageHeight - 219 },       // 629.27
    "Terms": { x: 462.49, y: pageHeight - 238 },      // 605.68
    "Country of Origin": { x: 462.49, y: pageHeight - 277 },      // 570.85
    "Country of Beneficiary": { x: 462.49, y: pageHeight - 296 }, // 551.87
    "Transaction Currency": { x: 462.49, y: pageHeight - 315 },   // 532.90
    "Terms of Delivery": { x: 462.49, y: pageHeight - 336 },      // 509.31
    "Manufacturer/Vendor": { x: 45.6, y: pageHeight - 206.89 },      // 635.80
    "Freight Forwarder": { x: 45.6, y: pageHeight - 301 },        // 509.61
    "Item & Description": { x: 79.5, y: pageHeight - 443.19 },       // 401.50
    "HSN": { x: 301, y: pageHeight - 443.19 },                    // 401.50
    "Qty": { x: 385, y: pageHeight - 443.19 },                    // 401.50
    "Rate": { x: 442, y: pageHeight - 443.19 },                   // 401.50
    "Amount": { x: 502, y: pageHeight - 443.19 },                 // 401.50
    "Sub-Total": { x: 504.66, y: pageHeight - 538 },              // 303.69
    "IGST": { x: 417, y: pageHeight - 570 },                      // 271.69 - Tax rate label (aligned with Sub-Total label)
    "IGST Amount": { x: 504.66, y: pageHeight - 570 },            // 271.69 - Tax amount (aligned with Sub-Total amount)
    "Adjustment Label": { x: 417, y: pageHeight - 590 },          // 251.69 - Adjustment label (aligned with IGST label)
    "Adjustment": { x: 504.66, y: pageHeight - 590 },             // 251.69 - Adjustment amount (aligned with amounts)
    "Total": { x: 493.34, y: pageHeight - 613 },                  // 228.69
    "Amount in words": { x: 120.74, y: pageHeight - 532 },        // 316.60
    "Terms and Conditions": { x: 45.6, y: pageHeight - 665.19 }      // 176.50
  };

  return anchors;
}

// Download the filled PO
export async function downloadFilledPO(templateUrl: string, orderData: HRVOrderData, filename?: string, order?: Order): Promise<void> {
  const blob = await generateFilledPO(templateUrl, orderData, order);
  saveAs(blob, filename || `PO_${orderData.po_number}.pdf`);
}

// Preview the filled PO (returns data URL for iframe display)
export async function previewFilledPO(templateUrl: string, orderData: HRVOrderData, order?: Order): Promise<string> {
  const blob = await generateFilledPO(templateUrl, orderData, order);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// Convert Order to HRVOrderData format
export function convertOrderToHRVData(order: Order, taxRate?: number, termsAndConditions?: string): HRVOrderData {
  // Use tax rate from materials if not provided
  const materialTaxRate = order.materials[0]?.taxRate || 18;
  const finalTaxRate = taxRate !== undefined ? taxRate : materialTaxRate;
  
  // Combine supplier information into single field
  const manufacturerVendor = order.supplier ? [
    order.supplier?.name || '',
    order.supplier?.address || '',
    order.supplier?.gstin ? `GSTIN: ${order.supplier.gstin}` : ''
  ].filter(Boolean).join(', ') : 'N/A';
  
  // Combine freight handler information into single field
  const freightForwarder = order.freightHandler ? [
    order.freightHandler.name,
    order.freightHandler.address,
    order.freightHandler.gstin ? `GSTIN: ${order.freightHandler.gstin}` : ''
  ].filter(Boolean).join(', ') : 'N/A';
  
  return {
    po_number: order.poNumber || order.orderId,
    po_date: new Date(order.createdAt).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }),
    manufacturer_vendor: manufacturerVendor,
    supplier_country: order.supplier?.country || 'N/A',
    freight_forwarder: freightForwarder,
    line_items: order.materials.map(material => {
      const qty = material.quantity.value || 0;
      const supplierRate = material.supplierUnitPrice?.amount || 0;
      const amount = +(supplierRate * qty).toFixed(2);
      
      // Check if this is a freight charges row (case insensitive)
      const isFreightCharges = material.name.toLowerCase().trim() === 'freight charges';
      
      // Use material-level HSN, or fall back to order-level HSN Code
      const hsnCode = material.hsn || order.hsnCode || 'N/A';
      console.log(`Material: ${material.name}, HSN from material: ${material.hsn}, HSN from order: ${order.hsnCode}, Using: ${hsnCode}, Is Freight: ${isFreightCharges}`);
      
      return {
        description: material.name,
        itemDescription: material.itemDescription,
        hsn: isFreightCharges ? '' : hsnCode, // Exclude HSN for freight charges
        quantity: isFreightCharges ? 0 : material.quantity.value, // Set to 0 for freight charges (won't display)
        unit: isFreightCharges ? '' : material.quantity.unit, // Exclude unit for freight charges
        rate: supplierRate,
        amount: amount,
      };
    }),
    currency: order.materials[0]?.supplierUnitPrice?.currency || order.priceFromSupplier.currency,
    taxRate: finalTaxRate, // Use tax rate from materials or provided override
    terms: order.deliveryTerms || '90 days credit from the date of GRN', // Payment terms from dropdown
    terms_of_delivery: order.incoterms || 'FOB', // Delivery terms (FOB, CIF, etc.)
    terms_and_conditions: termsAndConditions || order.notes, // Terms and conditions from dialog
    adjustment: order.adjustment || 0 // Adjustment value from supplier tab
  };
}

// Main function to generate HRV PO from Order (renamed for consistency)
export async function previewHRVPOFromOrder(templateUrl: string, order: Order, taxRate?: number, termsAndConditions?: string): Promise<string> {
  const orderData = convertOrderToHRVData(order, taxRate, termsAndConditions);
  return previewFilledPO(templateUrl, orderData, order);
}