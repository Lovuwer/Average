# COPILOT AGENT TASK 7
## Scope: Full Sensor Fusion Engine — GPS + Accelerometer + Gyroscope + Pedometer + Barometer
## Goal: Instant, accurate speed detection for ALL motion types — walking (<1s response), running, cycling, driving (up to 200+ km/h), with smooth transitions between all modes

### 🚨 ANTI-HALLUCINATION PROTOCOL — READ FIRST
Before writing ANY code, you MUST:
1. READ `whathasbeenimplemented.md` COMPLETELY — understand every file, every pattern, every dependency from Tasks 1-6
2. READ every file in `src/services/gps/` — understand the current SpeedEngine.ts, KalmanFilter.ts, GPSService.ts, HaversineCalculator.ts EXACTLY as they are
3. READ `src/hooks/useSpeed.ts`, `src/store/useSpeedStore.ts`, `src/store/useSettingsStore.ts` — understand the data flow
4. READ `src/screens/DashboardScreen.tsx`, `src/screens/HUDScreen.tsx`, `src/components/GPSQualityIndicator.tsx` — understand all UI consumers
5. READ `android/app/src/main/java/com/average/MainApplication.kt` — understand the native module registration pattern
6. READ `ios/Average/Info.plist` — understand existing iOS permission / plist config
7. Do NOT recreate any files. Only MODIFY existing files and create new ones as specified
8. WRITE into `whathasbeenimplemented.md` what you're about to do BEFORE coding
9. Verify that every import path you reference actually exists in the project
10. UPDATE `whathasbeenimplemented.md` when done with a full summary of changes

---

## IMPORTANT DESIGN CONSTRAINT: CAR / VEHICLE SUPPORT

This app is a speedometer. It must work perfectly in a car at highway speeds (0–250 km/h).
- In a car, there are NO steps. The pedometer produces nothing. The accelerometer sees smooth vibration, not step impacts.
- GPS is the AUTHORITATIVE source above ~15 km/h. Period.
- The sensor fusion engine MUST detect vehicle mode and switch to GPS-dominant operation.
- The gyroscope detects cornering / turning in a car (useful for dead-reckoning during GPS tunnels).
- The barometer detects elevation change (useful for altitude-adjusted distance in hilly terrain).
- The accelerometer in a car shows: smooth low-variance vibration + sustained linear acceleration during speeding up / braking.

The fusion engine serves ALL use cases:
| Mode | Speed Range | Primary Source | Secondary Source | Tertiary |
|------|------------|---------------|-----------------|----------|
| Stationary | 0 km/h | Accelerometer (no movement) | — | — |
| Walking | 3–7 km/h | Pedometer + Stride | GPS (refine) | Accel (instant detect) |
| Running | 7–18 km/h | Pedometer + Stride | GPS (refine) | Accel (instant detect) |
| Cycling | 10–50 km/h | GPS | Accel (vibration pattern) | — |
| Driving | 0–250+ km/h | GPS (authoritative) | Accel (fill GPS gaps) | Gyro (cornering) |
| GPS Tunnel | any | Last GPS + Accel integration | Gyro (heading) | Baro (elevation) |

---

## PART A: New Dependencies

1. **Install `react-native-sensors`**:
   ```bash
   npm install react-native-sensors
   cd ios && pod install && cd ..
   ```
   This provides: accelerometer, gyroscope, magnetometer, barometer subscriptions via RxJS Observables.
   Platforms: Android + iOS.

2. **Add `NSMotionUsageDescription` to `ios/Average/Info.plist`**:
   ```xml
   <key>NSMotionUsageDescription</key>
   <string>Average uses motion sensors to provide instant and accurate speed readings while walking, running, or driving.</string>
   ```
   This is REQUIRED by iOS to access CMPedometer / CMMotionManager. Without it, the app will crash on sensor access.

3. **Add `HIGH_SAMPLING_RATE_SENSORS` permission to `android/app/src/main/AndroidManifest.xml`**:
   ```xml
   <uses-permission android:name="android.permission.HIGH_SAMPLING_RATE_SENSORS" />
   <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
   ```
   `ACTIVITY_RECOGNITION` is required for step detector on Android 10+.
   `HIGH_SAMPLING_RATE_SENSORS` allows >200Hz on Android 12+.

---

## PART B: Native Step Detector Module (Android)

React Native has no built-in step detector. We need a thin native module that bridges Android's `TYPE_STEP_DETECTOR` and `TYPE_STEP_COUNTER` sensor APIs to JavaScript.

4. **Create `android/app/src/main/java/com/average/sensors/StepDetectorModule.kt`**:
   ```kotlin
   // Package: com.average.sensors
   //
   // This Kotlin class implements a React Native NativeModule that:
   //   - Registers an Android SensorEventListener for TYPE_STEP_DETECTOR
   //   - Registers an Android SensorEventListener for TYPE_STEP_COUNTER
   //   - Emits "onStepDetected" events to JS via RCTDeviceEventEmitter
   //     Payload: { timestamp: Long } (SystemClock.elapsedRealtimeNanos converted to ms)
   //   - Emits "onStepCount" events to JS via RCTDeviceEventEmitter
   //     Payload: { steps: Float, timestamp: Long }
   //   - Exposes @ReactMethod start(): starts both listeners with SensorManager.SENSOR_DELAY_FASTEST
   //   - Exposes @ReactMethod stop(): unregisters both listeners
   //   - Exposes @ReactMethod isAvailable(promise: Promise): resolves true/false based on
   //     sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR) != null
   //   - In onSensorChanged for TYPE_STEP_DETECTOR:
   //       val params = Arguments.createMap()
   //       params.putDouble("timestamp", event.timestamp / 1_000_000.0) // nanos to ms
   //       sendEvent("onStepDetected", params)
   //   - In onSensorChanged for TYPE_STEP_COUNTER:
   //       val params = Arguments.createMap()
   //       params.putDouble("steps", event.values[0].toDouble())
   //       params.putDouble("timestamp", event.timestamp / 1_000_000.0)
   //       sendEvent("onStepCount", params)
   //   - getName() returns "StepDetectorModule"
   //   - Handles null sensor gracefully (some devices don't have step detector)
   //   - Cleans up listeners in onCatalystInstanceDestroy()
   ```

