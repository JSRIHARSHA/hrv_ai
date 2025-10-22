# ✅ Materials Array - Multiple Materials Support

## 🎯 **Answer: YES!**

Materials are stored in an **array** (`MaterialItem[]`), which **fully supports multiple materials** in the same Purchase Order!

---

## 📊 **Data Structure**

### **Order Interface:**
```typescript
export interface Order {
  orderId: string;
  // ... other fields
  materialName: string;           // Primary material name (for display)
  materials: MaterialItem[];      // ✅ ARRAY of all materials
  quantity: Quantity;             // Total quantity (sum of all materials)
  // ... other fields
}
```

### **MaterialItem Interface:**
```typescript
export interface MaterialItem {
  id: string;                     // Unique ID
  name: string;                   // Material name
  sku?: string;                   // Stock Keeping Unit
  hsn?: string;                   // HSN Code
  quantity: Quantity;             // Material-specific quantity
  unitPrice: Price;               // Price per unit
  totalPrice: Price;              // Total for this material
  description?: string;           // Additional description/grade
}
```

### **Supporting Types:**
```typescript
export interface Quantity {
  value: number;                  // e.g., 1000
  unit: string;                   // e.g., "Kg", "Liters"
}

export interface Price {
  amount: number;                 // e.g., 45000
  currency: string;               // e.g., "USD", "INR"
}
```

---

## 🎨 **Real Example**

### **Single Material Order:**
```typescript
{
  orderId: "001-2025",
  materialName: "Paracetamol API",
  materials: [
    {
      id: "material_001",
      name: "Paracetamol API",
      hsn: "29242990",
      quantity: { value: 1000, unit: "Kg" },
      unitPrice: { amount: 45, currency: "USD" },
      totalPrice: { amount: 45000, currency: "USD" }
    }
  ]
}
```

### **Multiple Materials Order:**
```typescript
{
  orderId: "002-2025",
  materialName: "Paracetamol API + Ibuprofen", // Summary
  materials: [
    {
      id: "material_001",
      name: "Paracetamol API",
      hsn: "29242990",
      quantity: { value: 1000, unit: "Kg" },
      unitPrice: { amount: 45, currency: "USD" },
      totalPrice: { amount: 45000, currency: "USD" }
    },
    {
      id: "material_002",
      name: "Ibuprofen USP",
      hsn: "29163100",
      quantity: { value: 500, unit: "Kg" },
      unitPrice: { amount: 60, currency: "USD" },
      totalPrice: { amount: 30000, currency: "USD" }
    },
    {
      id: "material_003",
      name: "Aspirin API",
      hsn: "29181100",
      quantity: { value: 250, unit: "Kg" },
      unitPrice: { amount: 35, currency: "USD" },
      totalPrice: { amount: 8750, currency: "USD" }
    }
  ],
  quantity: { value: 1750, unit: "Kg" }, // Total: 1000+500+250
  priceToCustomer: { amount: 83750, currency: "USD" } // Total
}
```

---

## 🤖 **Gemini AI Extraction**

### **How It Works:**
When Gemini AI extracts a PDF with multiple line items, it creates an array of materials:

```typescript
// Gemini extracts from PDF:
geminiData.items = [
  {
    materialName: "Paracetamol API",
    materialGrade: "USP Grade",
    quantity: 1000,
    unitPrice: 45,
    totalPrice: 45000
  },
  {
    materialName: "Ibuprofen USP",
    materialGrade: "EP Grade",
    quantity: 500,
    unitPrice: 60,
    totalPrice: 30000
  }
];

// Converted to MaterialItem array:
materials: MaterialItem[] = geminiData.items.map((item, index) => ({
  id: `material_${Date.now()}_${index}`,
  name: item.materialName,
  description: item.materialGrade || undefined,
  quantity: {
    value: item.quantity,
    unit: 'Kg'
  },
  unitPrice: {
    amount: item.unitPrice,
    currency: extractedCurrency
  },
  totalPrice: {
    amount: item.totalPrice,
    currency: extractedCurrency
  }
}));
```

---

## 📄 **PDF Generation**

### **Both HRV and NHG PDFs Support Multiple Materials:**

