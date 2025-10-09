import { ContactInfo } from '../types';

export interface Supplier extends ContactInfo {
  id: string;
  isActive: boolean;
  specialties: string[];
  rating: number;
  lastOrderDate?: string;
}

export const mockSuppliers: Supplier[] = [
  {
    id: 'supplier-1',
    name: 'PureChem API Manufacturing Ltd',
    address: '456 Chemical Industrial Zone, Building 15',
    country: 'India',
    email: 'sales@purechemapi.com',
    phone: '+91-22-1234-5678',
    gstin: '27AABCP1234D1Z5',
    isActive: true,
    specialties: ['Paracetamol API', 'Ibuprofen API', 'Aspirin API'],
    rating: 4.8,
    lastOrderDate: '2024-01-15',
  },
  {
    id: 'supplier-2',
    name: 'Global Pharma Solutions Inc',
    address: '789 Pharmaceutical Drive, Suite 200',
    country: 'USA',
    email: 'orders@globalpharma.com',
    phone: '+1-555-0123',
    gstin: '12ABCDE1234F1G5',
    isActive: true,
    specialties: ['Microcrystalline Cellulose', 'Magnesium Stearate', 'Lactose'],
    rating: 4.6,
    lastOrderDate: '2024-01-10',
  },
  {
    id: 'supplier-3',
    name: 'BioActive Ingredients Co',
    address: '123 Research Park, Lab Building 5',
    country: 'Germany',
    email: 'info@bioactive.com',
    phone: '+49-30-1234-5678',
    gstin: 'DE123456789',
    isActive: true,
    specialties: ['Vitamin D3', 'Omega-3', 'Probiotics'],
    rating: 4.9,
    lastOrderDate: '2024-01-12',
  },
  {
    id: 'supplier-4',
    name: 'MediForm Excipients Ltd',
    address: '456 Industrial Estate, Unit 12',
    country: 'China',
    email: 'sales@mediform.com',
    phone: '+86-21-1234-5678',
    gstin: 'CN123456789012',
    isActive: true,
    specialties: ['Starch', 'Talc', 'Silicon Dioxide'],
    rating: 4.4,
    lastOrderDate: '2024-01-08',
  },
  {
    id: 'supplier-5',
    name: 'PharmaTech Innovations',
    address: '789 Science Park, Innovation Hub',
    country: 'Singapore',
    email: 'contact@pharmatech.sg',
    phone: '+65-6123-4567',
    gstin: 'SG123456789A',
    isActive: true,
    specialties: ['Controlled Release', 'Sustained Release', 'Immediate Release'],
    rating: 4.7,
    lastOrderDate: '2024-01-14',
  },
];

export const searchSuppliers = (query: string): Supplier[] => {
  if (!query.trim()) return mockSuppliers;
  
  const lowercaseQuery = query.toLowerCase();
  return mockSuppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(lowercaseQuery) ||
    supplier.specialties.some(specialty => specialty.toLowerCase().includes(lowercaseQuery)) ||
    supplier.country.toLowerCase().includes(lowercaseQuery)
  );
};

export const addSupplier = (supplierData: Omit<Supplier, 'id'>): Supplier => {
  const newSupplier: Supplier = {
    ...supplierData,
    id: `supplier-${Date.now()}`,
    isActive: true,
    rating: 0,
  };
  
  mockSuppliers.push(newSupplier);
  return newSupplier;
};