5. **Create `android/app/src/main/java/com/average/sensors/StepDetectorPackage.kt`**:
   ```kotlin
   // Package: com.average.sensors
   //
   // Standard ReactPackage implementation:
   //   - createNativeModules() returns listOf(StepDetectorModule(reactContext))
   //   - createViewManagers() returns emptyList()
   ```

6. **Modify `android/app/src/main/java/com/average/MainApplication.kt`**:
   ```kotlin
   // In the getPackages() function, add to the .apply block:
   //   add(com.average.sensors.StepDetectorPackage())
   //
   // Currently line 20-23 reads:
   //   PackageList(this).packages.apply {
   //     // Packages that cannot be autolinked yet can be added manually here
   //   }
   //
   // Change to:
   //   PackageList(this).packages.apply {
   //     add(com.average.sensors.StepDetectorPackage())
   //   }
   ```

---

## PART C: Native Step Detector Module (iOS)

7. **Create `ios/Average/Sensors/StepDetectorModule.swift`**:
   ```swift
   // Uses CoreMotion's CMPedometer (NOT CMMotionManager — that's for raw accel)
   //
   // CMPedometer.startUpdates(from: Date()) gives per-step events with:
   //   - numberOfSteps
   //   - distance (Apple's own estimation — very accurate, uses ML on newer iPhones)
   //   - currentPace (seconds per meter)
   //   - currentCadence (steps per second)
   //
   // This module:
   //   - @objc func start(): starts CMPedometer.startUpdates, emits "onStepDetected" per update
   //     Payload: { timestamp: Double, steps: Int, distance: Double?, pace: Double?, cadence: Double? }
   //     NOTE: iOS CMPedometer fires per-update (roughly per step), not guaranteed per-step
   //   - @objc func stop(): calls CMPedometer.stopUpdates()
   //   - @objc func isAvailable(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock):
   //     resolves CMPedometer.isStepCountingAvailable()
   //   - Module name: "StepDetectorModule" (matches Android)
   //   - Sends events via RCTEventEmitter bridge
   //   - supportedEvents() returns ["onStepDetected", "onStepCount"]
   //
   // IMPORTANT: iOS provides cadence (steps/sec) and pace (sec/meter) directly.
   // These are GOLD — much more accurate than computing from raw timestamps.
   // The JS StepDetectorService should prefer iOS-provided cadence/pace when available.
   ```

8. **Create `ios/Average/Sensors/StepDetectorModule.m`** (Objective-C bridge):
   ```objc
   // Standard RCT_EXTERN_MODULE bridge:
   //   RCT_EXTERN_MODULE(StepDetectorModule, RCTEventEmitter)
   //   RCT_EXTERN_METHOD(start)
   //   RCT_EXTERN_METHOD(stop)
   //   RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
   ```

9. **Ensure `ios/Average/Average-Bridging-Header.h`** includes:
   ```objc
   #import <React/RCTBridgeModule.h>
   #import <React/RCTEventEmitter.h>
   ```

---

## PART D: TypeScript Sensor Services

10. **Create `src/services/sensors/StepDetectorService.ts`**:
    ```typescript
    // Wraps the native StepDetectorModule with a clean TypeScript API
    //
    // Uses NativeModules.StepDetectorModule and NativeEventEmitter
    //
    // Interface:
    //   startListening(onStep: (event: StepEvent) => void): void
    //   stopListening(): void
    //   isAvailable(): Promise<boolean>
    //   getStepFrequency(): number        // steps per second, from sliding window
    //   getEstimatedSpeed(): number        // m/s, from step frequency × adaptive stride
    //   getCadence(): number | null        // iOS-provided cadence if available
    //   getPace(): number | null           // iOS-provided pace (sec/m) if available
    //
    // StepEvent: { timestamp: number; cadence?: number; pace?: number; distance?: number }
    //
    // Internal state:
    //   - stepTimestamps: number[] — circular buffer of last 10 step timestamps
    //   - iosCadence: number | null — latest CMPedometer cadence (iOS only, steps/sec)
    //   - iosPace: number | null — latest CMPedometer pace (iOS only, sec/meter)
    //
    // Step frequency calculation:
    //   - If iosCadence is available (iOS), return iosCadence directly (it's ML-refined, very accurate)
    //   - Otherwise (Android): maintain circular buffer of last 10 step timestamps
    //     stepFrequency = (bufferSize - 1) / ((lastTimestamp - firstTimestamp) / 1000)
    //     If buffer has < 3 steps → return 0
    //     If time since last step > 2 seconds → return 0 (user stopped)
    //
    // Speed estimation from steps:
    //   - If iosPace is available: speed = 1 / iosPace (pace is sec/meter, speed is m/s)
    //   - Otherwise: speed = stepFrequency × adaptiveStrideLength
    //     Stride length model:
    //       stepFreq <= 1.5 steps/sec → stride = 0.60m (slow walk)
    //       stepFreq 1.5–2.2 steps/sec → stride = 0.60 + (freq - 1.5) / (2.2 - 1.5) × 0.15 → 0.60–0.75m (normal walk)
    //       stepFreq 2.2–2.8 steps/sec → stride = 0.75 + (freq - 2.2) / (2.8 - 2.2) × 0.20 → 0.75–0.95m (fast walk / jog)
    //       stepFreq 2.8–3.5 steps/sec → stride = 0.95 + (freq - 2.8) / (3.5 - 2.8) × 0.35 → 0.95–1.30m (running)
    //       stepFreq > 3.5 steps/sec → stride = 1.30m (sprinting, capped)
    //
    // Graceful degradation: if NativeModules.StepDetectorModule is undefined (e.g. simulator),
    //   isAvailable() returns false, startListening() is a no-op, getEstimatedSpeed() returns 0
    ```

