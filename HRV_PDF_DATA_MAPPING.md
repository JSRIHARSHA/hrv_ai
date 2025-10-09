# HRV PDF Data Mapping Documentation

## Overview
The HRV PDF generator now automatically populates all PDF fields with real data from the order summary page. This document explains how each section of the PDF is mapped to the order data.

## Data Mapping Reference

### 1. Header Section
**Source**: Order data + Configuration
- **Company Name**: From `hrvPdfConfig.companyName`
- **PO Number**: From `order.poNumber` or auto-generated as `HRV/PO/{orderId}`
- **Date**: Current date in DD/MM/YYYY format
- **Delivery Terms**: From `order.deliveryTerms` (default: 'FOB')
- **Incoterms**: From `order.incoterms` (if available)
- **ETA**: From `order.eta` (if available)

### 2. Company Information (FROM)
**Source**: Configuration
- **Company Name**: `hrvPdfConfig.companyName`
- **Address**: `hrvPdfConfig.companyAddress`
- **Phone**: `hrvPdfConfig.companyPhone`
- **Email**: `hrvPdfConfig.companyEmail`

### 3. Supplier Information (TO)
**Source**: Order data
- **Company Name**: `order.supplier.name`
- **Address**: `order.supplier.address`
- **Country**: `order.supplier.country`
- **Phone**: `order.supplier.phone`
- **Email**: `order.supplier.email`
- **HSN Code**: `order.hsnCode` (if available)
- **Enquiry No**: `order.enquiryNo` (if available)

### 4. Order Details
**Source**: Order data
- **Order ID**: `order.orderId`
- **PO Number**: `order.poNumber` or auto-generated
- **Date**: Current date
- **Delivery Terms**: `order.deliveryTerms`
- **RFID**: `order.rfid` (if available)
- **Entity**: `order.entity` (if available)

### 5. Materials Table
**Source**: Order materials array
- **Serial Number**: Auto-generated (1, 2, 3...)
- **Material Name**: `material.name`
- **SKU**: `material.sku` (shows '-' if not available)
- **Quantity**: `material.quantity.value` + `material.quantity.unit`
- **Unit Price**: `material.unitPrice.currency` + `material.unitPrice.amount`
- **Total**: `material.totalPrice.currency` + `material.totalPrice.amount`

### 6. Amount Details
**Source**: Calculated from order data
- **Subtotal**: Sum of all `material.totalPrice.amount`
- **Tax**: Currently set to 0 (can be customized)
- **Total Amount**: `order.priceFromSupplier.amount`
- **Payment Method**: `order.paymentDetails.paymentMethod` (if available)
- **Payment Terms**: `order.paymentDetails.paymentTerms` (if available)

### 7. Terms and Conditions
**Source**: Configuration
- **Terms**: From `hrvPdfConfig.terms` array
- **Special Notes**: From `order.notes` (if available)

### 8. Signature Block
**Source**: Configuration + Order data
- **Signature Fields**: From `hrvPdfConfig.signatureFields`
- **Freight Handler**: `order.freightHandler.name` and `order.freightHandler.phone` (if available)

## Data Flow

```
Order Summary Page Data
    ↓
OrderDetailPage.handleGeneratePO()
    ↓
HRVPDFGenerator.generateHRVPO()
    ↓
PDF with Real Data
```

## Key Features

### ✅ **Automatic Data Population**
- All PDF fields are automatically populated from the order data
- No manual data entry required
- Consistent data across all PDFs

### ✅ **Dynamic Content**
- Materials table shows actual order materials
- Pricing reflects real order amounts
- Supplier/customer information from order data

### ✅ **Conditional Fields**
- Optional fields only appear if data is available
- HSN Code, Enquiry No, RFID, etc. show only when present
- Payment details appear if configured

### ✅ **Real-time Calculations**
- Subtotal calculated from materials
- Total amount from order data
- Proper currency formatting

## Example Data Mapping

### Order Data Example:
```typescript
{
  orderId: "ORD-2024-001",
  poNumber: "HRV/PO/2024-001",
  supplier: {
    name: "ABC Pharmaceuticals Ltd",
    address: "123 Industrial Area, Mumbai",
    country: "India",
    email: "orders@abcpharma.com",
    phone: "+91-22-12345678"
  },
  materials: [
    {
      name: "Paracetamol 500mg",
      sku: "PAR-500",
      quantity: { value: 1000, unit: "kg" },
      unitPrice: { amount: 150, currency: "USD" },
      totalPrice: { amount: 150000, currency: "USD" }
    }
  ],
  priceFromSupplier: { amount: 150000, currency: "USD" },
  deliveryTerms: "FOB Mumbai",
  hsnCode: "30049099",
  rfid: "RFID123456",
  entity: "HRV"
}
```

### Generated PDF Content:
- **Header**: "PURCHASE ORDER" with PO No: HRV/PO/2024-001
- **Supplier**: ABC Pharmaceuticals Ltd with complete address
- **Materials**: Table showing Paracetamol with SKU, quantity, pricing
- **Total**: $150,000.00 USD
- **Additional Info**: HSN Code, RFID, Entity information

## Customization

### Adding New Fields
To add new fields to the PDF:

1. **Update the Order interface** in `src/types/index.ts`
2. **Modify the PDF generator** in `src/utils/hrvPdfGenerator.ts`
3. **Add the field mapping** in the appropriate section method

### Example: Adding a new field
```typescript
// In addPODetails method
if (this.orderData?.newField) {
  this.doc.text(`New Field: ${this.orderData.newField}`, 25, startY + 45);
}
```

### Modifying Data Sources
To change where data comes from:

1. **Update the data mapping** in `generateHRVPO` method
2. **Modify the section methods** to use different data sources
3. **Test with sample data** to ensure proper mapping

## Testing

### Test Data
Use the order detail page to:
1. Set status to "Drafting PO for Supplier"
2. Set entity to "HRV"
3. Fill in order details (supplier, materials, etc.)
4. Click "Generate Supplier PO"
5. Verify PDF contains all order data

### Validation Checklist
- [ ] Company information appears correctly
- [ ] Supplier details match order data
- [ ] Materials table shows all order materials
- [ ] Pricing calculations are accurate
- [ ] Optional fields appear when data is available
- [ ] PDF formatting is professional and readable

## Troubleshooting

### Common Issues
1. **Missing Data**: Check if order fields are properly populated
2. **Formatting Issues**: Verify data types and formatting functions
3. **Layout Problems**: Adjust positioning in PDF generator methods

### Debug Tips
1. **Console Logging**: Add `console.log(this.orderData)` to see what data is available
2. **Field Validation**: Check if optional fields exist before using them
3. **Data Types**: Ensure proper data type conversion (numbers, strings, etc.)

## Future Enhancements

### Planned Features
- **Logo Integration**: Add company logo to PDF header
- **Custom Templates**: Support for multiple PDF templates
- **Advanced Formatting**: More sophisticated layout options
- **Data Validation**: Pre-generation data validation
- **Multi-language Support**: Internationalization for PDF content

The PDF generator now provides a complete, data-driven solution that automatically creates professional purchase orders using real order information from the order summary page.
