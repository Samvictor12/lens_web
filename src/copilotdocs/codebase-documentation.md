# Lensflow Optic Hub - Codebase Documentation

## Overview

Lensflow Optic Hub is a comprehensive web application designed for managing optical businesses. It provides functionality for sales management, inventory tracking, billing, and customer relationship management in the optical industry.

## Tech Stack

- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Custom components with Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router
- **Data Fetching**: TanStack Query (React Query)
- **Styling**: Tailwind CSS with custom UI components

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── dashboard/     # Dashboard-specific components
│   ├── layout/        # Layout components (Header, Sidebar, etc.)
│   └── ui/           # Base UI components
├── contexts/         # React Context providers
├── hooks/           # Custom React hooks
├── lib/            # Utility functions and dummy data
├── pages/          # Route components
└── types/          # TypeScript type definitions
```

## Core Features

### 1. Authentication System
- Implemented using `AuthContext`
- Role-based access control (Admin, Sales, Inventory, Accounts)
- Protected routes with authentication checks
- Demo credentials system for easy testing

### 2. Layout System
- Responsive sidebar navigation (`AppSidebar`)
- Collapsible sidebar with mobile support
- Header with user profile and notifications (`AppHeader`)
- Role-based menu items

### 3. Main Modules

#### Dashboard
- Overview statistics
- Sales metrics
- Inventory status
- Recent activities

#### Sales Management
- Sale Orders tracking
- Customer management
- Billing generation
- Order status tracking

#### Inventory Management
- Stock tracking
- Purchase order management
- Lens variants and types
- Low stock alerts

#### Dispatch Management
- Order dispatch tracking
- Dispatch copy generation
- Shipment status updates

#### Financial Management
- Billing management
- Payment tracking
- Expense management
- Financial reports

#### Customer Management
- Customer database
- Contact information
- Order history
- Account management

#### Vendor Management
- Vendor profiles
- Purchase order tracking
- Vendor-specific inventory

#### Reporting
- Sales reports
- Inventory reports
- Financial summaries
- Purchase order reports

## UI Components

### Key Components
- **StatCard**: Displays statistics with icons and trends
- **Sidebar**: Collapsible navigation with mobile support
- **Table**: Reusable table component with sorting and filtering
- **Forms**: Form components with validation

## Security Implementation

### Authentication & Authorization
The system implements a robust security layer using JWT (JSON Web Tokens) and Role-Based Access Control (RBAC). The security architecture is implemented in the `/backend/middleware` directory.

#### Authentication Flow
1. User login credentials are validated
2. JWT token is generated with user roles and permissions
3. Token is validated on protected routes
4. User context is added to request object

#### Role-Based Access Control
- Super Admin: Full system access
- Admin: Management operations
- Staff: Day-to-day operations
- Dispatcher: Dispatch-related operations only

### Validation Layer
Input validation is implemented using Zod schemas:
- Request body validation
- Query parameter validation
- Path parameter validation
- Custom validation rules for business logic

### Error Handling
The system implements a comprehensive error handling strategy:
- Standardized error responses
- HTTP status code mapping
- Prisma error handling
- Development vs Production error details
- Error logging and monitoring

### Security Best Practices
- Password hashing using bcrypt
- Rate limiting on sensitive routes
- CORS configuration
- XSS protection
- SQL injection prevention via Prisma
- Environment variable protection
- **Toast**: Notification system
- **Charts**: Data visualization components

### UI Component Library
The application uses a comprehensive set of base UI components:
- Buttons, Inputs, Labels
- Cards, Tables, Badges
- Modals, Dropdowns, Tooltips
- Charts and Data Display
- Navigation Components
- Form Elements

## State Management

### Authentication State
- User authentication status
- Role-based permissions
- Session management
- Login/Logout functionality

### Application State
- UI state (sidebar, modals, notifications)
- Form states
- Data caching with React Query
- Route state management

## Data Flow

1. **API Integration**
   - Currently using dummy data (`dummyData.ts`)
   - Prepared for real API integration
   - Data fetching with React Query

2. **State Updates**
   - Context-based state management
   - Component-level state for UI
   - Form state management
   - Route-based data loading

## Role-Based Access Control

### User Roles
1. **Admin**
   - Full access to all features
   - System configuration
   - User management

2. **Sales**
   - Sales order management
   - Customer management
   - Billing access

3. **Inventory**
   - Stock management
   - Purchase orders
   - Vendor management

4. **Accounts**
   - Financial management
   - Reports access
   - Payment tracking

## Future Enhancements

1. **API Integration**
   - Replace dummy data with real API endpoints
   - Implement proper error handling
   - Add data caching and optimization

2. **Advanced Features**
   - Advanced reporting
   - Data export capabilities
   - Batch operations
   - Email notifications

3. **Performance Optimizations**
   - Code splitting
   - Lazy loading
   - Performance monitoring
   - Caching strategies

## Development Guidelines

1. **Code Organization**
   - Follow the established folder structure
   - Keep components modular and reusable
   - Maintain type safety with TypeScript

2. **Styling**
   - Use Tailwind CSS utilities
   - Follow the design system
   - Maintain responsive design

3. **State Management**
   - Use contexts for global state
   - Local state for component-specific data
   - Implement proper error boundaries

4. **Testing**
   - Add unit tests for components
   - Implement integration tests
   - Add end-to-end testing

## Getting Started

1. **Installation**
   ```bash
   npm install
   ```

2. **Development**
   ```bash
   npm run dev
   ```

3. **Building**
   ```bash
   npm run build
   ```

4. **Testing**
   ```bash
   npm run test
   ```

## Best Practices

1. **Code Quality**
   - Follow TypeScript best practices
   - Maintain consistent code style
   - Use proper error handling
   - Write meaningful comments

2. **Performance**
   - Optimize component renders
   - Implement proper memoization
   - Use efficient data structures
   - Monitor bundle size

3. **Security**
   - Implement proper authentication
   - Validate user input
   - Secure API endpoints
   - Follow security best practices

## Conclusion

Lensflow Optic Hub is a well-structured React application with a focus on maintainability, scalability, and user experience. The codebase follows modern React practices and is prepared for future enhancements and real API integration.