11. **Create `src/services/sensors/AccelerometerService.ts`**:
    ```typescript
    // Uses react-native-sensors accelerometer and gyroscope subscriptions
    //
    // import { accelerometer, gyroscope } from 'react-native-sensors'
    //
    // Provides:
    //   startListening(onData: (data: MotionData) => void): void
    //   stopListening(): void
    //   getCurrentState(): MotionState
    //   getAccelMagnitude(): number
    //   getAccelVariance(): number
    //   getLinearAcceleration(): { x: number, y: number, z: number }
    //
    // MotionState: 'stationary' | 'walking' | 'running' | 'vehicle'
    // MotionData: { state: MotionState, accelVariance: number, magnitude: number, timestamp: number }
    //
    // Internal processing (accelerometer at 50Hz = setUpdateIntervalForType('accelerometer', 20)):
    //
    //   1. GRAVITY REMOVAL:
    //      - Apply low-pass filter to isolate gravity: gravity[i] = 0.8 * gravity[i-1] + 0.2 * accel[i]
    //      - Linear acceleration = accel - gravity
    //      - Magnitude = sqrt(linearX² + linearY² + linearZ²)
    //
    //   2. SLIDING WINDOW:
    //      - Maintain circular buffer of last 100 magnitude values (2 seconds at 50Hz)
    //      - Calculate variance over window: var = avg((x - mean)²)
    //      - Calculate dominant frequency using zero-crossing rate:
    //        zeroCrossings = count of sign changes in (magnitude - mean)
    //        dominantFreq = zeroCrossings / 2 / windowDurationSeconds
    //
    //   3. MOTION CLASSIFICATION:
    //      - 'stationary': variance < 0.08 (gravity-only noise floor)
    //      - 'walking': variance 0.08–0.6 AND dominantFreq 1.2–2.5 Hz (step periodicity)
    //      - 'running': variance 0.6–5.0 AND dominantFreq 2.0–4.0 Hz (faster step periodicity)
    //      - 'vehicle': variance 0.08–1.5 AND dominantFreq < 1.0 Hz (engine vibration, NOT periodic steps)
    //        OR: variance 0.08–0.5 AND sustained linear acceleration > 0.3 m/s² for > 1 second
    //              (smooth acceleration = car speeding up, not footsteps)
    //      - DEBOUNCE: Require 5 consecutive same-state classifications before emitting state change
    //        (5 readings at 50Hz = 100ms debounce — fast enough to feel instant)
    //
    //   4. INITIAL FAST PATH:
    //      - For the first 500ms, use a SHORT window of 25 readings (500ms at 50Hz)
    //      - This allows initial classification within 500ms
    //      - After 500ms, switch to full 100-reading window for stability
    //
    //   5. VEHICLE vs WALKING DISAMBIGUATION (critical for car support):
    //      The challenge: bumpy road in a car can look like walking.
    //      Solution: walking has PERIODIC step impacts with consistent ~0.5s intervals.
    //      Vehicle vibration is RANDOM or high-frequency engine noise.
    //      - Use autocorrelation on the magnitude buffer:
    //        If strong autocorrelation peak at 0.3–0.8 second lag → walking/running (step periodicity)
    //        If no autocorrelation peak OR peak at < 0.1s → vehicle vibration
    //      - Additionally: if StepDetector is firing steps → MUST be on foot (pedometer is hardware-fused,
    //        very reliable). If accelerometer says 'vehicle' but pedometer says steps → trust pedometer.
    //
    // Gyroscope integration (for vehicle dead-reckoning):
    //   - Subscribe to gyroscope at 20Hz (setUpdateIntervalForType('gyroscope', 50))
    //   - Track yaw rate (z-axis rotation in rad/s) — this is the turn rate
    //   - Expose: getYawRate(): number (rad/s)
    //   - Expose: getHeadingDelta(): number (accumulated heading change since last reset, degrees)
    //   - This is used by SensorFusionEngine for GPS-gap dead reckoning in vehicle mode
    //
    // Barometer integration:
    //   - Subscribe to barometer at 1Hz (setUpdateIntervalForType('barometer', 1000))
    //   - Convert pressure to altitude: altitude = 44330 * (1 - (pressure / 1013.25) ^ 0.1903)
    //   - Track altitude changes: expose getAltitudeChange(): number (meters, since last reset)
    //   - This is used for elevation-adjusted distance calculation
    //
    // GRACEFUL DEGRADATION:
    //   - If accelerometer subscription fails → getCurrentState() always returns 'stationary'
    //   - If gyroscope subscription fails → getYawRate() returns 0
    //   - If barometer subscription fails → getAltitudeChange() returns 0
    //   - Log warnings but NEVER crash. The app must always work with GPS alone as fallback.
    ```

---

## PART E: Sensor Fusion Engine — The Brain

