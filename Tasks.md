# COPILOT AGENT TASK 4
## Scope: Full Testing Suite (Unit + Integration + E2E) + Build Verification + CI/CD Pipeline
## Goal: Ensure the app builds PERFECTLY in Android Studio and Xcode with ZERO failures

### 🚨 ANTI-HALLUCINATION PROTOCOL — READ FIRST
Before writing ANY code, you MUST:
1. READ `whathasbeenimplemented.md` COMPLETELY — understand every file, every pattern, every dependency from Tasks 1-3
2. Do NOT recreate any files. Only create test files and modify configs as needed
3. WRITE into `whathasbeenimplemented.md` what you're about to do BEFORE coding
4. Verify that every import path you reference in tests actually exists in the project
5. Verify that every native module referenced is properly linked
6. UPDATE `whathasbeenimplemented.md` when done with full test results and any issues found/fixed

---

### PART A: Testing Infrastructure Setup

1. Install ALL testing dependencies:
   ```
   # Unit + Integration
   jest
   @testing-library/react-native
   @testing-library/jest-native
   react-test-renderer
   ts-jest
   msw (Mock Service Worker — API mocking)
   
   # E2E
   detox
   
   # Mocking utilities
   @react-native-async-storage/async-storage (mock)
   react-native-permissions (mock)
   
   # Backend testing
   supertest
   @faker-js/faker
   prisma (already installed — use for test DB)
   ```

2. Create `jest.config.ts` at project root:
   ```typescript
   import type { Config } from 'jest';

   const config: Config = {
     preset: 'react-native',
     transform: {
       '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
     },
     moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
     setupFilesAfterSetup: ['<rootDir>/jest.setup.ts'],
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/src/$1',
     },
     collectCoverageFrom: [
       'src/**/*.{ts,tsx}',
       '!src/**/*.d.ts',
       '!src/**/index.ts',
       '!src/**/*.test.{ts,tsx}',
     ],
     coverageThreshold: {
       global: {
         branches: 75,
         functions: 80,
         lines: 80,
         statements: 80,
       },
     },
     testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
   };

   export default config;
   ```

3. Create `jest.setup.ts`:
   ```typescript
   import '@testing-library/jest-native/extend-expect';

   // Mock react-native-encrypted-storage
   jest.mock('react-native-encrypted-storage', () => ({
     setItem: jest.fn(() => Promise.resolve()),
     getItem: jest.fn(() => Promise.resolve(null)),
     removeItem: jest.fn(() => Promise.resolve()),
     clear: jest.fn(() => Promise.resolve()),
   }));

   // Mock react-native-geolocation-service
   jest.mock('react-native-geolocation-service', () => ({
     watchPosition: jest.fn(),
     clearWatch: jest.fn(),
     getCurrentPosition: jest.fn(),
     requestAuthorization: jest.fn(() => Promise.resolve('granted')),
   }));

   // Mock react-native-device-info
   jest.mock('react-native-device-info', () => ({
     getUniqueId: jest.fn(() => Promise.resolve('test-device-id-123')),
     getModel: jest.fn(() => 'Test Model'),
     getSystemVersion: jest.fn(() => '14.0'),
     getVersion: jest.fn(() => '1.0.0'),
     getBundleId: jest.fn(() => 'com.average.app'),
     isEmulator: jest.fn(() => Promise.resolve(false)),
   }));

   // Mock react-native-permissions
   jest.mock('react-native-permissions', () => ({
     PERMISSIONS: {
       ANDROID: { ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION' },
       IOS: { LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE' },
     },
     RESULTS: {
       GRANTED: 'granted',
       DENIED: 'denied',
       BLOCKED: 'blocked',
     },
     request: jest.fn(() => Promise.resolve('granted')),
     check: jest.fn(() => Promise.resolve('granted')),
   }));

   // Mock @shopify/react-native-skia
   jest.mock('@shopify/react-native-skia', () => ({
     Canvas: 'Canvas',
     RoundedRect: 'RoundedRect',
     BackdropBlur: 'BackdropBlur',
     Fill: 'Fill',
     useCanvasRef: jest.fn(),
   }));

   // Mock react-native-reanimated
   jest.mock('react-native-reanimated', () => {
     const Reanimated = require('react-native-reanimated/mock');
     Reanimated.default.call = () => {};
     return Reanimated;
   });

   // Mock react-native-haptic-feedback
   jest.mock('react-native-haptic-feedback', () => ({
     trigger: jest.fn(),
   }));

   // Mock react-native-keep-awake
   jest.mock('react-native-keep-awake', () => ({
     activate: jest.fn(),
     deactivate: jest.fn(),
   }));

   // Mock react-native-sqlite-storage
   jest.mock('react-native-sqlite-storage', () => ({
     openDatabase: jest.fn(() => ({
       transaction: jest.fn((callback) => {
         callback({
           executeSql: jest.fn((sql, params, success) => {
             if (success) success({}, { rows: { length: 0, raw: () => [] } });
           }),
         });
       }),
     })),
   }));

   // Mock NativeModules for CarPlay/Android Auto bridges
   jest.mock('react-native', () => {
     const rn = jest.requireActual('react-native');
     rn.NativeModules.AutoBridge = {
       updateSpeed: jest.fn(),
     };
     rn.NativeModules.CarPlayBridge = {
       updateSpeedData: jest.fn(),
     };
     return rn;
   });

   // Silence console warnings in tests
   global.console.warn = jest.fn();
   ```

4. Create test directory structure:
   ```
   __tests__/
   ├── unit/
   │   ├── services/
   │   │   ├── gps/
   │   │   │   ├── GPSService.test.ts
   │   │   │   ├── SpeedEngine.test.ts
   │   │   │   ├── KalmanFilter.test.ts
   │   │   │   └── HaversineCalculator.test.ts
   │   │   ├── auth/
   │   │   │   ├── AuthService.test.ts
   │   │   │   └── TokenManager.test.ts
   │   │   ├── security/
   │   │   │   ├── SecurityGate.test.ts
   │   │   │   ├── IntegrityChecker.test.ts
   │   │   │   └── RootDetector.test.ts
   │   │   ├── trip/
   │   │   │   ├── TripManager.test.ts
   │   │   │   └── TripStorage.test.ts
   │   │   ├── api/
   │   │   │   ├── ApiClient.test.ts
   │   │   │   └── RequestSigner.test.ts
   │   │   └── carplay/
   │   │       └── CarIntegration.test.ts
   │   ├── store/
   │   │   ├── useSpeedStore.test.ts
   │   │   ├── useAuthStore.test.ts
   │   │   ├── useTripStore.test.ts
   │   │   └── useSettingsStore.test.ts
   │   ├── hooks/
   │   │   ├── useSpeed.test.ts
   │   │   └── useAuth.test.ts
   │   └── utils/
   │       ├── formatters.test.ts
   │       └── validators.test.ts
   │
   ├── integration/
   │   ├── auth-flow.test.tsx
   │   ├── speed-tracking-flow.test.tsx
   │   ├── trip-lifecycle.test.tsx
   │   ├── security-pipeline.test.ts
   │   └── api-integration.test.ts
   │
   ├── components/
   │   ├── LiquidGlassCard.test.tsx
   │   ├── LiquidGlassButton.test.tsx
   │   ├── BottomNavBar.test.tsx
   │   ├── SpeedDisplay.test.tsx
   │   ├── SpeedGauge.test.tsx
   │   └── TripCard.test.tsx
   │
   ├── screens/
   │   ├── SplashScreen.test.tsx
   │   ├── LoginScreen.test.tsx
   │   ├── RegisterScreen.test.tsx
   │   ├── DashboardScreen.test.tsx
   │   ├── StatsScreen.test.tsx
   │   ├── HistoryScreen.test.tsx
   │   └── SettingsScreen.test.tsx
   │
   └── e2e/
       ├── starter.test.ts
       ├── auth.e2e.ts
       ├── speed-tracking.e2e.ts
       ├── navigation.e2e.ts
       └── settings.e2e.ts
   
   backend/__tests__/
   ├── routes/
   │   ├── auth.test.ts
   │   ├── trips.test.ts
   │   └── license.test.ts
   ├── middleware/
   │   ├── authenticate.test.ts
   │   └── rateLimiter.test.ts
   └── services/
       ├── authService.test.ts
       ├── tripService.test.ts
       └── licenseService.test.ts
   ```

---

### PART B: Unit Tests — GPS & Speed Engine (Most Critical for Build Success)

1. **`__tests__/unit/services/gps/KalmanFilter.test.ts`**:
   ```typescript
   // Test cases:
   // ✅ Initializes with correct default parameters
   // ✅ Filters a single measurement correctly
   // ✅ Converges to stable value with repeated identical inputs
   // ✅ Smooths noisy data (input: [50, 80, 45, 90, 55] → output should be smoother)
   // ✅ Handles zero input
   // ✅ Handles negative speed gracefully (clamps to 0)
   // ✅ Reset method clears state
   // ✅ Different noise parameters change filter behavior
   // ✅ Performance: 10,000 filter calls complete in < 100ms
   ```

2. **`__tests__/unit/services/gps/HaversineCalculator.test.ts`**:
   ```typescript
   // Test cases:
   // ✅ Calculates distance between two known points correctly (NYC → LA ≈ 3,944 km)
   // ✅ Distance between same point is 0
   // ✅ Short distance accuracy (within 1m for 10m distances)
   // ✅ Calculates speed from two points with time delta
   // ✅ Handles equator crossing
   // ✅ Handles International Date Line crossing
   // ✅ Handles negative coordinates
   // ✅ Returns 0 speed if time delta is 0 (prevent division by zero)
   // ✅ Known GPS coordinates validation (use 5 real-world verified coordinate pairs)
   ```

3. **`__tests__/unit/services/gps/SpeedEngine.test.ts`**:
   ```typescript
   // Test cases:
   // ✅ Initializes with all values at 0
   // ✅ start() begins GPS tracking
   // ✅ stop() stops GPS tracking and returns trip summary
   // ✅ Updates currentSpeed correctly from GPS data
   // ✅ Calculates running average speed correctly
   // ✅ Tracks maximum speed correctly
   // ✅ Accumulates total distance via Haversine
   // ✅ Trip duration timer increments correctly
   // ✅ pause() freezes all calculations
   // ✅ resume() continues from paused state (averages not reset)
   // ✅ reset() clears all state to initial values
   // ✅ Falls back to Haversine when coords.speed is -1
   // ✅ Applies Kalman filter to raw speed data
   // ✅ Converts m/s to km/h correctly (multiply by 3.6)
   // ✅ Converts m/s to mph correctly (multiply by 2.237)
   // ✅ speedHistory maintains last 60 readings (circular buffer)
   // ✅ Handles GPS signal loss gracefully (speed → 0, no crash)
   // ✅ Does not update speed when paused
   // ✅ Multiple start/stop cycles don't leak watchers
   ```

4. **`__tests__/unit/services/gps/GPSService.test.ts`**:
   ```typescript
   // Test cases:
   // ✅ requestPermissions() resolves on both platforms
   // ✅ startTracking() calls watchPosition with correct config
   // ✅ stopTracking() calls clearWatch
   // ✅ Callback receives properly formatted position data
   // ✅ Error callback handles permission denied
   // ✅ Error callback handles location unavailable
   // ✅ Error callback handles timeout
   // ✅ Does not start duplicate watchers if called twice
   // ✅ Cleanup on stopTracking is idempotent
   ```

---

### PART C: Unit Tests — Auth, Security & API

