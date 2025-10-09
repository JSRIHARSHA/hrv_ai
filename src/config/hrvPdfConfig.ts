import { HRVPDFConfig } from '../utils/hrvPdfGenerator';

// HRV PDF Configuration
// This can be easily modified to match your specific HRV PO FORMAT.pdf requirements
export const hrvPDFConfig: HRVPDFConfig = {
  companyName: 'HRV LIFE SCIENCES PVT. LTD.',
  companyAddress: 'Plot No. 123, Industrial Area, Mumbai - 400001, India',
  companyPhone: '+91-22-12345678',
  companyEmail: 'info@hrvlifesciences.com',
  poPrefix: 'HRV/PO',
  
  // Terms and conditions - customize these based on your requirements
  terms: [
    'Payment terms: 30% advance, 70% on delivery',
    'All materials must comply with FDA regulations',
    'Certificate of Analysis (COA) required',
    'Delivery within 30 days from PO acceptance',
    'Quality standards as per USP/EP specifications',
    'Supplier must provide valid licenses and certifications',
    'Material should be properly packed and labeled',
    'Any deviation from specifications will result in rejection'
  ],
  
  // Signature fields - customize based on your PDF format
  signatureFields: {
    name: 'Authorized Signatory',
    title: 'Purchase Manager',
    date: 'Date',
    signature: 'Signature'
  }
};

// Alternative configurations for different scenarios
export const hrvPDFConfigAlternative: HRVPDFConfig = {
  companyName: 'HRV LIFE SCIENCES PVT. LTD.',
  companyAddress: 'Plot No. 123, Industrial Area, Mumbai - 400001, India',
  companyPhone: '+91-22-12345678',
  companyEmail: 'info@hrvlifesciences.com',
  poPrefix: 'HRV/PO',
  
  terms: [
    'Payment: Net 30 days from invoice date',
    'All products must meet USP/EP/BP standards',
    'COA must accompany each shipment',
    'Delivery: FOB destination',
    'Quality control testing required',
    'Supplier responsible for proper documentation',
    'Material must be stored under specified conditions',
    'Any non-compliance will result in return at supplier cost'
  ],
  
  signatureFields: {
    name: 'Purchasing Manager',
    title: 'Procurement Department',
    date: 'Issue Date',
    signature: 'Authorized Signature'
  }
};

// Function to get configuration based on order type or other criteria
export const getHRVPDFConfig = (orderType?: string): HRVPDFConfig => {
  switch (orderType) {
    case 'pharmaceutical':
      return hrvPDFConfigAlternative;
    case 'standard':
    default:
      return hrvPDFConfig;
  }
};
