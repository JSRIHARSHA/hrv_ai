import type { PurchaseOrder } from '../types';

// Rate limiting: Track last API call time
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 2000; // Minimum 2 seconds between calls

const PO_SCHEMA = {
  type: "object",
  properties: {
    poNumber: { type: "string", description: "The purchase order number.", nullable: true },
    issueDate: { type: "string", description: "The date the purchase order was issued, formatted as YYYY-MM-DD.", nullable: true },
    customerName: { type: "string", description: "The name of the customer.", nullable: true },
    customerAddress: { type: "string", description: "The full address of the customer.", nullable: true },
    customerEmail: { type: "string", description: "The email address of the customer.", nullable: true },
    customerContact: { type: "string", description: "The contact phone number of the customer.", nullable: true },
    customerGstin: { type: "string", description: "The GST Identification Number (GSTIN) of the customer.", nullable: true },
    shipmentDetails: { type: "string", description: "Any specific details or instructions about the shipment.", nullable: true },
    items: {
      type: "array",
      description: "A list of ALL line items in the purchase order. Extract EVERY row from the items/materials table in the document. This array should contain multiple items if the PO has multiple materials.",
      items: {
        type: "object",
        properties: {
          materialName: { type: "string", description: "The name or description of the material/item. Extract exactly as shown in the document." },
          materialGrade: { type: "string", description: "The grade or specification of the material, if specified.", nullable: true },
          quantity: { type: "number", description: "The quantity of the item (numeric value only)." },
          unitPrice: { type: "number", description: "The price per unit of the item (numeric value only)." },
          totalPrice: { type: "number", description: "The total price for this line item (quantity * unit price). Calculate if not explicitly shown." },
        },
        required: ["materialName", "quantity", "unitPrice", "totalPrice"],
      },
    },
    subtotal: { type: "number", description: "The subtotal amount before taxes and other charges.", nullable: true },
    tax: { type: "number", description: "The total tax amount.", nullable: true },
    totalAmount: { type: "number", description: "The final total amount of the purchase order.", nullable: true },
    currency: { type: "string", description: "The currency code used in the purchase order (e.g., USD, EUR, INR, GBP). Extract from the document or infer from context.", nullable: true },
  },
  required: ["customerName", "items", "totalAmount"],
};

export const extractPOData = async (pdfBase64: string): Promise<PurchaseOrder> => {
  // Rate limiting check
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall;
    console.log(`⏳ Rate limiting: Waiting ${waitTime}ms before next API call...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastCallTime = Date.now();
  
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  
  console.log('🔑 Gemini API Key Status:');
  console.log('  - Key exists:', !!apiKey);
  console.log('  - Key length:', apiKey?.length || 0);
  console.log('  - Key starts with:', apiKey?.substring(0, 15) || 'N/A');
  console.log('  - Key ends with:', apiKey?.substring(apiKey.length - 5) || 'N/A');
  console.log('  - Full key (partially masked):', apiKey?.substring(0, 20) + '...' + apiKey?.substring(apiKey.length - 4));
  console.log('  - Time since last call:', timeSinceLastCall + 'ms');
  console.log('  - Environment loaded:', process.env.NODE_ENV || 'development');
  
  if (!apiKey) {
    throw new Error("REACT_APP_GEMINI_API_KEY environment variable is not set. Please add your Gemini API key.");
  }
  
  if (apiKey.length !== 39) {
    throw new Error(`REACT_APP_GEMINI_API_KEY has invalid length: ${apiKey.length} characters (should be 39). Your key appears to be incomplete.`);
  }
  
  // Remove data URL prefix if present
  const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
  
  const prompt = `You are an expert in processing financial documents. Your task is to analyze the provided Purchase Order PDF and extract key fields according to the provided JSON schema. 

CRITICAL INSTRUCTIONS:
1. **Extract ALL line items**: The document may contain multiple materials/items. You MUST extract every single line item from the purchase order table. Do not skip any rows. Each row in the items table should become a separate item in the "items" array.

2. **Data Types**: Pay close attention to data types - numbers should be numbers, not strings.

3. **Null Handling**: If a specific field is not present in the document, return null for its value.

4. **Calculations**: If totals are not explicitly mentioned, calculate them based on line items.

5. **Date Format**: Standardize all dates to YYYY-MM-DD format.

6. **Completeness**: Ensure you capture all materials, quantities, unit prices, and total prices for each line item in the purchase order.`;

  // Try gemini-2.0-flash-exp first, fallback to gemini-2.5-pro
  const modelsToTry = ['gemini-2.0-flash-exp', 'gemini-2.5-pro'];
  const apiVersion = 'v1beta';
  
  let lastError: any = null;
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`📞 Calling Gemini REST API (${apiVersion}) with model: ${modelName}`);
      console.log('📄 PDF size:', base64Data.length, 'bytes');
      
      // Use REST API directly with fetch
      const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`;
      
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              }
            }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: PO_SCHEMA,
        }
      };
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const errorMessage = errorData?.error?.message || JSON.stringify(errorData);
        throw new Error(`Gemini API error: ${errorMessage}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content) {
        throw new Error("Gemini API returned empty response");
      }

      const textContent = responseData.candidates[0].content.parts[0].text;
      if (!textContent) {
        throw new Error("Gemini API returned empty text content");
      }

      const jsonText = textContent.trim();
      console.log(`✅ Success with model: ${modelName} using ${apiVersion} API`);
      console.log("✨ Gemini AI response received");
      
      const data: PurchaseOrder = JSON.parse(jsonText);
      return data;
      
    } catch (error: any) {
      lastError = error;
      console.warn(`❌ ${modelName} failed: ${error.message?.substring(0, 200) || error}`);
      
      // If this is the last model, don't try again
      if (modelName === modelsToTry[modelsToTry.length - 1]) {
        break;
      }
      
      // Try next model
      console.log(`   → Trying fallback model: ${modelsToTry[modelsToTry.indexOf(modelName) + 1]}`);
    }
  }
  
  // If we get here, both models failed
  throw new Error(`Gemini extraction failed. Both models (${modelsToTry.join(', ')}) failed. Last error: ${lastError?.message || 'Unknown error'}`);
};
