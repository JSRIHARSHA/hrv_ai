import React from 'react';
import type { PurchaseOrder } from '../types';

interface ExtractionResultProps {
  data: PurchaseOrder;
}

const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
    <div className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{children}</div>
  </div>
);

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const ExtractionResult: React.FC<ExtractionResultProps> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Extraction Complete</h2>
          <p className="text-gray-500 dark:text-gray-400">Review the extracted purchase order details below.</p>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          <p className="text-lg font-semibold text-gray-800 dark:text-white">PO #: <span className="text-blue-500">{data.poNumber || 'N/A'}</span></p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Date: {data.issueDate || 'N/A'}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Customer Details</h3>
            <div className="text-gray-800 dark:text-gray-200 text-sm space-y-1">
              <p><strong>Name:</strong> {data.customerName || 'N/A'}</p>
              <div className="whitespace-pre-line"><strong>Address:</strong> {data.customerAddress || 'N/A'}</div>
              <p><strong>Email:</strong> {data.customerEmail || 'N/A'}</p>
              <p><strong>Contact:</strong> {data.customerContact || 'N/A'}</p>
              <p><strong>GSTIN:</strong> {data.customerGstin || 'N/A'}</p>
            </div>
        </div>
        <InfoCard title="Shipment Details">
          {data.shipmentDetails || 'Not specified'}
        </InfoCard>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Line Items</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Material Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Material Grade</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unit Price</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Price</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900 dark:text-white">{item.materialName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.materialGrade || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-300">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-300">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-300">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-sm space-y-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Subtotal</span>
            <span>{formatCurrency(data.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Tax</span>
            <span>{formatCurrency(data.tax)}</span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>
          <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
            <span>Total Amount</span>
            <span>{formatCurrency(data.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtractionResult;
