# HRV PDF Generator Documentation

## Overview
This document explains how to customize the HRV PDF generator to match your specific "HRV PO FORMAT.pdf" requirements.

## Files Structure
```
src/
├── utils/
│   ├── hrvPdfGenerator.ts     # Main HRV PDF generator class
│   └── pdfGenerator.ts         # Generic PDF generator
├── config/
│   └── hrvPdfConfig.ts        # Configuration for HRV PDF format
└── pages/
    └── OrderDetailPage.tsx    # UI integration
```

## Customization Guide

### 1. Company Information
Edit `src/config/hrvPdfConfig.ts` to update company details:

```typescript
export const hrvPDFConfig: HRVPDFConfig = {
  companyName: 'HRV LIFE SCIENCES PVT. LTD.',
  companyAddress: 'Your Company Address Here',
  companyPhone: 'Your Phone Number',
  companyEmail: 'your-email@company.com',
  poPrefix: 'HRV/PO',
  // ... rest of config
};
```

### 2. PDF Layout Customization
Modify the `HRVPDFGenerator` class in `src/utils/hrvPdfGenerator.ts`:

#### Header Section
```typescript
private addHeader(data: PDFGenerationData): void {
  // Company Logo Area
  this.doc.setFillColor(240, 240, 240);
  this.doc.rect(20, 20, 50, 20, 'F');
  
  // Company Name
  this.doc.setFontSize(16);
  this.doc.setFont('helvetica', 'bold');
  this.doc.text(this.config.companyName, 20, 35);
  
  // Customize positioning, fonts, colors as needed
}
```

#### Materials Table
```typescript
private addMaterialsTable(data: PDFGenerationData): void {
  // Table headers
  this.doc.text('Sr. No.', 25, startY + 15);
  this.doc.text('Material Name', 45, startY + 15);
  this.doc.text('SKU', 100, startY + 15);
  this.doc.text('Qty', 130, startY + 15);
  this.doc.text('Unit Price', 150, startY + 15);
  this.doc.text('Total', 170, startY + 15);
  
  // Add more columns or modify existing ones
}
```

### 3. Terms and Conditions
Update terms in the configuration file:

```typescript
terms: [
  'Payment terms: 30% advance, 70% on delivery',
  'All materials must comply with FDA regulations',
  'Certificate of Analysis (COA) required',
  // Add your specific terms here
],
```

### 4. Signature Fields
Customize signature section:

```typescript
signatureFields: {
  name: 'Authorized Signatory',
  title: 'Purchase Manager',
  date: 'Date',
  signature: 'Signature'
}
```

## Advanced Customization

### Adding Company Logo
To add a company logo, modify the `addHeader` method:

```typescript
private addHeader(data: PDFGenerationData): void {
  // Add logo if available
  if (this.config.companyLogo) {
    // Load and add logo image
    const img = new Image();
    img.src = this.config.companyLogo;
    this.doc.addImage(img, 'PNG', 20, 20, 50, 20);
  }
  
  // Rest of header code...
}
```

### Custom Fonts and Colors
```typescript
// Set custom colors
this.doc.setFillColor(240, 240, 240); // Light gray background
this.doc.setDrawColor(0, 0, 0);       // Black borders
this.doc.setTextColor(0, 0, 0);       // Black text

// Set custom fonts
this.doc.setFont('helvetica', 'bold');
this.doc.setFontSize(16);
```

### Adding More Sections
To add additional sections to the PDF:

```typescript
private addCustomSection(data: PDFGenerationData): void {
  const startY = 350; // Adjust position as needed
  
  this.doc.setFontSize(12);
  this.doc.setFont('helvetica', 'bold');
  this.doc.text('CUSTOM SECTION', 20, startY);
  
  // Add your custom content here
}
```

Then call it in the `generateHRVPO` method:

```typescript
generateHRVPO(order: Order, customData?: Partial<PDFGenerationData>): jsPDF {
  // ... existing code ...
  this.addCustomSection(data);
  return this.doc;
}
```

## Testing Your Changes

1. **Build the project**: `npm run build`
2. **Test PDF generation**: 
   - Set order status to "Drafting PO for Supplier"
   - Set entity to "HRV"
   - Click "Generate Supplier PO"
   - Check the generated PDF in the Documents section

## Matching Your HRV PO FORMAT.pdf

To match your specific PDF format:

1. **Analyze the original PDF**:
   - Note the exact layout and positioning
   - Identify all sections and their order
   - Check fonts, colors, and styling
   - Note any special formatting or tables

2. **Update the generator**:
   - Modify positioning in each method
   - Adjust fonts and sizes
   - Update colors and styling
   - Add or remove sections as needed

3. **Test and iterate**:
   - Generate PDFs and compare with original
   - Make adjustments until satisfied
   - Test with different order data

## Example: Complete Customization

```typescript
// In hrvPdfConfig.ts
export const customHRVConfig: HRVPDFConfig = {
  companyName: 'YOUR COMPANY NAME',
  companyAddress: 'Your Complete Address',
  companyPhone: 'Your Phone',
  companyEmail: 'your@email.com',
  poPrefix: 'YOUR/PO',
  
  terms: [
    'Your specific term 1',
    'Your specific term 2',
    // ... more terms
  ],
  
  signatureFields: {
    name: 'Your Signature Field Name',
    title: 'Your Title Field',
    date: 'Your Date Field',
    signature: 'Your Signature Field'
  }
};
```

## Support

If you need help customizing the PDF format to match your specific requirements, please provide:
1. The original "HRV PO FORMAT.pdf" file
2. Specific requirements or changes needed
3. Any special formatting or layout requirements

The current implementation provides a solid foundation that can be easily modified to match any specific PDF format requirements.