**HRV PDF Generator:**
```typescript
line_items: order.materials.map(material => ({
  description: material.name,
  hsn: material.hsn || 'N/A',
  quantity: material.quantity.value,
  unit: material.quantity.unit,
  rate: material.unitPrice.amount,
  amount: material.totalPrice.amount
}))
```

**Generated PDF shows:**
```
Description          HSN        Qty    Unit   Rate    Amount
─────────────────────────────────────────────────────────────
Paracetamol API     29242990   1000   Kg     45.00   45,000
Ibuprofen USP       29163100   500    Kg     60.00   30,000
Aspirin API         29181100   250    Kg     35.00   8,750
                                                      ────────
                                         Subtotal:    83,750
                                         IGST (18%):  15,075
                                         Total:       98,825
```

---

## 🗄️ **MongoDB Storage**

### **Materials Array in Database:**
```javascript
{
  _id: ObjectId("..."),
  orderId: "002-2025",
  materials: [
    {
      id: "material_1234567890_0",
      name: "Paracetamol API",
      hsn: "29242990",
      quantity: { value: 1000, unit: "Kg" },
      unitPrice: { amount: 45, currency: "USD" },
      totalPrice: { amount: 45000, currency: "USD" }
    },
    {
      id: "material_1234567890_1",
      name: "Ibuprofen USP",
      hsn: "29163100",
      quantity: { value: 500, unit: "Kg" },
      unitPrice: { amount: 60, currency: "USD" },
      totalPrice: { amount: 30000, currency: "USD" }
    }
  ]
}
```

---

## 🎨 **UI Display**

### **Order Detail Page:**
```
Materials:
┌─────────────────────────────────────────────────────────────┐
│ Material 1: Paracetamol API                                 │
│ HSN: 29242990                                               │
│ Quantity: 1,000 Kg                                          │
│ Unit Price: $45.00 USD                                      │
│ Total: $45,000.00 USD                                       │
├─────────────────────────────────────────────────────────────┤
│ Material 2: Ibuprofen USP                                   │
│ HSN: 29163100                                               │
│ Quantity: 500 Kg                                            │
│ Unit Price: $60.00 USD                                      │
│ Total: $30,000.00 USD                                       │
├─────────────────────────────────────────────────────────────┤
│ Material 3: Aspirin API                                     │
│ HSN: 29181100                                               │
│ Quantity: 250 Kg                                            │
│ Unit Price: $35.00 USD                                      │
│ Total: $8,750.00 USD                                        │
└─────────────────────────────────────────────────────────────┘
Total Quantity: 1,750 Kg
Total Amount: $83,750.00 USD
```

---

## 💾 **Where Materials Array is Used**

### **1. Order Creation:**
```typescript
// src/services/geminiPdfExtractor.ts (line 59)
const materials: MaterialItem[] = geminiData.items.map((item, index) => ({
  id: `material_${Date.now()}_${index}`,
  name: item.materialName,
  // ... converts ALL items from Gemini extraction
}));
```

### **2. MongoDB Schema:**
```javascript
// backend/models/Order.js
materials: [{
  id: String,
  name: String,
  sku: String,
  hsn: String,
  quantity: {
    value: Number,
    unit: String
  },
  unitPrice: {
    amount: Number,
    currency: String
  },
  totalPrice: {
    amount: Number,
    currency: String
  },
  description: String
}]
```

### **3. PDF Generation:**
```typescript
// src/utils/hrvPdfLibGenerator.ts (line 151)
line_items: order.materials.map(material => ({
  // Maps EACH material to a line in the PDF
}))

// src/utils/nhgPdfLibGenerator.ts (line 149)
line_items: order.materials.map(material => ({
  // Maps EACH material to a line in the PDF
}))
```

### **4. Excel Export:**
```typescript
// src/services/excelService.ts (line 86)
materialsJson: JSON.stringify(order.materials)
// Stores entire array as JSON
```

---

## ✅ **Benefits of Array Structure**

### **1. Flexibility:**
- ✅ Handle single material orders
- ✅ Handle multi-material orders
- ✅ No limit on number of materials
- ✅ Each material has independent properties

