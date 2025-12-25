# TheGutGuru Tracker

A comprehensive invoice management and analytics platform for tracking food service payments from TheGutGuru. Built with Next.js 16, this application automates invoice collection from emails, provides powerful analytics, and streamlines payment tracking.

![TheGutGuru Tracker](https://img.shields.io/badge/Next.js-16.1.0-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![Turso](https://img.shields.io/badge/Turso-SQLite-green?style=flat-square)
![License](https://img.shields.io/badge/License-Private-red?style=flat-square)

---

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Database Setup (Turso)](#-database-setup-turso)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
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
| **Saved Filters** | Save and reuse frequently used filter combinations |
| **Search** | Full-text search across all invoice fields |
| **Invoice Details** | Slide-out drawer with complete invoice information |
| **Status Management** | Mark invoices as Paid/Processed/Pending |
| **PDF Preview** | View invoice PDFs directly in browser |
| **PDF Download** | Download individual or multiple invoices |
| **Bulk Download** | Select multiple invoices and download as ZIP |
| **CSV Export** | Export filtered invoices to CSV format |
| **Mobile Responsive** | Optimized for phones and tablets |

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

### Database
| Technology | Purpose |
|------------|---------|
| **Turso (LibSQL)** | Cloud SQLite database with 9GB free storage |
| **@libsql/client** | Turso database client |
| **File System** | PDF document storage |

---

## 📦 Installation

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- Access to an IMAP-enabled email account
- Turso account (free at [turso.tech](https://turso.tech))

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/satish-varma/Gutguru-tracker.git
   cd Gutguru-tracker
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

## 🗄 Database Setup (Turso)

This application uses **Turso** for cloud SQLite database with 9GB free storage.

### Current Database Details

```
Database: thegutguru-tracker
URL: libsql://thegutguru-tracker-satish-varma.aws-ap-south-1.turso.io
Region: Mumbai (aws-ap-south-1)
Account: satish-varma
Storage: 9GB FREE
```

### Setting Up a New Turso Database

1. **Install Turso CLI**
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   source ~/.profile
   ```

2. **Login to Turso**
   ```bash
   turso auth login
   ```

3. **Create a new database**
   ```bash
   turso db create thegutguru-tracker -w
   ```

4. **Get the database URL**
   ```bash
   turso db show thegutguru-tracker --url
   ```

5. **Create an auth token**
   ```bash
   turso db tokens create thegutguru-tracker
   ```

6. **Add to your `.env.local`**
   ```env
   TURSO_DATABASE_URL=libsql://your-database-url.turso.io
   TURSO_AUTH_TOKEN=your-auth-token
   ```

### Database Schema

The database is automatically initialized with the following tables:

```sql
-- Invoices table
CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    service_date_range TEXT,
    location TEXT NOT NULL,
    stall TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    pdf_path TEXT,
    synced_at TEXT NOT NULL,
    org_id TEXT NOT NULL
);

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    org_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
    org_id TEXT PRIMARY KEY,
    email_search_term TEXT DEFAULT 'TheGutGuru',
    sync_lookback_days INTEGER DEFAULT 30,
    email_user TEXT,
    email_password TEXT
);
```

### Useful Turso Commands

```bash
# Check login status
turso auth whoami

# List all databases
turso db list

# Open SQL shell
turso db shell thegutguru-tracker

# Get database info
turso db show thegutguru-tracker

# Create a new auth token
turso db tokens create thegutguru-tracker

# Delete database (careful!)
turso db destroy thegutguru-tracker
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Authentication
NEXTAUTH_SECRET=your-secure-random-string
NEXTAUTH_URL=http://localhost:3000

# Turso Database
TURSO_DATABASE_URL=libsql://thegutguru-tracker-satish-varma.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Email Sync (Optional - can be set in Settings UI)
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-app-password
```

### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
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

## 🚀 Deployment

### Deploy to Vercel

1. **Push code to GitHub**
   ```bash
   git add -A
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository

3. **Configure Environment Variables** in Vercel Dashboard:
   | Variable | Value |
   |----------|-------|
   | `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` |
   | `TURSO_DATABASE_URL` | Your Turso database URL |
   | `TURSO_AUTH_TOKEN` | Your Turso auth token |
   | `EMAIL_USER` | (Optional) Your email |
   | `EMAIL_PASSWORD` | (Optional) Your app password |

4. **Deploy!**

### Production Checklist

- [ ] Change default admin password after first login
- [ ] Configure email credentials in Settings
- [ ] Set proper NEXTAUTH_URL for your domain
- [ ] Enable HTTPS (automatic on Vercel)

---

## 📖 Usage Guide

### Default Login Credentials

| Field | Value |
|-------|-------|
| Email | `admin@thegutguru.com` |
| Password | `admin123` |

⚠️ **Change the password immediately after first login!**

### First-Time Setup

1. **Login** with default credentials above

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
| `PUT` | `/api/invoices/[id]` | Update invoice status |
| `PATCH` | `/api/invoices/[id]` | Update invoice status |
| `DELETE` | `/api/invoices` | Delete all invoices |

#### Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sync` | Get sync status |
| `POST` | `/api/sync` | Trigger email sync |
| `POST` | `/api/sync?full=true` | Trigger full sync (all history) |

#### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get current settings |
| `POST` | `/api/settings` | Update settings |

#### Users (Admin/Manager only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/team/users` | List team users |
| `POST` | `/api/team/users` | Create team user |
| `PUT` | `/api/team/users` | Update team user |
| `DELETE` | `/api/team/users` | Delete team user |
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
Gutguru-tracker/
├── data/                       # Legacy data storage (deprecated)
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
│   │   ├── turso.ts           # Turso database operations
│   │   ├── sync.ts            # Email sync logic
│   │   └── settings.ts        # Settings management (legacy)
│   └── types/                 # TypeScript definitions
│       └── index.ts           # Type definitions
├── .env.example               # Environment template
├── .env.local                 # Local environment (not committed)
├── AI_PROMPT.md               # AI development prompt
├── TODO.md                    # Feature roadmap
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
6. **Database Security**: Turso auth tokens required for database access

---

## 🐛 Troubleshooting

### Common Issues

1. **Database table not found**
   - The database initializes automatically on first request
   - Restart the dev server if tables aren't created

2. **Email sync fails**
   - Verify IMAP credentials in Settings
   - For Gmail, use App Passwords (not regular password)
   - Check if "Less secure app access" is needed

3. **Login not working**
   - Clear browser cookies
   - Check NEXTAUTH_SECRET is set
   - Verify NEXTAUTH_URL matches your URL

4. **Turso connection timeout**
   - Check your internet connection
   - Verify TURSO_DATABASE_URL is correct
   - Try regenerating the auth token

---

## 📝 License

This is a private application. All rights reserved.

---

## 🤝 Support

For issues or feature requests, please contact the development team.

**Repository**: [https://github.com/satish-varma/Gutguru-tracker](https://github.com/satish-varma/Gutguru-tracker)

---

*Last Updated: December 25, 2025*
