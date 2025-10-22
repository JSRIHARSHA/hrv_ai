import { GoogleGenAI, Type } from "@google/genai";
import type { PurchaseOrder } from '../types';

const PO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    poNumber: { type: Type.STRING, description: "The purchase order number.", nullable: true },
    issueDate: { type: Type.STRING, description: "The date the purchase order was issued, formatted as YYYY-MM-DD.", nullable: true },
    customerName: { type: Type.STRING, description: "The name of the customer.", nullable: true },
    customerAddress: { type: Type.STRING, description: "The full address of the customer.", nullable: true },
    customerEmail: { type: Type.STRING, description: "The email address of the customer.", nullable: true },
    customerContact: { type: Type.STRING, description: "The contact phone number of the customer.", nullable: true },
    customerGstin: { type: Type.STRING, description: "The GST Identification Number (GSTIN) of the customer.", nullable: true },
    shipmentDetails: { type: Type.STRING, description: "Any specific details or instructions about the shipment.", nullable: true },
    items: {
      type: Type.ARRAY,
      description: "A list of all line items in the purchase order.",
      items: {
        type: Type.OBJECT,
        properties: {
          materialName: { type: Type.STRING, description: "The name or description of the material/item." },
          materialGrade: { type: Type.STRING, description: "The grade of the material, if specified.", nullable: true },
          quantity: { type: Type.NUMBER, description: "The quantity of the item." },
          unitPrice: { type: Type.NUMBER, description: "The price per unit of the item." },
          totalPrice: { type: Type.NUMBER, description: "The total price for the line item (quantity * unit price)." },
        },
        required: ["materialName", "quantity", "unitPrice", "totalPrice"],
      },
    },
    subtotal: { type: Type.NUMBER, description: "The subtotal amount before taxes and other charges.", nullable: true },
    tax: { type: Type.NUMBER, description: "The total tax amount.", nullable: true },
    totalAmount: { type: Type.NUMBER, description: "The final total amount of the purchase order.", nullable: true },
    currency: { type: Type.STRING, description: "The currency code used in the purchase order (e.g., USD, EUR, INR, GBP). Extract from the document or infer from context.", nullable: true },
  },
  required: ["customerName", "items", "totalAmount"],
};

export const extractPOData = async (pdfBase64: string): Promise<PurchaseOrder> => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("REACT_APP_GEMINI_API_KEY environment variable is not set. Please add your Gemini API key.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const textPart = {
    text: `You are an expert in processing financial documents. Your task is to analyze the provided Purchase Order PDF and extract key fields according to the provided JSON schema. Pay close attention to data types. If a specific field (like a separate billing address) is not present in the document, you should return null for its value. If totals are not explicitly mentioned, please calculate them based on line items. Dates should be standardized to YYYY-MM-DD format.`
  };
  
  // Remove data URL prefix if present
  const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
  
  const pdfPart = {
    inlineData: {
      mimeType: 'application/pdf',
      data: base64Data,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [textPart, pdfPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: PO_SCHEMA,
      },
    });

    if (!response.text) {
      throw new Error("Gemini API returned empty response");
    }

    const jsonText = response.text.trim();
    console.log("✨ Gemini AI response received");
    const data: PurchaseOrder = JSON.parse(jsonText);
    return data;
  } catch (e: any) {
    console.error("Failed to extract PO data with Gemini:", e);
    throw new Error(`Gemini extraction failed: ${e.message || 'Unknown error'}`);
  }
};
