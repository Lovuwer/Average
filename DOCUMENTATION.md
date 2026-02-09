# Average — Speed Tracking App

## Overview

**Average** is a cross-platform mobile speed tracking application built with React Native. It provides real-time GPS-based speed monitoring, trip recording, and detailed statistics — with native integrations for Android Auto and Apple CarPlay.

### Supported Platforms
- **iOS** 14.0+ (iPhone, CarPlay)
- **Android** 8.0+ (Phone, Android Auto)
- **Backend**: Node.js + Fastify + PostgreSQL (Railway-deployable)

---

## Architecture

### Frontend (React Native 0.76+)
- **Language**: TypeScript
- **State Management**: Zustand (lightweight, hooks-based)
- **Navigation**: React Navigation (Stack + Bottom Tabs with custom floating pill nav)
- **UI Framework**: Custom Liquid Glass design system using react-native-reanimated
- **GPS**: react-native-geolocation-service with Kalman filter smoothing
- **Security**: 7-layer anti-cracking suite (root detection, SSL pinning, request signing, etc.)
- **Storage**: react-native-encrypted-storage (tokens), in-memory trip store with sync

### Backend (Fastify)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT with refresh token rotation, bcrypt password hashing
- **Validation**: Zod schemas
- **Rate Limiting**: @fastify/rate-limit (100/min global, 20/min auth)
- **Deployment**: Docker container for Railway

### Car Integration
- **Android Auto**: Kotlin native module using `androidx.car.app` library
- **Apple CarPlay**: Swift native module using `CarPlay` framework

---

## Setup Guide

### Prerequisites
- Node.js 20+
- npm 10+
- React Native CLI (`npx react-native`)
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS native deps)
- PostgreSQL 14+ (for backend)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Lovuwer/Average.git
cd Average

# 2. Install RN dependencies
npm install

# 3. Install iOS pods
cd ios && pod install && cd ..

# 4. Install backend dependencies
cd backend && npm install && cd ..

# 5. Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your PostgreSQL connection string

# 6. Set up database
cd backend
npx prisma migrate dev --name init
cd ..
```

### Running the App

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Start backend server
cd backend && npm run dev
```

---

## Backend Deployment (Railway)

### Step-by-Step

1. **Create Railway project**: Go to [railway.app](https://railway.app) and create a new project
2. **Add PostgreSQL**: Add a PostgreSQL plugin to your project
3. **Deploy from GitHub**: Connect your repository, set the root directory to `backend/`
4. **Set environment variables**:
   - `DATABASE_URL` — auto-populated by Railway PostgreSQL plugin
   - `JWT_SECRET` — a secure random string (min 32 characters)
   - `JWT_ACCESS_EXPIRY` — `15m`
   - `JWT_REFRESH_EXPIRY` — `7d`
   - `PORT` — `3000` (Railway assigns $PORT automatically)
   - `HOST` — `0.0.0.0`
   - `CORS_ORIGIN` — `*` (or restrict to your domain)
5. **Deploy**: Railway auto-builds using the Dockerfile and runs migrations on start

### Health Check
```
GET /health → { "status": "ok", "timestamp": "..." }
```

---

## Android Auto Setup

### Testing with Desktop Head Unit (DHU)

1. Install Android Auto app on device/emulator
2. Enable Developer Settings in Android Auto app
3. Download and run the [Desktop Head Unit](https://developer.android.com/training/cars/testing#desktop-head-unit)
4. Connect device via ADB
5. The Average app will appear in Android Auto's app list

### Manifest Configuration
The `AndroidManifest.xml` includes:
- `com.google.android.gms.car.application` meta-data pointing to `automotive_app_desc.xml`
- `AverageCarAppService` service declaration

### Google Play Requirements
- Apps using Android Auto must pass Google's review process
- Speed-related apps must comply with driving safety guidelines

---

## Apple CarPlay Setup

### Entitlement
1. Apply for CarPlay entitlement at [Apple's MFi Portal](https://mfi.apple.com)
2. Select "Driving Task" category
3. Add `com.apple.developer.carplay-driving-task` to your app's entitlements

### Xcode Configuration
1. Add CarPlay capability in Signing & Capabilities
2. Ensure `Info.plist` includes CarPlay scene configuration
3. Build and run on a CarPlay-compatible device or simulator

### Testing in Simulator
1. Open Simulator
2. Go to I/O → External Displays → CarPlay
3. The Average app should appear in the CarPlay dashboard

---

## Security Architecture

Average implements a 7-layer security model:

| Layer | Component | Description |
|-------|-----------|-------------|
| 1 | Hermes Bytecode | JS compiled to bytecode, no readable source in release |
| 2 | ProGuard (Android) | Code shrinking and obfuscation for Java/Kotlin |
| 3 | Integrity Checker | Runtime APK/IPA signature verification |
| 4 | Root/Jailbreak Detection | Checks for su, Magisk, Cydia, sandbox escape |
| 5 | SSL Pinning | Certificate pinning for API communication |
| 6 | Debug/Emulator Detection | Prevents running on debug or emulated environments |
| 7 | Request Signing | HMAC-SHA256 signed API requests with nonce + timestamp |

### Rotating SSL Pins
Update the SHA-256 hashes in `src/services/security/SSLPinning.ts`. Always include a backup pin for rotation.

### Security Gate Flow
On app launch, `SecurityGate.checkAsync()` runs all checks. If any fail in production, the app shows an error and exits.

---

## Troubleshooting

### Common Build Issues
- **Pod install fails**: Run `cd ios && pod install --repo-update`
- **Android build fails**: Ensure `ANDROID_HOME` is set, run `cd android && ./gradlew clean`
- **Metro bundler crash**: Clear cache with `npx react-native start --reset-cache`

### GPS Accuracy
- Ensure location permissions are granted
- The Kalman filter smooths GPS jitter — adjust parameters in `KalmanFilter.ts`
- Indoor GPS is unreliable; test outdoors for accurate readings

### CarPlay/Android Auto Debugging
- Android Auto: Use `adb logcat | grep -i "car"` to debug
- CarPlay: Check Xcode console for CarPlay-related logs
- Ensure native bridge modules are properly linked