12. **Create `src/services/sensors/SensorFusionEngine.ts`**:
    ```typescript
    // The central intelligence that combines ALL sensor data into a single speed estimate.
    //
    // Dependencies:
    //   - GPSService (existing) — provides position, GPS speed, accuracy
    //   - StepDetectorService (new) — provides step frequency, estimated walk/run speed
    //   - AccelerometerService (new) — provides motion state, accel data, gyro yaw, baro altitude
    //   - KalmanFilter (existing) — smooths the fused output
    //   - HaversineCalculator (existing) — distance calculations
    //
    // ═══════════════════════════════════════════════════════════════
    // CORE FUSION ALGORITHM
    // ═══════════════════════════════════════════════════════════════
    //
    // The engine runs a state machine with 5 modes.
    // Mode transitions are driven by the AccelerometerService motion state
    // combined with GPS speed and step detector activity.
    //
    // ┌──────────────┐
    // │  STATIONARY   │ ← accel says stationary for 1.5s AND no steps for 2s AND GPS speed < 0.3 m/s
    // └──────┬───────┘
    //        │ accel detects movement OR step detected
    //        ▼
    // ┌──────────────┐
    // │   WALKING     │ ← accel says walking AND steps detected AND GPS speed < 3 m/s
    // └──────┬───────┘
    //        │ step frequency > 2.5/s OR GPS speed > 3 m/s
    //        ▼
    // ┌──────────────┐
    // │   RUNNING     │ ← accel says running AND steps detected AND GPS speed < 6 m/s
    // └──────┬───────┘
    //        │ GPS speed > 6 m/s (21.6 km/h) AND no steps for 3s (or accel says vehicle)
    //        ▼
    // ┌──────────────┐
    // │   VEHICLE     │ ← GPS speed > 6 m/s AND (accel says vehicle OR no steps for 5s)
    // └──────┬───────┘
    //        │ GPS lost for > 3s (tunnel, parking garage)
    //        ▼
    // ┌──────────────┐
    // │  GPS_DEAD_    │ ← GPS signal lost while in vehicle mode
    // │  RECKONING    │   Uses last GPS speed + accel integration + gyro heading
    // └──────────────┘
    //
    // ═══════════════════════════════════════════════════════════════
    // SPEED CALCULATION PER MODE
    // ═══════════════════════════════════════════════════════════════
    //
    // STATIONARY MODE:
    //   - Output: 0 m/s always
    //   - Kalman filter: reset to 0
    //   - No distance accumulation
    //   - Entry criteria: accel variance < 0.08 for 1.5 seconds (75 readings at 50Hz)
    //                     AND no step events for 2 seconds
    //                     AND (GPS speed < 0.3 m/s OR GPS not available)
    //   - Exit criteria: accel variance > 0.08 OR step detected
    //                    (exit is INSTANT — one reading is enough)
    //
    // WALKING MODE:
    //   - Phase 1 (0–300ms, before steps are counted):
    //     - Accel just detected motion → output initial estimate: 1.2 m/s (4.3 km/h)
    //     - Confidence: 'low'
    //     - Source: 'accelerometer'
    //   - Phase 2 (300ms–2s, 3+ steps collected):
    //     - speed = StepDetectorService.getEstimatedSpeed()
    //     - Weighted blend: 0.8 × stepSpeed + 0.2 × gpsSpeed (if GPS available and accuracy < 15m)
    //     - If GPS not available or accuracy > 15m: use 1.0 × stepSpeed
    //     - Confidence: 'medium'
    //     - Source: 'pedometer'
    //   - Phase 3 (2s+, GPS has warmed up):
    //     - Weighted blend: 0.6 × stepSpeed + 0.4 × gpsSpeed
    //     - GPS weight increases with accuracy:
    //       accuracy < 5m → GPS weight = 0.5 (very good GPS, trust it more)
    //       accuracy 5-10m → GPS weight = 0.4
    //       accuracy 10-15m → GPS weight = 0.3
    //       accuracy > 15m → GPS weight = 0.1 (bad GPS, trust pedometer)
    //     - Confidence: 'high'
    //     - Source: 'fused'
    //
    // RUNNING MODE:
    //   - Same phased approach as walking but:
    //     Phase 1 initial estimate: 2.8 m/s (10 km/h)
    //     Phase 3 GPS weight is higher: 0.5 × stepSpeed + 0.5 × gpsSpeed
    //     (GPS is more accurate at running speed than walking speed)
    //
    // VEHICLE MODE (THE CRITICAL ONE):
    //   - GPS is AUTHORITATIVE. Pedometer output is IGNORED (weight = 0).
    //   - speed = gpsSpeed (direct from GPS hardware, no step calculation)
    //   - Dead zone: if GPS speed < 0.5 m/s → output 0 (GPS jitter while stopped at red light)
    //   - GPS accuracy gating: only use GPS speed if accuracy < 30m
    //     (looser than walking because at 100 km/h, GPS is very accurate from Doppler effect)
    //   - Confidence: 'high' (GPS at vehicle speed is extremely accurate due to Doppler shift)
    //   - Source: 'gps'
    //   - Kalman filter parameters for vehicle: processNoise = 0.3, measurementNoise = 0.1
    //     (high processNoise because speed changes rapidly during acceleration/braking)
    //   - SMOOTH STOP DETECTION in vehicle mode:
    //     If speed drops below 2 m/s for > 3 seconds → transition to STATIONARY
    //     (handles: stopped at traffic light, parked car)
    //     If speed drops below 2 m/s but accel shows vibration → stay in VEHICLE (engine idle)
    //
    // GPS_DEAD_RECKONING MODE (GPS tunnel, underground parking):
    //   - Entry: GPS signal lost for > 3 consecutive seconds while in VEHICLE mode
    //   - Speed estimation:
    //     lastKnownGpsSpeed + integrate(linearAcceleration × dt)
    //     Specifically: v(t) = v(t-1) + accelForward × dt
    //     where accelForward is the component of linear acceleration along the direction of travel
    //     (requires projecting accel vector onto heading, using gyroscope for heading tracking)
    //   - Heading tracking: integrate gyroscope yaw rate
    //     heading(t) = heading(t-1) + yawRate × dt
    //   - Distance in DR mode:
    //     distance += speed × dt
    //   - DRIFT PROTECTION: DR mode speed decays by 2% per second toward 0
    //     (prevents runaway integration errors — if GPS is out for 30s, DR has decayed enough
    //     that re-acquiring GPS won't cause a jarring jump)
    //   - Maximum DR duration: 60 seconds. After that, speed fades to 0.
    //   - Exit: GPS signal re-acquired → snap back to GPS speed (smoothed over 1 second)
    //   - Confidence: 'low' (DR is inherently inaccurate, user should know)
    //   - Source: 'dead_reckoning'
    //
    // ═══════════════════════════════════════════════════════════════
    // ADAPTIVE KALMAN FILTER
    // ═══════════════════════════════════════════════════════════════
    //
    // The Kalman filter's noise parameters change based on current state:
    //
    // | Situation | processNoise | measurementNoise | Why |
    // |-----------|-------------|-----------------|-----|
    // | Stationary | 0.01 | 0.5 | Very stable, reject noise |
    // | Just started moving (state changed < 1s ago) | 0.8 | 0.15 | ADAPT FAST to new speed |
    // | Steady walking (state stable > 3s) | 0.05 | 0.2 | Smooth output |
    // | Steady running | 0.08 | 0.2 | Slightly more responsive |
    // | Vehicle accelerating (accel magnitude > 1.0 m/s²) | 0.5 | 0.1 | Speed changing fast |
    // | Vehicle cruising (accel magnitude < 0.3 m/s²) | 0.03 | 0.1 | Very smooth |
    // | Vehicle braking (accel magnitude > 1.5 m/s²) | 0.6 | 0.1 | Speed dropping fast |
    // | GPS dead reckoning | 0.3 | 0.8 | Don't trust DR much |
    // | Mode transition (any) | 0.5 | 0.2 | Quick adaptation |
    //
    // ═══════════════════════════════════════════════════════════════
    // DISTANCE CALCULATION
    // ═══════════════════════════════════════════════════════════════
    //
    // - In WALKING/RUNNING mode with iOS: prefer CMPedometer.distance (Apple's ML-based, very accurate)
    // - In WALKING/RUNNING mode on Android: distance += stepCount × strideLength
    // - In VEHICLE mode: distance = haversineDistance between consecutive GPS positions
    // - In GPS_DEAD_RECKONING: distance += fusedSpeed × dt
    // - Barometer altitude correction: if altitude changed > 2m between readings,
    //   adjust horizontal distance: horizontalDist = sqrt(totalDist² - altitudeChange²)
    //   (Pythagoras — the GPS distance includes vertical component on hills)
    //
    // ═══════════════════════════════════════════════════════════════
    // PUBLIC INTERFACE
    // ═══════════════════════════════════════════════════════════════
    //
    // FusionSpeedData extends existing SpeedData {
    //   currentSpeed: number;      // m/s, fused
    //   averageSpeed: number;
    //   maxSpeed: number;
    //   totalDistance: number;      // meters
    //   tripDuration: number;      // seconds
    //   speedHistory: number[];    // last 60 fused readings
    //   // NEW fields:
    //   confidence: 'low' | 'medium' | 'high';
    //   primarySource: 'accelerometer' | 'pedometer' | 'gps' | 'fused' | 'dead_reckoning';
    //   motionState: 'stationary' | 'walking' | 'running' | 'vehicle' | 'gps_dead_reckoning';
    //   gpsAccuracy: number | null;    // meters, null if no GPS
    //   stepFrequency: number;         // steps/sec, 0 if not walking/running
    //   sensorHealth: {                // for UI diagnostics
    //     gps: boolean;
    //     accelerometer: boolean;
    //     gyroscope: boolean;
    //     pedometer: boolean;
    //     barometer: boolean;
    //   };
    // }
    //
    // Class SensorFusionEngine:
    //   start(callback: (data: FusionSpeedData) => void): void
    //     - Starts GPS (via GPSService), Step Detector, Accelerometer, Gyroscope, Barometer
    //     - GPS callback feeds into fusion algorithm
    //     - Step callback feeds into fusion algorithm
    //     - Accel/gyro/baro callbacks feed into AccelerometerService
    //     - Fusion runs on every GPS update (~2Hz) AND every accel classification change
    //     - Timer emits fused data at minimum 2Hz (every 500ms) even if GPS hasn't updated
    //       (so accel-based speed estimates during Phase 1 reach the UI fast)
    //
    //   stop(): FusionTripSummary
    //     - Stops all sensors
    //     - Returns trip summary with fusion metadata
    //
    //   pause(): void / resume(): void
    //     - Pauses/resumes all processing (sensors keep running but data is discarded)
    //
    //   getMotionState(): MotionState
    //   getSensorHealth(): SensorHealth
    //   isGpsAvailable(): boolean
    ```

