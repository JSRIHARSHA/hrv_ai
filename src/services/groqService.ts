import type { PurchaseOrder } from '../types';

// Dynamic import for pdfjs-dist to avoid SSR issues
let pdfjsLib: any = null;

const loadPdfJs = async () => {
  if (!pdfjsLib && typeof window !== 'undefined') {
    pdfjsLib = await import('pdfjs-dist');
    // Configure PDF.js to run without external worker to avoid CDN fetch issues
    if (pdfjsLib.GlobalWorkerOptions) {
      // Point to the local worker bundled in /public to avoid CDN fetches
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      pdfjsLib.GlobalWorkerOptions.workerPort = null;
    }
    // Ensure workers are enabled (default behavior)
    pdfjsLib.disableWorker = false;
    console.log('[PDF.js] Configured to use local worker at /pdf.worker.min.js');
  }
  return pdfjsLib;
};

// Rate limiting: Track last API call time
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 2000; // Minimum 2 seconds between calls

const PO_SCHEMA = {
  type: "object",
  properties: {
    poNumber: { type: "string", description: "The purchase order number.", nullable: true },
    issueDate: { type: "string", description: "The date the purchase order was issued, formatted as YYYY-MM-DD.", nullable: true },
    customerName: { type: "string", description: "The BUYER (customer) name — the company or person who issued the PO.", nullable: true },
    customerAddress: { type: "string", description: "The BUYER (customer) full address as shown on the PO letterhead.", nullable: true },
    customerEmail: { type: "string", description: "The BUYER (customer) email address.", nullable: true },
    customerContact: { type: "string", description: "The BUYER (customer) contact phone number.", nullable: true },
    customerGstin: { type: "string", description: "The BUYER (customer) GSTIN or tax ID.", nullable: true },
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

/**
 * Extract text from PDF using pdfjs-dist
 */
const extractTextFromPDF = async (pdfBase64: string): Promise<string> => {
  console.log('  🔄 Loading PDF.js library...');
  // Load pdfjs-dist dynamically
  const pdfjs = await loadPdfJs();
  if (!pdfjs) {
    throw new Error('PDF.js library failed to load');
  }
  console.log('  ✅ PDF.js library loaded');
  console.log('  ⚙️  Worker configuration:', {
    disableWorker: pdfjs.disableWorker,
    workerSrc: pdfjs.GlobalWorkerOptions?.workerSrc || 'undefined',
    workerPort: pdfjs.GlobalWorkerOptions?.workerPort || 'null',
  });

  // Remove data URL prefix if present
  const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
  console.log('  📊 PDF Data size:', base64Data.length, 'characters (base64)');
  
  // Convert base64 to Uint8Array
  console.log('  🔄 Converting base64 to binary...');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  console.log('  ✅ Binary conversion complete, size:', bytes.length, 'bytes');

  // Load PDF document
  console.log('  🔄 Loading PDF document...');
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  console.log('  ✅ PDF document loaded');
  console.log('  📄 PDF has', pdf.numPages, 'page(s)');

  // Extract text from all pages
  console.log('  🔄 Extracting text from pages...');
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    console.log(`  📄 Processing page ${pageNum}/${pdf.numPages}...`);
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
    console.log(`  ✅ Page ${pageNum} extracted, text length:`, pageText.length, 'characters');
  }

  const trimmedText = fullText.trim();
  console.log('  ✅ Text extraction complete');
  return trimmedText;
};

/**
 * Extract PO data from PDF using Groq API
 */
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
  
  const apiKey = process.env.REACT_APP_GROQ_API_KEY;
  const groqModel = process.env.REACT_APP_GROQ_MODEL || 'llama-3.3-70b-versatile';
  
  console.log('🔑 HRV AI API Key Status:');
  console.log('  - Key exists:', !!apiKey);
  console.log('  - Key length:', apiKey?.length || 0);
  console.log('  - Key starts with:', apiKey?.substring(0, 15) || 'N/A');
  console.log('  - Time since last call:', timeSinceLastCall + 'ms');
  console.log('  - Environment loaded:', process.env.NODE_ENV || 'development');
  
  if (!apiKey) {
    throw new Error("REACT_APP_GROQ_API_KEY environment variable is not set. Please add your HRV AI API key.");
  }
  
  try {
    // Step 1: Extract text from PDF
    console.log('📄 ========================================');
    console.log('📄 STEP 1: Extracting text from PDF...');
    console.log('📄 ========================================');
    const pdfText = await extractTextFromPDF(pdfBase64);
    console.log('✅ PDF text extraction completed');
    console.log('📊 PDF Text Statistics:');
    console.log('  - Total characters:', pdfText.length);
    console.log('  - Total words:', pdfText.split(/\s+/).filter(w => w.length > 0).length);
    console.log('  - Total lines:', pdfText.split('\n').length);
    console.log('');
    console.log('📄 ========================================');
    console.log('📄 EXTRACTED PDF TEXT (Full Content):');
    console.log('📄 ========================================');
    console.log(pdfText);
    console.log('📄 ========================================');
    console.log('');
    
    // Step 2: Prepare prompt with schema instructions
    console.log('🔧 ========================================');
    console.log('🔧 STEP 2: Preparing API request...');
    console.log('🔧 ========================================');
    const schemaDescription = JSON.stringify(PO_SCHEMA, null, 2);
    const prompt = `You are an expert in processing financial documents. Your task is to analyze the provided Purchase Order text and extract key fields according to the following JSON schema.

JSON Schema:
${schemaDescription}

CRITICAL INSTRUCTIONS:
1. **Buyer vs Supplier**: The fields prefixed with "customer" (customerName, address, email, contact, GSTIN) refer to the BUYER / PO issuer that appears on the letterhead. This is the customer that sent us the PO. DO NOT confuse it with the supplier / vendor (our company). If the buyer information is missing in the document, set those fields to null but never fill them with supplier details.

2. **Extract ALL line items**: The document may contain multiple materials/items. You MUST extract every single line item from the purchase order table. Do not skip any rows. Each row in the items table should become a separate item in the "items" array.

3. **Data Types**: Pay close attention to data types - numbers should be numbers, not strings.

4. **Null Handling**: If a specific field is not present in the document, return null for its value.

5. **Calculations**: If totals are not explicitly mentioned, calculate them based on line items.

6. **Date Format**: Standardize all dates to YYYY-MM-DD format.

7. **Completeness**: Ensure you capture all materials, quantities, unit prices, and total prices for each line item in the purchase order.

8. **Output Format**: You MUST return ONLY valid JSON that matches the schema above. Do not include any markdown formatting, code blocks, or explanatory text.

Purchase Order Text:
${pdfText}`;

    console.log('📊 Request Statistics:');
    console.log('  - Prompt length:', prompt.length, 'characters');
    console.log('  - Schema size:', schemaDescription.length, 'characters');
    console.log('  - PDF text size:', pdfText.length, 'characters');
    console.log('');

    // Step 3: Call AI API
    console.log('📞 ========================================');
    console.log('📞 STEP 3: Calling HRV AI API (Groq)...');
    console.log('📞 ========================================');
    console.log('🌐 API Endpoint: https://api.groq.com/openai/v1/chat/completions');
    console.log('🤖 Model:', groqModel);
    console.log('⏰ Request started at:', new Date().toISOString());
    console.log('');
    
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    const requestBody = {
      model: groqModel,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured data from purchase orders. Always respond with valid JSON only, no markdown or explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for consistent structured output
    };

    console.log('📤 Sending HTTP POST request...');
    const requestStartTime = Date.now();
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const requestEndTime = Date.now();
    const requestDuration = requestEndTime - requestStartTime;
    
    console.log('📥 HTTP Response received');
    console.log('📊 Response Details:');
    console.log('  - Status:', response.status, response.statusText);
    console.log('  - Request duration:', requestDuration, 'ms');
    console.log('  - Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('');

    if (!response.ok) {
      console.error('❌ API Error Response:');
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      console.error('  - Error data:', JSON.stringify(errorData, null, 2));
      const errorMessage = errorData?.error?.message || JSON.stringify(errorData);
      throw new Error(`HRV AI API error: ${errorMessage}`);
    }

    console.log('📦 Parsing response JSON...');
    const responseData = await response.json();
    
    console.log('📊 Response Structure:');
    console.log('  - Has choices:', !!responseData.choices);
    console.log('  - Choices count:', responseData.choices?.length || 0);
    console.log('  - Usage tokens:', responseData.usage ? JSON.stringify(responseData.usage, null, 2) : 'N/A');
    console.log('');

    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error('❌ Invalid response structure:', JSON.stringify(responseData, null, 2));
      throw new Error("HRV AI API returned empty response");
    }

    const jsonText = responseData.choices[0].message.content;
    if (!jsonText) {
      console.error('❌ Empty content in response:', JSON.stringify(responseData, null, 2));
      throw new Error("HRV AI API returned empty content");
    }

    console.log('✅ HRV AI response received successfully');
    console.log('📋 Response Content Statistics:');
    console.log('  - Content length:', jsonText.length, 'characters');
    console.log('  - Content preview (first 500 chars):');
    console.log('    ' + jsonText.substring(0, 500).replace(/\n/g, '\n    '));
    console.log('');
    
    // Parse and validate JSON
    console.log('🔍 ========================================');
    console.log('🔍 STEP 4: Parsing and validating response...');
    console.log('🔍 ========================================');
    let data: PurchaseOrder;
    try {
      console.log('📝 Attempting to parse JSON...');
      data = JSON.parse(jsonText);
      console.log('✅ JSON parsed successfully');
      console.log('📊 Parsed Data Structure:');
      console.log('  - customerName:', data.customerName || 'null');
      console.log('  - items count:', data.items?.length || 0);
      console.log('  - totalAmount:', data.totalAmount || 'null');
      console.log('  - currency:', data.currency || 'null');
      console.log('  - poNumber:', data.poNumber || 'null');
      console.log('');
    } catch (parseError) {
      console.error('❌ JSON Parse Error:');
      console.error('  - Error:', parseError);
      console.error('  - Raw response text:', jsonText);
      throw new Error(`Invalid JSON response from HRV AI: ${parseError}`);
    }

    // Validate required fields
    console.log('✅ Validating required fields...');
    const missingFields: string[] = [];
    if (!data.customerName) missingFields.push('customerName');
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) missingFields.push('items');
    if (!data.totalAmount) missingFields.push('totalAmount');
    
    if (missingFields.length > 0) {
      console.error('❌ Validation failed - Missing required fields:', missingFields);
      console.error('📋 Current data:', JSON.stringify(data, null, 2));
      throw new Error(`HRV AI response missing required fields: ${missingFields.join(', ')}`);
    }
    
    console.log('✅ All required fields present');
    console.log('📋 Final Extracted Data:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 Extraction completed successfully!');
    console.log('🎉 ========================================');
    console.log('');

    return data;
  } catch (error: any) {
    console.error('❌ HRV AI extraction failed:', error);
    throw new Error(`HRV AI extraction failed: ${error.message || 'Unknown error'}`);
  }
};

