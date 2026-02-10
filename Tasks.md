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