---

## PART F: Modify Existing SpeedEngine to Delegate to Fusion

13. **Modify `src/services/gps/SpeedEngine.ts`**:
    ```
    The SpeedEngine becomes a THIN WRAPPER around SensorFusionEngine.
    This preserves the existing API that useSpeed.ts depends on (start/stop/pause/resume/getCurrentData).
    
    Changes:
    
    a) Import SensorFusionEngine
    
    b) Replace `private kalmanFilter: KalmanFilter` with `private fusionEngine: SensorFusionEngine`
    
    c) constructor(): create new SensorFusionEngine() instead of new KalmanFilter()
    
    d) start(callback):
       - Call fusionEngine.start() instead of gpsService.startTracking()
       - The fusionEngine handles GPS, sensors, everything internally
       - The callback receives FusionSpeedData which extends SpeedData
       - Forward the data to updateCallback as before
       - KEEP the durationInterval timer
    
    e) stop(): 
       - Call fusionEngine.stop() instead of gpsService.stopTracking()
       - Return trip summary as before
    
    f) pause() / resume():
       - Delegate to fusionEngine.pause() / fusionEngine.resume()
    
    g) REMOVE processPosition() entirely
       - The SensorFusionEngine handles ALL position processing internally
    
    h) REMOVE all stationary detection fields (stationaryCount, SPEED_DEAD_ZONE, etc.)
       - SensorFusionEngine handles this
    
    i) KEEP getCurrentData() — but extend it to include fusion metadata:
       - Add confidence, motionState, primarySource, gpsAccuracy, stepFrequency, sensorHealth
       - These come from fusionEngine
    
    j) KEEP SpeedData interface but extend it:
       export interface SpeedData {
         currentSpeed: number;
         averageSpeed: number;
         maxSpeed: number;
         totalDistance: number;
         tripDuration: number;
         speedHistory: number[];
         // NEW:
         confidence: 'low' | 'medium' | 'high';
         primarySource: string;
         motionState: string;
         gpsAccuracy: number | null;
         stepFrequency: number;
         sensorHealth: { gps: boolean; accelerometer: boolean; gyroscope: boolean; pedometer: boolean; barometer: boolean };
       }
    
    k) KEEP all unit conversion functions (msToKmh, msToMph, etc.) — unchanged
    l) KEEP TripSummary interface — extend with motionState breakdown (% time in each mode)
    ```

14. **Modify `src/services/gps/KalmanFilter.ts`** — Add adaptive setters:
    ```typescript
    // Add two new methods:
    //   setProcessNoise(noise: number): void { this.processNoise = noise; }
    //   setMeasurementNoise(noise: number): void { this.measurementNoise = noise; }
    //
    // These are called by SensorFusionEngine to dynamically tune the filter
    // based on current motion state and driving conditions.
    //
    // DO NOT change the existing constructor defaults or filter() method.
    // The new setters are additive — they don't break any existing behavior.
    ```

---

## PART G: Modify GPS Service for Faster Updates