### **2. Accurate Calculations:**
```typescript
// Total quantity
const totalQuantity = materials.reduce(
  (sum, item) => sum + item.quantity.value, 
  0
);

// Total amount
const totalAmount = materials.reduce(
  (sum, item) => sum + item.totalPrice.amount, 
  0
);
```

### **3. Individual Material Tracking:**
- ✅ Each material has unique ID
- ✅ Separate HSN codes
- ✅ Different quantities and units
- ✅ Individual pricing
- ✅ Material-specific descriptions

### **4. Easy to Expand:**
```typescript
// Add new material to existing order:
order.materials.push({
  id: `material_${Date.now()}`,
  name: "New Material",
  // ... properties
});
```

---

## 🔧 **Code Examples**

### **Accessing Materials:**
```typescript
// Get all materials
const allMaterials = order.materials;

// Get first material
const primaryMaterial = order.materials[0];

// Count materials
const materialCount = order.materials.length;

// Loop through materials
order.materials.forEach(material => {
  console.log(`${material.name}: ${material.quantity.value} ${material.quantity.unit}`);
});

// Filter materials
const highValueMaterials = order.materials.filter(
  m => m.totalPrice.amount > 10000
);

// Get total value
const totalValue = order.materials.reduce(
  (sum, m) => sum + m.totalPrice.amount, 
  0
);
```

---

## 📊 **Statistics**

### **Current Implementation:**
```
✅ Materials stored as: Array (MaterialItem[])
✅ Array length: Unlimited
✅ Gemini AI extracts: All items from PDF
✅ PDF generation: Supports multiple materials
✅ MongoDB storage: Full array support
✅ Excel export: All materials included
✅ UI display: Shows all materials
```

---

## 🎯 **Real-World Example**

### **Pharmaceutical Order with 3 Materials:**

**PDF Contains:**
```
Item 1: Paracetamol API USP - 1000 Kg @ $45/kg
Item 2: Ibuprofen API EP - 500 Kg @ $60/kg
Item 3: Aspirin API BP - 250 Kg @ $35/kg
```

**Gemini Extracts:**
```json
{
  "items": [
    {
      "materialName": "Paracetamol API USP",
      "quantity": 1000,
      "unitPrice": 45,
      "totalPrice": 45000
    },
    {
      "materialName": "Ibuprofen API EP",
      "quantity": 500,
      "unitPrice": 60,
      "totalPrice": 30000
    },
    {
      "materialName": "Aspirin API BP",
      "quantity": 250,
      "unitPrice": 35,
      "totalPrice": 8750
    }
  ]
}
```

**Order Created:**
```typescript
{
  orderId: "PHARMACO-2025-001",
  materials: [
    { id: "mat_001", name: "Paracetamol API USP", ... },
    { id: "mat_002", name: "Ibuprofen API EP", ... },
    { id: "mat_003", name: "Aspirin API BP", ... }
  ],
  // ✅ All 3 materials stored
}
```

**PDF Generated:**
```
All 3 materials appear as separate line items
Tax calculated on combined total
Grand total includes all materials
```

---

## ✅ **Conclusion**

### **YES, Materials are Stored in an Array!**

```
✅ Type: MaterialItem[]
✅ Supports: Multiple materials
✅ Limit: None (array can grow)
✅ Gemini AI: Extracts all line items
✅ PDF Generation: All materials shown
✅ MongoDB: Full array saved
✅ UI: Displays all materials
✅ Excel: All materials exported
```

**Your application fully supports multiple materials per purchase order!** 🎉

---

## 📝 **File Locations**

- **Type Definition**: `src/types/index.ts` (line 181)
- **Gemini Extraction**: `src/services/geminiPdfExtractor.ts` (line 59-77)
- **HRV PDF**: `src/utils/hrvPdfLibGenerator.ts` (line 151)
- **NHG PDF**: `src/utils/nhgPdfLibGenerator.ts` (line 149)
- **MongoDB Schema**: `backend/models/Order.js`

---

**Date**: October 22, 2025
**Status**: ✅ Fully Supported
**Array Type**: MaterialItem[]
**Capacity**: Unlimited materials per order