5. **`__tests__/unit/services/auth/AuthService.test.ts`**:
   ```typescript
   // Test cases:
   // ✅ login() sends correct payload to /auth/login
   // ✅ login() stores tokens in EncryptedStorage on success
   // ✅ login() throws on invalid credentials (401)
   // ✅ login() throws on network error
   // ✅ register() sends correct payload to /auth/register
   // ✅ register() stores tokens on success
   // ✅ register() throws on duplicate email (409)
   // ✅ refreshToken() sends refresh token to /auth/refresh
   // ✅ refreshToken() updates stored tokens
   // ✅ refreshToken() triggers logout on invalid refresh token
   // ✅ logout() clears all stored tokens
   // ✅ logout() calls /auth/logout endpoint
   // ✅ isAuthenticated() returns true when valid token exists
   // ✅ isAuthenticated() returns false when no token
   // ✅ isAuthenticated() returns false when token expired
   ```

6. **`__tests__/unit/services/auth/TokenManager.test.ts`**:
   ```typescript
   // Test cases:
   // ✅ storeTokens() saves to EncryptedStorage
   // ✅ getAccessToken() retrieves from EncryptedStorage
   // ✅ getRefreshToken() retrieves from EncryptedStorage
   // ✅ clearTokens() removes all token entries
   // ✅ isTokenExpired() correctly parses JWT exp claim
   // ✅ isTokenExpired() returns true for expired token
   // ✅ isTokenExpired() returns false for valid token
   // ✅ Auto-refresh interceptor triggers before expiry (within 5 min window)
   // ✅ Handles concurrent requests during token refresh (queue pattern)
   ```

7. **`__tests__/unit/services/security/SecurityGate.test.ts`**:
   ```typescript
   // Test cases:
   // ✅ Returns { safe: true } when all checks pass
   // ✅ Detects root/jailbreak and returns { safe: false, reasons: ['rooted'] }
   // ✅ Detects debugger and returns appropriate reason
   // ✅ Detects emulator and returns appropriate reason
   // ✅ Aggregates multiple failure reasons
   // ✅ In __DEV__ mode, logs warnings but allows execution
   // ✅ In production mode, blocks execution on failure
   // ✅ Integrity check validates binary hash
   // ✅ SSL pinning configuration is valid
   // ✅ Full security pipeline executes all checks in correct order
   ```

8. **`__tests__/unit/services/api/RequestSigner.test.ts`**:
   ```typescript
   // Test cases:
   // ✅ Signs request with HMAC-SHA256
   // ✅ Includes timestamp in signature
   // ✅ Includes nonce in signature
   // ✅ Different payloads produce different signatures
   // ✅ Same payload + same timestamp produces same signature (deterministic)
   // ✅ Signature header is added to request
   // ✅ Rejects replayed requests (same nonce)
   ```

9. **`__tests__/unit/services/api/ApiClient.test.ts`**:
   ```typescript
   // Test cases (use MSW for API mocking):
   // ✅ Adds Authorization header to requests
   // ✅ Handles 401 by attempting token refresh
   // ✅ Retries request after successful token refresh
   // ✅ Redirects to login after failed token refresh
   // ✅ Handles 500 server errors gracefully
   // ✅ Handles network timeout
   // ✅ Handles no network connection
   // ✅ Request signing interceptor is called
   // ✅ Base URL is correctly configured from env
   ```

10. **`__tests__/unit/services/carplay/CarIntegration.test.ts`**:
    ```typescript
    // Test cases:
    // ✅ Detects platform correctly (iOS vs Android)
    // ✅ Calls AutoBridge.updateSpeed on Android
    // ✅ Calls CarPlayBridge.updateSpeedData on iOS
    // ✅ Formats speed data correctly before sending to bridge
    // ✅ Handles bridge unavailability gracefully (no crash)
    // ✅ Does not call bridge when tracking is stopped
    // ✅ Throttles bridge updates to max 1/second
    ```

---

### PART D: Unit Tests — Stores, Hooks & Utils

11. **`__tests__/unit/store/useSpeedStore.test.ts`**:
    ```typescript
    // ✅ Initial state has all values at 0
    // ✅ updateSpeed() updates currentSpeed
    // ✅ startTrip() sets isTracking to true
    // ✅ stopTrip() sets isTracking to false
    // ✅ pauseTrip() sets isPaused to true, isTracking stays true
    // ✅ resumeTrip() sets isPaused to false
    // ✅ toggleUnit() switches between 'kmh' and 'mph'
    // ✅ Store persists across component re-renders
    ```

12. **`__tests__/unit/store/useAuthStore.test.ts`**:
    ```typescript
    // ✅ Initial state: not authenticated, no user
    // ✅ login() sets user and isAuthenticated
    // ✅ logout() clears user and isAuthenticated
    // ✅ checkAuth() verifies stored token on app launch
    // ✅ Error state is set on failed login
    // ✅ Loading state is set during async operations
    ```

13. **`__tests__/unit/utils/formatters.test.ts`**:
    ```typescript
    // ✅ formatSpeed(27.78, 'kmh') → '100' (27.78 m/s * 3.6 = 100.008)
    // ✅ formatSpeed(27.78, 'mph') → '62' (27.78 m/s * 2.237 = 62.14)
    // ✅ formatSpeed(0, 'kmh') → '0'
    // ✅ formatSpeed(-1, 'kmh') → '0' (negative clamped)
    // ✅ formatDistance(1500) → '1.5 km'
    // ✅ formatDistance(500) → '500 m'
    // ✅ formatDuration(3661) → '01:01:01'
    // ✅ formatDuration(0) → '00:00:00'
    // ✅ formatDuration(59) → '00:00:59'
    // ✅ formatDate(timestamp) → 'Feb 9, 2026'
    ```

14. **`__tests__/unit/utils/validators.test.ts`**:
    ```typescript
    // ✅ isValidEmail('user@example.com') → true
    // ✅ isValidEmail('invalid') → false
    // ✅ isValidEmail('') → false
    // ✅ isValidPassword('Str0ng!Pass') → true (≥8 chars, upper, lower, number, special)
    // ✅ isValidPassword('weak') → false
    // ✅ isValidPassword('') → false
    // ✅ isValidLicenseKey('XXXX-XXXX-XXXX-XXXX') → true
    // ✅ isValidLicenseKey('invalid') → false
    ```

---

### PART E: Component Tests

15. **`__tests__/components/SpeedDisplay.test.tsx`**:
    ```typescript
    // ✅ Renders current speed value
    // ✅ Displays correct unit label (km/h or mph)
    // ✅ Toggles unit on tap
    // ✅ Shows green color for speed < 60 km/h
    // ✅ Shows yellow color for speed 60-120 km/h
    // ✅ Shows red color for speed > 120 km/h
    // ✅ Handles 0 speed display
    // ✅ Accessibility: speed value is announced by screen reader
    ```

16. **`__tests__/components/BottomNavBar.test.tsx`**:
    ```typescript
    // ✅ Renders all 4 tab items (Home, Stats, History, Settings)
    // ✅ Highlights active tab
    // ✅ Calls navigation on tab press
    // ✅ Triggers haptic feedback on press
    // ✅ Active indicator animates between tabs
    // ✅ Does not obstruct main content (proper positioning)
    ```

17. **`__tests__/components/LiquidGlassCard.test.tsx`**:
    ```typescript
    // ✅ Renders children content
    // ✅ Applies glass styling (blur, border, radius)
    // ✅ Accepts custom cornerRadius prop
    // ✅ Accepts custom style prop
    // ✅ Press animation triggers on touch
    // ✅ Passes accessibility props through
    ```

18. **`__tests__/screens/LoginScreen.test.tsx`**:
    ```typescript
    // ✅ Renders email and password inputs
    // ✅ Renders login button
    // ✅ Renders register navigation link
    // ✅ Login button is disabled when inputs are empty
    // ✅ Shows validation error for invalid email
    // ✅ Shows validation error for short password
    // ✅ Calls auth service login on button press
    // ✅ Shows loading indicator during login
    // ✅ Shows error message on failed login
    // ✅ Navigates to dashboard on successful login
    // ✅ Navigates to register screen on link press
    ```

19. **`__tests__/screens/DashboardScreen.test.tsx`**:
    ```typescript
    // ✅ Renders speed display component
    // ✅ Renders average speed card
    // ✅ Renders max speed card
    // ✅ Renders distance card
    // ✅ Renders trip timer
    // ✅ Renders start button when not tracking
    // ✅ Renders stop button when tracking
    // ✅ Start button triggers GPS tracking
    // ✅ Stop button stops GPS tracking
    // ✅ All metric cards use LiquidGlassCard wrapper
    // ✅ Screen keeps awake during tracking
    ```

---

### PART F: Integration Tests

20. **`__tests__/integration/auth-flow.test.tsx`** (MSW for API mocking):
    ```typescript
    // ✅ Full login flow: enter credentials → submit → receive token → navigate to dashboard
    // ✅ Full register flow: enter details → submit → receive token → navigate to dashboard
    // ✅ Token refresh flow: expired token → auto-refresh → retry original request
    // ✅ Logout flow: press logout → clear tokens → navigate to login
    // ✅ Session persistence: app launch → check stored token → auto-login
    // ✅ Invalid session: app launch → expired token → fail refresh → show login
    ```

21. **`__tests__/integration/speed-tracking-flow.test.tsx`**:
    ```typescript
    // ✅ Full trip lifecycle: start → receive GPS updates → speed updates → stop → trip saved
    // ✅ GPS permission denied → shows error message → does not crash
    // ✅ GPS signal lost mid-trip → speed goes to 0 → resumes when signal returns
    // ✅ Pause/resume flow: pause → no speed updates → resume → updates continue
    // ✅ Average speed calculation matches expected over simulated trip
    // ✅ Distance accumulation matches expected for known route
    // ✅ Speed data is forwarded to CarPlay/Android Auto bridge
    ```

22. **`__tests__/integration/security-pipeline.test.ts`**:
    ```typescript
    // ✅ SecurityGate runs ALL checks on app launch
    // ✅ Root detection failure blocks app in production
    // ✅ Debug detection failure blocks app in production
    // ✅ Emulator detection failure blocks app in production
    // ✅ All checks passing allows app to proceed
    // ✅ Security check results are logged to backend
    // ✅ __DEV__ mode bypasses blocking but still logs
    ```

---

### PART G: Backend Tests

23. **`backend/__tests__/routes/auth.test.ts`** (Supertest):
    ```typescript
    // ✅ POST /auth/register — creates user, returns tokens
    // ✅ POST /auth/register — rejects duplicate email (409)
    // ✅ POST /auth/register — rejects invalid email format (400)
    // ✅ POST /auth/register — rejects weak password (400)
    // ✅ POST /auth/login — returns tokens for valid credentials
    // ✅ POST /auth/login — rejects invalid credentials (401)
    // ✅ POST /auth/login — creates session with device fingerprint
    // ✅ POST /auth/refresh — returns new token pair
    // ✅ POST /auth/refresh — invalidates old refresh token (rotation)
    // ✅ POST /auth/refresh — rejects expired refresh token
    // ✅ GET /auth/verify — returns 200 for valid token
    // ✅ GET /auth/verify — returns 401 for invalid token
    // ✅ POST /auth/logout — invalidates session
    // ✅ Rate limiting: 20+ auth requests from same IP → 429
    ```

24. **`backend/__tests__/routes/trips.test.ts`**:
    ```typescript
    // ✅ POST /trips/sync — upserts trip data
    // ✅ POST /trips/sync — rejects unauthenticated requests
    // ✅ GET /trips/history — returns paginated trips for user
    // ✅ GET /trips/history — does not return other users' trips
    // ✅ GET /trips/history — supports page/limit query params
    ```