15. **Modify `src/services/gps/GPSService.ts`**:
    ```typescript
    // Change watchPosition config (lines 60-67):
    //   interval: 500        (was 1000 — now 2Hz GPS for faster responsiveness)
    //   fastestInterval: 250  (was 500 — allows 4Hz bursts from FusedLocationProvider)
    //
    // Extend GPSPosition interface:
    //   bearing: number;          // degrees (0-360), -1 if unavailable
    //   altitudeAccuracy: number; // meters, -1 if unavailable
    //
    // In the watchPosition success callback, add:
    //   bearing: position.coords.heading ?? -1,
    //   altitudeAccuracy: (position.coords as any).altitudeAccuracy ?? -1,
    //
    // KEEP everything else unchanged.
    ```

---

## PART H: Update Zustand Store

16. **Modify `src/store/useSpeedStore.ts`**:
    ```typescript
    // Add new fields to SpeedState interface:
    //   confidence: 'low' | 'medium' | 'high';
    //   motionState: 'stationary' | 'walking' | 'running' | 'vehicle' | 'gps_dead_reckoning';
    //   primarySource: string;
    //   gpsAccuracy: number | null;
    //   stepFrequency: number;
    //   sensorHealth: { gps: boolean; accelerometer: boolean; gyroscope: boolean; pedometer: boolean; barometer: boolean };
    //
    // Add defaults:
    //   confidence: 'low',
    //   motionState: 'stationary',
    //   primarySource: 'gps',
    //   gpsAccuracy: null,
    //   stepFrequency: 0,
    //   sensorHealth: { gps: false, accelerometer: false, gyroscope: false, pedometer: false, barometer: false },
    //
    // Modify updateSpeed() to accept and store the new fields
    //
    // Modify reset() to reset all new fields to defaults
    ```

---

## PART I: Update useSpeed Hook

17. **Modify `src/hooks/useSpeed.ts`**:
    ```typescript
    // Destructure and return the new fields from useSpeedStore:
    //   confidence, motionState, primarySource, gpsAccuracy, stepFrequency, sensorHealth
    //
    // These are passed through to the UI layer without conversion.
    //
    // KEEP all existing return values unchanged.
    ```

---

## PART J: Update Dashboard UI

18. **Modify `src/screens/DashboardScreen.tsx`**:
    ```typescript
    // a) Destructure new fields from useSpeed():
    //    { confidence, motionState, primarySource, gpsAccuracy, sensorHealth }
    //
    // b) Replace the static GPSQualityIndicator with the new SensorStatusIndicator:
    //    <SensorStatusIndicator
    //      gpsAccuracy={gpsAccuracy}
    //      confidence={confidence}
    //      motionState={motionState}
    //      primarySource={primarySource}
    //      sensorHealth={sensorHealth}
    //    />
    //
    // c) Add a subtle motion state label below the timer:
    //    When walking: small text "🚶 Walking" in COLORS.textSecondary
    //    When running: "🏃 Running"
    //    When driving: "🚗 Driving"  
    //    When stationary: nothing (hide label)
    //    When dead reckoning: "📡 Estimated" in COLORS.speedModerate (yellow, to indicate reduced accuracy)
    //    Use Ionicons instead of emoji if the icon replacement from Task 6 is in place.
    //
    // d) KEEP all other UI unchanged. The speed display, gauge, metric cards, buttons — all the same.
    ```

19. **Create `src/components/SensorStatusIndicator.tsx`**:
    ```typescript
    // Replaces GPSQualityIndicator with a richer multi-sensor status display.
    //
    // Layout: Row of small indicators in the top bar
    //
    // GPS signal bars (same as existing GPSQualityIndicator):
    //   - 4 bars based on accuracy: <5m=4bars, <10m=3bars, <20m=2bars, <50m=1bar, else 0
    //   - Color: green if good, yellow if fair, red if poor
    //
    // Sensor dots (new, to the right of GPS bars):
    //   - Small 4px circles for each active sensor
    //   - Pedometer dot: shown only when motionState is walking/running AND sensorHealth.pedometer
    //   - Accel dot: shown always when sensorHealth.accelerometer (it's always on during tracking)
    //   - Color: green if active, dark gray if inactive
    //
    // Confidence indicator (new, rightmost):
    //   - Single 6px circle: green='high', yellow='medium', red='low'
    //   - Subtle glow animation when confidence is 'high' (Reanimated pulse)
    //
    // Long press: show expanded debug info (same as existing — accuracy in meters + primary source name)
    //
    // Props: { gpsAccuracy, confidence, motionState, primarySource, sensorHealth }
    ```

20. **Modify `src/screens/HUDScreen.tsx`**:
    ```typescript
    // The HUD screen should also show motion state when in dead reckoning.
    // When primarySource is 'dead_reckoning', show a small "EST" label below the speed
    // in yellow (COLORS.speedModerate) to indicate the speed is estimated.
    // Otherwise, no changes — the HUD uses useSpeedStore directly, which now has fusion data.
    ```

---

## PART K: Update Test Infrastructure

21. **Modify `jest.setup.ts`** — Add mocks for new modules:
    ```typescript
    // Mock react-native-sensors
    jest.mock('react-native-sensors', () => ({
      accelerometer: { subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) },
      gyroscope: { subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) },
      barometer: { subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) },
      setUpdateIntervalForType: jest.fn(),
      SensorTypes: { accelerometer: 'accelerometer', gyroscope: 'gyroscope', barometer: 'barometer' },
    }));
    
    // Mock StepDetectorModule native module
    // Add to the existing react-native mock block:
    //   rn.NativeModules.StepDetectorModule = {
    //     start: jest.fn(),
    //     stop: jest.fn(),
    //     isAvailable: jest.fn(() => Promise.resolve(true)),
    //   };
    ```

---

## PART L: Unit Tests for All New Services

