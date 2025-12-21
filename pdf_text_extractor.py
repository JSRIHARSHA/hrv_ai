"""
Standalone PDF Text Extractor
Reads a Purchase Order PDF and extracts all text content.
"""

import sys
import argparse
from pathlib import Path


def extract_text_from_pdf(pdf_path):
    """
    Extract text from a PDF file.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        str: Extracted text content from the PDF
    """
    try:
        import pdfplumber
        
        text_content = []
        
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Processing PDF: {pdf_path}")
            print(f"Total pages: {len(pdf.pages)}\n")
            
            for page_num, page in enumerate(pdf.pages, start=1):
                print(f"Extracting text from page {page_num}...")
                page_text = page.extract_text()
                
                if page_text:
                    text_content.append(f"\n--- Page {page_num} ---\n")
                    text_content.append(page_text)
                else:
                    text_content.append(f"\n--- Page {page_num} (No text found) ---\n")
        
        return "\n".join(text_content)
        
    except ImportError as e:
        print("Error: pdfplumber library is not installed.")
        print(f"Import error details: {str(e)}")
        print(f"\nPython executable: {sys.executable}")
        print(f"Python version: {sys.version}")
        print(f"\nTo fix this issue:")
        print(f"1. Make sure you're using the same Python interpreter where pdfplumber is installed")
        print(f"2. Install pdfplumber using: {sys.executable} -m pip install pdfplumber")
        print(f"3. Or if using pip directly: pip install pdfplumber")
        print(f"\nTo verify installation, run: {sys.executable} -m pip show pdfplumber")
        sys.exit(1)
    except FileNotFoundError:
        print(f"Error: File not found: {pdf_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        sys.exit(1)


def main():
    """Main function to handle command line arguments and execute text extraction."""
    parser = argparse.ArgumentParser(
        description="Extract text content from a Purchase Order PDF file"
    )
    parser.add_argument(
        "pdf_path",
        type=str,
        help="Path to the PDF file to extract text from"
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        help="Output file path to save extracted text (optional)"
    )
    
    args = parser.parse_args()
    
    # Validate PDF file exists
    pdf_path = Path(args.pdf_path)
    if not pdf_path.exists():
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    if not pdf_path.suffix.lower() == '.pdf':
        print(f"Warning: File does not have .pdf extension: {pdf_path}")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    # Extract text from PDF
    extracted_text = extract_text_from_pdf(str(pdf_path))
    
    # Output results
    if args.output:
        # Save to file
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(extracted_text)
        print(f"\nText extracted successfully and saved to: {output_path}")
    else:
        # Print to console
        print("\n" + "="*80)
        print("EXTRACTED TEXT CONTENT")
        print("="*80)
        print(extracted_text)
        print("="*80)


if __name__ == "__main__":
    main()

