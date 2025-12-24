# HungerBox Invoice Tracker - Complete AI Development Prompt

> **Purpose**: This document serves as a comprehensive prompt for any AI to recreate this application from scratch with all features.

---

## 🎯 Project Overview

Build a **TheGutGuru Invoice Tracker** - a modern web application for tracking and managing food service invoices from TheGutGuru (a corporate food service provider in India). The app automatically syncs invoices from email, provides analytics, and manages payment workflows.

---

## 🛠 Technology Stack

### Core Framework
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **React 18+** with Server Components

### Styling
- **Tailwind CSS** for utility classes
- **CSS Modules** for component-specific styles
- **Modern glassmorphism design** with purple/indigo gradient accents

### Authentication
- **NextAuth.js** with Credentials Provider
- **Role-based access control** (admin, manager, user)
- **Session management** with JWT

### Data Storage
- **JSON file storage** (`data/invoices.json`, `data/users.json`, `data/settings.json`)
- **localStorage** for user preferences and saved filters

### Email Integration
- **IMAP** library for email fetching
- **pdf-parse** for PDF text extraction
- Email credentials stored in settings

---

## 📁 Project Structure

```
hungerbox_tracker/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │   │   ├── invoices/route.ts            # GET/POST invoices
│   │   │   ├── invoices/[id]/route.ts       # PUT invoice status
│   │   │   ├── sync/route.ts                # Email sync endpoint
│   │   │   ├── settings/route.ts            # App settings
│   │   │   ├── download-invoice/route.ts    # PDF download
│   │   │   ├── admin/users/route.ts         # User management
│   │   │   └── team/users/route.ts          # Team listing
│   │   ├── auth/signin/page.tsx             # Login page
│   │   ├── invoices/page.tsx                # Main invoices page
│   │   ├── analytics/page.tsx               # Analytics dashboard
│   │   ├── settings/page.tsx                # Settings page
│   │   ├── admin/page.tsx                   # Admin panel
│   │   ├── team/page.tsx                    # Team management
│   │   ├── layout.tsx                       # Root layout with providers
│   │   ├── page.tsx                         # Home redirect
│   │   └── globals.css                      # Global styles
│   ├── components/
│   │   ├── Sidebar.tsx                      # Navigation sidebar
│   │   ├── MultiSelect.tsx                  # Multi-select dropdown
│   │   ├── InvoiceModal.tsx                 # Invoice detail modal
│   │   └── MultiSelect.module.css           # MultiSelect styles
│   ├── lib/
│   │   ├── auth.ts                          # NextAuth configuration
│   │   └── scheduler.ts                     # Background sync scheduler
│   └── types/
│       └── invoice.ts                       # TypeScript interfaces
├── data/
│   ├── invoices.json                        # Invoice storage
│   ├── users.json                           # User accounts
│   └── settings.json                        # App settings
├── public/                                  # Static assets
├── .env.local                               # Environment variables
└── package.json
```

---

## 👤 User Roles & Permissions

### Role Hierarchy
1. **admin** - Full access, can manage users
2. **manager** - Can mark invoices as Paid
3. **user** - View-only access

### Permission Matrix
| Action | Admin | Manager | User |
|--------|-------|---------|------|
| View Invoices | ✅ | ✅ | ✅ |
| Sync Invoices | ✅ | ✅ | ❌ |
| Export/Download | ✅ | ✅ | ✅ |
| Mark as Paid | ✅ | ✅ | ❌ |
| Manage Settings | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |

---

## 📧 Email Sync Feature

### Configuration
Store in `data/settings.json`:
```json
{
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "imapUser": "user@gmail.com",
  "imapPassword": "app-password",
  "senderFilter": "hungerbox.com",
  "autoSync": true,
  "syncInterval": 6
}
```

### Sync Logic
1. Connect to IMAP server with TLS
2. Search for emails from `senderFilter` in last 90 days
3. Download PDF attachments
4. Parse PDF to extract: Invoice ID, Date, Service Period, Location, Stall, Amount
5. Deduplicate by Invoice ID
6. Save to `data/invoices.json`

### PDF Parsing
Extract from HungerBox invoice PDFs:
- **Invoice ID**: Pattern like `HB-XXX-XXXXX`
- **Service Date Range**: "From date To date" format
- **Location**: Cafeteria/office name
- **Stall Name**: Vendor name
- **Total Amount**: Rupee amount

---

## 📄 Invoice Data Model

```typescript
interface Invoice {
  id: string;                    // Unique invoice ID (e.g., "HB-123-45678")
  date: string;                  // Invoice date (YYYY-MM-DD)
  serviceDateRange: string;      // "2024-12-01 to 2024-12-15"
  location: string;              // "IBM Bangalore"
  stall: string;                 // "Chai Point"
  amount: number;                // 1234.56
  status: 'Pending' | 'Processed' | 'Paid';
  pdfPath?: string;              // Path to stored PDF
  syncedAt: string;              // ISO timestamp
}
```

---

## 🎨 UI/UX Specifications

