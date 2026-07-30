# Backend-Frontend Integration Plan

## Steps

- [x] Plan approved
- [x] **Step 1**: Create `app.py` — Flask REST API server wrapping the banking logic
  - [x] Convert `Pythonmain.py` functions into Flask routes
  - [x] Add transaction history tracking
  - [x] Add CORS support
  - [x] Add JSON API endpoints (balance, deposit, withdraw, KYC, transactions)
- [x] **Step 2**: Update `js/main.js` — Replace mock actions with real `fetch()` API calls
  - [x] On page load, fetch balance from `/api/balance`
  - [x] Deposit form submits to `/api/deposit`
  - [x] Withdraw form submits to `/api/withdraw`
  - [x] KYC form submits to `/api/kyc`
  - [x] Load transactions from `/api/transactions`
  - [x] Remove mock timeout delays
- [x] **Step 3**: Install Python dependencies (`flask`, `flask-cors`)
- [ ] **Step 4**: Test the full integration — Start Flask server and verify frontend connects
