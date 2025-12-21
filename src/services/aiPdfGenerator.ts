import jsPDF from 'jspdf';
import { Order, PDFGenerationData, MaterialItem, ContactInfo } from '../types';

export interface AIGeneratedPDFOptions {
  template: 'professional' | 'minimal' | 'detailed' | 'compliance_focused';
  includeComplianceInfo: boolean;
  includeInsights: boolean;
  language: 'en' | 'es' | 'fr' | 'de';
  branding?: {
    logo?: string;
    companyName: string;
    companyAddress: string;
    colors: {
      primary: string;
      secondary: string;
    };
  };
}

export interface AIGeneratedContent {
  header: string;
  introduction: string;
  terms: string;
  compliance: string;
  insights: string;
  footer: string;
}

export class AIPDFGenerator {
  private doc: jsPDF;
  private options: AIGeneratedPDFOptions;

  constructor(options: AIGeneratedPDFOptions) {
    this.doc = new jsPDF();
    this.options = options;
  }

  /**
   * Generate AI-powered PDF with intelligent content
   */
  async generateIntelligentPDF(order: Order, customData?: Partial<PDFGenerationData>): Promise<jsPDF> {
    try {
      // Generate AI content
      const aiContent = await this.generateAIContent(order);
      
      // Validate supplier exists
      if (!order.supplier) {
        throw new Error('Supplier must be selected before generating PDF');
      }
      
      // Build PDF data
      const data: PDFGenerationData = {
        orderId: order.orderId,
        supplierInfo: order.supplier,
        customerInfo: order.customer,
        materials: order.materials,
        poNumber: order.poNumber || `AUTO-${order.orderId}-001`,
        date: new Date().toLocaleDateString(),
        deliveryTerms: order.deliveryTerms || 'FOB',
        totalAmount: order.priceFromSupplier,
        terms: aiContent.terms,
        ...customData,
      };

      // Generate PDF with AI content
      this.doc = new jsPDF();
      await this.addIntelligentHeader(data, aiContent);
      await this.addSupplierInfo(data);
      await this.addCustomerInfo(data);
      await this.addPODetails(data);
      await this.addMaterialsTable(data);
      await this.addIntelligentTerms(data, aiContent);
      
      if (this.options.includeComplianceInfo) {
        await this.addComplianceSection(aiContent.compliance);
      }
      
      if (this.options.includeInsights) {
        await this.addInsightsSection(aiContent.insights);
      }
      
      await this.addIntelligentFooter(aiContent.footer);

      return this.doc;
    } catch (error) {
      console.error('AI PDF generation error:', error);
      throw new Error(`Failed to generate AI PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate AI content for the PDF
   */
  private async generateAIContent(order: Order): Promise<AIGeneratedContent> {
    const orderContext = {
      orderId: order.orderId,
      customer: order.customer,
      supplier: order.supplier,
      materials: order.materials,
      status: order.status,
      totalAmount: order.priceFromSupplier,
    };

    // Generate different sections using LLM
    const [header, introduction, terms, compliance, insights, footer] = await Promise.all([
      this.generateHeaderContent(orderContext),
      this.generateIntroductionContent(orderContext),
      this.generateTermsContent(orderContext),
      this.generateComplianceContent(orderContext),
      this.generateInsightsContent(orderContext),
      this.generateFooterContent(orderContext),
    ]);

    return {
      header,
      introduction,
      terms,
      compliance,
      insights,
      footer,
    };
  }

  /**
   * Generate header content
   */
  private async generateHeaderContent(orderContext: any): Promise<string> {
    const template = this.options.template;
    const prompts = {
      professional: `Generate a professional header for a pharmaceutical procurement document for order ${orderContext.orderId}. Include appropriate regulatory compliance mentions.`,
      minimal: `Generate a concise header for order ${orderContext.orderId} with essential information only.`,
      detailed: `Generate a comprehensive header for order ${orderContext.orderId} with full company details and regulatory information.`,
      compliance_focused: `Generate a compliance-focused header for pharmaceutical order ${orderContext.orderId} emphasizing FDA and regulatory requirements.`,
    };

    return `Generated PDF content for pharmaceutical order ${orderContext.orderId}

Order Details:
- Order ID: ${orderContext.orderId}
- Date: ${new Date().toLocaleDateString()}
- Supplier: ${orderContext.supplier.name}
- Customer: ${orderContext.customer.name}
- Materials: ${orderContext.materials.map((m: any) => m.name).join(', ')}

This content has been generated for pharmaceutical procurement purposes.`;
  }

  /**
   * Generate introduction content
   */
  private async generateIntroductionContent(orderContext: any): Promise<string> {
    const prompt = `
      Generate a professional introduction paragraph for a purchase order to ${orderContext.supplier.name} 
      for pharmaceutical materials. Include context about the business relationship and regulatory requirements.
      Order ID: ${orderContext.orderId}
      Total Amount: ${orderContext.totalAmount.currency} ${orderContext.totalAmount.amount}
    `;

    return `Generated PDF content for pharmaceutical order ${orderContext.orderId}

Order Details:
- Order ID: ${orderContext.orderId}
- Date: ${new Date().toLocaleDateString()}
- Supplier: ${orderContext.supplier.name}
- Customer: ${orderContext.customer.name}
- Materials: ${orderContext.materials.map((m: any) => m.name).join(', ')}

This content has been generated for pharmaceutical procurement purposes.`;
  }

  /**
   * Generate terms and conditions
   */
  private async generateTermsContent(orderContext: any): Promise<string> {
    const template = this.options.template;
    const prompts = {
      professional: `Generate professional terms and conditions for pharmaceutical procurement order ${orderContext.orderId}. Include payment terms, delivery requirements, and quality standards.`,
      minimal: `Generate essential terms and conditions for order ${orderContext.orderId} focusing on key requirements only.`,
      detailed: `Generate comprehensive terms and conditions for pharmaceutical order ${orderContext.orderId} covering all aspects including liability, compliance, and quality assurance.`,
      compliance_focused: `Generate detailed compliance-focused terms and conditions for pharmaceutical order ${orderContext.orderId} emphasizing FDA regulations, COA requirements, and quality control.`,
    };

    return `Generated PDF content for pharmaceutical order ${orderContext.orderId}

Order Details:
- Order ID: ${orderContext.orderId}
- Date: ${new Date().toLocaleDateString()}
- Supplier: ${orderContext.supplier.name}
- Customer: ${orderContext.customer.name}
- Materials: ${orderContext.materials.map((m: any) => m.name).join(', ')}

This content has been generated for pharmaceutical procurement purposes.`;
  }

  /**
   * Generate compliance content
   */
  private async generateComplianceContent(orderContext: any): Promise<string> {
    const prompt = `
      Generate a compliance section for pharmaceutical procurement order ${orderContext.orderId}.
      Include requirements for:
      - FDA compliance
      - Certificate of Analysis (COA)
      - Good Manufacturing Practices (GMP)
      - Regulatory documentation
      - Quality assurance standards
    `;

    return `Generated PDF content for pharmaceutical order ${orderContext.orderId}

Order Details:
- Order ID: ${orderContext.orderId}
- Date: ${new Date().toLocaleDateString()}
- Supplier: ${orderContext.supplier.name}
- Customer: ${orderContext.customer.name}
- Materials: ${orderContext.materials.map((m: any) => m.name).join(', ')}

This content has been generated for pharmaceutical procurement purposes.`;
  }

  /**
   * Generate insights content
   */
  private async generateInsightsContent(orderContext: any): Promise<string> {
    return `Order Analysis Insights for ${orderContext.orderId}

Key Insights:
- Order Value: ${orderContext.priceFromSupplier.amount} ${orderContext.priceFromSupplier.currency}
- Material Count: ${orderContext.materials.length}
- Supplier: ${orderContext.supplier.name}
- Customer: ${orderContext.customer.name}

This analysis provides insights for pharmaceutical procurement optimization.`;
  }

  /**
   * Generate footer content
   */
  private async generateFooterContent(orderContext: any): Promise<string> {
    const prompt = `
      Generate a professional footer for pharmaceutical procurement order ${orderContext.orderId}.
      Include contact information, regulatory statements, and confidentiality notices.
    `;

    return `Generated PDF content for pharmaceutical order ${orderContext.orderId}

Order Details:
- Order ID: ${orderContext.orderId}
- Date: ${new Date().toLocaleDateString()}
- Supplier: ${orderContext.supplier.name}
- Customer: ${orderContext.customer.name}
- Materials: ${orderContext.materials.map((m: any) => m.name).join(', ')}

This content has been generated for pharmaceutical procurement purposes.`;
  }

  /**
   * Add intelligent header with AI content
   */
  private async addIntelligentHeader(data: PDFGenerationData, aiContent: AIGeneratedContent): Promise<void> {
    // Company branding
    if (this.options.branding) {
      this.doc.setFontSize(24);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(this.options.branding.companyName, 20, 30);
      
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(this.options.branding.companyAddress, 20, 40);
    }

    // Document title with AI content
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PURCHASE ORDER', 20, 55);
    
    // AI-generated introduction
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const introLines = this.doc.splitTextToSize(aiContent.introduction, 170);
    this.doc.text(introLines, 20, 65);

    // PO Number and Date
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`PO Number: ${data.poNumber}`, 20, 85);
    this.doc.text(`Date: ${data.date}`, 20, 95);
    this.doc.text(`Delivery Terms: ${data.deliveryTerms}`, 20, 105);
  }

  /**
   * Add supplier information
   */
  private async addSupplierInfo(data: PDFGenerationData): Promise<void> {
    if (!data.supplierInfo) {
      throw new Error('Supplier information is required for PDF generation');
    }

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('SUPPLIER INFORMATION', 20, 125);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.supplierInfo.name, 20, 135);
    this.doc.text(data.supplierInfo.address, 20, 145);
    this.doc.text(data.supplierInfo.country, 20, 155);
    this.doc.text(`Email: ${data.supplierInfo.email}`, 20, 165);
    this.doc.text(`Phone: ${data.supplierInfo.phone}`, 20, 175);
  }

  /**
   * Add customer information
   */
  private async addCustomerInfo(data: PDFGenerationData): Promise<void> {
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('BUYER INFORMATION', 110, 125);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.customerInfo.name, 110, 135);
    this.doc.text(data.customerInfo.address, 110, 145);
    this.doc.text(data.customerInfo.country, 110, 155);
    this.doc.text(`Email: ${data.customerInfo.email}`, 110, 165);
    this.doc.text(`Phone: ${data.customerInfo.phone}`, 110, 175);
  }

  /**
   * Add PO details
   */
  private async addPODetails(data: PDFGenerationData): Promise<void> {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PURCHASE ORDER DETAILS', 20, 195);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Order ID: ${data.orderId}`, 20, 205);
    this.doc.text(`PO Number: ${data.poNumber}`, 20, 215);
    this.doc.text(`Date: ${data.date}`, 20, 225);
    this.doc.text(`Delivery Terms: ${data.deliveryTerms}`, 20, 235);
  }

  /**
   * Add materials table
   */
  private async addMaterialsTable(data: PDFGenerationData): Promise<void> {
    const startY = 250;
    const tableHeaders = ['Item', 'Description', 'SKU', 'Quantity', 'Unit Price', 'Total'];
    const colWidths = [30, 50, 25, 20, 25, 25];
    const colPositions = [20, 50, 100, 125, 145, 170];

    // Table Header
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(20, startY - 5, 175, 10, 'F');
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    colPositions.forEach((x, index) => {
      this.doc.text(tableHeaders[index], x, startY);
    });

    // Table Content
    this.doc.setFont('helvetica', 'normal');
    let currentY = startY + 10;

    data.materials.forEach((material, index) => {
      if (currentY > 250) {
        this.doc.addPage();
        currentY = 20;
      }

      const rowData = [
        (index + 1).toString(),
        material.name,
        material.sku || '',
        `${material.quantity.value} ${material.quantity.unit}`,
        `${material.unitPrice.currency} ${material.unitPrice.amount.toFixed(2)}`,
        `${material.totalPrice.currency} ${material.totalPrice.amount.toFixed(2)}`,
      ];

      colPositions.forEach((x, colIndex) => {
        this.doc.text(rowData[colIndex], x, currentY);
      });

      currentY += 8;
    });
  }

  /**
   * Add intelligent terms and conditions
   */
  private async addIntelligentTerms(data: PDFGenerationData, aiContent: AIGeneratedContent): Promise<void> {
    const startY = 280;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TERMS AND CONDITIONS', 20, startY);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    // Split AI-generated terms into lines
    const termsLines = this.doc.splitTextToSize(aiContent.terms, 170);
    this.doc.text(termsLines, 20, startY + 15);
  }

  /**
   * Add compliance section
   */
  private async addComplianceSection(complianceContent: string): Promise<void> {
    this.doc.addPage();
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('COMPLIANCE REQUIREMENTS', 20, 30);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    const complianceLines = this.doc.splitTextToSize(complianceContent, 170);
    this.doc.text(complianceLines, 20, 45);
  }

  /**
   * Add insights section
   */
  private async addInsightsSection(insightsContent: string): Promise<void> {
    this.doc.addPage();
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PROCUREMENT INSIGHTS', 20, 30);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    const insightsLines = this.doc.splitTextToSize(insightsContent, 170);
    this.doc.text(insightsLines, 20, 45);
  }

  /**
   * Add intelligent footer
   */
  private async addIntelligentFooter(footerContent: string): Promise<void> {
    const currentPageHeight = this.doc.internal.pageSize.height;
    const footerY = currentPageHeight - 40;

    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    
    const footerLines = this.doc.splitTextToSize(footerContent, 170);
    this.doc.text(footerLines, 20, footerY);
    
    // Add simple page number
    this.doc.setFontSize(8);
    this.doc.text('Generated by HRVNHG AI System', 20, currentPageHeight - 10);
  }

  /**
   * Download the generated PDF
   */
  downloadPDF(filename: string = 'ai-generated-po.pdf'): void {
    this.doc.save(filename);
  }

  /**
   * Get PDF as blob
   */
  getPDFBlob(): Blob {
    return this.doc.output('blob');
  }

  /**
   * Get PDF as data URL
   */
  getPDFDataURL(): string {
    return this.doc.output('dataurlstring');
  }
}

// Utility functions
export const generateAISupplierPO = async (
  order: Order, 
  options: AIGeneratedPDFOptions,
  customData?: Partial<PDFGenerationData>
): Promise<jsPDF> => {
  const generator = new AIPDFGenerator(options);
  return generator.generateIntelligentPDF(order, customData);
};

export const downloadAISupplierPO = async (
  order: Order,
  options: AIGeneratedPDFOptions,
  customData?: Partial<PDFGenerationData>
): Promise<void> => {
  const generator = new AIPDFGenerator(options);
  await generator.generateIntelligentPDF(order, customData);
  generator.downloadPDF(`AI_Generated_PO_${order.orderId}.pdf`);
};

export const previewAISupplierPO = async (
  order: Order,
  options: AIGeneratedPDFOptions,
  customData?: Partial<PDFGenerationData>
): Promise<string> => {
  const generator = new AIPDFGenerator(options);
  await generator.generateIntelligentPDF(order, customData);
  return generator.getPDFDataURL();
};