25. **`backend/__tests__/routes/license.test.ts`**:
    ```typescript
    // ✅ POST /license/validate — validates active license key
    // ✅ POST /license/validate — rejects invalid key
    // ✅ POST /license/validate — rejects expired key
    // ✅ POST /license/validate — binds to device on first use
    // ✅ POST /license/validate — rejects when max devices exceeded
    ```

---

### PART H: E2E Tests (Detox)

26. Create `.detoxrc.js` configuration:
    ```javascript
    module.exports = {
      testRunner: {
        args: { $0: 'jest', config: 'e2e/jest.config.js' },
        jest: { setupTimeout: 120000 },
      },
      apps: {
        'ios.debug': {
          type: 'ios.app',
          binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Average.app',
          build: 'xcodebuild -workspace ios/Average.xcworkspace -scheme Average -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
        },
        'android.debug': {
          type: 'android.apk',
          binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
          build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
          reversePorts: [8081],
        },
      },
      devices: {
        simulator: { type: 'ios.simulator', device: { type: 'iPhone 15 Pro' } },
        emulator: { type: 'android.emulator', device: { avdName: 'Pixel_7_API_34' } },
      },
      configurations: {
        'ios.sim.debug': { device: 'simulator', app: 'ios.debug' },
        'android.emu.debug': { device: 'emulator', app: 'android.debug' },
      },
    };
    ```

27. **`e2e/auth.e2e.ts`**:
    ```typescript
    // ✅ App launches to splash screen
    // ✅ Security checks pass → navigates to login
    // ✅ User can type email and password
    // ✅ User can press login → navigates to dashboard
    // ✅ User can navigate to register screen
    // ✅ Invalid credentials show error toast
    // ✅ Logout returns to login screen
    ```

28. **`e2e/speed-tracking.e2e.ts`** (with GPS mocking):
    ```typescript
    // Before each test, set mock GPS location via adb/simctl:
    // adb emu geo fix -122.084 37.422  (Android)
    // xcrun simctl location booted set 37.422 -122.084  (iOS)
    
    // ✅ Dashboard shows speed = 0 when stationary
    // ✅ Press START → tracking indicator appears
    // ✅ Timer starts counting
    // ✅ Press STOP → trip summary appears
    // ✅ Trip appears in history screen
    ```

29. **`e2e/navigation.e2e.ts`**:
    ```typescript
    // ✅ Bottom nav: tap Home → Dashboard screen visible
    // ✅ Bottom nav: tap Stats → Stats screen visible
    // ✅ Bottom nav: tap History → History screen visible
    // ✅ Bottom nav: tap Settings → Settings screen visible
    // ✅ Active tab indicator moves with selection
    // ✅ Back navigation works correctly
    ```

---

### PART I: Android Build Verification (CRITICAL — prevents Android Studio failures)

30. Create `__tests__/build/android-build-verification.sh`:
    ```bash
    #!/bin/bash
    set -e
    
    echo "=========================================="
    echo "  AVERAGE — Android Build Verification"
    echo "=========================================="
    
    # Step 1: Clean
    echo "[1/8] Cleaning Android build..."
    cd android && ./gradlew clean && cd ..
    
    # Step 2: Check node_modules
    echo "[2/8] Verifying node_modules..."
    if [ ! -d "node_modules" ]; then
      echo "Installing dependencies..."
      npm install
    fi
    
    # Step 3: Generate native autolinking
    echo "[3/8] Running autolinking..."
    npx react-native config
    
    # Step 4: Verify Gradle wrapper
    echo "[4/8] Checking Gradle wrapper..."
    cd android
    if [ ! -f "gradlew" ]; then
      echo "ERROR: gradlew not found!"
      exit 1
    fi
    chmod +x gradlew
    
    # Step 5: Check dependencies resolution
    echo "[5/8] Resolving Gradle dependencies..."
    ./gradlew dependencies --configuration releaseRuntimeClasspath > /dev/null 2>&1
    if [ $? -ne 0 ]; then
      echo "ERROR: Gradle dependency resolution failed!"
      exit 1
    fi
    echo "  ✅ Dependencies resolved"
    
    # Step 6: Lint check
    echo "[6/8] Running Android Lint..."
    ./gradlew lint 2>&1 | tail -5
    
    # Step 7: Build debug APK
    echo "[7/8] Building debug APK..."
    ./gradlew assembleDebug
    if [ $? -eq 0 ]; then
      echo "  ✅ Debug APK built successfully"
      ls -la app/build/outputs/apk/debug/app-debug.apk
    else
      echo "  ❌ Debug build FAILED"
      exit 1
    fi
    
    # Step 8: Build release APK (without signing for verification)
    echo "[8/8] Building release APK..."
    ./gradlew assembleRelease 2>&1 | tail -10
    if [ $? -eq 0 ]; then
      echo "  ✅ Release APK built successfully"
    else
      echo "  ⚠️ Release build failed (may need signing config)"
    fi
    
    cd ..
    echo ""
    echo "=========================================="
    echo "  BUILD VERIFICATION COMPLETE ✅"
    echo "=========================================="
    ```

31. Create `__tests__/build/ios-build-verification.sh`:
    ```bash
    #!/bin/bash
    set -e
    
    echo "=========================================="
    echo "  AVERAGE — iOS Build Verification"
    echo "=========================================="
    
    # Step 1: Pod install
    echo "[1/5] Installing CocoaPods..."
    cd ios && pod install && cd ..
    
    # Step 2: Check workspace
    echo "[2/5] Verifying workspace..."
    if [ ! -f "ios/Average.xcworkspace/contents.xcworkspacedata" ]; then
      echo "ERROR: Xcode workspace not found!"
      exit 1
    fi
    echo "  ✅ Workspace exists"
    
    # Step 3: Build for simulator
    echo "[3/5] Building for iOS simulator..."
    xcodebuild -workspace ios/Average.xcworkspace \
      -scheme Average \
      -configuration Debug \
      -sdk iphonesimulator \
      -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
      -derivedDataPath ios/build \
      build 2>&1 | tail -20
    
    if [ $? -eq 0 ]; then
      echo "  ✅ iOS build succeeded"
    else
      echo "  ❌ iOS build FAILED"
      exit 1
    fi
    
    # Step 4: Check for linking issues
    echo "[4/5] Verifying native module linking..."
    xcodebuild -workspace ios/Average.xcworkspace -scheme Average -showBuildSettings 2>&1 | grep "LIBRARY_SEARCH_PATHS" | head -3
    echo "  ✅ Linking paths verified"
    
    # Step 5: Verify CarPlay entitlement
    echo "[5/5] Checking CarPlay entitlement..."
    if grep -q "com.apple.developer.carplay" ios/Average/Average.entitlements 2>/dev/null; then
      echo "  ✅ CarPlay entitlement present"
    else
      echo "  ⚠️ CarPlay entitlement not yet configured (needs Apple developer portal)"
    fi
    
    echo ""
    echo "=========================================="
    echo "  iOS BUILD VERIFICATION COMPLETE ✅"
    echo "=========================================="
    ```

---

### PART J: Gradle & Native Configuration Verification

32. Create `__tests__/build/verify-native-config.ts` (Node script):
    ```typescript
    /**
     * This script verifies that all native configurations are correct
     * BEFORE attempting a build. Run this as a pre-build check.
     * 
     * Checks:
     * - AndroidManifest.xml has all required permissions
     * - build.gradle has Hermes enabled
     * - build.gradle has correct minSdkVersion (≥26 for car app library)
     * - build.gradle has ProGuard configured for release
     * - Info.plist has location permissions
     * - Info.plist has CarPlay scene configuration
     * - All native modules are properly linked
     * - No duplicate dependency versions
     * - Android Auto automotive_app_desc.xml exists
     * - All required native bridge files exist
     */
    
    // Verify these files exist and contain expected content:
    // ✅ android/app/src/main/AndroidManifest.xml → ACCESS_FINE_LOCATION
    // ✅ android/app/src/main/AndroidManifest.xml → car.application meta-data
    // ✅ android/app/src/main/res/xml/automotive_app_desc.xml → exists
    // ✅ android/app/build.gradle → hermesEnabled = true
    // ✅ android/app/build.gradle → minSdkVersion ≥ 26
    // ✅ android/app/build.gradle → ProGuard rules referenced
    // ✅ android/app/proguard-rules.pro → exists and has React Native keep rules
    // ✅ ios/Average/Info.plist → NSLocationWhenInUseUsageDescription
    // ✅ ios/Average/Info.plist → NSLocationAlwaysAndWhenInUseUsageDescription
    // ✅ ios/Average/Info.plist → NSFaceIDUsageDescription
    // ✅ ios/Podfile → platform :ios, '15.0' minimum
    // ✅ android/app/src/main/java/com/average/auto/AverageCarAppService.kt → exists
    // ✅ android/app/src/main/java/com/average/auto/AutoBridge.kt → exists
    // ✅ ios/Average/CarPlay/CarPlaySceneDelegate.swift → exists
    // ✅ ios/Average/CarPlay/CarPlayBridge.swift → exists
    // ✅ All native security modules exist (both platforms)
    // ✅ No conflicting dependency versions in package.json
    // ✅ react-native version matches peer dependency requirements
    ```

33. Create fix scripts for common build failures — `scripts/fix-android-build.sh`:
    ```bash
    #!/bin/bash
    # Fixes common Android build issues
    
    echo "Fixing common Android build issues..."
    
    # Fix 1: Clear Gradle caches
    rm -rf android/.gradle
    rm -rf android/app/build
    rm -rf ~/.gradle/caches
    
    # Fix 2: Ensure Jetifier is enabled
    if ! grep -q "android.enableJetifier=true" android/gradle.properties; then
      echo "android.enableJetifier=true" >> android/gradle.properties
    fi
    
    # Fix 3: Ensure AndroidX is enabled
    if ! grep -q "android.useAndroidX=true" android/gradle.properties; then
      echo "android.useAndroidX=true" >> android/gradle.properties
    fi
    
    # Fix 4: Set correct JDK
    if ! grep -q "org.gradle.java.home" android/gradle.properties; then
      echo "# org.gradle.java.home=/path/to/jdk-17" >> android/gradle.properties
      echo "⚠️  Set org.gradle.java.home in android/gradle.properties if build fails with JDK errors"
    fi
    
    # Fix 5: Increase Gradle memory
    if ! grep -q "org.gradle.jvmargs" android/gradle.properties; then
      echo 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m' >> android/gradle.properties
    fi
    
    # Fix 6: Ensure new architecture flags
    if ! grep -q "newArchEnabled=true" android/gradle.properties; then
      echo "newArchEnabled=true" >> android/gradle.properties
    fi
    
    echo "✅ Android build fixes applied. Run 'cd android && ./gradlew assembleDebug'"
    ```

---

### PART K: CI/CD Pipeline (GitHub Actions)

