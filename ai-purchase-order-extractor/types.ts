export interface LineItem {
  materialName: string;
  materialGrade: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  poNumber: string | null;
  issueDate: string | null;
  customerName: string | null;
  customerAddress: string | null;
  customerEmail: string | null;
  customerContact: string | null;
  customerGstin: string | null;
  shipmentDetails: string | null;
  items: LineItem[];
  subtotal: number | null;
  tax: number | null;
  totalAmount: number | null;
}
