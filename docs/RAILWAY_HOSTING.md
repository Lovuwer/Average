# Railway Hosting Guide — Average Backend + Auth

This guide walks you through hosting the Average backend (Fastify API with auth) on [Railway](https://railway.app) and connecting the React Native mobile app to it.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create a Railway Account & Project](#step-1-create-a-railway-account--project)
3. [Step 2: Add a PostgreSQL Database](#step-2-add-a-postgresql-database)
4. [Step 3: Deploy the Backend from GitHub](#step-3-deploy-the-backend-from-github)
5. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
6. [Step 5: Generate Your Admin Password Hash](#step-5-generate-your-admin-password-hash)
7. [Step 6: Deploy & Verify](#step-6-deploy--verify)
8. [Step 7: Connect the Mobile App to Railway](#step-7-connect-the-mobile-app-to-railway)
9. [Custom Domain (Optional)](#custom-domain-optional)
10. [Troubleshooting](#troubleshooting)
11. [Architecture Overview](#architecture-overview)

---

## Prerequisites

- A [Railway](https://railway.app) account (free tier available, or paid for production)
- This repository pushed to GitHub
- Node.js 20+ installed locally (for generating the password hash)

---

## Step 1: Create a Railway Account & Project

1. Go to [railway.app](https://railway.app) and sign up / log in (GitHub OAuth recommended).
2. Click **"New Project"** from the dashboard.
3. Select **"Empty Project"** — we'll add services manually.

---

## Step 2: Add a PostgreSQL Database

1. Inside your new project, click **"+ New"** → **"Database"** → **"PostgreSQL"**.
2. Railway will automatically provision a PostgreSQL 16 instance.
3. Click on the PostgreSQL service to see its connection details.
4. Copy the **`DATABASE_URL`** — it looks like:
   ```
   postgresql://postgres:XXXX@roundhouse.proxy.rlwy.net:12345/railway
   ```
   > You'll need this in Step 4. Railway can also auto-inject it as a variable reference `${{Postgres.DATABASE_URL}}`.

---

## Step 3: Deploy the Backend from GitHub

1. In the same project, click **"+ New"** → **"GitHub Repo"**.
2. Select the **Average** repository from the list.
   - If you don't see it, click "Configure GitHub App" to grant Railway access.
3. **Set the root directory** — this is critical:
   - Click on the newly created service → **Settings** tab.
   - Under **"Root Directory"**, enter: **`backend`**
   - This tells Railway to build from the `backend/` folder (where the Dockerfile lives).
4. Railway will detect the `Dockerfile` automatically and begin the first deploy.

---

## Step 4: Configure Environment Variables

Click on your backend service → **"Variables"** tab → **"+ New Variable"**.

Add each of the following:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Click "Add Reference" and select the Postgres service — Railway auto-fills this |
| `JWT_SECRET` | *(generate one — see below)* | Must be a strong random string, min 32 chars |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime |
| `HOST` | `0.0.0.0` | Required for Railway to route traffic |
| `CORS_ORIGIN` | `*` | Or restrict to your domain for production |
| `ADMIN_EMAIL` | `your-email@example.com` | The email you'll use to log in from the app |
| `ADMIN_PASSWORD_HASH` | *(bcrypt hash — see Step 5)* | Hashed version of your password |

> **Note**: Do NOT set a `PORT` environment variable. Railway automatically injects its own `PORT` variable (usually 8080 or other values), and the backend code will use it. Setting your own `PORT` can cause conflicts and 502 errors.

### Generate a JWT Secret

Run this in your terminal:
```bash
openssl rand -base64 32
```
Use the output as your `JWT_SECRET` value.

---

## Step 5: Generate Your Admin Password Hash

The backend uses bcrypt to compare your password. You need to store the **hash**, not the plain-text password.

### Option A: Using Node.js (Recommended)

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD_HERE', 12).then(h => console.log(h));"
```

> Replace `YOUR_PASSWORD_HERE` with your desired password.

If you don't have `bcryptjs` globally, run from the backend directory:
```bash
cd backend
npm install
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD_HERE', 12).then(h => console.log(h));"
```

### Option B: Using an Online Tool

Go to [bcrypt-generator.com](https://bcrypt-generator.com/), enter your password, set rounds to 12, and copy the hash.

### Set the Hash in Railway

Copy the output (e.g., `$2a$12$LJ3m4ys...`) and paste it as the value for `ADMIN_PASSWORD_HASH` in Railway's Variables tab.

> **Important**: The hash starts with `$2a$` or `$2b$`. Make sure you copy the entire string.

---

## Step 6: Deploy & Verify

1. After setting all variables, Railway will automatically redeploy.
   - If it doesn't, click **"Deploy"** or push a commit to trigger a deploy.
2. Wait for the build to complete (usually 1–2 minutes).
3. Railway assigns a public URL to your service, e.g.:
   ```
   https://average-backend-production.up.railway.app
   ```
   Find it in the service's **Settings** → **"Networking"** → **"Public Networking"**.
   Click **"Generate Domain"** if no domain is shown.

### Verify the deployment

```bash
curl https://YOUR-RAILWAY-URL.railway.app/health
```

Expected response:
```json
{ "status": "ok", "timestamp": "2026-02-11T00:00:00.000Z" }
```

### Test the login endpoint

```bash
curl -X POST https://YOUR-RAILWAY-URL.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"YOUR_PASSWORD_HERE"}'
```

Expected response:
```json
{
  "accessToken": "eyJhbGciOiJI...",
  "refreshToken": "a1b2c3d4-...",
  "user": { "id": "admin", "email": "your-email@example.com", "displayName": "Admin" }
}
```

---

## Step 7: Connect the Mobile App to Railway

The React Native app is already configured to connect to Railway in production. The API client at `src/services/api/ApiClient.ts` switches URLs based on the build mode:

```typescript
const BASE_URL = __DEV__
  ? 'http://localhost:3000'           // Development (Metro)
  : 'https://average-api.railway.app'; // Production (Railway)
```

### Update the Production URL

Edit `src/services/api/ApiClient.ts` and replace the production URL with your actual Railway URL:

```typescript
const BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://YOUR-RAILWAY-URL.railway.app';  // ← Your Railway URL here
```

### For Local Development

When running locally with Metro, the app connects to `http://localhost:3000`. Start the backend locally:

```bash
cd backend
cp .env.example .env
# Edit .env with your local PostgreSQL URL, ADMIN_EMAIL, ADMIN_PASSWORD_HASH
npx prisma migrate dev
npm run dev
```

### Build & Install the APK

After updating the Railway URL, build a release APK:

```bash
# Generate the JS bundle
npm run bundle:android

# Build the APK
cd android && ./gradlew assembleRelease
```

The release APK will use your Railway URL for all API calls.

---

## Custom Domain (Optional)

1. In Railway, go to your backend service → **Settings** → **Networking**.
2. Click **"+ Custom Domain"**.
3. Enter your domain (e.g., `api.yourdomain.com`).
4. Add the CNAME record Railway provides to your DNS settings.
5. Update `src/services/api/ApiClient.ts` with your custom domain.

---

## Troubleshooting

### "Server auth configuration error" (500)

**Cause**: `ADMIN_EMAIL` or `ADMIN_PASSWORD_HASH` environment variables are missing.

**Fix**: Check Railway Variables tab. Ensure both `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` are set.

### "Invalid credentials" (401)

**Cause**: Email or password doesn't match the env vars.

**Fix**:
1. Verify `ADMIN_EMAIL` matches exactly what you type in the app.
2. Re-generate the bcrypt hash for your password (see Step 5) and update `ADMIN_PASSWORD_HASH`.

### Build fails on Railway

**Cause**: Usually a missing dependency or Prisma issue.

**Fix**:
1. Check Railway's build logs (click on the deployment).
2. Ensure `backend/package.json` and `backend/Dockerfile` are correct.
3. Verify `backend/prisma/schema.prisma` exists with a valid schema.

### App can't reach the backend

**Cause**: Wrong URL or CORS issue.

**Fix**:
1. Confirm the Railway URL is correct in `src/services/api/ApiClient.ts`.
2. Ensure `CORS_ORIGIN=*` is set (or your specific domain).
3. Test from terminal: `curl https://YOUR-URL.railway.app/health`

### Database migration errors

**Fix**: Run migrations manually via Railway's CLI or shell:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migration
railway run npx prisma migrate deploy
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Railway Cloud                         │
│                                                              │
│   ┌─────────────────┐       ┌─────────────────────────┐     │
│   │   PostgreSQL 16  │◄──────│  Average Backend        │     │
│   │   (Database)     │       │  (Fastify + Prisma)     │     │
│   │                  │       │                         │     │
│   │  • Users data    │       │  • POST /auth/login     │     │
│   │  • Trips data    │       │  • POST /auth/refresh   │     │
│   │  • Sessions      │       │  • POST /auth/logout    │     │
│   └─────────────────┘       │  • GET  /auth/verify    │     │
│                              │  • POST /trips/sync     │     │
│                              │  • GET  /health         │     │
│                              └────────────┬────────────┘     │
│                                           │                  │
│                              https://xxx.railway.app         │
└──────────────────────────────────────────────────────────────┘
                                            │
                                            │ HTTPS
                                            │
                              ┌─────────────▼────────────┐
                              │   React Native App       │
                              │   (Android / iOS)        │
                              │                          │
                              │   ApiClient.ts           │
                              │   → axios + JWT tokens   │
                              │   → auto-refresh on 401  │
                              └──────────────────────────┘
```

### Auth Flow

1. **User opens app** → Splash screen checks for stored tokens.
2. **Login screen** → User enters email + password.
3. **App calls** `POST /auth/login` → Backend uses bcrypt to compare the submitted password against the stored `ADMIN_PASSWORD_HASH`.
4. **Backend returns** `accessToken` (JWT, 15min) + `refreshToken`.
5. **App stores tokens** in encrypted storage.
6. **Subsequent API calls** include `Authorization: Bearer <accessToken>`.
7. **On 401** → App auto-calls `POST /auth/refresh` with the refresh token → gets new tokens.
8. **Logout** → `POST /auth/logout` clears server-side tokens + app clears local storage.