34. Create `.github/workflows/ci.yml`:
    ```yaml
    name: Average — CI/CD Pipeline

    on:
      push:
        branches: [main, develop]
      pull_request:
        branches: [main]

    jobs:
      # ─── UNIT & INTEGRATION TESTS ───
      test-mobile:
        name: Mobile Tests (Unit + Integration)
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'
          - run: npm ci
          - run: npm run test -- --coverage --ci --reporters=default --reporters=jest-junit
          - uses: actions/upload-artifact@v4
            with:
              name: coverage-report
              path: coverage/

      test-backend:
        name: Backend Tests
        runs-on: ubuntu-latest
        services:
          postgres:
            image: postgres:16
            env:
              POSTGRES_USER: test
              POSTGRES_PASSWORD: test
              POSTGRES_DB: average_test
            ports: ['5432:5432']
            options: >-
              --health-cmd pg_isready
              --health-interval 10s
              --health-timeout 5s
              --health-retries 5
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'
          - run: cd backend && npm ci
          - run: cd backend && npx prisma migrate deploy
            env:
              DATABASE_URL: postgresql://test:test@localhost:5432/average_test
          - run: cd backend && npm test -- --coverage --ci
            env:
              DATABASE_URL: postgresql://test:test@localhost:5432/average_test
              JWT_SECRET: test-jwt-secret-for-ci
              JWT_REFRESH_SECRET: test-jwt-refresh-secret-for-ci

      # ─── ANDROID BUILD VERIFICATION ───
      build-android:
        name: Android Build Verification
        runs-on: ubuntu-latest
        needs: [test-mobile]
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'
          - uses: actions/setup-java@v4
            with:
              distribution: 'temurin'
              java-version: '17'
          - run: npm ci
          - name: Verify native config
            run: npx ts-node __tests__/build/verify-native-config.ts
          - name: Build Android Debug APK
            run: cd android && ./gradlew assembleDebug
          - uses: actions/upload-artifact@v4
            with:
              name: android-debug-apk
              path: android/app/build/outputs/apk/debug/app-debug.apk

      # ─── iOS BUILD VERIFICATION ───
      build-ios:
        name: iOS Build Verification
        runs-on: macos-latest
        needs: [test-mobile]
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'
          - run: npm ci
          - run: cd ios && pod install
          - name: Build iOS (Simulator)
            run: |
              xcodebuild -workspace ios/Average.xcworkspace \
                -scheme Average \
                -configuration Debug \
                -sdk iphonesimulator \
                -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
                build

      # ─── E2E TESTS ───
      e2e-android:
        name: E2E Tests (Android)
        runs-on: ubuntu-latest
        needs: [build-android]
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '20'
          - uses: actions/setup-java@v4
            with:
              distribution: 'temurin'
              java-version: '17'
          - run: npm ci
          - name: Setup Android Emulator
            uses: reactivecircus/android-emulator-runner@v2
            with:
              api-level: 34
              target: google_apis
              arch: x86_64
              script: |
                npx detox build --configuration android.emu.debug
                npx detox test --configuration android.emu.debug --headless
    ```

35. Add test scripts to `package.json`:
    ```json
    {
      "scripts": {
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage",
        "test:unit": "jest --testPathPattern='__tests__/unit'",
        "test:integration": "jest --testPathPattern='__tests__/integration'",
        "test:components": "jest --testPathPattern='__tests__/components'",
        "test:screens": "jest --testPathPattern='__tests__/screens'",
        "test:e2e:android": "detox test --configuration android.emu.debug",
        "test:e2e:ios": "detox test --configuration ios.sim.debug",
        "build:verify:android": "bash __tests__/build/android-build-verification.sh",
        "build:verify:ios": "bash __tests__/build/ios-build-verification.sh",
        "build:verify:config": "npx ts-node __tests__/build/verify-native-config.ts",
        "build:fix:android": "bash scripts/fix-android-build.sh",
        "lint": "eslint src/ --ext .ts,.tsx",
        "typecheck": "tsc --noEmit"
      }
    }
    ```

---

### PART L: Update whathasbeenimplemented.md

After ALL tests are written and verified:
1. Document total test count per category
2. Document all test file locations
3. Document CI/CD pipeline configuration
4. Document build verification steps
5. List any tests that CANNOT run without real devices (e.g., GPS E2E)
6. List all mock configurations and why each mock is necessary
7. Document the pre-build checklist that MUST pass before opening Android Studio
8. Note: "Run `npm run build:verify:config` before opening Android Studio"
9. Note: "Run `npm run build:fix:android` if Gradle build fails"
10. Provide clear instructions for Task 5 on what's been tested and what new features need test coverage
# COPILOT AGENT TASK 5
## Scope: ALL Recommended Enhanced Features + Their Tests
## Features: Kalman Filter Enhancement, HUD Mode, Speed Alerts, Biometric Login, Dark/Night Auto-Switch, Trip Export (PDF/CSV), License Key System, Offline-First Sync, Device Fingerprinting, Speed Unit Toggle Enhancement

### 🚨 ANTI-HALLUCINATION PROTOCOL — READ FIRST
Before writing ANY code, you MUST:
1. READ `whathasbeenimplemented.md` COMPLETELY — understand everything from Tasks 1-4
2. Pay special attention to existing test patterns from Task 4 — follow the SAME testing patterns
3. Do NOT duplicate any existing functionality — extend what's already there
4. WRITE into `whathasbeenimplemented.md` what you're about to do BEFORE coding
5. For EVERY new feature you implement, also write the corresponding tests
6. UPDATE `whathasbeenimplemented.md` when done with complete feature list and test results

---

### FEATURE 1: HUD (Heads-Up Display) Mode — Windshield Projection

**Implementation:**