22. **Create `__tests__/unit/services/sensors/StepDetectorService.test.ts`**:
    ```typescript
    // ✅ isAvailable() returns true when native module exists
    // ✅ isAvailable() returns false when native module is undefined (simulator)
    // ✅ startListening() subscribes to native events
    // ✅ stopListening() removes native event subscription
    // ✅ getStepFrequency() returns 0 with less than 3 steps
    // ✅ getStepFrequency() calculates correctly: 5 steps over 2.5 seconds → 1.6 steps/sec
    // ✅ getStepFrequency() returns 0 when last step was >2 seconds ago
    // ✅ Circular buffer drops timestamps beyond 10 entries
    // ✅ getEstimatedSpeed() for slow walk (1.5 steps/sec) ≈ 0.90 m/s
    // ✅ getEstimatedSpeed() for normal walk (1.8 steps/sec) ≈ 1.18 m/s
    // ✅ getEstimatedSpeed() for fast walk (2.2 steps/sec) ≈ 1.65 m/s
    // ✅ getEstimatedSpeed() for running (3.0 steps/sec) ≈ 3.09 m/s
    // ✅ Prefers iOS cadence when available over manual calculation
    // ✅ Prefers iOS pace for speed when available over stride model
    // ✅ Graceful degradation: all methods return 0 when native module unavailable
    ```

23. **Create `__tests__/unit/services/sensors/AccelerometerService.test.ts`**:
    ```typescript
    // ✅ startListening() subscribes to accelerometer and gyroscope
    // ✅ stopListening() unsubscribes from all sensors
    // ✅ Gravity removal: constant 9.81 input → linear acceleration ≈ 0
    // ✅ Classifies low variance (<0.08) as 'stationary'
    // ✅ Classifies periodic variance (0.08–0.6) with step-frequency peaks as 'walking'
    // ✅ Classifies high periodic variance (0.6–5.0) as 'running'
    // ✅ Classifies smooth low-variance (0.08–0.5) with no periodicity as 'vehicle'
    // ✅ Debounce: single anomalous reading doesn't change state
    // ✅ Debounce: 5 consecutive same readings DO change state
    // ✅ getYawRate() returns gyroscope z-axis rotation rate
    // ✅ getAltitudeChange() calculates altitude from barometric pressure
    // ✅ Graceful degradation: sensor failure → safe defaults, no crash
    // ✅ Initial fast path: classification available within 25 readings (500ms)
    ```

24. **Create `__tests__/unit/services/sensors/SensorFusionEngine.test.ts`**:
    ```typescript
    // === STATIONARY MODE ===
    // ✅ Outputs 0 speed when all sensors report stationary
    // ✅ Transitions from stationary to walking on first step detect
    // ✅ Transitions from stationary to walking on accel variance increase
    //
    // === WALKING MODE ===
    // ✅ Phase 1: Reports ~1.2 m/s within 300ms of movement detection
    // ✅ Phase 2: Uses step frequency × stride after 3+ steps
    // ✅ Phase 3: Blends pedometer (60%) + GPS (40%) after GPS warm-up
    // ✅ GPS accuracy affects blend weights (bad GPS → more pedometer weight)
    //
    // === RUNNING MODE ===
    // ✅ Phase 1 initial estimate: ~2.8 m/s
    // ✅ Transition from walking when step frequency > 2.5/s
    //
    // === VEHICLE MODE (CRITICAL) ===
    // ✅ Enters vehicle mode when GPS speed > 6 m/s AND no steps for 5s
    // ✅ GPS is sole speed source in vehicle mode (pedometer weight = 0)
    // ✅ Handles 0–250 km/h range without issues
    // ✅ Dead zone at < 0.5 m/s GPS speed → outputs 0 (red light stop)
    // ✅ Smooth stop at traffic light: speed < 2 m/s for 3s → stationary
    // ✅ Engine idle: speed < 2 m/s but accel vibration → stays in vehicle
    // ✅ Kalman processNoise = 0.5 during acceleration, 0.03 during cruise
    // ✅ GPS accuracy gating at 30m (looser than walking mode)
    //
    // === GPS DEAD RECKONING ===
    // ✅ Enters DR when GPS lost for 3s while in vehicle mode
    // ✅ Uses last GPS speed + acceleration integration
    // ✅ Speed decays 2% per second
    // ✅ Maximum DR duration: 60 seconds then speed → 0
    // ✅ GPS re-acquisition: smooth transition back to GPS speed
    // ✅ Confidence is 'low' during DR
    //
    // === TRANSITIONS ===
    // ✅ Walking → Vehicle: when GPS consistently > 6 m/s (gets in car while app running)
    // ✅ Vehicle → Stationary: when speed < 2 m/s for 3+ seconds
    // ✅ Vehicle → Walking: when speed drops < 3 m/s AND steps detected (parked and walking)
    // ✅ Mode transitions trigger adaptive Kalman parameter change
    //
    // === DISTANCE ===
    // ✅ Walking distance uses step count × stride (Android) or CMPedometer distance (iOS)
    // ✅ Vehicle distance uses Haversine between GPS positions
    // ✅ Barometer altitude correction applied when altitude change > 2m
    //
    // === SENSOR HEALTH ===
    // ✅ sensorHealth reports true/false for each sensor
    // ✅ If pedometer unavailable, falls back to accel + GPS only
    // ✅ If accelerometer unavailable, falls back to GPS only (degraded, still works)
    // ✅ If all sensors fail, pure GPS mode still functions (backward compatible)
    //
    // === EDGE CASES ===
    // ✅ App starts in vehicle (user opens app while driving): GPS provides speed immediately,
    //    no pedometer confusion because no steps are detected
    // ✅ Phone in pocket vs hand: accelerometer patterns differ but step detector is hardware-fused
    //    and works regardless of phone orientation
    // ✅ Bumpy road doesn't trigger walking mode (autocorrelation check)
    ```

25. **Update `__tests__/unit/services/gps/SpeedEngine.test.ts`**:
    ```typescript
    // ✅ Existing tests updated to reflect SpeedEngine now delegates to SensorFusionEngine
    // ✅ start() initializes SensorFusionEngine
    // ✅ stop() stops SensorFusionEngine and returns summary
    // ✅ pause()/resume() delegates to SensorFusionEngine
    // ✅ getCurrentData() returns extended SpeedData with fusion fields
    // ✅ reset() resets SensorFusionEngine
    // ✅ Unit conversion functions unchanged (msToKmh, msToMph, etc.)
    ```