### Design System
- **Primary Color**: Indigo (#4f46e5)
- **Background**: Light slate (#f8fafc) with gradient overlay
- **Cards**: Glassmorphism with blur effect
- **Typography**: Inter font
- **Border Radius**: 0.5rem (md), 0.75rem (lg)

### Layout
- **Sidebar**: Fixed left, 280px wide, with navigation links
- **Main Content**: Flexible, max-width 1200px centered
- **Header**: Page title + action buttons (Export, Sync)

### Responsive Breakpoints
- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px

---

## 📊 Analytics Dashboard

### Stats Cards (Top Row)
1. **Total Invoices** - Count of all invoices
2. **Total Amount** - Sum of all amounts (₹ formatted)
3. **Pending Amount** - Sum of Pending + Processed invoices
4. **Paid Amount** - Sum of Paid invoices

### Charts
1. **Monthly Spending Trend** - Bar chart of monthly totals
2. **Top Stalls by Amount** - Horizontal bar chart
3. **Invoice Status Distribution** - Pie/donut chart

---

## 📋 Invoices Page Features

### Filters (Row 1)
- **Search**: Text search across ID, stall, amount
- **Location**: Multi-select dropdown
- **Stall**: Multi-select dropdown  
- **Status**: Dropdown (All, Pending, Processed, Paid)

### Filters (Row 2)
- **Quick Range**: All Time, Last 7 Days, Last 30 Days, Custom
- **Month**: Jan-Dec dropdown
- **Year**: 2023, 2024, 2025 dropdown
- **Clear** / **Save Filter** buttons

### Saved Filters
- User-specific (stored with user email in localStorage key)
- Quick access pills below filter row
- Click to apply, X to delete

### Table Columns
1. Checkbox (bulk select)
2. Service Period
3. Date (hidden on mobile)
4. Location (hidden on mobile)
5. Stall Name
6. Amount (₹ formatted)
7. Status (with Pay Now button for Processed)

### Bulk Actions
- **Download Selected** - Download PDFs as ZIP
- **Mark as Paid** - Update status to Paid (admin/manager only)

### Pagination
- 15 items per page
- Previous/Next navigation
- Page number display

### Invoice Modal
- Click row to open detail modal
- Show all invoice fields
- Download PDF button
- Pay Now button (if applicable)

---

## ⚙️ Settings Page

### IMAP Configuration
- Host, Port, Username, Password fields
- Sender filter (email domain to search)
- Test Connection button

### Sync Settings
- Enable/disable auto-sync toggle
- Sync interval (hours)
- Manual sync button

### Data Management
- Reset All Data button (with confirmation)
- Export all data as JSON

---

## 👥 Admin Panel

### User Management
- List all users with email, role, created date
- Add new user form (email, password, role)
- Change user role dropdown
- Delete user button (with confirmation)

### Default Admin Account
```json
{
  "email": "admin@hungerbox.com",
  "password": "admin123",
  "role": "admin"
}
```

---

## 🔐 Authentication Flow

### Login Page
- Email and password fields
- "Sign In" button
- Error message display
- Redirect to /invoices on success

### Session
- JWT-based sessions
- Session includes: email, role
- Protected routes redirect to /auth/signin

### API Protection
```typescript
// Example protected API route
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## 📱 Mobile Responsiveness

### Filter Layout
- Stack vertically on mobile
- Full-width inputs
- 44px minimum touch targets

### Table
- Hide Date and Location columns on mobile
- Compact padding
- Horizontal scroll if needed

### Buttons
- Larger touch targets
- Stack action buttons vertically on small screens

---

## 🔄 API Endpoints

### GET /api/invoices
Returns all invoices sorted by date (newest first)

### POST /api/invoices
Add new invoice (used internally by sync)

### PUT /api/invoices/[id]
Update invoice status
```json
{ "status": "Paid" }
```

### POST /api/sync
Trigger email sync, returns:
```json
{ "message": "Synced X new invoices", "newCount": 5 }
```

### GET/PUT /api/settings
Read/update application settings

### GET /api/download-invoice?id=XXX
Download invoice PDF file

### GET/POST/DELETE /api/admin/users
User CRUD operations (admin only)

---

## 🗂 Environment Variables

```env
# .env.local
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

---

## 📦 Key Dependencies

```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "next-auth": "^4.24.0",
  "tailwindcss": "^3.4.0",
  "imap": "^0.8.19",
  "pdf-parse": "^1.1.1",
  "lucide-react": "^0.300.0",
  "recharts": "^2.10.0",
  "archiver": "^6.0.0"
}
```

---

## 🚀 Getting Started

1. Create Next.js app with TypeScript and Tailwind
2. Set up NextAuth with credentials provider
3. Create JSON data files with initial structure
4. Build API routes for CRUD operations
5. Create pages with specified layouts
6. Implement IMAP sync functionality
7. Add PDF parsing for HungerBox invoices
8. Build analytics dashboard with charts
9. Add responsive styles for mobile
10. Test all user role permissions

---

## 💡 Implementation Tips

### Glassmorphism CSS
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

### Multi-Select Component
- Checkbox-based selection
- "All" option defaults to empty array (show all)
- Search/filter for long lists
- Click outside to close

### Invoice Status Workflow
```
Pending → Processed → Paid
   ↑         ↑
   └─────────┴── Can be set by admin/manager
```

### PDF Download as ZIP (Multiple)
```typescript
import archiver from 'archiver';
const archive = archiver('zip');
// Add files and pipe to response
```

---

## 🎯 Success Criteria

The app is complete when:
1. ✅ Users can login with role-based access
2. ✅ Invoices sync automatically from email
3. ✅ PDF invoices are parsed and displayed
4. ✅ Filters work (search, location, stall, date, status)
5. ✅ Saved filters persist per user
6. ✅ Bulk download and status update work
7. ✅ Analytics show spending trends and charts
8. ✅ Settings allow IMAP configuration
9. ✅ Admin can manage users
10. ✅ Mobile responsive design works

---

*This prompt was auto-generated from the HungerBox Invoice Tracker application.*
*Last Updated: December 25, 2025*
