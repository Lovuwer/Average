# Average — Build Documentation

## How to Build the APK

This guide covers building the Average speed tracking app as an Android APK (release build).

---

## Prerequisites

### System Requirements
- **Node.js** 18+ (LTS recommended)
- **Java Development Kit (JDK)** 17 (required by React Native 0.76+)
- **Android Studio** (latest stable) with:
  - Android SDK Platform 34 (API 34)
  - Android SDK Build-Tools 34.0.0
  - Android NDK (Side by side)
  - CMake
- **React Native CLI** (`npx react-native`)

### Environment Variables
Ensure these are set in your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk  # or your JDK 17 path
```

---

## Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/Lovuwer/Average.git
cd Average

# Install frontend dependencies
npm install

# Install backend dependencies (optional, for API server)
cd backend && npm install && cd ..
```

---

## Step 2: Generate Signing Key

Android requires a release keystore to sign the APK. Generate one if you don't have one:

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore android/app/average-release-key.keystore \
  -alias average-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You will be prompted for a password. Remember this password.

---

## Step 3: Configure Signing in Gradle

Edit `android/app/build.gradle` and add the signing config:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('average-release-key.keystore')
            storePassword 'YOUR_KEYSTORE_PASSWORD'
            keyAlias 'average-key-alias'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

> **Security Note:** For production, use environment variables or `gradle.properties` instead of hardcoding passwords:
>
> In `~/.gradle/gradle.properties` or `android/gradle.properties`:
> ```properties
> AVERAGE_RELEASE_STORE_FILE=average-release-key.keystore
> AVERAGE_RELEASE_KEY_ALIAS=average-key-alias
> AVERAGE_RELEASE_STORE_PASSWORD=your_password
> AVERAGE_RELEASE_KEY_PASSWORD=your_password
> ```
>
> Then reference them in `build.gradle`:
> ```gradle
> signingConfigs {
>     release {
>         storeFile file(AVERAGE_RELEASE_STORE_FILE)
>         storePassword AVERAGE_RELEASE_STORE_PASSWORD
>         keyAlias AVERAGE_RELEASE_KEY_ALIAS
>         keyPassword AVERAGE_RELEASE_KEY_PASSWORD
>     }
> }
> ```

---

## Step 4: Run Pre-Build Checks

Before building, verify everything is configured correctly:

```bash
# Run all tests (317 tests should pass)
npm test

# TypeScript type check
npm run typecheck

# Verify native configuration
npm run build:verify:config

# Fix common Android build issues (if needed)
npm run build:fix:android
```

---

## Step 5: Build the APK

### Option A: Using npm script (recommended)

```bash
npm run build:android:release
```

This runs `cd android && ./gradlew assembleRelease`.

### Option B: Using Gradle directly

```bash
cd android
./gradlew assembleRelease
```

### Option C: Build from Android Studio

1. Open the `android/` folder in Android Studio
2. Wait for Gradle sync to complete
3. Go to **Build → Generate Signed Bundle / APK**
4. Select **APK**
5. Choose your keystore and enter credentials
6. Select **release** build variant
7. Click **Finish**

---

## Step 6: Find the APK

The release APK will be at:

```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Step 7: Install on Device

### Via ADB (USB debugging enabled):

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Via file transfer:
1. Copy the APK to your device
2. Open it from a file manager
3. Allow installation from unknown sources if prompted

---

## Building an Android App Bundle (AAB) for Play Store

For Google Play Store submission, build an AAB instead:

```bash
cd android
./gradlew bundleRelease
```

The AAB will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## Backend Setup (Optional)

If you want to use the full backend features (auth, trip sync, license validation):

### 1. Set up PostgreSQL

Create a PostgreSQL database and note the connection string.

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/average
JWT_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=*
```

### 3. Run migrations and start

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 4. Deploy to Railway

The backend includes a `Dockerfile` ready for Railway deployment:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

---

## Troubleshooting

### Common Build Issues

| Issue | Solution |
|-------|----------|
| `SDK location not found` | Set `ANDROID_HOME` environment variable |
| `Could not determine java version` | Install JDK 17 and set `JAVA_HOME` |
| Gradle build fails with OOM | Add `org.gradle.jvmargs=-Xmx4096m` to `gradle.properties` |
| `Execution failed for task ':app:mergeReleaseResources'` | Run `cd android && ./gradlew clean` then rebuild |
| Missing native modules | Run `npm run build:fix:android` |
| Jetifier errors | Add `android.enableJetifier=true` to `gradle.properties` |
| ProGuard issues | Check `android/app/proguard-rules.pro` for missing keep rules |

### Debug Build (for testing)

```bash
# Start Metro bundler
npm start

# Run on connected device/emulator
npm run android
```

### Clean Build

```bash
cd android
./gradlew clean
cd ..
npm start --reset-cache
npm run android
```

---

## Project Structure

```
Average/
├── android/                    # Android native project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/average/  # Kotlin native modules
│   │   │   ├── AndroidManifest.xml
│   │   │   └── res/
│   │   ├── build.gradle
│   │   └── proguard-rules.pro
│   └── build.gradle
├── ios/                        # iOS native project
├── src/                        # React Native source
│   ├── components/             # Reusable UI components
│   ├── context/                # React Context providers
│   ├── hooks/                  # Custom hooks
│   ├── navigation/             # Navigation configuration
│   ├── screens/                # Screen components
│   ├── services/               # Business logic services
│   ├── store/                  # Zustand state stores
│   ├── theme/                  # Theme definitions
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions
├── backend/                    # Node.js API server
│   ├── prisma/                 # Database schema
│   ├── src/                    # Server source
│   └── Dockerfile
├── __tests__/                  # Test suites
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── build/                  # Build verification scripts
├── e2e/                        # End-to-end tests (Detox)
├── docs/                       # Additional documentation
├── package.json
├── tsconfig.json
└── jest.config.ts
```

---

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Metro bundler |
| `npm run android` | Run on Android device/emulator |
| `npm run ios` | Run on iOS simulator |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | TypeScript type checking |
| `npm run build:android:release` | Build Android release APK |
| `npm run build:ios:release` | Build iOS release archive |
| `npm run build:verify:config` | Verify native configuration |
| `npm run build:fix:android` | Fix common Android build issues |

---

## Security Features

The app includes a 7-layer anti-cracking suite:
1. **SSL Pinning** — Certificate pinning with backup pins
2. **Root/Jailbreak Detection** — Detects rooted/jailbroken devices
3. **Emulator Detection** — Blocks emulator usage in production
4. **Debug Detection** — Detects debug mode
5. **Integrity Checking** — Runtime bundle ID verification
6. **Request Signing** — HMAC-signed API requests with nonce + timestamp
7. **License Key Validation** — Device-bound license keys with server verification

---

## Task 5 Features Summary

| Feature | Description |
|---------|-------------|
| HUD Mode | Mirrored windshield display with configurable color |
| Speed Alerts | Configurable speed limit warnings (vibration/sound) |
| Biometric Login | FaceID / TouchID / Fingerprint authentication |
| Dark/Night Mode | Auto-switch via system, ambient light, or time-of-day |
| Trip Export | PDF & CSV export with Share integration |
| License System | XXXX-XXXX-XXXX-XXXX key format, device binding |
| Offline Sync | Queue-based sync with exponential backoff retry |
| Device Fingerprinting | SHA-256 device identification for security |
| Speed Unit Enhancement | Locale auto-detection (metric/imperial) |
| 2D Kalman Filter | Enhanced GPS filtering with outlier rejection |
