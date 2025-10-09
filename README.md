# Order Management System

A comprehensive role-aware web application for managing customer orders, coordinating supplier POs/Proforma Invoices/COAs, driving status transitions, handling PDF parsing & generation with LLM integration, integrating Outlook mail actions, and presenting role-specific dashboards with audit logs and approval workflows.

## 🚀 Features

### Core Functionality
- **Role-based Authentication**: Secure login system with role-specific access control
- **Order Management**: Complete order lifecycle from PO receipt to delivery
- **Document Management**: Upload, preview, and manage all order-related documents
- **PDF Generation**: Generate supplier POs with customizable templates
- **Email Integration**: Simulated Outlook integration for sending emails with attachments
- **Status Transitions**: Automated workflow management with role-based permissions
- **Audit Logging**: Complete audit trail for all order changes
- **Comments System**: Internal and external communication tracking

### Role-Based Access Control
- **Employee**: Create orders, manage supplier POs, process payments, handle logistics, send COAs, manage customer communication
- **Manager**: Oversee team tasks, reassign work, approve requests
- **Higher Management**: High-level approvals and oversight
- **Admin**: System administration and user management

### Order Status Workflow
1. **PO Received from Client** → Order creation
2. **PO Sent to Supplier** → Supplier PO generation and sending
3. **Proforma Invoice Received** → Payment processing
4. **Advance Payment Made** → Payment confirmation
5. **COA Received** → Quality assurance
6. **COA Sent** → Customer approval process
7. **COA Accepted/Declined** → Customer decision
8. **Awaiting Material Dispatch** → Logistics coordination
9. **Material Dispatched** → Shipment tracking
10. **In Transit** → Delivery monitoring
11. **Reached Destination** → Order completion

## 🛠️ Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **State Management**: React Context API
- **Routing**: React Router v6
- **PDF Generation**: jsPDF
- **Notifications**: React Hot Toast
- **Icons**: Material Icons
- **Styling**: Emotion (CSS-in-JS)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd order-management-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔐 Demo Accounts

The application includes demo accounts for testing different roles:

| Role | Name | Email | Password |
|------|------|-------|----------|
| BD | John Smith | john.smith@company.com | password123 |
| CRM Team 1 | Sarah Johnson | sarah.johnson@company.com | password123 |
| CRM Team 2 | Mike Wilson | mike.wilson@company.com | password123 |
| Finance | Lisa Brown | lisa.brown@company.com | password123 |
| Logistics | David Lee | david.lee@company.com | password123 |
| Manager | Emma Davis | emma.davis@company.com | password123 |
| Higher Management | Robert Taylor | robert.taylor@company.com | password123 |

## 📱 Usage Guide

### Login
1. Navigate to the login page
2. Use any demo account credentials or click on a role button for auto-fill
3. Click "Sign In"

### Dashboard
- **My Tasks**: Orders assigned to you or created by you
- **Team Tasks**: Orders assigned to your team members (Manager+ only)
- **Summary Cards**: Quick overview of task counts and statuses
- **Action Buttons**: Quick actions based on your role and order status

### Order Management
1. **View Order Details**: Click on any Order ID to view full details
2. **Add Comments**: Use the "Add Comment" button for internal notes
3. **Change Status**: Use the "Change Status" button to update order status
4. **Generate PDFs**: Create supplier POs with custom data
5. **Send Emails**: Send notifications to customers and suppliers

### Document Management
- **Upload Documents**: Attach customer POs, supplier POs, COAs, etc.
- **Preview Documents**: View documents inline
- **Download Documents**: Download documents for offline use

### PDF Generation
1. Click "Generate Supplier PO" on eligible orders
2. Customize PO details (number, date, terms, etc.)
3. Preview the generated PDF
4. Download or send via email

### Email Integration
1. Use role-specific email buttons (Send PO, Send COA, etc.)
2. Customize email content
3. Preview before sending
4. Track email history in audit logs

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ProtectedRoute.tsx
│   ├── PDFGenerationModal.tsx
│   └── EmailModal.tsx
├── contexts/           # React Context providers
│   ├── AuthContext.tsx
│   └── OrderContext.tsx
├── data/              # Mock data and constants
│   ├── constants.ts
│   └── mockData.ts
├── pages/             # Main application pages
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   └── OrderDetailPage.tsx
├── types/             # TypeScript type definitions
│   └── index.ts
├── utils/             # Utility functions
│   └── pdfGenerator.ts
├── App.tsx            # Main application component
└── index.tsx          # Application entry point
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_OUTLOOK_CLIENT_ID=your-outlook-client-id
REACT_APP_LLM_API_KEY=your-llm-api-key
```

### Customization
- **Email Templates**: Modify templates in `EmailModal.tsx`
- **PDF Templates**: Customize PDF generation in `pdfGenerator.ts`
- **Status Transitions**: Update workflow rules in `constants.ts`
- **Role Permissions**: Modify permission matrix in `constants.ts`

## 🧪 Testing

The application includes comprehensive mock data for testing:

- **3 Sample Orders**: Different statuses and scenarios
- **7 Demo Users**: All role types represented
- **Complete Audit Trails**: Full history for all orders
- **Document Attachments**: Sample documents for testing
- **Timeline Events**: Complete order lifecycle tracking

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Static Hosting
The built files in the `build` directory can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

### Environment Setup
Ensure the following environment variables are set in production:
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_OUTLOOK_CLIENT_ID`: Microsoft Graph API client ID
- `REACT_APP_LLM_API_KEY`: LLM service API key

## 🔒 Security Features

- **Role-based Access Control**: Strict permission system
- **Input Validation**: Form validation and sanitization
- **Secure Authentication**: Token-based authentication simulation
- **Audit Logging**: Complete change tracking
- **Data Encryption**: Sensitive data protection (simulated)

## 📊 Monitoring & Analytics

- **Audit Logs**: Complete activity tracking
- **Status Transitions**: Workflow monitoring
- **Email Tracking**: Communication history
- **Document Management**: File access tracking
- **User Activity**: Role-based action logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the demo accounts for testing

## 🔮 Future Enhancements

- **Real Backend Integration**: Replace mock data with actual API calls
- **Microsoft Graph Integration**: Real Outlook email sending
- **LLM Integration**: Actual PDF parsing and data extraction
- **Real-time Notifications**: WebSocket integration
- **Advanced Analytics**: Dashboard with charts and metrics
- **Mobile App**: React Native version
- **API Documentation**: OpenAPI/Swagger specs
- **Automated Testing**: Jest and Cypress tests
- **CI/CD Pipeline**: Automated deployment
- **Multi-language Support**: Internationalization

---

**Note**: This is a standalone frontend application with simulated backend functionality. In a production environment, you would need to implement the actual backend APIs, database integration, and external service connections.
