# HRV Order Management System

---

## Project Structure

```
APP/
├── public/                          # Static assets
│   ├── images/                      # Logos and icons
│   ├── HRV_PO_FORMAT.pdf           # PO templates
│   ├── NHG_PO_FORMAT.pdf
│   └── *.csv                        # Master data files
│
├── src/
│   ├── components/                  # Reusable components
│   │   ├── AppBanner.tsx           # Top navigation bar
│   │   ├── LeftNavigation.tsx      # Sidebar navigation
│   │   ├── CreateOrderModal.tsx    # Order creation dialog
│   │   ├── AIPDFGenerationModal.tsx # AI PDF generator
│   │   ├── EmailModal.tsx          # Email sending dialog
│   │   └── ...
│   │
│   ├── pages/                       # Main application pages
│   │   ├── LoginPage.tsx           # User authentication
│   │   ├── DashboardPage.tsx       # Role-based dashboard
│   │   ├── OrdersPage.tsx          # Order overview (Manager+)
│   │   ├── OrderDetailPage.tsx     # Single order management
│   │   ├── SupplierMasterDataPage.tsx
│   │   ├── ProductMasterDataPage.tsx
│   │   └── FreightHandlersPage.tsx
│   │
│   ├── contexts/                    # Global state management
│   │   ├── AuthContext.tsx         # User authentication state
│   │   ├── OrderContext.tsx        # Order data and actions
│   │   ├── ThemeContext.tsx        # Light/Dark mode
│   │   └── FreightHandlerContext.tsx
│   │
│   ├── services/                    # API and external services
│   │   ├── supabaseClient.ts       # Supabase configuration
│   │   ├── supabaseOrdersService.ts # Order CRUD operations
│   │   ├── supabaseSuppliersService.ts
│   │   ├── supabaseProductsService.ts
│   │   ├── geminiPdfExtractor.ts   # AI PDF extraction
│   │   ├── apiService.ts           # Backend API client
│   │   ├── csvService.ts           # CSV import/export
│   │   ├── emailService.ts         # Email sending
│   │   └── ...
│   │
│   ├── data/                        # Data management
│   │   ├── orders.ts               # Order data utilities
│   │   ├── suppliers.ts            # Supplier data layer
│   │   ├── products.ts             # Product data layer
│   │   ├── constants.ts            # App constants
│   │   └── currencies.ts           # Currency data
│   │
│   ├── types/                       # TypeScript definitions
│   │   └── index.ts                # All type definitions
│   │
│   ├── utils/                       # Helper functions
│   │   ├── pdfGenerator.ts         # PDF generation utilities
│   │   ├── nhgPdfLibGenerator.ts   # Entity-specific PDF
│   │   ├── currencyConverter.ts    # Currency conversion
│   │   ├── orderStatusHelper.ts    # Status transitions
│   │   └── ...
│   │
│   ├── config/                      # Configuration files
│   │   ├── hrvPdfConfig.ts         # HRV PDF templates
│   │   └── hrvPdfTemplateConfig.ts
│   │
│   ├── App.tsx                      # Main app component
│   └── index.tsx                    # Entry point
│
├── backend/                         # Optional Node.js backend
│   ├── controllers/                 # API controllers
│   ├── models/                      # Database models
│   ├── routes/                      # API routes
│   ├── middleware/                  # Authentication middleware
│   ├── config/                      # Backend configuration
│   └── server.js                    # Express server
│
├── ai-purchase-order-extractor/     # Standalone PDF extractor
│   ├── App.tsx
│   └── components/
│
├── .env                             # Environment variables
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── netlify.toml                     # Netlify configuration
└── vercel.json                      # Vercel configuration
```

## 🗄️ Database Schema

### Key Tables

#### `orders`
- `orderId` (Primary Key)
- `entity` (HRV/NHG)
- `poType` (Direct PO/Sample PO/Service PO)
- `status` (16 possible values)
- `customer` (JSON: name, address, email, etc.)
- `supplier` (JSON: supplier details)
- `materials` (JSON Array: line items)
- `documents` (JSON: attached files)
- `timeline` (JSON Array: events)
- `comments` (JSON Array: internal notes)
- `assignedTo` (User ID)
- `createdBy` (User ID)
- `createdAt`, `updatedAt`

#### `suppliers`
- `id` (Primary Key)
- `name`, `address`, `city`, `country`
- `email`, `phone`, `gstin`
- `isActive`, `rating`, `specialties`

#### `products`
- `id` (Primary Key)
- `itemName`, `casNumber`, `grade`
- `packingType`, `hsnCode`
- `specifications` (JSON)

#### `freight_handlers`
- `id` (Primary Key)
- `name`, `contactPerson`, `email`, `phone`
- `serviceType`, `coverage`

#### `users` (Supabase Auth)
- `userId` (Primary Key)
- `email`, `password` (hashed)
- `name`, `role` (Employee/Manager/Management)
- `team`, `isActive`

---
