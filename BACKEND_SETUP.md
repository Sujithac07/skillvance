# Skillvance Backend Setup (MongoDB Atlas + Vercel)

## Architecture

1. Backend app entry is `backend/server.js`.
2. Local runtime starts from `backend/start.js`.
3. Vercel routes all `/api/*` requests to `api/index.js`.
4. `api/index.js` forwards requests to the same Express app from `backend/server.js`.
5. MongoDB connection is handled in `backend/config/db.js`.
6. Auth routes are in `backend/routes/auth.js`.
7. Certificate routes are in `backend/routes/certificates.js`.
8. JWT middleware is in `backend/middleware/auth.js`.
9. Mongoose models are in `backend/models/Admin.js` and `backend/models/Certificate.js`.

## Required Environment Variables

Use these in local `.env` and in Vercel Project Settings:

- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_SECRET_PREVIOUS` (optional, comma-separated previous secrets for key rotation)
- `JWT_ALGORITHM` (`HS256` default, or `RS256`)
- `JWT_KEY_ID` (optional key identifier)
- `JWT_PRIVATE_KEY` (required when `JWT_ALGORITHM=RS256`)
- `JWT_PUBLIC_KEY` (required when `JWT_ALGORITHM=RS256`)
- `JWT_PUBLIC_KEYS` (optional, `|||`-separated previous public keys for rotation)
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWT_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_IN` (default `30d`)
- `REFRESH_COOKIE_NAME` (optional, default `skillvance_admin_refresh`)
- `REFRESH_COOKIE_SAMESITE` (default `strict` in production)
- `REFRESH_ALLOW_MULTI_SESSION` (`false` by default)
- `PUBLIC_APP_URL` (for canonical verification URL generation)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`
- `CORS_ORIGIN`

Copy `.env.example` and fill secure values.

## Error-Free Local Setup

1. Open terminal at project root.
2. Install backend dependencies:

```powershell
cd backend
npm install
```

3. Keep `.env` in backend folder with required keys:

- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`

4. Start backend:

```powershell
npm run dev
```

5. Confirm backend health:

```text
http://localhost:5000/api/health
```

It must return JSON with `status: "OK"`.

6. Serve frontend separately from root folder, for example:

```powershell
cd ..
npx serve .
```

7. Open admin login page and ensure API calls go to backend (`http://localhost:5000`) when frontend runs on a different local port.

## Why `501 Unsupported method (POST)` Happens

1. `501` means request hit a server that does not support POST for that route.
2. Usually this is a static frontend server, not Express backend.
3. So `POST /api/auth/login` reached wrong port/server, not `backend/routes/auth.js`.

## Quick Verification Checklist

1. Backend log prints server running on localhost:5000.
2. `/api/health` returns `status: "OK"`.
3. `POST /api/auth/login` sets access + refresh cookies and returns authenticated JSON (not HTML, not 404/501).
4. `GET /api/certificates` with token returns data or auth error (401 if token missing), not 501.
5. Public verify URL works with URL encoded query format:

```text
https://www.skillvancetechnologies.com/verify?certId=SKV2025ML01203
```

6. `GET /api/certificates/verify/:id` response includes:
 - `verificationUrl`
 - `qrCodeUrl`

## API Endpoints

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/verify`
- `POST /api/auth/logout`

### Certificates

- `GET /api/certificates/verify/:id` (public)
- `GET /api/certificates` (admin token)
- `POST /api/certificates` (admin token)
- `PUT /api/certificates/:id` (admin token)
- `DELETE /api/certificates/:id` (admin token)

## Vercel Deployment Notes

1. `vercel.json` already rewrites `/api/*` to `api/index.js`.
2. `cleanUrls` is enabled, so `/about` maps to `about.html` automatically.
3. Add all environment variables in Vercel before deployment.
4. Use MongoDB Atlas network allowlist and least-privilege DB user.

## Security Controls Included

- Password hashing with bcrypt (`Admin` model pre-save hook)
- JWT signed with required secret and strict algorithm
- Optional RS256 JWT signing/verification mode
- JWT key rotation support (`JWT_SECRET_PREVIOUS` / `JWT_PUBLIC_KEYS`)
- Issuer/audience validation on token verify
- Refresh-token rotation and revocation persistence
- Login rate limiting
- CORS allowlist support via `CORS_ORIGIN`
- Request body size limit (1mb)
- Certificate ID uniqueness and schema validation
- Canonical URL-encoded verification links and QR URL generation
