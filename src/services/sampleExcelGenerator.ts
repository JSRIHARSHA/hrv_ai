import * as XLSX from 'xlsx';
import { Order } from '../types';

export class SampleExcelGenerator {
  /**
   * Create a comprehensive sample Excel file with multiple orders
   */
  static createSampleExcelFile(): void {
    const sampleOrders: Order[] = [
      {
        orderId: 'ORD-SAMPLE-001',
        createdAt: new Date().toISOString(),
        createdBy: {
          userId: 'user1',
          name: 'John Smith',
          role: 'Employee',
        },
        customer: {
          name: 'MediPharm Solutions Inc',
          address: '789 Pharmaceutical Drive, Suite 200',
          country: 'USA',
          email: 'procurement@medipharm.com',
          phone: '+1-555-0123',
          gstin: '',
        },
        supplier: {
          name: 'PureChem API Manufacturing Ltd',
          address: '456 Chemical Industrial Zone, Building 15',
          country: 'India',
          email: 'sales@purechemapi.com',
          phone: '+91-22-1234-5678',
          gstin: '22AAAAA0000A1Z5',
        },
        materialName: 'Active Pharmaceutical Ingredient (API) - Paracetamol',
        materials: [
          {
            id: 'mat-sample-1',
            name: 'Active Pharmaceutical Ingredient (API) - Paracetamol',
            sku: 'API-PAR-001',
            quantity: { value: 1000, unit: 'kg' },
            unitPrice: { amount: 45.50, currency: 'USD' },
            totalPrice: { amount: 45500, currency: 'USD' },
            description: 'High-purity Paracetamol API, USP grade, Batch #PAR2024001',
          },
        ],
        quantity: { value: 1000, unit: 'kg' },
        priceToCustomer: { amount: 51500, currency: 'USD' },
        priceFromSupplier: { amount: 45000, currency: 'USD' },
        status: 'PO_Received_from_Client',
        documents: {},
        assignedTo: {
          userId: 'user2',
          name: 'Sarah Johnson',
          role: 'Employee',
        },
        auditLogs: [
          {
            timestamp: new Date().toISOString(),
            userId: 'user1',
            userName: 'John Smith',
            fieldChanged: 'status',
            oldValue: '',
            newValue: 'PO_Received_from_Client',
            note: 'Order created from customer PO',
          },
        ],
        comments: [
          {
            id: 'comment-sample-1',
            timestamp: new Date().toISOString(),
            userId: 'user1',
            userName: 'John Smith',
            message: 'Customer requires expedited delivery for urgent production schedule.',
            isInternal: false,
          },
        ],
        approvalRequests: [],
        timeline: [
          {
            id: 'timeline-sample-1',
            timestamp: new Date().toISOString(),
            event: 'Order Created',
            actor: {
              userId: 'user1',
              name: 'John Smith',
              role: 'Employee',
            },
            details: 'Customer PO received and order created',
            status: 'PO_Received_from_Client',
          },
        ],
        poNumber: 'PO-SAMPLE-001',
        deliveryTerms: 'FOB',
        incoterms: 'FOB Mumbai',
        eta: '2024-03-01',
        notes: 'Urgent delivery required for production schedule',
        hsnCode: '3004.90.90',
        enquiryNo: 'ENQ-SAMPLE-001',
        upc: '123456789012',
        ean: '1234567890123',
        mpn: 'API-PAR-001',
        isbn: '978-0-123456-78-9',
        inventoryAccount: 'Stock-In + Hand',
        inventoryValuationMethod: 'FIFO(First In First Out)',
        supplierPOGenerated: false,
        supplierPOSent: false,
        rfid: 'RFID-SAMPLE-001',
        entity: 'HRV',
      },
      {
        orderId: 'ORD-SAMPLE-002',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        createdBy: {
          userId: 'user1',
          name: 'John Smith',
          role: 'Employee',
        },
        customer: {
          name: 'BioPharma Therapeutics',
          address: '321 Research Boulevard, Lab Complex A',
          country: 'Germany',
          email: 'procurement@biopharma.de',
          phone: '+49-30-9876-5432',
          gstin: '',
        },
        supplier: {
          name: 'Excipient Solutions GmbH',
          address: '789 Pharmaceutical Park, Building C',
          country: 'Germany',
          email: 'orders@excipientsolutions.de',
          phone: '+49-30-1234-5678',
          gstin: 'DE123456789',
        },
        materialName: 'Excipient - Microcrystalline Cellulose',
        materials: [
          {
            id: 'mat-sample-2',
            name: 'Excipient - Microcrystalline Cellulose',
            sku: 'EXC-MCC-002',
            quantity: { value: 500, unit: 'kg' },
            unitPrice: { amount: 12.00, currency: 'USD' },
            totalPrice: { amount: 6000, currency: 'USD' },
            description: 'Pharmaceutical grade MCC, NF grade, suitable for tablet formulation',
          },
        ],
        quantity: { value: 500, unit: 'kg' },
        priceToCustomer: { amount: 6000, currency: 'USD' },
        priceFromSupplier: { amount: 5000, currency: 'USD' },
        status: 'PO_Sent_to_Supplier',
        documents: {
          customerPO: {
            id: 'doc-sample-1',
            filename: 'customer_po_sample_002.pdf',
            uploadedAt: new Date(Date.now() - 86400000).toISOString(),
            uploadedBy: {
              userId: 'user1',
              name: 'John Smith',
            },
            fileSize: 198432,
            mimeType: 'application/pdf',
          },
          supplierPO: {
            id: 'doc-sample-2',
            filename: 'supplier_po_sample_002.pdf',
            uploadedAt: new Date(Date.now() - 82800000).toISOString(), // 10 hours ago
            uploadedBy: {
              userId: 'user2',
              name: 'Sarah Johnson',
            },
            fileSize: 189440,
            mimeType: 'application/pdf',
          },
        },
        assignedTo: {
          userId: 'user3',
          name: 'Mike Chen',
          role: 'Employee',
        },
        auditLogs: [
          {
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            userId: 'user1',
            userName: 'John Smith',
            fieldChanged: 'status',
            oldValue: '',
            newValue: 'PO_Received_from_Client',
            note: 'Order created from customer PO',
          },
          {
            timestamp: new Date(Date.now() - 82800000).toISOString(),
            userId: 'user2',
            userName: 'Sarah Johnson',
            fieldChanged: 'status',
            oldValue: 'PO_Received_from_Client',
            newValue: 'PO_Sent_to_Supplier',
            note: 'Supplier PO generated and sent',
          },
        ],
        comments: [
          {
            id: 'comment-sample-2',
            timestamp: new Date(Date.now() - 82800000).toISOString(),
            userId: 'user2',
            userName: 'Sarah Johnson',
            message: 'Supplier confirmed receipt of PO. Expected response within 2 business days.',
            isInternal: true,
          },
        ],
        approvalRequests: [],
        timeline: [
          {
            id: 'timeline-sample-2',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            event: 'Order Created',
            actor: {
              userId: 'user1',
              name: 'John Smith',
              role: 'Employee',
            },
            details: 'Customer PO received and order created',
            status: 'PO_Received_from_Client',
          },
          {
            id: 'timeline-sample-3',
            timestamp: new Date(Date.now() - 82800000).toISOString(),
            event: 'PO Sent to Supplier',
            actor: {
              userId: 'user2',
              name: 'Sarah Johnson',
              role: 'Employee',
            },
            details: 'Supplier PO drafted and sent to supplier',
            status: 'PO_Sent_to_Supplier',
          },
        ],
        poNumber: 'PO-SAMPLE-002',
        deliveryTerms: 'CIF',
        incoterms: 'CIF Mumbai',
        eta: '2024-03-15',
        notes: 'Standard processing timeline',
        hsnCode: '3004.90.90',
        enquiryNo: 'ENQ-SAMPLE-002',
        upc: '234567890123',
        ean: '2345678901234',
        mpn: 'EXC-MCC-002',
        isbn: '978-0-234567-89-0',
        inventoryAccount: 'Stock-In + Hand',
        inventoryValuationMethod: 'FIFO(First In First Out)',
        supplierPOGenerated: true,
        supplierPOSent: true,
        rfid: 'RFID-SAMPLE-002',
        entity: 'NHG',
      },
      {
        orderId: 'ORD-SAMPLE-003',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        createdBy: {
          userId: 'user1',
          name: 'John Smith',
          role: 'Employee',
        },
        customer: {
          name: 'Global Pharma Corp',
          address: '555 Medical Center Drive',
          country: 'USA',
          email: 'orders@globalpharma.com',
          phone: '+1-555-9876',
          gstin: '',
        },
        supplier: {
          name: 'API Manufacturing Co',
          address: '123 Industrial Zone',
          country: 'China',
          email: 'sales@apimanufacturing.com',
          phone: '+86-21-1234-5678',
          gstin: 'CN123456789',
        },
        materialName: 'Active Pharmaceutical Ingredients',
        materials: [
          {
            id: 'mat-sample-3',
            name: 'Active Pharmaceutical Ingredient (API) - Ibuprofen',
            sku: 'API-IBU-003',
            quantity: { value: 2000, unit: 'kg' },
            unitPrice: { amount: 35.00, currency: 'USD' },
            totalPrice: { amount: 70000, currency: 'USD' },
            description: 'High-purity Ibuprofen API, USP grade, Batch #IBU2024003',
          },
        ],
        quantity: { value: 2000, unit: 'kg' },
        priceToCustomer: { amount: 77000, currency: 'USD' },
        priceFromSupplier: { amount: 70000, currency: 'USD' },
        status: 'Awaiting_COA',
        documents: {
          customerPO: {
            id: 'doc-sample-3',
            filename: 'customer_po_sample_003.pdf',
            uploadedAt: new Date(Date.now() - 172800000).toISOString(),
            uploadedBy: {
              userId: 'user1',
              name: 'John Smith',
            },
            fileSize: 312456,
            mimeType: 'application/pdf',
          },
          supplierPO: {
            id: 'doc-sample-4',
            filename: 'supplier_po_sample_003.pdf',
            uploadedAt: new Date(Date.now() - 165600000).toISOString(), // 20 hours ago
            uploadedBy: {
              userId: 'user2',
              name: 'Sarah Johnson',
            },
            fileSize: 201234,
            mimeType: 'application/pdf',
          },
          proformaInvoice: {
            id: 'doc-sample-5',
            filename: 'proforma_invoice_sample_003.pdf',
            uploadedAt: new Date(Date.now() - 144000000).toISOString(), // 8 hours ago
            uploadedBy: {
              userId: 'user2',
              name: 'Sarah Johnson',
            },
            fileSize: 187654,
            mimeType: 'application/pdf',
          },
        },
        assignedTo: {
          userId: 'user4',
          name: 'Emily Davis',
          role: 'Employee',
        },
        auditLogs: [
          {
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            userId: 'user1',
            userName: 'John Smith',
            fieldChanged: 'status',
            oldValue: '',
            newValue: 'PO_Received_from_Client',
            note: 'Order created from customer PO',
          },
          {
            timestamp: new Date(Date.now() - 165600000).toISOString(),
            userId: 'user2',
            userName: 'Sarah Johnson',
            fieldChanged: 'status',
            oldValue: 'PO_Received_from_Client',
            newValue: 'PO_Sent_to_Supplier',
            note: 'Supplier PO generated and sent',
          },
          {
            timestamp: new Date(Date.now() - 144000000).toISOString(),
            userId: 'user2',
            userName: 'Sarah Johnson',
            fieldChanged: 'status',
            oldValue: 'PO_Sent_to_Supplier',
            newValue: 'Awaiting_COA',
            note: 'Proforma invoice received, awaiting COA',
          },
        ],
        comments: [
          {
            id: 'comment-sample-3',
            timestamp: new Date(Date.now() - 144000000).toISOString(),
            userId: 'user2',
            userName: 'Sarah Johnson',
            message: 'COA required before shipment can proceed',
            isInternal: true,
          },
        ],
        approvalRequests: [],
        timeline: [
          {
            id: 'timeline-sample-4',
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            event: 'Order Created',
            actor: {
              userId: 'user1',
              name: 'John Smith',
              role: 'Employee',
            },
            details: 'Customer PO received and order created',
            status: 'PO_Received_from_Client',
          },
          {
            id: 'timeline-sample-5',
            timestamp: new Date(Date.now() - 165600000).toISOString(),
            event: 'PO Sent to Supplier',
            actor: {
              userId: 'user2',
              name: 'Sarah Johnson',
              role: 'Employee',
            },
            details: 'Supplier PO drafted and sent to supplier',
            status: 'PO_Sent_to_Supplier',
          },
          {
            id: 'timeline-sample-6',
            timestamp: new Date(Date.now() - 144000000).toISOString(),
            event: 'Proforma Invoice Received',
            actor: {
              userId: 'user2',
              name: 'Sarah Johnson',
              role: 'Employee',
            },
            details: 'Proforma invoice received from supplier',
            status: 'Awaiting_COA',
          },
        ],
        poNumber: 'PO-SAMPLE-003',
        deliveryTerms: 'EXW',
        incoterms: 'EXW Mumbai',
        eta: '2024-03-20',
        notes: 'COA required before shipment',
        hsnCode: '3004.90.90',
        enquiryNo: 'ENQ-SAMPLE-003',
        upc: '345678901234',
        ean: '3456789012345',
        mpn: 'API-IBU-003',
        isbn: '978-0-345678-90-1',
        inventoryAccount: 'Stock-In + Hand',
        inventoryValuationMethod: 'FIFO(First In First Out)',
        supplierPOGenerated: true,
        supplierPOSent: true,
        rfid: 'RFID-SAMPLE-003',
        entity: 'HRV',
      },
    ];

    // Convert orders to Excel format
    const excelData = sampleOrders.map(order => ({
      orderId: order.orderId,
      createdAt: order.createdAt,
      createdBy: order.createdBy.userId,
      createdByName: order.createdBy.name,
      createdByRole: order.createdBy.role,
      customerName: order.customer.name,
      customerAddress: order.customer.address,
      customerCountry: order.customer.country,
      customerEmail: order.customer.email,
      customerPhone: order.customer.phone,
      customerGstin: order.customer.gstin || '',
      supplierName: order.supplier?.name || '',
      supplierAddress: order.supplier?.address || '',
      supplierCountry: order.supplier?.country || '',
      supplierEmail: order.supplier?.email || '',
      supplierPhone: order.supplier?.phone || '',
      supplierGstin: order.supplier?.gstin || '',
      materialName: order.materialName,
      materialsJson: JSON.stringify(order.materials),
      quantityValue: order.quantity.value,
      quantityUnit: order.quantity.unit,
      priceToCustomerAmount: order.priceToCustomer.amount,
      priceToCustomerCurrency: order.priceToCustomer.currency,
      priceFromSupplierAmount: order.priceFromSupplier.amount,
      priceFromSupplierCurrency: order.priceFromSupplier.currency,
      status: order.status,
      documentsJson: JSON.stringify(order.documents),
      assignedTo: order.assignedTo.userId,
      assignedToName: order.assignedTo.name,
      assignedToRole: order.assignedTo.role,
      poNumber: order.poNumber || '',
      deliveryTerms: order.deliveryTerms || '',
      incoterms: order.incoterms || '',
      eta: order.eta || '',
      notes: order.notes || '',
      hsnCode: order.hsnCode || '',
      enquiryNo: order.enquiryNo || '',
      upc: order.upc || '',
      ean: order.ean || '',
      mpn: order.mpn || '',
      isbn: order.isbn || '',
      inventoryAccount: order.inventoryAccount || '',
      inventoryValuationMethod: order.inventoryValuationMethod || '',
      supplierPOGenerated: order.supplierPOGenerated || false,
      supplierPOSent: order.supplierPOSent || false,
      timelineJson: JSON.stringify(order.timeline),
      auditLogsJson: JSON.stringify(order.auditLogs),
      commentsJson: JSON.stringify(order.comments),
      paymentDetailsJson: JSON.stringify(order.paymentDetails || {}),
      rfid: order.rfid || '',
      entity: order.entity || '',
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_orders_template.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
