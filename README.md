# DigitalMarket.com Paper Trading Simulator

Simulation only. No real-money deposits, withdrawals, banking, investments, or payouts.

Features: registration, administrator approval, zero starting balances, automatic currency by selected country (Nigeria NGN/₦, Ghana GHS/₵, Philippines PHP/₱, UK GBP/£, US USD/$), user dashboard, simulated deposit/withdrawal requests, transaction history, profile, notifications, administrator balance controls, administrator transaction management, view-only test bank details, SQLite persistence, hashed passwords, sessions, and mobile-friendly UI.

## Run
npm install
npm start

Default admin (change before public deployment):
admin@digitalmarket.com
ChangeMe123!

## Render
Build: npm install
Start: npm start
Set ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET.
For persistent storage set DB_PATH=/data/digitalmarket.sqlite and attach a persistent disk.
