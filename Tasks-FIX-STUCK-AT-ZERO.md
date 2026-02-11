# COPILOT AGENT TASK: Fix Stuck at 0 km/h — GPS-First Architecture

## ANTI-HALLUCINATION PROTOCOL
Before writing ANY code, READ these files in full:
1. `src/services/sensors/SensorFusionEngine.ts` — the brain (655 lines)
2. `src/services/sensors/AccelerometerService.ts` — accel/gyro/baro (301 lines)
3. `src/services/sensors/StepDetectorService.ts` — pedometer (192 lines)
4. `src/services/gps/GPSService.ts` — GPS provider (88 lines)
5. `src/services/gps/KalmanFilter.ts` — Kalman filter (52 lines)
6. `src/services/gps/SpeedEngine.ts` — thin wrapper (115 lines)
7. `src/hooks/useSpeed.ts` — hook (112 lines)
8. `src/store/useSpeedStore.ts` — Zustand store
9. `android/app/src/main/java/com/average/sensors/StepDetectorModule.kt` — native step module
10. `whathasbeenimplemented.md` — write your changes here when done

Do NOT recreate any file from scratch. Only MODIFY the specific lines described.

---

## BUG 1: StepDetectorModule Android — Wrong Timestamp Domain (CRITICAL)

**File:** `android/app/src/main/java/com/average/sensors/StepDetectorModule.kt`

**The bug:** Line 59 sends `event.timestamp / 1_000_000.0` — this is `SystemClock.elapsedRealtimeNanos / 1_000_000` = milliseconds since boot. But the JS side (`SensorFusionEngine.ts` line 103) stores this in `this.lastStepTime` and compares it against `Date.now()` (Unix epoch ms). The time domains don't match, so `timeSinceLastStep` is always billions of milliseconds, and the engine thinks no step was ever detected.

**Fix:** Change both `onStepDetected` and `onStepCount` events to use `System.currentTimeMillis()` instead of `event.timestamp / 1_000_000.0`.

Replace line 58-60:
```kotlin
val params = Arguments.createMap().apply {
    putDouble("timestamp", event.timestamp / 1_000_000.0)
}
```
With:
```kotlin
val params = Arguments.createMap().apply {
    putDouble("timestamp", System.currentTimeMillis().toDouble())
}
```

AND replace line 64-66:
```kotlin
val params = Arguments.createMap().apply {
    putDouble("steps", event.values[0].toDouble())
    putDouble("timestamp", event.timestamp / 1_000_000.0)
}
```
With:
```kotlin
val params = Arguments.createMap().apply {
    putDouble("steps", event.values[0].toDouble())
    putDouble("timestamp", System.currentTimeMillis().toDouble())
}
```

This ensures `StepDetectorService.stepTimestamps[]` contains epoch-ms values that are comparable to `Date.now()`.

---

## BUG 2: AccelerometerService — Silent Failure With No Recovery

**File:** `src/services/sensors/AccelerometerService.ts`

