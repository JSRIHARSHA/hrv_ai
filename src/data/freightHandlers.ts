import { FreightHandler } from '../types';

export const mockFreightHandlers: FreightHandler[] = [
  {
    id: 'fh-001',
    name: 'HRV Global',
    company: 'HRV GLOBAL LIFE SCIENCES PRIVATE LIMITED',
    address: '#8-2-269/W/4, 1st Floor, Plot No. 4, Women\'s Co-operative Society, Road No. 2, Banjara Hills, Hyderabad, Telangana, India, 500034',
    country: 'India',
    phone: '04023554992',
    gstin: 'AADCH6322C1Z0'
  },
  {
    id: 'fh-002',
    name: 'Macro Logistics',
    company: 'MACRO LOGISTICS & EXIM PVT LTD',
    address: 'Bldg. NO.5 UNIT NO A1, AKSHAY MITTAL INDL ESTATE ANDHERI, Mumbai, Maharashtra, India, 400059',
    country: 'India',
    phone: '9920029049',
    gstin: '27AAGCM2600P1ZB'
  },
  {
    id: 'fh-003',
    name: 'JWR Logistics',
    company: 'JWR LOGISTICS PVT LTD',
    address: '15-23 National Highway 4B, Panvel JNPT Highway, Village Padeghar, Panvel, Maharashtra, India, 410206',
    country: 'India',
    phone: '77018807180',
    gstin: '27AACCJ4352R1Z1'
  },
  {
    id: 'fh-004',
    name: 'Sarveshwar Logistics',
    company: 'SARVESHWAR LOGISTICS SERVICES PVT LTD',
    address: 'CFS Address: Sarveshwar CFS, Digode Circle, Village: Digode, Taluka: Uran, Raigad, Maharashtra, India, 400702',
    country: 'India',
    phone: '8424016014',
    gstin: '27AAOCS1721K1Z3'
  },
  {
    id: 'fh-005',
    name: 'Punjab Conware',
    company: 'PUNJAB CONWARE O&M GAD LOGISTICS PVT LTD',
    address: 'Plot 2, Sector 2, Dronagiri Node, Nhava Sheva, Navi Mumbai, Maharashtra, India, 400707',
    country: 'India',
    phone: '7710887180',
    gstin: '27AABCG2816N1ZG'
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
    handler.country.toLowerCase().includes(lowercaseQuery)
  );
};



