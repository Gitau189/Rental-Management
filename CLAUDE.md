# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Esther Rent is a full-stack rental management system. Landlords manage properties, create monthly invoices with itemized utility charges, record partial or full payments, and generate PDF receipts. Tenants log in to view their invoices and download PDFs.

## Tech Stack

- **Backend:** Django 4.2, Django REST Framework, djangorestframework-simplejwt, PostgreSQL (psycopg2-binary), reportlab (PDF generation), python-dotenv
- **Frontend:** React 18, Vite, Tailwind CSS 3, React Router 6, Axios, react-hot-toast, lucide-react

## Commands

### Backend

```bash
# All backend commands run inside backend/venv
cd backend

# Run dev server (port 8000)
venv/Scripts/python.exe manage.py runserver

# Migrations
venv/Scripts/python.exe manage.py makemigrations users properties billing
venv/Scripts/python.exe manage.py migrate

# Django shell
venv/Scripts/python.exe manage.py shell

# Install new package
venv/Scripts/pip install <package> && venv/Scripts/pip freeze > requirements.txt
```

### Frontend

```bash
cd frontend
npm run dev       # dev server at http://localhost:5173
npm run build     # production build
```

## Architecture

### Backend Apps

```
backend/
  rental_system/   # Django project (settings, root URLs, wsgi)
  users/           # Custom User model with role field (landlord/tenant)
  properties/      # Apartment, Unit, TenantProfile models
  billing/         # Invoice, InvoiceLineItem, Payment models + PDF utils
  reports/         # Read-only dashboard & report views (no models)
```

**Key patterns:**
- `AUTH_USER_MODEL = 'users.User'` — custom user with `role` field (`landlord` | `tenant`)
- All CRUD views use `@api_view` function-based views (not class-based) with a `landlord_required` decorator
- Invoice status (`unpaid` / `partial` / `paid` / `overdue`) is stored in the DB and refreshed via `Invoice.refresh_status()` when payments are recorded, and bulk-updated via `.update(status='overdue')` in list views
- `InvoiceLineItem` records extra charges (water, electricity, etc.); `total_amount` = `base_rent` + sum of line items, calculated at creation
- When a `Payment` is created, `Invoice.amount_paid` is incremented and `refresh_status()` is called
- PDF generation is in `billing/pdf_utils.py` using reportlab; returned as `HttpResponse(content_type='application/pdf')`
- `TenantProfile` is a OneToOne extension of `User` for tenant-specific fields; creating a tenant also marks the `Unit.status = 'occupied'`

### Frontend Structure

```
frontend/src/
  contexts/AuthContext.jsx   # JWT login/logout + /auth/me/ fetch; stores tokens in localStorage
  services/api.js            # Axios instance with JWT interceptor + refresh on 401
  utils/helpers.js           # formatCurrency, formatDate, downloadBlob, errorMessage, MONTHS
  components/                # Layout, Sidebar, Modal, StatusBadge, EmptyState, LoadingSpinner
  pages/landlord/            # Dashboard, Properties, PropertyDetail, Tenants, TenantDetail,
                             # Invoices, CreateInvoice, InvoiceDetail, Payments, Reports
  pages/tenant/              # TenantDashboard, TenantInvoices, TenantInvoiceDetail
```

**Key patterns:**
- `App.jsx` uses `RequireAuth` with a `role` prop to enforce landlord vs tenant routing
- All monetary values: `formatCurrency(value)` → `1,234.56` (no currency symbol in helper; UI prepends `KES`)
- PDF downloads use `downloadBlob(res.data, filename)` with `api.get(..., { responseType: 'blob' })`
- Forms use controlled React state; `errorMessage(err)` normalises DRF error shapes for toasts
- Tailwind custom classes (`btn-primary`, `btn-secondary`, `card`, `input`, `label`, `table-head`, `table-cell`) are defined in `src/index.css`

### Data Flow: Invoice → Payment → Receipt

1. Landlord creates invoice → `POST /api/invoices/` → `InvoiceCreateSerializer` calculates `total_amount`, creates `InvoiceLineItem` rows
2. Landlord records payment → `POST /api/payments/` → `PaymentCreateSerializer` increments `Invoice.amount_paid`, calls `Invoice.refresh_status()`
3. Receipt download → `GET /api/payments/{id}/receipt/` → `generate_receipt_pdf(payment)` → PDF response

### Login
Login accepts **username or email** in a single field. The backend resolves email → username via `FlexibleTokenObtainPairView` in `users/views.py` before handing off to simplejwt. There is no self-service sign-up; tenants are created exclusively by landlords.

### Environment Variables
**Backend** (`backend/.env`): `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DB_*`, `CORS_ALLOWED_ORIGINS` (comma-separated list of allowed frontend origins).

**Frontend** (`frontend/.env`): `VITE_API_BASE_URL` — set to the deployed API root (e.g. `https://api.yourdomain.com/api`). Leave blank in development; Vite's dev proxy handles `/api → http://localhost:8000/api`.

### Database

The `.env` in `backend/` configures the PostgreSQL connection. Copy `.env.example` → `.env` and fill in credentials. Run `migrate` once after setup. No fixtures; first landlord is created via `createsuperuser` then role is set to `landlord` via admin or shell.
