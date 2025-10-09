import * as pdfjsLib from 'pdfjs-dist';
import * as Tesseract from 'tesseract.js';
import { ParsedDocument, OCRResult } from '../types';

// Set up PDF.js worker - use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export class PDFParser {
  private static instance: PDFParser;
  private tesseractWorker: Tesseract.Worker | null = null;

  public static getInstance(): PDFParser {
    if (!PDFParser.instance) {
      PDFParser.instance = new PDFParser();
    }
    return PDFParser.instance;
  }

  /**
   * Parse PDF file and extract text with OCR fallback
   */
  async parsePDF(file: File): Promise<ParsedDocument> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      const numPages = pdf.numPages;
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      // Get PDF metadata
      const metadata = await pdf.getMetadata();
      
      const parsedDoc: ParsedDocument = {
        text: fullText.trim(),
        metadata: {
          title: (metadata.info as any)?.Title,
          author: (metadata.info as any)?.Author,
          subject: (metadata.info as any)?.Subject,
          creator: (metadata.info as any)?.Creator,
          producer: (metadata.info as any)?.Producer,
          creationDate: (metadata.info as any)?.CreationDate ? new Date((metadata.info as any).CreationDate) : undefined,
          modificationDate: (metadata.info as any)?.ModDate ? new Date((metadata.info as any).ModDate) : undefined,
          pages: numPages,
          info: metadata.info,
        },
        confidence: 0.9,
        documentType: 'pdf',
      };

      // If text extraction is poor (less than 50 characters), try OCR
      if (fullText.length < 50) {
        console.log('Low text extraction quality, attempting OCR...');
        const ocrText = await this.performOCR(file);
        parsedDoc.text = ocrText.text;
        parsedDoc.confidence = ocrText.confidence;
      }

      return parsedDoc;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Word document (simplified - just return basic info)
   */
  async parseWord(file: File): Promise<ParsedDocument> {
    try {
      // For now, just return basic document info
      // In a real implementation, you'd need a browser-compatible Word parser
      return {
        text: `Word document: ${file.name}\n\nNote: Word document parsing requires additional setup. Please convert to PDF for full text extraction.`,
        metadata: {
          pages: 1,
        },
        confidence: 0.5,
        documentType: file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'doc',
      };
    } catch (error) {
      console.error('Word document parsing error:', error);
      throw new Error(`Failed to parse Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse image files using OCR
   */
  async parseImage(file: File): Promise<ParsedDocument> {
    try {
      const ocrResult = await this.performOCR(file);
      
      return {
        text: ocrResult.text,
        metadata: {
          pages: 1,
        },
        confidence: ocrResult.confidence,
        documentType: 'image',
      };
    } catch (error) {
      console.error('Image parsing error:', error);
      throw new Error(`Failed to parse image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform OCR on file
   */
  async performOCR(file: File): Promise<OCRResult> {
    try {
      // Convert file to image data
      const imageData = await this.fileToImageData(file);
      
      // Perform OCR using Tesseract.js
      const { data } = await Tesseract.recognize(imageData, 'eng', {
        logger: (m: any) => console.log(m), // Log progress
      });
      
      return {
        text: data.text,
        confidence: data.confidence / 100, // Convert to 0-1 scale
        words: (data as any).words?.map((word: any) => ({
          text: word.text,
          confidence: word.confidence / 100,
          bbox: word.bbox,
        })) || [],
      };
    } catch (error) {
      console.error('OCR error:', error);
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert file to image data for OCR
   */
  private async fileToImageData(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as data URL'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Auto-detect document type and parse accordingly
   */
  async parseDocument(file: File): Promise<ParsedDocument> {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      return this.parsePDF(file);
    } else if (fileName.endsWith('.docx')) {
      return this.parseWord(file);
    } else if (fileName.endsWith('.doc')) {
      return this.parseWord(file);
    } else if (this.isImageFile(fileName)) {
      return this.parseImage(file);
    } else {
      throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
    }
  }

  /**
   * Check if file is an image
   */
  private isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
    return imageExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Extract specific sections from parsed text
   */
  extractSections(text: string, documentType: string): Record<string, string> {
    const sections: Record<string, string> = {};
    
    switch (documentType.toLowerCase()) {
      case 'customer_po':
        sections.customerInfo = this.extractSection(text, ['customer', 'buyer', 'bill to']);
        sections.supplierInfo = this.extractSection(text, ['supplier', 'vendor', 'seller']);
        sections.items = this.extractSection(text, ['items', 'products', 'materials', 'goods']);
        sections.payment = this.extractSection(text, ['payment', 'terms', 'invoice']);
        break;
        
      case 'supplier_po':
        sections.supplierInfo = this.extractSection(text, ['supplier', 'vendor', 'seller']);
        sections.customerInfo = this.extractSection(text, ['customer', 'buyer', 'bill to']);
        sections.items = this.extractSection(text, ['items', 'products', 'materials']);
        sections.delivery = this.extractSection(text, ['delivery', 'shipping', 'terms']);
        break;
        
      case 'proforma_invoice':
        sections.supplierInfo = this.extractSection(text, ['supplier', 'vendor', 'seller']);
        sections.customerInfo = this.extractSection(text, ['customer', 'buyer', 'bill to']);
        sections.items = this.extractSection(text, ['items', 'products', 'materials']);
        sections.payment = this.extractSection(text, ['payment', 'terms', 'invoice']);
        sections.shipping = this.extractSection(text, ['shipping', 'delivery', 'freight']);
        break;
        
      case 'coa':
        sections.productInfo = this.extractSection(text, ['product', 'material', 'sample']);
        sections.analysis = this.extractSection(text, ['analysis', 'test', 'results']);
        sections.specifications = this.extractSection(text, ['specification', 'standard', 'requirement']);
        sections.certification = this.extractSection(text, ['certificate', 'approval', 'compliance']);
        break;
        
      default:
        // Generic extraction
        sections.content = text;
    }
    
    return sections;
  }

  /**
   * Extract section based on keywords
   */
  private extractSection(text: string, keywords: string[]): string {
    const lines = text.split('\n');
    let sectionLines: string[] = [];
    let inSection = false;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Check if line contains any of the keywords
      if (keywords.some(keyword => lowerLine.includes(keyword))) {
        inSection = true;
        sectionLines.push(line);
      } else if (inSection) {
        // Check if we've moved to a new section (empty line or new keyword pattern)
        if (line.trim() === '' || this.isNewSection(line)) {
          break;
        }
        sectionLines.push(line);
      }
    }
    
    return sectionLines.join('\n');
  }

  /**
   * Check if line indicates a new section
   */
  private isNewSection(line: string): boolean {
    const sectionKeywords = [
      'customer', 'supplier', 'vendor', 'buyer', 'seller',
      'items', 'products', 'materials', 'goods',
      'payment', 'terms', 'delivery', 'shipping',
      'invoice', 'purchase order', 'quotation'
    ];
    
    const lowerLine = line.toLowerCase();
    return sectionKeywords.some(keyword => lowerLine.includes(keyword));
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Tesseract.js handles cleanup automatically
    this.tesseractWorker = null;
  }
}

// Export singleton instance
export const pdfParser = PDFParser.getInstance();
