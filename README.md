# SmartSpend — Personal Finance and Budget Management System

SmartSpend is a full-stack web application concept for recording income and expenses, monitoring budgets, and understanding spending patterns through a financial dashboard.

## Current status
- [x] React + Vite frontend scaffold
- [x] Responsive dashboard UI with summary cards and charts
- [x] Add and remove transactions in demo session
- [x] CSV export of visible transactions
- [x] Express API scaffold and health endpoint
- [x] MongoDB persistence and transaction API
- [x] User authentication
- [x] Persistent budgets and analytics

> The initial dashboard uses sample data for presentation. Transactions created in this stage are stored only in React state and are not persisted to a database. Do not present sample figures as real financial data.

## Technology stack
- React, Vite, React Router
- Recharts, Lucide React, Axios
- Node.js, Express
- MongoDB, Mongoose (backend connection to be configured)
- JWT and bcrypt (authentication to be implemented)

## Run the frontend
```bash
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite (normally http://localhost:5173).

## Run the backend
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```
Set `MONGODB_URI` in `backend/.env` before enabling database-backed features. Keep `.env` private and never commit credentials.

API health check: `http://localhost:5000/api/health`
