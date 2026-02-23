# Rental Management System

A full-stack web application for managing rental properties, tenants, invoices, and payments.

## Tech Stack

- **Backend:** Django 4.2 + Django REST Framework + PostgreSQL
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Auth:** JWT (djangorestframework-simplejwt)

## Setup

### Prerequisites

- Python 3.12 (venv already created at `backend/venv/`)
- Node.js 18+
- PostgreSQL running locally

### 1. Backend

```bash
# Create the PostgreSQL database
psql -U postgres -c "CREATE DATABASE rental_db;"

# Configure environment
cd backend
cp .env.example .env
# Edit .env with your DB credentials and a strong SECRET_KEY

# Install dependencies (already installed in venv)
venv/Scripts/pip install -r requirements.txt   # Windows
# source venv/bin/activate && pip install -r requirements.txt  # Linux/Mac

# Run migrations
venv/Scripts/python.exe manage.py migrate

# Create the first landlord user
venv/Scripts/python.exe manage.py createsuperuser

# Start the backend server (port 8000)
venv/Scripts/python.exe manage.py runserver
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev   # starts at http://localhost:5173
```

### 3. Make the superuser a landlord

After running `createsuperuser`, log into the Django admin at `http://localhost:8000/admin/` and set the user's **role** to `landlord`.

Alternatively, use the shell:

```bash
venv/Scripts/python.exe manage.py shell
>>> from users.models import User
>>> u = User.objects.get(username='your_username')
>>> u.role = 'landlord'
>>> u.save()
```

## Usage Flow

1. **Landlord logs in** at `http://localhost:5173`
2. **Add properties** → Properties → Add Property
3. **Add units** → click a property → Add Unit
4. **Add tenants** → Tenants → Add Tenant (assigns to a unit, sets login credentials)
5. **Create invoices** → Invoices → Create Invoice (base rent + utility line items)
6. **Record payments** → open an invoice → Record Payment → generates downloadable receipt
7. **View reports** → Reports → Payment Report or Outstanding Balances

Tenants log in with the email and password set by the landlord and can view their invoices and download PDFs.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/token/` | Login (returns JWT) |
| POST | `/api/auth/token/refresh/` | Refresh JWT |
| GET/PATCH | `/api/auth/me/` | Current user |
| GET/POST | `/api/apartments/` | List / create apartments |
| GET/PUT/DELETE | `/api/apartments/{id}/` | Apartment detail |
| GET/POST | `/api/units/` | List / create units |
| GET/PUT/DELETE | `/api/units/{id}/` | Unit detail |
| GET/POST | `/api/tenants/` | List / create tenants |
| GET/PUT/PATCH | `/api/tenants/{id}/` | Tenant detail |
| GET/POST | `/api/invoices/` | List / create invoices |
| GET | `/api/invoices/{id}/` | Invoice detail |
| GET | `/api/invoices/{id}/pdf/` | Download invoice PDF |
| GET/POST | `/api/payments/` | List / record payments |
| GET | `/api/payments/{id}/receipt/` | Download receipt PDF |
| GET | `/api/reports/dashboard/` | Landlord dashboard stats |
| GET | `/api/reports/payments/` | Filterable payment report |
| GET | `/api/reports/outstanding/` | Outstanding balance report |
| GET | `/api/tenant/invoices/` | Tenant's own invoices |
| GET | `/api/tenant/invoices/{id}/pdf/` | Tenant invoice PDF download |
| GET | `/api/reports/tenant/dashboard/` | Tenant dashboard stats |
