# Installment Management System

A comprehensive installment management system with modern, responsive design, local data storage, and export capabilities. This system manages installments, customers, and customer affairs including payments with a professional web interface.

## Features

### 🎯 **Core Functionality**
- **Customer Management**: Complete CRUD operations with search, filtering, and status categorization
- **Contract Management**: Create and edit contracts with automatic installment calculations
- **Installment Tracking**: Payment registration, status management, and scheduling
- **Payment Processing**: Manual payment processing with receipts and multiple payment methods
- **Financial Reports**: Monthly/weekly reports with income analysis and PDF/Excel export
- **Alert System**: Manual alert creation and automatic notifications for overdue payments
- **User Management**: Role-based access control (admin/employee/viewer)

### 🚀 **Technical Features**
- **Modern UI**: Built with React 19 + TypeScript + Material-UI
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Real-time Analytics**: Dashboard with statistics, charts, and recent activities
- **Data Export**: Excel export for financial reports
- **Local Storage**: SQLite database with backup capabilities
- **Authentication**: JWT-based authentication with role-based access
- **RESTful API**: Complete backend API with proper error handling

### 📊 **Dashboard Features**
- Real-time statistics and KPIs
- Interactive charts for financial data
- Quick links to common actions
- Recent activities and alerts
- Overdue installments overview

## Technology Stack

### Backend
- **Node.js** + **Express.js** - Server framework
- **SQLite** - Local database storage
- **JWT** - Authentication and authorization
- **bcryptjs** - Password hashing
- **multer** - File upload handling
- **xlsx** - Excel file generation

### Frontend
- **React 19** - Modern React framework
- **TypeScript** - Type safety
- **Material-UI (MUI)** - Component library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Day.js** - Date manipulation

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd installment-management-system
   npm run install-all
   ```

2. **Start the Application**
   ```bash
   npm start
   ```

3. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Default Admin Account
- **Username**: admin
- **Email**: admin@installment.com
- **Password**: password

## Database Schema

The system uses SQLite with the following tables:

### Users
- User management with roles (admin/employee/viewer)
- Authentication and authorization

### Customers
- Customer information and contact details
- Status tracking and notes

### Contracts
- Contract details with installment terms
- Employee assignments and descriptions

### Installments
- Individual installment records
- Payment tracking and late fees

### Payments
- Payment transactions and methods
- Receipt generation and history

### Alerts
- System notifications and reminders
- Automatic alert generation for overdue payments

### Settings
- System configuration parameters
- Company information for reports

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Contracts
- `GET /api/contracts` - Get all contracts
- `POST /api/contracts` - Create new contract
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract

### Installments
- `GET /api/installments` - Get all installments
- `PUT /api/installments/:id` - Update installment status
- `POST /api/installments/:id/pay` - Record payment

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create new payment
- `GET /api/payments/:id/receipt` - Generate receipt

### Reports
- `GET /api/reports/financial` - Financial reports
- `GET /api/reports/export` - Export to Excel
- `GET /api/reports/monthly` - Monthly summaries

### Alerts
- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id` - Update alert status

## Usage Guide

### 1. Customer Management
- Add new customers with complete contact information
- Search and filter customers by name, status, or creation date
- Update customer information and track their status

### 2. Contract Creation
- Create contracts with automatic installment calculation
- Set payment terms, interest rates, and responsible employees
- Generate installment schedules automatically

### 3. Payment Processing
- Record payments with multiple payment methods
- Generate receipts for all transactions
- Track payment history and outstanding balances

### 4. Financial Reports
- Generate monthly and weekly financial reports
- Export data to Excel for further analysis
- View income trends and payment statistics

### 5. Alert Management
- Set up automatic alerts for overdue payments
- Create manual alerts for important notifications
- Track alert status and follow-up actions

## Development Scripts

```bash
# Install all dependencies
npm run install-all

# Start development servers (both frontend and backend)
npm start
npm run dev

# Start backend only
npm run server

# Start frontend only
npm run client

# Build for production
npm run build
```

## File Structure

```
installment-management-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── context/        # React context providers
│   │   └── theme.ts        # Material-UI theme
│   └── package.json
├── server/                 # Node.js backend
│   ├── database/           # Database setup and migrations
│   ├── middleware/         # Express middleware
│   ├── routes/             # API route handlers
│   └── index.js            # Main server file
└── package.json           # Root package configuration
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Different permission levels for different user types
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Server-side validation for all inputs
- **CORS Configuration**: Proper cross-origin resource sharing setup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.