1. Create `src/screens/HUDScreen.tsx`:
   - Full black background (#000000) — critical for windshield reflection
   - ALL content is horizontally mirrored using `transform: [{ scaleX: -1 }]`
   - Display ONLY:
     - Current speed (massive font, ~200px, color: lime/green #00FF41)
     - Speed unit label (km/h or mph)
     - Small average speed below
   - Force LANDSCAPE orientation using `react-native-orientation-locker`:
     ```typescript
     import Orientation from 'react-native-orientation-locker';
     
     useEffect(() => {
       Orientation.lockToLandscape();
       KeepAwake.activate();
       // Set max brightness
       SystemSetting.setBrightnessForce(1.0);
       StatusBar.setHidden(true);
       
       return () => {
         Orientation.unlockAllOrientations();
         KeepAwake.deactivate();
         SystemSetting.setBrightnessForce(previousBrightness);
         StatusBar.setHidden(false);
       };
     }, []);
     ```
   - Keep screen always on (`react-native-keep-awake`)
   - Maximum screen brightness when entering HUD mode, restore previous on exit
   - Minimal UI — no nav bar, no status bar, just speed
   - Exit via double-tap gesture or swipe-down
   - Speed data comes from the same `useSpeedStore` (shared state with dashboard)

2. Install additional dependency: `react-native-orientation-locker`, `react-native-system-setting` (for brightness control)

3. Add HUD button to `DashboardScreen.tsx`:
   - Small icon button in top-right corner of the dashboard
   - Icon: a windshield/projection icon
   - On press: navigate to HUDScreen
   - Only enabled when tracking is active

4. Add HUD toggle to `SettingsScreen.tsx`:
   - "Auto-HUD on drive start" toggle
   - Brightness level slider for HUD mode
   - Color picker for speed text (green, white, cyan, red)

**Tests for HUD Mode:**

5. Create `__tests__/screens/HUDScreen.test.tsx`:
   ```typescript
   // ✅ Renders with black background (#000000)
   // ✅ Speed text has scaleX: -1 transform (mirrored)
   // ✅ Locks orientation to landscape on mount
   // ✅ Unlocks orientation on unmount
   // ✅ Activates keep-awake on mount
   // ✅ Deactivates keep-awake on unmount
   // ✅ Hides status bar on mount
   // ✅ Shows status bar on unmount
   // ✅ Displays current speed from useSpeedStore
   // ✅ Displays correct speed unit
   // ✅ Speed text uses large font (≥150px)
   // ✅ Speed text color is configurable (default: #00FF41)
   // ✅ Double-tap gesture triggers exit
   // ✅ Navigates back to dashboard on exit
   // ✅ Sets brightness to max on mount
   // ✅ Restores previous brightness on unmount
   // ✅ Only shows speed and unit — no nav bar, no other UI
   // ✅ Average speed shown in smaller text below main speed
   ```

---

### FEATURE 2: Speed Alerts — Configurable Speed Limit Warnings

**Implementation:**

6. Create `src/services/alerts/SpeedAlertService.ts`:
   ```typescript
   interface SpeedAlertConfig {
     enabled: boolean;
     speedLimit: number;       // in current unit (km/h or mph)
     warningThreshold: number; // percentage before limit (e.g., 90% = warn at 90 km/h if limit is 100)
     alertType: 'vibration' | 'sound' | 'both';
     cooldownSeconds: number;  // minimum time between alerts (prevent spam)
   }
   
   class SpeedAlertService {
     private lastAlertTime: number = 0;
     private isWarning: boolean = false;
     
     checkSpeed(currentSpeed: number, config: SpeedAlertConfig): AlertResult {
       // Returns: { shouldAlert: boolean, level: 'warning' | 'exceeded' | 'none' }
       // Warning: speed ≥ warningThreshold% of limit
       // Exceeded: speed ≥ limit
       // Respects cooldown to prevent alert spam
     }
     
     triggerAlert(level: 'warning' | 'exceeded', type: AlertType): void {
       // Vibration: short pulse for warning, long pulse for exceeded
       // Sound: gentle beep for warning, insistent beep for exceeded
       // Both: vibration + sound
     }
   }
   ```

7. Create `src/services/alerts/SoundManager.ts`:
   - Preload alert sounds on app start
   - Warning sound: gentle double-beep
   - Exceeded sound: urgent triple-beep
   - Use `react-native-sound` for audio playback
   - Respect system volume settings

8. Add to `useSettingsStore.ts`:
   ```typescript
   speedAlert: {
     enabled: boolean;
     speedLimit: number;
     warningThreshold: number; // 0.85 to 0.95
     alertType: 'vibration' | 'sound' | 'both';
     cooldownSeconds: number;
   }
   ```

9. Integrate into `SpeedEngine.ts`:
   - After each speed update, call `SpeedAlertService.checkSpeed()`
   - If alert triggered, call `triggerAlert()`
   - Visual indicator on DashboardScreen: speed display border turns yellow (warning) or flashes red (exceeded)

10. Add Speed Alert settings to `SettingsScreen.tsx`:
    - Toggle: Enable/Disable speed alerts
    - Slider: Set speed limit (20-300 km/h or 12-186 mph)
    - Slider: Warning threshold (85%-95%)
    - Radio: Alert type (vibration / sound / both)
    - Slider: Cooldown (5-60 seconds)

**Tests for Speed Alerts:**

11. Create `__tests__/unit/services/alerts/SpeedAlertService.test.ts`:
    ```typescript
    // ✅ Returns 'none' when speed is below warning threshold
    // ✅ Returns 'warning' when speed ≥ warningThreshold% of limit
    // ✅ Returns 'exceeded' when speed ≥ limit
    // ✅ Respects cooldown period (no alert within cooldown window)
    // ✅ Alerts resume after cooldown expires
    // ✅ Returns 'none' when alerts are disabled
    // ✅ Correctly handles km/h speeds
    // ✅ Correctly handles mph speeds
    // ✅ Edge case: speed exactly at limit → 'exceeded'
    // ✅ Edge case: speed exactly at warning threshold → 'warning'
    // ✅ Edge case: speed = 0 → 'none'
    // ✅ Edge case: speed limit = 0 → always 'exceeded' (invalid config handled)
    // ✅ triggerAlert('warning', 'vibration') → calls Vibration.vibrate with short pattern
    // ✅ triggerAlert('exceeded', 'sound') → plays exceeded sound
    // ✅ triggerAlert('exceeded', 'both') → plays sound AND vibrates
    // ✅ Multiple rapid speed changes don't spam alerts
    ```

---

### FEATURE 3: Biometric Login (FaceID / TouchID / Fingerprint)

**Implementation:**

12. Install: `react-native-biometrics`

13. Create `src/services/auth/BiometricService.ts`:
    ```typescript
    import ReactNativeBiometrics from 'react-native-biometrics';
    
    class BiometricService {
      private rnBiometrics = new ReactNativeBiometrics();
      
      async isAvailable(): Promise<{
        available: boolean;
        biometryType: 'FaceID' | 'TouchID' | 'Biometrics' | null;
      }> {
        const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
        return { available, biometryType };
      }
      
      async authenticate(promptMessage?: string): Promise<boolean> {
        // Uses simplePrompt for authentication
        // Returns true on success, false on cancel/failure
        // promptMessage defaults to 'Authenticate to access Average'
      }
      
      async createKeys(): Promise<string> {
        // Creates a public/private key pair
        // Returns the public key (to send to server for verification)
        // Used for biometric-based token generation
      }
      
      async signPayload(payload: string): Promise<string> {
        // Signs a payload with the biometric-protected private key
        // Server verifies with stored public key
        // This provides cryptographic proof of biometric auth
      }
      
      async deleteKeys(): Promise<void> {
        // Remove stored keys (on logout or key rotation)
      }
    }
    ```

14. Integrate biometric login flow:
    - On `LoginScreen.tsx`: Add "Login with FaceID/TouchID" button below password login
      - Only show if biometrics are available AND user has previously logged in on this device
      - Icon changes based on biometryType (face icon for FaceID, fingerprint for TouchID/Biometrics)
    - On first successful password login, prompt: "Enable biometric login for next time?"
      - If yes: create biometric keys, send public key to server, store `biometricEnabled: true`
    - On subsequent launches: if biometric is enabled, show biometric prompt immediately
      - On success: sign a challenge nonce from server with biometric key → server validates → issue tokens
      - On failure/cancel: fall back to password login

15. Add to `SettingsScreen.tsx`:
    - "Biometric Login" toggle
    - Shows biometry type (FaceID / TouchID / Fingerprint)
    - Disable → deletes keys and disables biometric auth

16. Backend changes — add to `backend/src/routes/auth.ts`:
    - `POST /auth/biometric/register` — store public key for user + device
    - `POST /auth/biometric/challenge` — return a random nonce challenge
    - `POST /auth/biometric/verify` — verify signed challenge with stored public key → issue tokens

**Tests for Biometric Login:**

17. Create `__tests__/unit/services/auth/BiometricService.test.ts`:
    ```typescript
    // ✅ isAvailable() returns true when sensor exists
    // ✅ isAvailable() returns false when no sensor
    // ✅ isAvailable() returns correct biometryType ('FaceID', 'TouchID', 'Biometrics')
    // ✅ authenticate() resolves true on successful biometric
    // ✅ authenticate() resolves false on user cancel
    // ✅ authenticate() uses custom prompt message
    // ✅ createKeys() returns a public key string
    // ✅ signPayload() returns a signature string
    // ✅ signPayload() requires biometric authentication
    // ✅ deleteKeys() removes stored keys
    // ✅ Handles sensor unavailable gracefully (no crash)
    ```

18. Create `__tests__/integration/biometric-auth-flow.test.tsx`:
    ```typescript
    // ✅ Login screen shows biometric button when available AND previously used
    // ✅ Login screen hides biometric button when not available
    // ✅ Login screen hides biometric button on first-ever login
    // ✅ Biometric button shows correct icon for biometry type
    // ✅ Successful biometric auth → navigates to dashboard
    // ✅ Failed biometric → stays on login, shows password form
    // ✅ First password login → prompts to enable biometric
    // ✅ User accepts biometric enrollment → keys created, public key sent to server
    // ✅ User declines biometric enrollment → no keys created
    // ✅ Settings toggle disable → keys deleted, biometric login disabled
    ```

19. Create `backend/__tests__/routes/biometric-auth.test.ts`:
    ```typescript
    // ✅ POST /auth/biometric/register — stores public key for user
    // ✅ POST /auth/biometric/register — rejects unauthenticated request
    // ✅ POST /auth/biometric/challenge — returns random nonce
    // ✅ POST /auth/biometric/verify — validates correct signature → returns tokens
    // ✅ POST /auth/biometric/verify — rejects invalid signature
    // ✅ POST /auth/biometric/verify — rejects expired challenge nonce
    ```

---

### FEATURE 4: Dark/Night Mode Auto-Switch (continued)

**Implementation:**

20. Create `src/services/theme/ThemeManager.ts`:
    ```typescript
    type ThemeMode = 'light' | 'dark' | 'auto-system' | 'auto-ambient' | 'auto-time';
    
    interface ThemeConfig {
      mode: ThemeMode;
      ambientLuxThreshold: number;  // lux level below which = dark (default: 20)
      nightStartHour: number;       // e.g., 19 (7 PM)
      nightEndHour: number;         // e.g., 6 (6 AM)
    }
    
    class ThemeManager {
      private currentTheme: 'light' | 'dark' = 'dark';
      private ambientLightSubscription: any = null;
      
      /**
       * Resolves the active theme based on the selected mode.
       * - 'light' / 'dark': manual override, returns as-is
       * - 'auto-system': uses React Native's Appearance API (useColorScheme)
       * - 'auto-ambient': uses device light sensor (Android only, fallback to system on iOS)
       * - 'auto-time': switches based on time of day
       */
      resolveTheme(config: ThemeConfig): 'light' | 'dark' {
        switch (config.mode) {
          case 'light': return 'light';
          case 'dark': return 'dark';
          case 'auto-system': return this.getSystemTheme();
          case 'auto-ambient': return this.getAmbientTheme(config.ambientLuxThreshold);
          case 'auto-time': return this.getTimeBasedTheme(config.nightStartHour, config.nightEndHour);
        }
      }
      
      private getSystemTheme(): 'light' | 'dark' {
        // Uses Appearance.getColorScheme() from react-native
        const scheme = Appearance.getColorScheme();
        return scheme === 'dark' ? 'dark' : 'light';
      }
      
      private getAmbientTheme(threshold: number): 'light' | 'dark' {
        // Android: reads ambient light sensor value
        // iOS: falls back to system theme (no ambient light API)
        // If lux < threshold → dark, else → light
        // Uses a rolling average of last 5 readings to avoid flicker
      }
      
      private getTimeBasedTheme(nightStart: number, nightEnd: number): 'light' | 'dark' {
        const hour = new Date().getHours();
        if (nightStart > nightEnd) {
          // Handles overnight (e.g., 19:00 → 06:00)
          return (hour >= nightStart || hour < nightEnd) ? 'dark' : 'light';
        }
        return (hour >= nightStart && hour < nightEnd) ? 'dark' : 'light';
      }
      
      startAmbientLightListening(callback: (lux: number) => void): void {
        // Android only: subscribe to ambient light sensor
        // Uses react-native-ambient-light or custom native module
        // Emits lux values every 2 seconds
        // Applies debounce (3-second window) to prevent rapid theme switching
      }
      
      stopAmbientLightListening(): void {
        // Unsubscribe from sensor
      }
    }
    ```

21. Create `src/services/theme/AmbientLightBridge.ts` (Android native bridge):
    ```typescript
    // This wraps the Android SensorManager for TYPE_LIGHT
    // Exposes to JS:
    //   - startListening(): void — begins emitting light sensor events
    //   - stopListening(): void — stops sensor
    //   - Events: onLightChange(lux: number)
    // On iOS: returns a no-op (ambient light sensor not exposed)
    ```

22. Create native Android module `android/app/src/main/java/com/average/sensors/AmbientLightModule.kt`:
    ```kotlin
    // Implements ReactContextBaseJavaModule
    // Registers SensorManager.SENSOR_SERVICE for Sensor.TYPE_LIGHT
    // On sensor change: emit event "onAmbientLightChange" with { lux: Float }
    // Methods:
    //   @ReactMethod fun startListening()
    //   @ReactMethod fun stopListening()
    // Register in MainApplication package list
    ```

23. Create `src/hooks/useTheme.ts`:
    ```typescript
    // Custom hook that:
    // 1. Reads theme config from useSettingsStore
    // 2. Instantiates ThemeManager
    // 3. Sets up listeners based on mode:
    //    - 'auto-system': Appearance.addChangeListener
    //    - 'auto-ambient': AmbientLightBridge.startListening (Android) / fallback (iOS)
    //    - 'auto-time': setInterval every 60 seconds to check hour
    // 4. Returns { theme: 'light' | 'dark', colors: ThemeColors }
    // 5. Cleans up all listeners on unmount
    // 6. Applies debounce to prevent rapid switching (min 3 seconds between changes)
    ```

24. Create `src/theme/themes.ts`:
    ```typescript
    export const DARK_THEME = {
      background: '#0A0A0A',
      surface: 'rgba(255,255,255,0.08)',
      surfaceElevated: 'rgba(255,255,255,0.12)',
      primary: '#00D4FF',
      secondary: '#7B61FF',
      accent: '#00FF41',
      text: '#FFFFFF',
      textSecondary: 'rgba(255,255,255,0.6)',
      textTertiary: 'rgba(255,255,255,0.35)',
      border: 'rgba(255,255,255,0.12)',
      danger: '#FF4444',
      success: '#44FF88',
      warning: '#FFAA00',
      glassBg: 'rgba(255,255,255,0.06)',
      glassBorder: 'rgba(255,255,255,0.15)',
      speedGreen: '#00FF41',
      speedYellow: '#FFD700',
      speedRed: '#FF3333',
      navBarBg: 'rgba(30,30,30,0.85)',
    };
    
    export const LIGHT_THEME = {
      background: '#F5F5F7',
      surface: 'rgba(0,0,0,0.04)',
      surfaceElevated: 'rgba(0,0,0,0.08)',
      primary: '#007AFF',
      secondary: '#5856D6',
      accent: '#34C759',
      text: '#1C1C1E',
      textSecondary: 'rgba(0,0,0,0.55)',
      textTertiary: 'rgba(0,0,0,0.3)',
      border: 'rgba(0,0,0,0.12)',
      danger: '#FF3B30',
      success: '#34C759',
      warning: '#FF9500',
      glassBg: 'rgba(255,255,255,0.65)',
      glassBorder: 'rgba(0,0,0,0.1)',
      speedGreen: '#34C759',
      speedYellow: '#FF9500',
      speedRed: '#FF3B30',
      navBarBg: 'rgba(255,255,255,0.85)',
    };
    ```

25. Create `src/context/ThemeContext.tsx`:
    ```typescript
    // React Context provider that wraps the entire app
    // Provides: { theme, colors, toggleTheme, setThemeMode }
    // All components use useThemeContext() instead of hardcoded colors
    // Wrap in AppNavigator.tsx at the top level
    ```

26. Update ALL existing screens and components:
    - Replace hardcoded color values with `colors.xxx` from theme context
    - `LiquidGlassCard` — adjust glass opacity/tint based on theme
    - `BottomNavBar` — update background and text colors
    - `SpeedDisplay` — speed color thresholds use theme values
    - `LoginScreen` — adapt glass/input styles for both themes

27. Add to `SettingsScreen.tsx`:
    - Theme mode picker: Manual Dark / Manual Light / Auto (System) / Auto (Ambient Light) / Auto (Time-based)
    - If "Auto (Ambient Light)" selected: show lux threshold slider (5-50 lux)
    - If "Auto (Time-based)" selected: show night start/end hour pickers
    - Live preview: theme switches immediately as user changes settings

**Tests for Dark/Night Mode:**

28. Create `__tests__/unit/services/theme/ThemeManager.test.ts`:
    ```typescript
    // ✅ resolveTheme('light') → always returns 'light'
    // ✅ resolveTheme('dark') → always returns 'dark'
    // ✅ resolveTheme('auto-system') → returns system preference
    // ✅ resolveTheme('auto-system') → returns 'dark' when system is dark
    // ✅ resolveTheme('auto-system') → returns 'light' when system is light
    // ✅ resolveTheme('auto-ambient', threshold=20) → returns 'dark' when lux < 20
    // ✅ resolveTheme('auto-ambient', threshold=20) → returns 'light' when lux ≥ 20
    // ✅ resolveTheme('auto-ambient') on iOS → falls back to system theme
    // ✅ resolveTheme('auto-time', start=19, end=6) → 'dark' at 21:00
    // ✅ resolveTheme('auto-time', start=19, end=6) → 'light' at 12:00
    // ✅ resolveTheme('auto-time', start=19, end=6) → 'dark' at 03:00 (overnight)
    // ✅ resolveTheme('auto-time', start=19, end=6) → 'light' at 06:00 (boundary)
    // ✅ resolveTheme('auto-time', start=19, end=6) → 'dark' at 19:00 (boundary)
    // ✅ Ambient light debounce prevents switching within 3 seconds
    // ✅ Rolling average of 5 lux readings smooths flickering
    // ✅ startAmbientLightListening emits lux values
    // ✅ stopAmbientLightListening cleans up subscription
    ```

29. Create `__tests__/unit/theme/themes.test.ts`:
    ```typescript
    // ✅ DARK_THEME has all required color keys
    // ✅ LIGHT_THEME has all required color keys
    // ✅ DARK_THEME and LIGHT_THEME have identical key sets
    // ✅ All color values are valid CSS color strings
    // ✅ Background colors have sufficient contrast ratio with text (WCAG AA)
    // ✅ Speed color values are distinguishable from each other
    ```

---

### FEATURE 5: Trip Summary Export (PDF & CSV)

**Implementation:**

30. Install: `react-native-html-to-pdf`, `react-native-share`, `react-native-fs`

31. Create `src/services/export/TripExportService.ts`:
    ```typescript
    import RNHTMLtoPDF from 'react-native-html-to-pdf';
    import Share from 'react-native-share';
    import RNFS from 'react-native-fs';
    
    interface TripExportData {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      duration: string;          // formatted: "01:23:45"
      distance: string;          // formatted: "45.2 km"
      averageSpeed: string;      // formatted: "85 km/h"
      maxSpeed: string;          // formatted: "142 km/h"
      speedUnit: 'km/h' | 'mph';
    }
    
    class TripExportService {
      
      async exportSingleTripPDF(trip: TripExportData): Promise<void> {
        const html = this.generateSingleTripHTML(trip);
        const options = {
          html,
          fileName: `average-trip-${trip.id}`,
          directory: 'Documents',
          base64: false,
        };
        const file = await RNHTMLtoPDF.convert(options);
        await Share.open({
          url: `file://${file.filePath}`,
          type: 'application/pdf',
          title: 'Share Trip Report',
        });
      }
      
      async exportMultipleTripsPDF(trips: TripExportData[]): Promise<void> {
        const html = this.generateMultiTripsHTML(trips);
        const options = {
          html,
          fileName: `average-trip-history-${Date.now()}`,
          directory: 'Documents',
        };
        const file = await RNHTMLtoPDF.convert(options);
        await Share.open({ url: `file://${file.filePath}`, type: 'application/pdf' });
      }
      
      async exportTripsCSV(trips: TripExportData[]): Promise<void> {
        const csv = this.generateCSV(trips);
        const path = `${RNFS.DocumentDirectoryPath}/average-trips-${Date.now()}.csv`;
        await RNFS.writeFile(path, csv, 'utf8');
        await Share.open({ url: `file://${path}`, type: 'text/csv' });
      }
      
      private generateSingleTripHTML(trip: TripExportData): string {
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; }
              .header { text-align: center; margin-bottom: 40px; }
              .header h1 { font-size: 28px; color: #007AFF; margin-bottom: 4px; }
              .header p { color: #888; font-size: 14px; }
              .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
              .stat-card { background: #f5f5f7; border-radius: 16px; padding: 24px; text-align: center; }
              .stat-value { font-size: 36px; font-weight: 700; color: #1a1a1a; }
              .stat-label { font-size: 14px; color: #888; margin-top: 4px; }
              .hero-stat { grid-column: span 2; background: linear-gradient(135deg, #007AFF, #5856D6); color: white; }
              .hero-stat .stat-value { color: white; font-size: 48px; }
              .hero-stat .stat-label { color: rgba(255,255,255,0.8); }
              .footer { text-align: center; margin-top: 40px; color: #ccc; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Average</h1>
              <p>Trip Report — ${trip.date}</p>
            </div>
            <div class="stats-grid">
              <div class="stat-card hero-stat">
                <div class="stat-value">${trip.averageSpeed}</div>
                <div class="stat-label">Average Speed</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${trip.maxSpeed}</div>
                <div class="stat-label">Max Speed</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${trip.distance}</div>
                <div class="stat-label">Distance</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${trip.duration}</div>
                <div class="stat-label">Duration</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${trip.startTime}</div>
                <div class="stat-label">Start Time</div>
              </div>
            </div>
            <div class="footer">Generated by Average — ${new Date().toISOString()}</div>
          </body>
          </html>
        `;
      }
      
      private generateMultiTripsHTML(trips: TripExportData[]): string {
        const rows = trips.map(t => `
          <tr>
            <td>${t.date}</td>
            <td>${t.duration}</td>
            <td>${t.distance}</td>
            <td>${t.averageSpeed}</td>
            <td>${t.maxSpeed}</td>
          </tr>
        `).join('');
        
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, sans-serif; padding: 40px; }
              h1 { color: #007AFF; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
              th { background: #007AFF; color: white; }
              tr:nth-child(even) { background: #f9f9f9; }
              .footer { text-align: center; margin-top: 20px; color: #aaa; font-size: 11px; }
            </style>
          </head>
          <body>
            <h1>Average — Trip History</h1>
            <p>${trips.length} trips recorded</p>
            <table>
              <thead><tr><th>Date</th><th>Duration</th><th>Distance</th><th>Avg Speed</th><th>Max Speed</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="footer">Generated by Average — ${new Date().toISOString()}</div>
          </body>
          </html>
        `;
      }
      
      private generateCSV(trips: TripExportData[]): string {
        const header = 'Date,Start Time,End Time,Duration,Distance,Average Speed,Max Speed,Unit';
        const rows = trips.map(t =>
          `"${t.date}","${t.startTime}","${t.endTime}","${t.duration}","${t.distance}","${t.averageSpeed}","${t.maxSpeed}","${t.speedUnit}"`
        ).join('\n');
        return `${header}\n${rows}`;
      }
    }
    ```

32. Add export buttons to `HistoryScreen.tsx`:
    - Each trip card: "Share" icon → opens action sheet → "Export as PDF" / "Export as CSV"
    - Top-right header button: "Export All" → action sheet → "All Trips as PDF" / "All Trips as CSV"
    - Show loading indicator during export generation

33. Add to `StatsScreen.tsx`:
    - "Export Stats Report" button at bottom
    - Generates a comprehensive PDF with all-time stats + trip history

**Tests for Trip Export:**

34. Create `__tests__/unit/services/export/TripExportService.test.ts`:
    ```typescript
    // ✅ generateSingleTripHTML() returns valid HTML string
    // ✅ generateSingleTripHTML() includes trip date
    // ✅ generateSingleTripHTML() includes average speed
    // ✅ generateSingleTripHTML() includes max speed
    // ✅ generateSingleTripHTML() includes distance
    // ✅ generateSingleTripHTML() includes duration
    // ✅ generateMultiTripsHTML() includes all trips in table
    // ✅ generateMultiTripsHTML() shows correct trip count
    // ✅ generateCSV() returns valid CSV with header row
    // ✅ generateCSV() has correct number of data rows
    // ✅ generateCSV() properly escapes values with commas/quotes
    // ✅ generateCSV() includes all fields per trip
    // ✅ exportSingleTripPDF() calls RNHTMLtoPDF.convert with correct options
    // ✅ exportSingleTripPDF() calls Share.open with file path
    // ✅ exportTripsCSV() writes file to Documents directory
    // ✅ exportTripsCSV() calls Share.open with csv file path
    // ✅ Handles empty trips array gracefully (CSV has only header, PDF shows "No trips")
    // ✅ Handles special characters in trip data (unicode, &, <, >)
    // ✅ Generated filename includes timestamp for uniqueness
    ```

---

### FEATURE 6: License Key System (Anti-Piracy)

**Implementation:**

35. Create `src/services/license/LicenseService.ts`:
    ```typescript
    import DeviceInfo from 'react-native-device-info';
    import EncryptedStorage from 'react-native-encrypted-storage';
    
    interface LicenseStatus {
      valid: boolean;
      expiresAt: string | null;
      remainingDevices: number;
      tier: 'free' | 'pro' | 'lifetime';
    }
    
    class LicenseService {
      private readonly STORAGE_KEY = 'average_license_cache';
      private readonly VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
      
      async validateLicense(licenseKey: string): Promise<LicenseStatus> {
        const deviceId = await DeviceInfo.getUniqueId();
        const deviceModel = DeviceInfo.getModel();
        const osVersion = await DeviceInfo.getSystemVersion();
        const appVersion = DeviceInfo.getVersion();
        
        // 1. Call backend POST /license/validate
        const response = await apiClient.post('/license/validate', {
          licenseKey,
          deviceId,
          deviceModel,
          platform: Platform.OS,
          osVersion,
          appVersion,
        });
        
        // 2. Cache result locally (for offline validation)
        await this.cacheLicenseStatus(response.data);
        
        return response.data;
      }
      
      async checkCachedLicense(): Promise<LicenseStatus | null> {
        // Used on app launch when offline
        // Returns cached license status if within validation interval
        // Returns null if cache is expired or doesn't exist
        const cached = await EncryptedStorage.getItem(this.STORAGE_KEY);
        if (!cached) return null;
        
        const parsed = JSON.parse(cached);
        const cacheAge = Date.now() - parsed.cachedAt;
        
        if (cacheAge > this.VALIDATION_INTERVAL) return null;
        return parsed.status;
      }
      
      async activateLicense(licenseKey: string): Promise<LicenseStatus> {
        // First-time activation: binds license to this device
        // Server checks maxDevices limit
        // Stores license key securely
      }
      
      async deactivateDevice(): Promise<void> {
        // Unbinds this device from the license
        // Frees up a device slot
        // Used when user wants to transfer to new device
      }
      
      private async cacheLicenseStatus(status: LicenseStatus): Promise<void> {
        await EncryptedStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          status,
          cachedAt: Date.now(),
        }));
      }
    }
    ```

36. Backend additions — update `backend/src/routes/license.ts`:
    ```typescript
    // POST /license/validate
    // - Receives: licenseKey, deviceId, deviceModel, platform, osVersion, appVersion
    // - Validates key exists and is active
    // - If device is new AND maxDevices not exceeded: register device
    // - If device is new AND maxDevices exceeded: reject (403)
    // - If device is already registered: accept
    // - Updates lastSeen timestamp for device fingerprint
    // - Returns: { valid, expiresAt, remainingDevices, tier }
    
    // POST /license/activate
    // - First-time activation of a license key
    // - Binds to device
    // - Returns license status
    
    // POST /license/deactivate
    // - Unbinds current device from license
    // - Authenticated + requires license key confirmation
    
    // GET /license/status
    // - Returns current license status for authenticated user
    
    // ADMIN endpoints (for you):
    // POST /admin/license/generate
    // - Generates new license keys (batch)
    // - Params: count, tier, maxDevices, expiresAt
    // - Returns array of generated keys
    
    // POST /admin/license/revoke
    // - Revokes a specific license key
    // - All devices bound to it are invalidated
    ```

37. Create `backend/src/services/licenseGenerator.ts`:
    ```typescript
    // Generates license keys in format: XXXX-XXXX-XXXX-XXXX
    // Each group is alphanumeric uppercase (excluding confusing chars: 0/O, 1/I/L)
    // Uses crypto.randomBytes for cryptographic randomness
    // Includes a check digit (last char of last group) for offline basic validation
    // 
    // function generateLicenseKey(): string
    // function validateKeyFormat(key: string): boolean  // client-side format check
    // function generateBatch(count: number, tier: string, maxDevices: number): LicenseKey[]
    ```

38. Add license activation screen — Create `src/screens/LicenseScreen.tsx`:
    - Shows when user has no active license (after login, before dashboard)
    - Input field for license key (formatted with dashes as user types)
    - "Activate" button
    - "Continue with Free Tier" button (if free tier is available)
    - Shows activation status, device count, expiry info
    - Error handling for invalid key, max devices reached, expired key

39. Update navigation flow in `AppNavigator.tsx`:
    ```
    Splash → Security Check → Login → License Check → Dashboard
                                         ↓
                                   (No valid license?)
                                         ↓
                                   LicenseScreen
    ```

40. Add to `SettingsScreen.tsx`:
    - "License" section showing:
      - Current license key (partially masked: XXXX-****-****-XXXX)
      - License tier (Free / Pro / Lifetime)
      - Expiry date
      - Devices: "2 of 3 used"
      - "Deactivate This Device" button
      - "Enter New License Key" button

**Tests for License System:**

41. Create `__tests__/unit/services/license/LicenseService.test.ts`:
    ```typescript
    // ✅ validateLicense() sends correct payload to /license/validate
    // ✅ validateLicense() includes device fingerprint data
    // ✅ validateLicense() caches result on success
    // ✅ validateLicense() throws on invalid key
    // ✅ validateLicense() throws on max devices exceeded
    // ✅ validateLicense() throws on expired key
    // ✅ checkCachedLicense() returns cached status within interval
    // ✅ checkCachedLicense() returns null when cache expired (>24h)
    // ✅ checkCachedLicense() returns null when no cache exists
    // ✅ activateLicense() binds device to license key
    // ✅ deactivateDevice() removes device binding
    // ✅ License key is stored in EncryptedStorage (not plain AsyncStorage)
    ```

42. Create `__tests__/unit/services/license/licenseGenerator.test.ts` (backend):
    ```typescript
    // ✅ generateLicenseKey() returns key in XXXX-XXXX-XXXX-XXXX format
    // ✅ generateLicenseKey() uses only allowed characters (no 0/O/1/I/L)
    // ✅ generateLicenseKey() produces unique keys (generate 1000, check no duplicates)
    // ✅ validateKeyFormat() returns true for valid format
    // ✅ validateKeyFormat() returns false for invalid format
    // ✅ validateKeyFormat() returns false for empty string
    // ✅ validateKeyFormat() checks check digit validity
    // ✅ generateBatch(10) returns exactly 10 unique keys
    // ✅ generateBatch() assigns correct tier and maxDevices
    ```

43. Create `__tests__/screens/LicenseScreen.test.tsx`:
    ```typescript
    // ✅ Renders license key input field
    // ✅ Auto-formats key with dashes as user types
    // ✅ Activate button is disabled when input is empty
    // ✅ Activate button is disabled when format is invalid
    // ✅ Calls LicenseService.activateLicense on button press
    // ✅ Shows success state and navigates to dashboard
    // ✅ Shows error message for invalid key
    // ✅ Shows error message for max devices reached
    // ✅ Shows error message for expired key
    // ✅ "Continue Free" button navigates to dashboard (if free tier enabled)
    // ✅ Loading state shown during activation
    ```

---

### FEATURE 7: Offline-First Architecture with Smart Sync

**Implementation:**

44. Create `src/services/sync/SyncManager.ts`:
    ```typescript
    import NetInfo from '@react-native-community/netinfo';
    
    interface SyncQueueItem {
      id: string;
      type: 'trip' | 'settings' | 'license_check';
      payload: any;
      createdAt: number;
      retryCount: number;
      maxRetries: number;
    }
    
    class SyncManager {
      private syncQueue: SyncQueueItem[] = [];
      private isSyncing: boolean = false;
      private networkListener: any = null;
      
      async initialize(): Promise<void> {
        // 1. Load pending sync queue from SQLite
        // 2. Listen for network state changes
        // 3. When coming online: process queue
        this.networkListener = NetInfo.addEventListener(state => {
          if (state.isConnected && !this.isSyncing) {
            this.processQueue();
          }
        });
      }
      
      async enqueue(item: Omit<SyncQueueItem, 'id' | 'retryCount'>): Promise<void> {
        // Add to in-memory queue + persist to SQLite
        // If online, immediately attempt sync
      }
      
      async processQueue(): Promise<void> {
        // Process items in FIFO order
        // For each item:
        //   - Attempt API call
        //   - On success: remove from queue
        //   - On failure: increment retryCount
        //   - If retryCount >= maxRetries: move to dead letter queue
        // Use exponential backoff between retries
      }
      
      async getQueueStatus(): Promise<{
        pending: number;
        failed: number;
        lastSyncAt: number | null;
      }> {
        // Returns current sync status for UI display
      }
      
      destroy(): void {
        // Cleanup network listener
      }
    }
    ```

45. Install: `@react-native-community/netinfo`

46. Integrate SyncManager into existing services:
    - `TripManager.ts` → on trip save, enqueue sync item
    - `SettingsScreen.tsx` → show sync status (✅ Synced / ⏳ 3 pending / ❌ Offline)
    - `AuthService.ts` → on login, trigger full sync
    - `LicenseService.ts` → enqueue periodic license validation

47. Create `src/components/SyncStatusBadge.tsx`:
    - Small indicator in Settings and optionally in Dashboard header
    - Green dot: all synced
    - Yellow dot: items pending
    - Red dot: offline / sync failed
    - Tap to see sync details (pending count, last sync time, force retry)

**Tests for Offline-First Sync:**

48. Create `__tests__/unit/services/sync/SyncManager.test.ts`:
    ```typescript
    // ✅ initialize() loads pending queue from SQLite
    // ✅ initialize() sets up network listener
    // ✅ enqueue() adds item to queue
    // ✅ enqueue() persists item to SQLite
    // ✅ enqueue() triggers immediate sync when online
    // ✅ processQueue() processes items in FIFO order
    // ✅ processQueue() removes successful items from queue
    // ✅ processQueue() increments retryCount on failure
    // ✅ processQueue() moves item to dead letter after maxRetries
    // ✅ processQueue() uses exponential backoff (1s, 2s, 4s, 8s...)
    // ✅ Network change to online triggers processQueue()
    // ✅ Network change to offline does NOT trigger processQueue()
    // ✅ Concurrent processQueue() calls don't duplicate work (isSyncing lock)
    // ✅ getQueueStatus() returns correct counts
    // ✅ destroy() removes network listener
    // ✅ Empty queue → processQueue() returns immediately
    ```

49. Create `__tests__/integration/offline-sync-flow.test.ts`:
    ```typescript
    // ✅ Save trip while offline → trip stored locally + queued for sync
    // ✅ Come online → queued trip synced to backend
    // ✅ Save trip while online → trip synced immediately
    // ✅ API failure → item stays in queue with incremented retry
    // ✅ Multiple trips saved offline → all synced in order when online
    // ✅ Sync status badge shows correct state at each step
    ```

---

### FEATURE 8: Device Fingerprinting Enhancement

**Implementation:**

50. Create `src/services/security/DeviceFingerprint.ts`:
    ```typescript
    import DeviceInfo from 'react-native-device-info';
    
    interface Fingerprint {
      deviceId: string;          // Unique device ID
      model: string;             // "iPhone 15 Pro" / "Pixel 8"
      brand: string;             // "Apple" / "Google"
      systemName: string;        // "iOS" / "Android"
      systemVersion: string;     // "17.2" / "14"
      appVersion: string;        // "1.0.0"
      buildNumber: string;       // "42"
      bundleId: string;          // "com.average.app"
      isTablet: boolean;
      hasNotch: boolean;
      screenWidth: number;
      screenHeight: number;
      timezone: string;          // "America/New_York"
      locale: string;            // "en-US"
      carrier: string;           // "Verizon" (or empty)
      firstInstallTime: number;  // timestamp
      fingerprintHash: string;   // SHA-256 of all above combined
    }
    
    class DeviceFingerprintService {
      async collect(): Promise<Fingerprint> {
        // Collects all device info
        // Generates SHA-256 hash of concatenated values
        // This hash uniquely identifies a device + install combination
      }
      
      async verify(storedHash: string): Promise<boolean> {
        // Collects current fingerprint and compares hash
        // Returns true if device is the same
        // Allows for minor changes (OS version update) by comparing individual fields
        // Flags suspicious changes (different model, different brand)
      }
      
      async getAnonymizedFingerprint(): Promise<string> {
        // Returns a privacy-friendly fingerprint
        // Used for analytics without PII
      }
    }
    ```

51. Integrate into auth flow:
    - On login: send device fingerprint to server
    - Server stores/updates fingerprint for the session
    - On each API call: include fingerprint hash in header
    - Server can flag suspicious fingerprint changes (potential token theft)

**Tests for Device Fingerprinting:**

52. Create `__tests__/unit/services/security/DeviceFingerprint.test.ts`:
    ```typescript
    // ✅ collect() returns all required fields
    // ✅ collect() generates a fingerprintHash
    // ✅ collect() returns consistent hash for same device
    // ✅ verify() returns true for matching fingerprint
    // ✅ verify() returns false for different device
    // ✅ verify() tolerates OS version change (minor field change)
    // ✅ verify() flags model change as suspicious
    // ✅ getAnonymizedFingerprint() returns a hash string
    // ✅ getAnonymizedFingerprint() does not contain PII
    // ✅ Handles missing device info gracefully (uses fallback values)
    ```

---

### FEATURE 9: Speed Unit Toggle Enhancement + Smart Defaults

**Implementation:**

53. Update `src/store/useSettingsStore.ts`:
    ```typescript
    interface SettingsState {
      // Existing
      speedUnit: 'kmh' | 'mph';
      
      // New
      distanceUnit: 'km' | 'mi';           // auto-linked to speed unit
      autoDetectUnit: boolean;               // detect from device locale
      showBothUnits: boolean;                // show secondary unit in smaller text
      speedDisplayPrecision: 0 | 1;          // decimal places (0 = "127", 1 = "127.4")
    }
    ```

54. Create `src/utils/unitDetector.ts`:
    ```typescript
    // Detects whether to use metric or imperial based on:
    // 1. Device locale (en-US, en-GB, etc.)
    // 2. Country code from locale
    // Imperial countries: US, UK (for road speed), Myanmar, Liberia
    // Returns: 'kmh' | 'mph'
    
    import { NativeModules, Platform } from 'react-native';
    
    export function detectPreferredUnit(): 'kmh' | 'mph' {
      const locale = Platform.OS === 'ios' 
        ? NativeModules.SettingsManager.settings.AppleLocale 
        : NativeModules.I18nManager.localeIdentifier;
      
      const imperialLocales = ['en_US', 'en_GB', 'my_MM', 'en_LR'];
      return imperialLocales.some(l => locale?.startsWith(l)) ? 'mph' : 'kmh';
    }
    ```

55. Update `SpeedDisplay.tsx`:
    - If `showBothUnits` is true: show primary unit large, secondary unit small below
    - Example: **127** km/h  *(79 mph)*
    - Precision follows `speedDisplayPrecision` setting
    - Tap on unit area cycles: km/h → mph → both → km/h

56. Add to `SettingsScreen.tsx`:
    - "Auto-detect unit from locale" toggle
    - "Show both units" toggle
    - "Speed precision" picker (0 or 1 decimal)

**Tests for Speed Unit Enhancement:**

57. Create `__tests__/unit/utils/unitDetector.test.ts`:
    ```typescript
    // ✅ detectPreferredUnit() returns 'mph' for en_US locale
    // ✅ detectPreferredUnit() returns 'mph' for en_GB locale
    // ✅ detectPreferredUnit() returns 'kmh' for de_DE locale
    // ✅ detectPreferredUnit() returns 'kmh' for ja_JP locale
    // ✅ detectPreferredUnit() returns 'kmh' for fr_FR locale
    // ✅ detectPreferredUnit() returns 'kmh' for unknown locale (safe default)
    // ✅ detectPreferredUnit() handles null locale gracefully
    ```

58. Create `__tests__/components/SpeedDisplay-enhanced.test.tsx`:
    ```typescript
    // ✅ Shows both units when showBothUnits is true
    // ✅ Secondary unit is visually smaller
    // ✅ Conversion is accurate (100 km/h = 62.1 mph)
    // ✅ Precision 0: shows "127" not "127.4"
    // ✅ Precision 1: shows "127.4" not "127"
    // ✅ Tap cycles through unit display modes
    // ✅ Auto-detect sets correct unit on first launch
    ```

---

### FEATURE 10: Enhanced Kalman Filter + GPS Quality Indicator

**Implementation:**

59. Update `src/services/gps/KalmanFilter.ts` to a full 2D Kalman Filter:
    ```typescript
    /**
     * Enhanced 2D Kalman Filter for GPS position + velocity estimation.
     * State vector: [latitude, longitude, velocity_north, velocity_east]
     * This provides much better speed estimation than 1D filtering.
     * 
     * Benefits over 1D:
     * - Considers both position and velocity simultaneously
     * - Better handles GPS jumps (outlier rejection)
     * - Provides velocity direction (heading) for free
     * - Smoother acceleration/deceleration transitions
     */
    
    class KalmanFilter2D {
      private state: number[];          // [lat, lon, vN, vE]
      private covariance: number[][];   // 4x4 covariance matrix
      private processNoise: number;
      private measurementNoise: number;
      
      constructor(config: {
        processNoise?: number;      // How much we trust the model (lower = smoother)
        measurementNoise?: number;  // How much we trust GPS (lower = more responsive)
        initialAccuracy?: number;   // Initial GPS accuracy in meters
      }) { }
      
      predict(dt: number): void {
        // Predict next state based on constant velocity model
        // Update covariance with process noise
      }
      
      update(measurement: {
        latitude: number;
        longitude: number;
        accuracy: number;    // GPS accuracy in meters (used to adjust measurement noise)
        speed?: number;      // Optional: GPS-reported speed
        timestamp: number;
      }): FilteredState {
        // Kalman gain calculation
        // State update
        // Covariance update
        // Outlier rejection: if measurement is > 3σ from prediction, reduce its weight
        // Returns: { latitude, longitude, speed, heading, quality }
      }
      
      getSpeed(): number {
        // Returns filtered speed in m/s from velocity components
        // speed = sqrt(vN² + vE²)
      }
      
      getHeading(): number {
        // Returns heading in degrees from velocity components
        // heading = atan2(vE, vN) * 180 / π
      }
      
      getQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
        // Based on innovation (prediction vs measurement difference)
        // and current covariance magnitude
      }
      
      reset(): void {
        // Reset filter state
      }
    }
    ```

60. Create `src/components/GPSQualityIndicator.tsx`:
    ```typescript
    // Small indicator component showing GPS signal quality
    // 4 bars like cell signal strength:
    //   - 4 bars (green): excellent — accuracy < 5m
    //   - 3 bars (green): good — accuracy < 15m
    //   - 2 bars (yellow): fair — accuracy < 30m
    //   - 1 bar (red): poor — accuracy > 30m
    //   - 0 bars (gray): no signal
    // Positioned in top-left of DashboardScreen
    // Shows accuracy in meters on long-press
    // Animated transitions between states
    ```

61. Add GPS quality to `DashboardScreen.tsx`:
    - Top-left corner: `<GPSQualityIndicator />`
    - When quality is 'poor': show subtle warning banner "GPS signal weak — speed may be inaccurate"

**Tests for Enhanced Kalman Filter & GPS Quality:**

62. Create `__tests__/unit/services/gps/KalmanFilter2D.test.ts`:
    ```typescript
    // ✅ Initializes with zero velocity state
    // ✅ predict() advances state by dt seconds
    // ✅ update() incorporates GPS measurement
    // ✅ Filters noisy GPS data to smooth trajectory
    // ✅ getSpeed() returns magnitude of velocity vector
    // ✅ getSpeed() converges to true speed with good data
    // ✅ getHeading() returns correct compass direction
    // ✅ Outlier rejection: ignores GPS jump > 3σ
    // ✅ Adapts to GPS accuracy (high accuracy = more trust)
    // ✅ Adapts to GPS accuracy (low accuracy = less trust)
    // ✅ getQuality() returns 'excellent' for accuracy < 5m
    // ✅ getQuality() returns 'good' for accuracy < 15m
    // ✅ getQuality() returns 'fair' for accuracy < 30m
    // ✅ getQuality() returns 'poor' for accuracy ≥ 30m
    // ✅ reset() clears all state
    // ✅ Handles rapid successive updates without degradation
    // ✅ Performance: 10,000 predict+update cycles in < 200ms
    // ✅ Known trajectory test: straight line at 100 km/h → filtered speed ≈ 100 km/h ± 2
    // ✅ Known trajectory test: stationary → filtered speed converges to 0
    // ✅ Known trajectory test: acceleration 0→100 km/h → smooth ramp, no overshoot
    ```

63. Create `__tests__/components/GPSQualityIndicator.test.tsx`:
    ```typescript
    // ✅ Shows 4 bars for accuracy < 5m
    // ✅ Shows 3 bars for accuracy < 15m
    // ✅ Shows 2 bars for accuracy < 30m
    // ✅ Shows 1 bar for accuracy ≥ 30m
    // ✅ Shows 0 bars when no GPS data
    // ✅ Bars use correct colors (green/yellow/red/gray)
    // ✅ Long-press shows accuracy in meters
    // ✅ Animates between states smoothly
    ```

---

### FINAL PART: Integration Tests for All New Features Together

64. Create `__tests__/integration/enhanced-features-flow.test.tsx`:
    ```typescript
    // ✅ Full enhanced trip flow:
    //    Login (biometric) → License check → Dashboard → Start trip →
    //    Speed alert triggers at configured limit → 
    //    HUD mode activated → Speed visible mirrored →
    //    Exit HUD → Stop trip → Export as PDF → Share
    
    // ✅ Offline enhanced flow:
    //    Start trip offline → Complete trip → Trip saved locally →
    //    Come online → Trip synced → Appears in backend
    
    // ✅ Theme switching during drive:
    //    Set auto-ambient → Start trip → Simulate low lux →
    //    Theme switches to dark → UI elements use dark colors →
    //    Simulate high lux → Theme switches to light
    
    // ✅ Settings persistence:
    //    Set all enhanced settings → Kill app → Relaunch →
    //    All settings preserved (speed unit, alert config, theme mode, etc.)
    
    // ✅ License + Device flow:
    //    Login → Enter license key → Activate →
    //    Device fingerprint stored → Dashboard accessible →
    //    Same key on second device → Works (within limit) →
    //    Same key on third device → Rejected (max 2 devices)
    ```

---

### UPDATE whathasbeenimplemented.md — FINAL STATE

After ALL features and tests are implemented, write the FINAL update to `whathasbeenimplemented.md`:

```markdown
# What Has Been Implemented — Final State

## Task 1: ✅ Complete
- Project scaffolding (React Native CLI + TypeScript)
- Backend (Fastify + Prisma + PostgreSQL)
- Authentication system (JWT + refresh tokens)
- Security gate (basic)
- Login/Register screens
- API client with interceptors

## Task 2: ✅ Complete
- GPS Service with high-accuracy tracking
- Speed Engine (current, average, max, distance)
- Kalman Filter (1D — now superseded by 2D in Task 5)
- Haversine Calculator
- Liquid Glass UI components (Card, Button)
- Bottom Navigation Bar (cnrad-style floating pill)
- Dashboard, Stats, History, Settings screens
- Trip management + SQLite storage
- Zustand stores (speed, auth, trip, settings)

## Task 3: ✅ Complete
- Android Auto native integration (Kotlin)
- Apple CarPlay native integration (Swift)
- 7-Layer anti-cracking suite
- JS obfuscation pipeline
- Native obfuscation (ProGuard/R8, LLVM)
- SSL pinning
- Runtime integrity checks
- Build configuration for release
- Comprehensive documentation

## Task 4: ✅ Complete
- 150+ unit tests across all services
- 30+ component tests
- 20+ screen tests
- 15+ integration tests
- E2E test suite (Detox) for auth, navigation, speed tracking
- CI/CD pipeline (GitHub Actions)
- Android build verification script
- iOS build verification script
- Native config verification script
- Fix scripts for common build issues
- Test coverage ≥ 80%

## Task 5: ✅ Complete
- Feature 1: HUD Mode (windshield projection, mirrored display)
- Feature 2: Speed Alerts (configurable limit, vibration/sound)
- Feature 3: Biometric Login (FaceID/TouchID/Fingerprint)
- Feature 4: Dark/Night Auto-Switch (system/ambient/time-based)
- Feature 5: Trip Export (PDF + CSV with Share)
- Feature 6: License Key System (generation, validation, device binding)
- Feature 7: Offline-First Sync (queue, retry, exponential backoff)
- Feature 8: Device Fingerprinting (SHA-256 hash, verification)
- Feature 9: Speed Unit Enhancement (auto-detect, dual display, precision)
- Feature 10: Enhanced 2D Kalman Filter + GPS Quality Indicator
- 100+ additional tests for all new features
- Integration tests covering cross-feature flows

## Total Test Count
- Unit tests: ~200
- Component tests: ~45
- Screen tests: ~30
- Integration tests: ~25
- E2E tests: ~15
- Backend tests: ~40
- TOTAL: ~355 tests

## Dependencies Added in Task 5
- react-native-biometrics
- react-native-orientation-locker
- react-native-system-setting
- react-native-sound
- react-native-html-to-pdf
- react-native-share
- react-native-fs
- @react-native-community/netinfo

## Known Limitations
- Ambient light sensor: Android only (iOS falls back to system theme)
- CarPlay: requires Apple developer entitlement application
- GPS accuracy: requires real device testing (simulators limited)
- Hermes bytecode encryption: requires custom native loader (advanced)
- HUD mode effectiveness depends on windshield glass type

## Pre-Build Checklist
1. Run: npm install
2. Run: npm run build:verify:config
3. Run: npm run test
4. Run: cd ios && pod install
5. Run: npm run build:verify:android
6. Run: npm run build:verify:ios
7. Open in Android Studio / Xcode — should build cleanly
```
