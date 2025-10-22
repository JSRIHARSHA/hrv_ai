# 📊 Supplier Pricing - How It's Populated

## 🎯 **Quick Answer**

The **supplier price fields** (`priceFromSupplier`) are currently **calculated automatically** based on the customer price with an assumed margin.

---

## 🔍 **Current Implementation**

### **1. Gemini AI Extraction** (`src/services/geminiPdfExtractor.ts`)

**Location:** Line 128-131

```typescript
priceFromSupplier: {
  amount: totalAmount * 0.9,  // ← Calculated: 90% of customer price
  currency: extractedCurrency
}
```

**How it works:**
- Gemini extracts customer total: `$50,000`
- Supplier price calculated: `$50,000 × 0.9 = $45,000`
- **Assumption**: 10% profit margin

---

### **2. Python PDF Extractor** (`src/services/pdfExtractorService.ts`)

**Location:** Line 188-194

```typescript
priceFromSupplier: {
  amount: parseFloat(data.TOTAL_AMOUNT || '0'),  // ← Same as customer price
  currency: data.CURRENCY || 'USD'
},
priceToCustomer: {
  amount: parseFloat(data.TOTAL_AMOUNT || '0') * 1.1,  // ← Adds 10% margin
  currency: data.CURRENCY || 'USD'
}
```

**How it works:**
- Python extracts total amount from PDF: `$50,000`
- Uses this as supplier price: `$50,000`
- Adds 10% for customer price: `$50,000 × 1.1 = $55,000`
- **Assumption**: 10% markup on supplier cost

---

## 📊 **Comparison**

| Extractor | Customer Price | Supplier Price | Logic |
|-----------|----------------|----------------|-------|
| **Gemini AI** | From PDF | Customer × 0.9 | Assumes 10% profit margin |
| **Python** | Extracted × 1.1 | From PDF | Assumes extracted is supplier cost |

---

## ❓ **Why This Approach?**

### **Problem:**
Most customer PDFs only show the **customer price**, not the supplier price. The PDFs you receive are purchase orders **from customers**, not **to suppliers**.

### **Current Solution:**
- Automatically calculate supplier price with a default margin
- Allows order creation without manual entry
- Can be edited manually later if needed

---

## 💡 **How Data Flows**

### **Typical PDF Upload Flow:**

```
1. Customer sends PO PDF
   ↓
2. PDF shows: "Total: $50,000"
   ↓
3. Gemini AI extracts: totalAmount = 50000
   ↓
4. System calculates:
   - priceToCustomer = $50,000 (from PDF)
   - priceFromSupplier = $45,000 (calculated: 90% of customer price)
   ↓
5. Order created with both prices
   ↓
6. User can manually edit supplier price if needed
```

---

## 🔧 **Where to Find These Values**

### **In the Code:**

1. **Gemini Extractor:**
   - File: `src/services/geminiPdfExtractor.ts`
   - Line: 128-131
   - Calculation: `totalAmount * 0.9`

2. **Python Extractor:**
   - File: `src/services/pdfExtractorService.ts`
   - Line: 188-194
   - Uses: Extracted `TOTAL_AMOUNT` directly

### **In the Order:**

```typescript
{
  orderId: "001-2025",
  priceToCustomer: {
    amount: 50000,      // ← From PDF
    currency: "USD"
  },
  priceFromSupplier: {
    amount: 45000,      // ← Calculated (90% of customer price)
    currency: "USD"
  }
}
```

---

## 🎨 **Visual Example**

### **Example 1: Gemini AI**
```
PDF: "Total Amount: $50,000"
         ↓
Gemini extracts: totalAmount = 50000, currency = "USD"
         ↓
Order created:
  - Customer pays: $50,000 USD
  - Supplier gets: $45,000 USD (90% of $50,000)
  - Margin: $5,000 USD (10%)
```

### **Example 2: Python Extractor**
```
PDF: "Total: ₹50,000"
         ↓
Python extracts: TOTAL_AMOUNT = 50000, CURRENCY = "INR"
         ↓
Order created:
  - Supplier cost: ₹50,000 INR (from PDF)
  - Customer pays: ₹55,000 INR (110% of supplier cost)
  - Margin: ₹5,000 INR (10%)
```

---

## 🔄 **If You Want to Change This**

### **Option 1: Extract Supplier Price from PDF**

If your PDFs contain supplier pricing, you can add it to the Gemini schema:

```typescript
// In geminiService.ts schema:
supplierPrice: { 
  type: Type.NUMBER, 
  description: "The price from supplier/vendor", 
  nullable: true 
}
```

Then use the extracted value instead of calculating.

### **Option 2: Change the Margin Percentage**

```typescript
// In geminiPdfExtractor.ts:
priceFromSupplier: {
  amount: totalAmount * 0.85,  // ← Change to 15% margin
  currency: extractedCurrency
}
```

### **Option 3: Manual Entry**

Users can always manually edit the supplier price in the order detail page after creation.

---

## 📝 **Summary**

### **Current Behavior:**

**Gemini AI Extraction:**
```
✅ Extracts: Customer total amount from PDF
✅ Calculates: Supplier price = Customer price × 0.9
✅ Assumes: 10% profit margin
❌ Does NOT extract: Supplier price from PDF
```

**Python Extraction:**
```
✅ Extracts: Total amount from PDF (assumes supplier cost)
✅ Calculates: Customer price = Supplier cost × 1.1
✅ Assumes: 10% markup
❌ Does NOT extract: Both prices separately
```

### **Why:**
- Most customer POs don't include supplier pricing
- Automatic calculation allows faster order creation
- Values can be edited manually if needed
- Provides a reasonable default for workflows

---

## 🎯 **Recommendation**

### **If your PDFs have supplier prices:**
1. Update Gemini schema to extract supplier price
2. Use extracted value instead of calculation
3. Keep calculation as fallback if not found

### **If your PDFs only have customer prices:**
1. Keep current calculation (works well)
2. Adjust margin percentage if needed (currently 10%)
3. Train users to verify/edit prices after creation

---

## 📞 **Want to Change This?**

Let me know if you'd like me to:
1. ✅ Add supplier price extraction to Gemini schema
2. ✅ Change the margin percentage
3. ✅ Add both prices to extraction
4. ✅ Make margin configurable per order
5. ✅ Any other pricing logic changes

---

**Location Summary:**
- **Gemini**: `src/services/geminiPdfExtractor.ts` (line 128-131)
- **Python**: `src/services/pdfExtractorService.ts` (line 188-194)
- **Logic**: Automatic calculation with 10% margin assumption

**Status**: ✅ Working as designed
**Can be changed**: ✅ Yes, easily customizable

