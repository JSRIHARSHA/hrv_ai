import { FreightHandler } from '../types';

export const mockFreightHandlers: FreightHandler[] = [
  {
    id: 'fh-001',
    name: 'DHL Express',
    company: 'DHL International GmbH',
    address: 'Bonn, Germany',
    country: 'Germany',
    email: 'customer.service@dhl.com',
    phone: '+49 228 4333112',
    contactPerson: 'John Smith',
    gstin: 'DE123456789',
    shippingMethod: 'Air Express',
    estimatedDelivery: '2-3 business days',
    notes: 'Global express shipping specialist'
  },
  {
    id: 'fh-002',
    name: 'FedEx',
    company: 'FedEx Corporation',
    address: 'Memphis, TN, USA',
    country: 'United States',
    email: 'support@fedex.com',
    phone: '+1 800 463 3339',
    contactPerson: 'Sarah Johnson',
    gstin: 'US987654321',
    shippingMethod: 'Air Freight',
    estimatedDelivery: '1-2 business days',
    notes: 'Reliable international shipping'
  },
  {
    id: 'fh-003',
    name: 'UPS',
    company: 'United Parcel Service Inc.',
    address: 'Atlanta, GA, USA',
    country: 'United States',
    email: 'info@ups.com',
    phone: '+1 800 742 5877',
    contactPerson: 'Mike Davis',
    gstin: 'US456789123',
    shippingMethod: 'Ground & Air',
    estimatedDelivery: '2-5 business days',
    notes: 'Comprehensive logistics solutions'
  },
  {
    id: 'fh-004',
    name: 'Maersk Line',
    company: 'A.P. Moller - Maersk A/S',
    address: 'Copenhagen, Denmark',
    country: 'Denmark',
    email: 'info@maersk.com',
    phone: '+45 33 63 33 63',
    contactPerson: 'Anna Larsen',
    gstin: 'DK789123456',
    shippingMethod: 'Sea Freight',
    estimatedDelivery: '7-14 business days',
    notes: 'Ocean freight and logistics'
  },
  {
    id: 'fh-005',
    name: 'TNT Express',
    company: 'TNT Express Worldwide',
    address: 'Hoofddorp, Netherlands',
    country: 'Netherlands',
    email: 'info@tnt.com',
    phone: '+31 20 500 6000',
    contactPerson: 'Peter van der Berg',
    gstin: 'NL321654987',
    shippingMethod: 'Road & Air',
    estimatedDelivery: '3-5 business days',
    notes: 'European and international delivery'
  },
  {
    id: 'fh-006',
    name: 'Schenker',
    company: 'DB Schenker',
    address: 'Essen, Germany',
    country: 'Germany',
    email: 'info@dbschenker.com',
    phone: '+49 201 743 0',
    contactPerson: 'Hans Mueller',
    gstin: 'DE456789123',
    shippingMethod: 'Multi-modal',
    estimatedDelivery: '5-10 business days',
    notes: 'Integrated logistics services'
  },
  {
    id: 'fh-007',
    name: 'Kuehne + Nagel',
    company: 'Kuehne + Nagel International AG',
    address: 'Schindellegi, Switzerland',
    country: 'Switzerland',
    email: 'info@kuehne-nagel.com',
    phone: '+41 44 786 95 11',
    contactPerson: 'Maria Rodriguez',
    gstin: 'CH654321789',
    shippingMethod: 'Air & Sea',
    estimatedDelivery: '4-8 business days',
    notes: 'Global logistics and supply chain'
  },
  {
    id: 'fh-008',
    name: 'Panalpina',
    company: 'Panalpina World Transport Ltd',
    address: 'Basel, Switzerland',
    country: 'Switzerland',
    email: 'info@panalpina.com',
    phone: '+41 61 226 11 11',
    contactPerson: 'Thomas Weber',
    gstin: 'CH123789456',
    shippingMethod: 'Air Freight',
    estimatedDelivery: '3-6 business days',
    notes: 'Specialized in pharmaceutical logistics'
  }
];

export const getFreightHandlerById = (id: string): FreightHandler | undefined => {
  return mockFreightHandlers.find(handler => handler.id === id);
};

export const searchFreightHandlers = (query: string): FreightHandler[] => {
  if (!query.trim()) return mockFreightHandlers;
  
  const lowercaseQuery = query.toLowerCase();
  return mockFreightHandlers.filter(handler => 
    handler.name.toLowerCase().includes(lowercaseQuery) ||
    handler.company.toLowerCase().includes(lowercaseQuery) ||
    handler.country.toLowerCase().includes(lowercaseQuery) ||
    handler.contactPerson.toLowerCase().includes(lowercaseQuery)
  );
};