26. **Update `__tests__/unit/services/gps/KalmanFilter.test.ts`**:
    ```typescript
    // ✅ Existing tests still pass
    // ✅ setProcessNoise() updates processNoise
    // ✅ setMeasurementNoise() updates measurementNoise
    // ✅ Higher processNoise → faster convergence to new measurements
    // ✅ Lower processNoise → smoother, slower convergence
    ```

27. **Create `__tests__/components/SensorStatusIndicator.test.tsx`**:
    ```typescript
    // ✅ Renders GPS bars based on accuracy
    // ✅ Renders sensor dots for active sensors
    // ✅ Confidence dot is green for 'high', yellow for 'medium', red for 'low'
    // ✅ Pedometer dot only shown during walking/running
    // ✅ Long press reveals accuracy text and source name
    // ✅ Renders without crash when all sensors are unavailable
    ```

28. **Update `__tests__/integration/speed-tracking-flow.test.tsx`**:
    ```typescript
    // ✅ (Existing tests updated for new SpeedData shape)
    // ✅ Simulated walking trip: steps + GPS → speed shows within 500ms
    // ✅ Simulated driving trip: GPS only → speed is accurate and smooth
    // ✅ Simulated GPS loss during driving → dead reckoning maintains speed estimate
    // ✅ Mode transitions during trip: walk to car to walk
    ```

---

## PART M: Update whathasbeenimplemented.md

After ALL changes are complete, add a new section documenting:
1. Full sensor fusion architecture and the 5-mode state machine
2. Why vehicle mode uses GPS exclusively (pedometer has no steps in a car)
3. Dead reckoning algorithm and its 60-second limit
4. Adaptive Kalman filter parameter table
5. New native modules: StepDetectorModule (Android Kotlin + iOS Swift)
6. New TypeScript services: StepDetectorService, AccelerometerService, SensorFusionEngine
7. New UI component: SensorStatusIndicator
8. Modified files: SpeedEngine, KalmanFilter, GPSService, useSpeedStore, useSpeed, DashboardScreen, HUDScreen
9. New dependencies: react-native-sensors
10. New permissions: NSMotionUsageDescription (iOS), ACTIVITY_RECOGNITION + HIGH_SAMPLING_RATE_SENSORS (Android)
11. Test count summary
12. Backward compatibility: if ALL sensors fail, app degrades to pure GPS mode (same as before Task 7)

---

## FILE CHANGE SUMMARY

**Files to CREATE:**
- `android/app/src/main/java/com/average/sensors/StepDetectorModule.kt`
- `android/app/src/main/java/com/average/sensors/StepDetectorPackage.kt`
- `ios/Average/Sensors/StepDetectorModule.swift`
- `ios/Average/Sensors/StepDetectorModule.m`
- `src/services/sensors/StepDetectorService.ts`
- `src/services/sensors/AccelerometerService.ts`
- `src/services/sensors/SensorFusionEngine.ts`
- `src/components/SensorStatusIndicator.tsx`
- `__tests__/unit/services/sensors/StepDetectorService.test.ts`
- `__tests__/unit/services/sensors/AccelerometerService.test.ts`
- `__tests__/unit/services/sensors/SensorFusionEngine.test.ts`
- `__tests__/components/SensorStatusIndicator.test.tsx`

**Files to MODIFY:**
- `android/app/src/main/java/com/average/MainApplication.kt` — register StepDetectorPackage
- `android/app/src/main/AndroidManifest.xml` — add ACTIVITY_RECOGNITION + HIGH_SAMPLING_RATE_SENSORS
- `ios/Average/Info.plist` — add NSMotionUsageDescription
- `ios/Average/Average-Bridging-Header.h` — ensure RCTEventEmitter import
- `src/services/gps/SpeedEngine.ts` — delegate to SensorFusionEngine, extend SpeedData interface
- `src/services/gps/KalmanFilter.ts` — add setProcessNoise/setMeasurementNoise
- `src/services/gps/GPSService.ts` — faster intervals, extended GPSPosition (bearing, altitudeAccuracy)
- `src/store/useSpeedStore.ts` — add fusion metadata fields
- `src/hooks/useSpeed.ts` — expose fusion metadata
- `src/screens/DashboardScreen.tsx` — use SensorStatusIndicator, show motion state
- `src/screens/HUDScreen.tsx` — show "EST" during dead reckoning
- `jest.setup.ts` — add mocks for react-native-sensors and StepDetectorModule
- `__tests__/unit/services/gps/SpeedEngine.test.ts` — update for fusion delegation
- `__tests__/unit/services/gps/KalmanFilter.test.ts` — add adaptive setter tests
- `__tests__/integration/speed-tracking-flow.test.tsx` — add sensor fusion integration tests
- `whathasbeenimplemented.md` — document everything
- `package.json` — add react-native-sensors

**Dependencies to ADD:**
- `react-native-sensors` (accelerometer, gyroscope, barometer)

**NO new dependencies for pedometer** — uses custom native module (avoids unreliable third-party pedometer packages)

---

## EXPECTED PERFORMANCE AFTER IMPLEMENTATION

| Scenario | Before (GPS only) | After (Full Sensor Fusion) |
|----------|-------------------|---------------------------|
| Start walking from still | 4-6 seconds of 0 km/h | Speed appears in < 0.5s |
| Steady walking (5 km/h) | Jumps 0-7 km/h | Smooth 4.5-5.5 km/h |
| Start running | 3-4 second lag | < 0.5s response |
| Walk → get in car | N/A (same GPS) | Smooth transition, GPS takes over at ~15 km/h |
| Driving 100 km/h | Works (GPS only) | Works (GPS authoritative, smoother via Kalman) |
| Stopped at red light | Shows 2 km/h (GPS jitter) | Shows 0 km/h (dead zone + stationary detection) |
| GPS tunnel while driving | Speed drops to 0 | Dead reckoning maintains estimate for 60s |
| Driving on bumpy road | N/A | Correctly stays in vehicle mode (not walking) |
| Car → park → walk | N/A | Smooth vehicle→stationary→walking transition |
| Indoors / no GPS | Shows 0, broken | Pedometer + accel give accurate walking speed |
| Phone in pocket | Same GPS | Step detector works regardless of orientation |