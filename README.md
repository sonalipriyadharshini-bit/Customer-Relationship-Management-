# Customer Hub: Amazon-style CRM (HTML + CSS + JS frontend, Django backend, SQLite)

There is no demo data and no default password. Every record is entered by a user through the app.

## First-time setup (Windows)

    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py createsuperuser      (choose your own admin username and password)
    python manage.py runserver

Open http://127.0.0.1:8000 . You will see three separate logins: Customer, Sales person and Admin.
Each login page only accepts its own role. Sign in as admin with the account you just created.

## Who enters what
| Role | Can add / change |
|---|---|
| Admin | Team members (sales people, admins), products, customers (and assign them), orders, order status, return approvals, delete records |
| Sales person | Customers (assigned to them), orders and support cases for their customers, order and case status |
| Customer | Registers on the login page, buys from the Shop, cancels an order that has not shipped, requests a return for a delivered order, raises support requests |

New customers who register are assigned automatically to the sales person with the fewest customers.
Sales people only see their own customers' data. Admin sees everything.

## Structure
- config/    settings and root urls (serves /frontend in development)
- crm/       models, serializers, role-scoped API views
- frontend/  login.html, app.html, style.css, api.js, login.js, app.js
- Database: default SQLite (db.sqlite3). Django admin at /admin.

## Upgrading from the earlier demo version
Delete the old db.sqlite3 and run migrate again (the data model changed).
