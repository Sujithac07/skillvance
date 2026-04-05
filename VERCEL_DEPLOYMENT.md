# Vercel Deployment Guide (Skillvance)

## 1) Project Setup

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Framework preset: `Other`.
4. Root directory: repository root (`skillvance`).
5. Build command: leave empty (static site + serverless function).
6. Output directory: leave empty.

## 2) Required Runtime Files

- API entry: `api/index.js`
- Backend app: `backend/server.js`
- Routing config: `vercel.json`

## 3) Environment Variables (Vercel Project Settings)

Set these for Production (and Preview if needed):

- `NODE_ENV=production`
- `MONGODB_URI=<your atlas uri>`
- `MONGODB_DB_NAME=skillvance`
- `JWT_SECRET=<min 32 chars>`
- `JWT_ISSUER=skillvance-api`
- `JWT_AUDIENCE=skillvance-admin`
- `JWT_EXPIRES_IN=15m`
- `BCRYPT_ROUNDS=12`
- `AUTH_COOKIE_NAME=skillvance_admin_token`
- `ADMIN_USERNAME=<secure admin username>`
- `ADMIN_PASSWORD=<secure admin password>`
- `ADMIN_EMAIL=<admin email>`
- `CORS_ORIGIN=https://<your-production-domain>,https://<your-project>.vercel.app`
- `TRUST_PROXY=true`

Optional rate-limit tuning:

- `API_RATE_LIMIT_WINDOW_MS=900000`
- `API_RATE_LIMIT_MAX=300`
- `AUTH_RATE_LIMIT_WINDOW_MS=600000`
- `AUTH_RATE_LIMIT_MAX=5`
- `CERT_VERIFY_RATE_LIMIT_WINDOW_MS=600000`
- `CERT_VERIFY_RATE_LIMIT_MAX=60`

## 4) Important Behavior

- `vercel.json` rewrites `/api/*` to `api/index.js`.
- API and frontend are served on the same Vercel domain.
- Auth cookie is `HttpOnly` and `Secure` in production.
- `backend/server.js` automatically includes `https://${VERCEL_URL}` in allowed origins.

## 5) Post-Deploy Checks

1. Open `https://<your-domain>/api/health` and verify JSON status.
2. Open `https://<your-domain>/admin-login` and login.
3. Confirm certificates list loads at `https://<your-domain>/admin-certs`.
4. Verify a certificate on `https://<your-domain>/verify`.

## 6) Troubleshooting

- 401 on admin APIs: clear cookies and login again.
- CORS error: verify `CORS_ORIGIN` contains the active domain.
- MongoDB timeout: ensure Atlas IP/network policy allows Vercel access.
- 500 on startup: ensure `JWT_SECRET` length is at least 32 characters.
