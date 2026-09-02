# TradingPlatformPayout — shared-account version

This version uses a real server-side SQLite database, hashed passwords, and server sessions.

## Run
1. Install Node.js 20+.
2. Run `npm install`.
3. Set a strong `ADMIN_PASSWORD` and `SESSION_SECRET` (copy `.env.example` to `.env` and load it with your deployment platform, or export the variables).
4. Run `npm start`.
5. Open the site at the server URL.

## Important
- The database is shared by all users who connect to the same deployed server.
- New accounts start with Deposit = 0 and Profit = 0 and remain Pending until an administrator approves them.
- Admin changes to a user's balance are stored server-side and are visible when that user logs in from another device.
- This package does not process real-money payments.
- Before production use, configure HTTPS, a persistent database volume/backups, a strong session secret, and a strong admin password.