**The bug:** Lines 58-101 use a try/catch that swallows ALL errors. If `react-native-sensors` fails to initialize (common on many Android builds where the native module isn't properly linked, or the RxJS Observable throws on subscribe), the catch block runs and ALL sensors are silently dead. `accelActive`, `gyroActive`, `baroActive` remain `false`. `currentState` stays `'stationary'` forever.

There's also NO logging, so you can never tell if sensors are working or not.

**Fix:** Add `console.warn` logging in the catch block AND in each individual sensor error handler, AND mark sensors as explicitly failed:

Replace lines 58-101:
```typescript
try {
  const sensors = require('react-native-sensors');
  const { accelerometer, gyroscope, barometer, setUpdateIntervalForType } = sensors;

  // Set update intervals
  setUpdateIntervalForType('accelerometer', 20); // 50Hz
  setUpdateIntervalForType('gyroscope', 50); // 20Hz
  setUpdateIntervalForType('barometer', 1000); // 1Hz

  // Accelerometer subscription
  this.accelSubscription = accelerometer.subscribe({
    next: (data: { x: number; y: number; z: number; timestamp: number }) => {
      this.processAccelerometer(data);
    },
    error: () => {
      this.accelActive = false;
    },
  });
  this.accelActive = true;

  // Gyroscope subscription
  this.gyroSubscription = gyroscope.subscribe({
    next: (data: { x: number; y: number; z: number; timestamp: number }) => {
      this.processGyroscope(data);
    },
    error: () => {
      this.gyroActive = false;
    },
  });
  this.gyroActive = true;

  // Barometer subscription
  this.baroSubscription = barometer.subscribe({
    next: (data: { pressure: number }) => {
      this.processBarometer(data);
    },
    error: () => {
      this.baroActive = false;
    },
  });
  this.baroActive = true;
} catch {
  // Graceful degradation - sensors not available
}
```

With:
```typescript
try {
  const sensors = require('react-native-sensors');
  const { accelerometer, gyroscope, barometer, setUpdateIntervalForType } = sensors;

  // Set update intervals
  try { setUpdateIntervalForType('accelerometer', 20); } catch (e) { console.warn('[AccelerometerService] Failed to set accelerometer interval:', e); }
  try { setUpdateIntervalForType('gyroscope', 50); } catch (e) { console.warn('[AccelerometerService] Failed to set gyroscope interval:', e); }
  try { setUpdateIntervalForType('barometer', 1000); } catch (e) { console.warn('[AccelerometerService] Failed to set barometer interval:', e); }

  // Accelerometer subscription
  try {
    this.accelSubscription = accelerometer.subscribe({
      next: (data: { x: number; y: number; z: number; timestamp: number }) => {
        this.processAccelerometer(data);
      },
      error: (err: any) => {
        console.warn('[AccelerometerService] Accelerometer stream error:', err);
        this.accelActive = false;
      },
    });
    this.accelActive = true;
  } catch (e) {
    console.warn('[AccelerometerService] Failed to subscribe to accelerometer:', e);
    this.accelActive = false;
  }

  // Gyroscope subscription
  try {
    this.gyroSubscription = gyroscope.subscribe({
      next: (data: { x: number; y: number; z: number; timestamp: number }) => {
        this.processGyroscope(data);
      },
      error: (err: any) => {
        console.warn('[AccelerometerService] Gyroscope stream error:', err);
        this.gyroActive = false;
      },
    });
    this.gyroActive = true;
  } catch (e) {
    console.warn('[AccelerometerService] Failed to subscribe to gyroscope:', e);
    this.gyroActive = false;
  }

  // Barometer subscription
  try {
    this.baroSubscription = barometer.subscribe({
      next: (data: { pressure: number }) => {
        this.processBarometer(data);
      },
      error: (err: any) => {
        console.warn('[AccelerometerService] Barometer stream error:', err);
        this.baroActive = false;
      },
    });
    this.baroActive = true;
  } catch (e) {
    console.warn('[AccelerometerService] Failed to subscribe to barometer:', e);
    this.baroActive = false;
  }
} catch (e) {
  console.warn('[AccelerometerService] react-native-sensors not available:', e);
  this.accelActive = false;
  this.gyroActive = false;
  this.baroActive = false;
}
```

---

## BUG 3 (THE BIG ONE): SensorFusionEngine — No GPS-Only Fallback Path

**File:** `src/services/sensors/SensorFusionEngine.ts`

**The critical design flaw:** The `determineMotionState()` method (lines 378-428) makes state transitions depend on `accelState` and `timeSinceLastStep`. If sensors are dead (which they are in Bug 1+2), the engine is stuck in `'stationary'` forever even with valid GPS speed data.

Walking GPS gives ~0.8-1.5 m/s. The current thresholds are:
- Vehicle: needs `gpsSpeedMs > 6` — won't trigger for walking
- Running: needs `accelState === 'running'` OR `stepFreq > 2.5` — both dead
- Walking (line 412): needs `timeSinceLastStep < 2000` — always false (Bug 1)
- Walking (line 417): needs `accelState === 'walking'` — always 'stationary' (Bug 2)
- Stationary (line 422): `accelState === 'stationary' && timeSinceLastStep > 2000 && gpsSpeedMs < 0.3` — GPS walking speed hovers around this threshold due to jitter

**So walking at 4-5 km/h = 1.1-1.4 m/s GPS speed → engine oscillates between stationary (showing 0) and falling through to default (keeping previous state, which is stationary). Speed stays 0.**

### Fix: Rewrite `determineMotionState()` with GPS-FIRST Logic

Replace the entire `determineMotionState()` method (lines 378-428) with:

```typescript
private determineMotionState(gpsPos: GPSPosition | null): FusionMotionState {
  const now = Date.now();
  const gpsSpeed = gpsPos?.speed ?? -1;
  const gpsSpeedMs = gpsSpeed >= 0 ? gpsSpeed : 0;
  const gpsAvailable = gpsSpeed >= 0;
  const gpsAccuracy = gpsPos?.accuracy ?? 999;
  const accelState = accelerometerService.getCurrentState();
  const accelActive = accelerometerService.isAccelerometerActive();
  const stepFreq = stepDetectorService.getStepFrequency();
  const timeSinceLastStep = now - this.lastStepTime;
  const stepsRecent = this.lastStepTime > 0 && timeSinceLastStep < 2000;
  const accelVariance = accelerometerService.getAccelVariance();

  // ═══════════════════════════════════════════════════════
  // TIER 1: GPS-BASED CLASSIFICATION (works without any sensors)
  // GPS is ALWAYS the ground truth for speed magnitude.
  // ═══════════════════════════════════════════════════════

  // Vehicle mode: GPS speed > 6 m/s (21.6 km/h) — no human runs this fast sustained
  if (gpsAvailable && gpsSpeedMs > 6) {
    return 'vehicle';
  }

  // Clear GPS movement: speed > 0.8 m/s (2.9 km/h) with reasonable accuracy
  // This is DEFINITELY not stationary — person is walking, running, or slow vehicle
  if (gpsAvailable && gpsSpeedMs > 0.8 && gpsAccuracy < 20) {
    // Sub-classify: running vs walking using GPS speed
    if (gpsSpeedMs > 3.0) {
      // > 10.8 km/h — running speed or slow cycling
      // If sensors confirm running, great. If not, still call it running from GPS alone.
      return 'running';
    }
    // 0.8 – 3.0 m/s (2.9 – 10.8 km/h) = walking or jogging
    return 'walking';
  }

  // ═══════════════════════════════════════════════════════
  // TIER 2: SENSOR-ENHANCED CLASSIFICATION (refines GPS)
  // Only used when GPS speed is ambiguous (0 – 0.8 m/s)
  // ═══════════════════════════════════════════════════════

  // If sensors are active and reporting, use them to disambiguate
  if (accelActive) {
    // Sensors say running + some GPS movement
    if ((accelState === 'running' || stepFreq > 2.5) && stepsRecent && gpsSpeedMs < 6) {
      return 'running';
    }

    // Sensors say walking
    if (stepsRecent && stepFreq > 0 && gpsSpeedMs < 3) {
      return 'walking';
    }

    // Accelerometer says walking (even without step detector)
    if (accelState === 'walking' && gpsSpeedMs < 3) {
      return 'walking';
    }

    // Accelerometer says vehicle (low-freq vibration, no steps)
    if (accelState === 'vehicle' && !stepsRecent) {
      return 'vehicle';
    }
  }

  // ═══════════════════════════════════════════════════════
  // TIER 3: GPS MARGINAL SPEED (0.3 – 0.8 m/s)
  // GPS jitter zone — could be stationary or slow walk
  // ═══════════════════════════════════════════════════════

  if (gpsAvailable && gpsSpeedMs > 0.3 && gpsAccuracy < 15) {
    // Marginal speed with good accuracy — probably slow walking
    // If we were already walking/running, stay in that state (hysteresis)
    if (this.motionState === 'walking' || this.motionState === 'running') {
      return 'walking';
    }
    // If we were stationary, give GPS the benefit of the doubt if speed sustained
    // But don't immediately jump to walking from one reading
    return 'stationary';
  }

  // ═══════════════════════════════════════════════════════
  // TIER 4: VEHICLE STATE TRANSITIONS
  // ═══════════════════════════════════════════════════════

  // Stay in vehicle mode at low speed if accelerometer shows vibration (engine idle at red light)
  if (this.motionState === 'vehicle' && gpsSpeedMs < 2) {
    if (accelActive && accelVariance >= 0.08) {
      // Engine vibration detected — likely stopped at red light, stay in vehicle briefly
      const timeLowSpeed = now - this.motionStateChangeTime;
      if (timeLowSpeed < 5000) {
        return 'vehicle';
      }
    }
    // Been stopped for a while → stationary
    return 'stationary';
  }

  // ═══════════════════════════════════════════════════════
  // TIER 5: DEFAULT — STATIONARY
  // ═══════════════════════════════════════════════════════

  // GPS speed < 0.3, no sensor movement, no steps → stationary
  if (gpsSpeedMs < 0.3 && (!accelActive || accelState === 'stationary') && !stepsRecent) {
    return 'stationary';
  }

  // Preserve current state if nothing definitively changed
  return this.motionState === 'gps_dead_reckoning' ? 'stationary' : this.motionState;
}
```

### Fix: Update `calculateWalkingSpeed()` to Prefer GPS When Sensors Are Dead

Replace the entire `calculateWalkingSpeed()` method (lines 430-481) with:

```typescript
private calculateWalkingSpeed(timeSinceStateChange: number, gpsSpeed: number, gpsAccuracy: number): number {
  const stepSpeed = stepDetectorService.getEstimatedSpeed();
  const sensorsWorking = stepSpeed > 0;

  // ═══════════════════════════════════════════════════════
  // FAST PATH: If GPS has a valid speed, use it immediately
  // This is the key fix — GPS speed is available from the FIRST callback
  // No need to wait for pedometer to warm up
  // ═══════════════════════════════════════════════════════

  if (!sensorsWorking) {
    // Sensors are dead — pure GPS mode
    if (gpsSpeed >= 0 && gpsAccuracy < 20) {
      this.confidence = gpsAccuracy < 10 ? 'high' : 'medium';
      this.primarySource = 'gps';
      return gpsSpeed;
    }
    // No GPS either — use initial estimate briefly, then 0
    this.confidence = 'low';
    this.primarySource = 'accelerometer';
    return timeSinceStateChange < 2000 ? 1.2 : 0;
  }

  // ═══════════════════════════════════════════════════════
  // SENSOR-ENHANCED PATH: Blend pedometer + GPS
  // ═══════════════════════════════════════════════════════

  // Phase 1: 0–300ms, before steps are counted
  if (timeSinceStateChange < 300) {
    // If GPS already has a speed, use it instead of hardcoded 1.2
    if (gpsSpeed >= 0 && gpsAccuracy < 15) {
      this.confidence = 'medium';
      this.primarySource = 'gps';
      return gpsSpeed;
    }
    this.confidence = 'low';
    this.primarySource = 'accelerometer';
    return 1.2; // 4.3 km/h initial estimate
  }

  // Phase 2: 300ms–2s, 3+ steps collected
  if (timeSinceStateChange < 2000) {
    if (stepSpeed > 0) {
      const gpsUsable = gpsSpeed >= 0 && gpsAccuracy < 15;
      if (gpsUsable) {
        this.confidence = 'medium';
        this.primarySource = 'fused';
        return 0.8 * stepSpeed + 0.2 * gpsSpeed;
      }
      this.confidence = 'medium';
      this.primarySource = 'pedometer';
      return stepSpeed;
    }
    // Steps not ready yet but GPS is — use GPS
    if (gpsSpeed >= 0 && gpsAccuracy < 15) {
      this.confidence = 'medium';
      this.primarySource = 'gps';
      return gpsSpeed;
    }
    this.confidence = 'low';
    this.primarySource = 'accelerometer';
    return 1.2;
  }

  // Phase 3: 2s+, GPS has warmed up
  if (stepSpeed > 0 && gpsSpeed >= 0) {
    const gpsWeight = this.getGpsWeight(gpsAccuracy);
    this.confidence = 'high';
    this.primarySource = 'fused';
    return (1 - gpsWeight) * stepSpeed + gpsWeight * gpsSpeed;
  }

  if (stepSpeed > 0) {
    this.confidence = 'high';
    this.primarySource = 'pedometer';
    return stepSpeed;
  }

  if (gpsSpeed >= 0) {
    this.confidence = 'medium';
    this.primarySource = 'gps';
    return gpsSpeed;
  }

  this.confidence = 'low';
  this.primarySource = 'accelerometer';
  return 1.2;
}
```

### Fix: Update `calculateRunningSpeed()` with Same GPS-First Logic

Replace the entire `calculateRunningSpeed()` method (lines 483-534) with:

```typescript
private calculateRunningSpeed(timeSinceStateChange: number, gpsSpeed: number, gpsAccuracy: number): number {
  const stepSpeed = stepDetectorService.getEstimatedSpeed();
  const sensorsWorking = stepSpeed > 0;

  // Pure GPS mode when sensors are dead
  if (!sensorsWorking) {
    if (gpsSpeed >= 0 && gpsAccuracy < 20) {
      this.confidence = gpsAccuracy < 10 ? 'high' : 'medium';
      this.primarySource = 'gps';
      return gpsSpeed;
    }
    this.confidence = 'low';
    this.primarySource = 'accelerometer';
    return timeSinceStateChange < 2000 ? 2.8 : 0;
  }

  // Phase 1
  if (timeSinceStateChange < 300) {
    if (gpsSpeed >= 0 && gpsAccuracy < 15) {
      this.confidence = 'medium';
      this.primarySource = 'gps';
      return gpsSpeed;
    }
    this.confidence = 'low';
    this.primarySource = 'accelerometer';
    return 2.8; // 10 km/h initial estimate
  }

  // Phase 2
  if (timeSinceStateChange < 2000) {
    if (stepSpeed > 0) {
      const gpsUsable = gpsSpeed >= 0 && gpsAccuracy < 15;
      if (gpsUsable) {
        this.confidence = 'medium';
        this.primarySource = 'fused';
        return 0.7 * stepSpeed + 0.3 * gpsSpeed;
      }
      this.confidence = 'medium';
      this.primarySource = 'pedometer';
      return stepSpeed;
    }
    if (gpsSpeed >= 0 && gpsAccuracy < 15) {
      this.confidence = 'medium';
      this.primarySource = 'gps';
      return gpsSpeed;
    }
    this.confidence = 'low';
    this.primarySource = 'accelerometer';
    return 2.8;
  }

  // Phase 3 - higher GPS weight for running
  if (stepSpeed > 0 && gpsSpeed >= 0) {
    const gpsWeight = Math.min(0.5, this.getGpsWeight(gpsAccuracy) + 0.1);
    this.confidence = 'high';
    this.primarySource = 'fused';
    return (1 - gpsWeight) * stepSpeed + gpsWeight * gpsSpeed;
  }

  if (stepSpeed > 0) {
    this.confidence = 'high';
    this.primarySource = 'pedometer';
    return stepSpeed;
  }

  if (gpsSpeed >= 0) {
    this.confidence = 'medium';
    this.primarySource = 'gps';
    return gpsSpeed;
  }

  this.confidence = 'low';
  this.primarySource = 'accelerometer';
  return 2.8;
}
```

---

## BUG 4: StepDetectorService — Also Uses Wrong Timestamps for Frequency Calc

**File:** `src/services/sensors/StepDetectorService.ts`

**The bug:** Line 53 does `const timestamp = data.timestamp || Date.now()`. Before Bug 1 is fixed, `data.timestamp` from Android is a boot-relative ms value (nonzero, truthy), so it gets stored. Then `getStepFrequency()` line 132 compares these boot-relative timestamps against `Date.now()` for the timeout check. Even step-to-step frequency calculation *happens to work* (the intervals between boot-relative timestamps are correct), BUT the `now - lastTimestamp > this.STEP_TIMEOUT` check on line 135 is always true because `now` (epoch) >> `lastTimestamp` (boot-relative).

**After Bug 1 fix (native module sends epoch ms), this is automatically fixed.** But add a safety fallback:

Replace line 53:
```typescript
const timestamp = data.timestamp || Date.now();
```
With:
```typescript
// Ensure timestamp is in epoch-ms domain (compatible with Date.now())
// If timestamp looks like boot-relative (< year 2020 in ms), use Date.now() instead
const rawTs = data.timestamp;
const timestamp = (rawTs && rawTs > 1577836800000) ? rawTs : Date.now();
```

This `1577836800000` is Jan 1, 2020 in epoch ms. Any timestamp below that is clearly not epoch time and we fall back to `Date.now()`. This makes the JS side resilient regardless of what the native module sends.

---

## BUG 5: SensorFusionEngine `lastStepTime` Init — Edge Case

**File:** `src/services/sensors/SensorFusionEngine.ts`

**The bug:** `lastStepTime` is initialized to `0` (line 65). In `determineMotionState()`, `timeSinceLastStep = now - 0` = huge number = always "no recent steps". This is correct when no steps are detected. BUT after the first step IS detected, `lastStepTime` gets set (line 103). The issue: if the native module sends the first event BEFORE the SensorFusionEngine callback is ready, the step is lost.

**Fix:** No code change needed — the fix for Bug 1 (correct timestamps) + Bug 3 (GPS-first logic) makes this a non-issue. The new `determineMotionState()` doesn't require steps to work.

---

## SUMMARY OF ALL CHANGES

| File | What Changed | Why |
|------|-------------|-----|
| `android/.../StepDetectorModule.kt` | `event.timestamp / 1_000_000.0` → `System.currentTimeMillis().toDouble()` | Timestamps must be epoch-ms to match `Date.now()` in JS |
| `src/services/sensors/AccelerometerService.ts` | Individual try/catch per sensor + `console.warn` logging | Silent failures must be visible; one sensor failing shouldn't kill others |
| `src/services/sensors/SensorFusionEngine.ts` | Rewrote `determineMotionState()` with GPS-first tiered logic | GPS speed > 0.8 m/s → walking, > 3 m/s → running, > 6 m/s → vehicle. No sensors required. |
| `src/services/sensors/SensorFusionEngine.ts` | Rewrote `calculateWalkingSpeed()` and `calculateRunningSpeed()` | GPS-only fallback when pedometer data unavailable |
| `src/services/sensors/StepDetectorService.ts` | Epoch timestamp validation on line 53 | Safety net for wrong timestamp domains |
| `whathasbeenimplemented.md` | Document all fixes | Audit trail |

## EXPECTED RESULTS AFTER FIX

| Scenario | Before | After |
|----------|--------|-------|
| Walking (sensors dead) | 0 km/h forever | 4-6 km/h from GPS |
| Walking (sensors working) | 0 km/h (timestamp bug) | 4-6 km/h from fused sensors+GPS |
| Running | 0 km/h | 8-15 km/h from GPS |
| Driving 60 km/h | May work (> 6 m/s threshold hits) | Definitely works |
| Sitting still | 0 km/h (correct!) | 0 km/h (correct!) |
| Standing still but GPS jitters 0.5 m/s | Was sometimes 0, sometimes stuck | 0 km/h (below 0.8 threshold) |