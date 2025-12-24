# HungerBox Tracker

A comprehensive invoice management and analytics platform for tracking food service payments from HungerBox. Built with Next.js 16, this application automates invoice collection from emails, provides powerful analytics, and streamlines payment tracking.

![HungerBox Tracker](https://img.shields.io/badge/Next.js-16.1.0-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-Private-red?style=flat-square)

---

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage Guide](#-usage-guide)
- [User Roles & Permissions](#-user-roles--permissions)
- [API Reference](#-api-reference)
- [File Structure](#-file-structure)

---

## ✨ Features

### 1. Dashboard (Home)
The main dashboard provides an at-a-glance overview of your invoice data.

| Feature | Description |
|---------|-------------|
| **Total Invoices** | Count of all invoices in the system |
| **Total Amount** | Sum of all invoice amounts |
| **Paid Invoices** | Count and amount of paid invoices |
| **Pending Invoices** | Invoices awaiting payment |
| **Interactive Charts** | Visual breakdown by location, stall, and time period |
| **Recent Activity** | Quick view of the latest invoices |

### 2. Invoice Management
Complete invoice lifecycle management with powerful filtering and actions.

| Feature | Description |
|---------|-------------|
| **Invoice List** | Paginated table view of all invoices (15 per page) |
| **Multi-Select** | Checkbox selection for bulk operations |
| **Advanced Filtering** | Filter by location, stall, date range, and status |
| **Search** | Full-text search across all invoice fields |
| **Invoice Details** | Slide-out drawer with complete invoice information |
| **Status Management** | Mark invoices as Paid/Processed/Pending |
| **PDF Preview** | View invoice PDFs directly in browser |
| **PDF Download** | Download individual or multiple invoices |
| **Bulk Download** | Select multiple invoices and download all at once |
| **CSV Export** | Export filtered invoices to CSV format |

### 3. Email Sync
Automated invoice collection from email.

| Feature | Description |
|---------|-------------|
| **IMAP Integration** | Connects to email server via IMAP |
| **PDF Extraction** | Automatically extracts PDF attachments |
| **Data Parsing** | AI-powered extraction of invoice details from PDFs |
| **Duplicate Detection** | Prevents importing the same invoice twice |
| **Sync Control** | Start/stop sync with visual feedback |
| **Auto-Sync Scheduler** | Automatic syncing every 6 hours |
| **Configurable Credentials** | Email settings stored securely |

### 4. Analytics
Visual insights into spending patterns and trends.

| Feature | Description |
|---------|-------------|
| **Spending by Location** | Bar chart showing expenses per location |
| **Spending by Stall** | Breakdown of expenses by food stall |
| **Monthly Trends** | Line chart showing expense patterns over time |
| **Top Vendors** | Ranking of highest-expense vendors |
| **Date Range Selection** | Filter analytics by custom date ranges |

### 5. Team Management
User management for collaborative access.

| Feature | Description |
|---------|-------------|
| **User List** | View all team members |
| **Add Users** | Create new user accounts |
| **Role Assignment** | Assign Admin, Manager, or User roles |
| **Access Control** | Role-based permissions for features |
| **Organization Isolation** | Multi-tenant data separation |

### 6. Settings
Application configuration and preferences.

| Feature | Description |
|---------|-------------|
| **Email Configuration** | Set IMAP email credentials for sync |
| **Sync Settings** | Configure auto-sync interval |
| **Data Management** | Reset/clear all invoice data |
| **Profile Settings** | Update user profile information |

### 7. Admin Panel
Administrative controls (Admin role only).

| Feature | Description |
|---------|-------------|
| **User Management** | Full CRUD operations on users |
| **System Overview** | Platform-wide statistics |
| **Organization Management** | Manage multi-tenant organizations |

---

## 🛠 Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type-safe JavaScript |
| **React 19** | UI component library |
| **Recharts** | Charting and data visualization |
| **Lucide React** | Icon library |
| **CSS Modules** | Scoped styling |

### Backend
| Technology | Purpose |
|------------|---------|
| **Next.js API Routes** | RESTful API endpoints |
| **NextAuth.js** | Authentication and session management |
| **bcryptjs** | Password hashing |
| **IMAP-Simple** | Email server connection |
| **Mailparser** | Email parsing and attachment extraction |
| **pdf2json** | PDF text extraction |

### Data Storage
| Technology | Purpose |
|------------|---------|
| **JSON Files** | Lightweight file-based data storage |
| **File System** | PDF document storage |

---

## 📦 Installation

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- Access to an IMAP-enabled email account

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hungerbox_tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables** (see [Configuration](#-configuration))

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Authentication
NEXTAUTH_SECRET=your-secure-random-string
NEXTAUTH_URL=http://localhost:3000

# Email Sync (Optional - can be set in Settings UI)
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-app-password
```

### Email Setup for Sync

The application uses IMAP to connect to your email. For Gmail:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use this App Password in the Settings page or `.env.local`

**IMAP Settings (Gmail):**
- Host: `imap.gmail.com`
- Port: `993`
- TLS: `true`

---

## 📖 Usage Guide

### First-Time Setup

1. **Login** with default credentials:
   - Email: `admin@example.com`
   - Password: `admin123`

2. **Configure Email** in Settings:
   - Navigate to Settings
   - Enter your email credentials
   - Save the configuration

3. **Sync Invoices**:
   - Click "Sync Now" on the Invoices page
   - Wait for the sync to complete
   - Invoices will appear in the table

### Daily Workflow

1. **Check Dashboard** for overview
2. **Review New Invoices** on the Invoices page
3. **Process Payments** by marking invoices as Paid
4. **Download Invoices** for record-keeping
5. **Export Data** for accounting/reconciliation

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Focus search |
| `Esc` | Close drawer/modal |

---

## 👥 User Roles & Permissions

### Role Hierarchy

| Role | Dashboard | Invoices | Sync | Team | Admin | Settings |
|------|-----------|----------|------|------|-------|----------|
| **Admin** | ✅ Full | ✅ Full | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ Full | ✅ Full | ✅ | ✅ View | ❌ | ✅ |
| **User** | ✅ View | ✅ View | ❌ | ❌ | ❌ | ✅ Limited |

### Permission Details

- **Admin**: Full access to all features including user management and system settings
- **Manager**: Can sync invoices, manage payments, view team, but cannot manage users
- **User**: Read-only access to invoices and dashboard, can download invoices

---

## 🔌 API Reference

### Authentication
All API routes (except `/api/auth/*`) require authentication via NextAuth session.

### Endpoints

#### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/invoices` | List all invoices |
| `PATCH` | `/api/invoices/[id]` | Update invoice status |
| `DELETE` | `/api/invoices` | Delete all invoices |

#### Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sync` | Trigger email sync |

#### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get current settings |
| `POST` | `/api/settings` | Update settings |

#### Users (Admin/Manager only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/team/users` | List team users |
| `GET` | `/api/admin/users` | List all users (Admin) |
| `POST` | `/api/admin/users` | Create user (Admin) |
| `PUT` | `/api/admin/users` | Update user (Admin) |
| `DELETE` | `/api/admin/users` | Delete user (Admin) |

#### Download
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/download-invoice?id=xxx` | Download invoice PDF |

---

## 📁 File Structure

```
hungerbox_tracker/
├── data/                       # Data storage
│   ├── invoices.json          # Invoice records
│   ├── users.json             # User accounts
│   └── settings.json          # App settings
├── public/
│   └── documents/             # Stored PDF invoices
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── invoices/      # Invoice CRUD
│   │   │   ├── sync/          # Email sync
│   │   │   ├── settings/      # Settings management
│   │   │   ├── team/          # Team management
│   │   │   ├── admin/         # Admin operations
│   │   │   └── download-invoice/ # PDF downloads
│   │   ├── admin/             # Admin page
│   │   ├── analytics/         # Analytics page
│   │   ├── auth/              # Auth pages
│   │   ├── invoices/          # Invoices page
│   │   ├── settings/          # Settings page
│   │   ├── team/              # Team page
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Dashboard
│   ├── components/            # React components
│   │   ├── AppLayout.tsx      # Main layout wrapper
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── DashboardCharts.tsx # Chart components
│   │   ├── InvoiceDrawer.tsx  # Invoice details drawer
│   │   └── MultiSelect.tsx    # Multi-select dropdown
│   ├── lib/                   # Utility libraries
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── db.ts              # Database operations
│   │   ├── sync.ts            # Email sync logic
│   │   └── settings.ts        # Settings management
│   └── types/                 # TypeScript definitions
│       └── index.ts           # Type definitions
├── .env.local                 # Environment variables
├── package.json               # Dependencies
└── README.md                  # This file
```

---

## 🔐 Security Considerations

1. **Password Hashing**: All passwords are hashed using bcrypt
2. **Session Management**: Secure JWT-based sessions via NextAuth
3. **Role-Based Access**: API routes check user roles before operations
4. **Input Validation**: Server-side validation on all inputs
5. **Environment Variables**: Sensitive data stored in env files (not committed)

---

## 🐛 Known Issues & Limitations

1. **File-Based Storage**: Uses JSON files instead of a proper database; suitable for small-medium deployments
2. **Single Organization**: Currently optimized for single-organization use
3. **Email Provider**: Tested primarily with Gmail; other providers may need configuration adjustments

---

## 📝 License

This is a private application. All rights reserved.

---

## 🤝 Support

For issues or feature requests, please contact the development team.

---

*Last Updated: December 24, 2025*
