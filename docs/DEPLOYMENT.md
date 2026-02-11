# Deployment Guide

## Backend Deployment (Railway)

### Prerequisites
- [Railway](https://railway.app) account
- GitHub repository connected to Railway

### Steps

1. **Create a new Railway project**
2. **Add PostgreSQL database**:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway auto-provisions the database and provides `DATABASE_URL`
3. **Add service from GitHub**:
   - Click "New" → "GitHub Repo"
   - Select the Average repository
   - Set root directory to `backend/`
4. **Configure environment variables**:
   ```
   DATABASE_URL=<auto-populated by Railway>
   JWT_SECRET=<generate: openssl rand -base64 32>
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   PORT=3000
   HOST=0.0.0.0
   CORS_ORIGIN=*
   ADMIN_EMAIL=your-email@example.com
   ADMIN_PASSWORD_HASH=<generate bcrypt hash — see docs/RAILWAY_HOSTING.md Step 5>
   ```
5. **Deploy**: Railway auto-detects the Dockerfile and deploys
6. **Verify**: Hit `https://<your-app>.railway.app/health`

### Database Migrations
Migrations run automatically on container start (`npx prisma migrate deploy` in Dockerfile CMD).

To run manually:
```bash
cd backend
DATABASE_URL=<url> npx prisma migrate deploy
```

---

## Android (Google Play Store)

### Build Release APK/AAB

```bash
# Generate release keystore (one-time)
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/average-release.keystore -alias average -keyalg RSA -keysize 2048 -validity 10000

# Build release AAB
cd android
./gradlew bundleRelease
```

The AAB will be at `android/app/build/outputs/bundle/release/app-release.aab`

### Google Play Console
1. Create app listing in Google Play Console
2. Upload AAB to Internal/Closed testing track
3. For Android Auto: Submit for Auto review in the Play Console
4. Complete store listing, content rating, and pricing
5. Submit for review

---

## iOS (App Store)

### Build Release IPA

```bash
# From project root
cd ios
pod install
xcodebuild -workspace Average.xcworkspace -scheme Average -configuration Release -sdk iphoneos archive -archivePath build/Average.xcarchive
```

### App Store Connect
1. Open Xcode, select Product → Archive
2. In Organizer, click "Distribute App"
3. Select "App Store Connect" → Upload
4. In App Store Connect, create a new app listing
5. For CarPlay: Ensure CarPlay entitlement is approved before submission
6. Submit for review

### CarPlay Entitlement
1. Visit [Apple MFi Portal](https://mfi.apple.com)
2. Apply for CarPlay entitlement (category: Driving Task)
3. Apple review takes 2-4 weeks
4. Once approved, add `com.apple.developer.carplay-driving-task` to entitlements
5. Enable CarPlay in Xcode's Signing & Capabilities

---

## Environment Variables Summary

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_ACCESS_EXPIRY` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | `7d` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `CORS_ORIGIN` | CORS allowed origins | `*` |
| `ADMIN_EMAIL` | Single-user login email | Required |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of admin password | Required |
