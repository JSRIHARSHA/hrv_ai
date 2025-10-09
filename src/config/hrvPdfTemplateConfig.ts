// HRV PDF Template Configuration
export const HRV_PDF_CONFIG = {
  // Template URL - Pointing to the actual HRV PO FORMAT.pdf file in public directory
  templateUrl: '/HRV_PO_FORMAT.pdf',
  
  // Alternative template URLs for different environments
  templateUrlLocal: '/HRV_PO_FORMAT.pdf',
  templateUrlCDN: 'https://your-cdn.com/templates/HRV_PO_FORMAT.pdf',
  
  // Fallback template (if main template is not available)
  fallbackTemplate: '/HRV_PO_FORMAT.pdf',
  
  // Flag to force fallback generation (useful for testing)
  forceFallback: false
};

// Function to get the appropriate template URL based on environment
export const getTemplateUrl = (): string => {
  // If force fallback is enabled, return a non-existent URL to trigger fallback
  if (HRV_PDF_CONFIG.forceFallback) {
    return '/non-existent-template.pdf';
  }
  
  // Check if we're in development or production
  if (process.env.NODE_ENV === 'development') {
    return HRV_PDF_CONFIG.templateUrlLocal;
  }
  
  // For production, you might want to use a CDN URL
  return HRV_PDF_CONFIG.templateUrl;
};

// Function to validate template URL
export const validateTemplateUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Template URL validation failed:', error);
    return false;
  }
};
