# Security Architecture

## Overview

Average implements a defense-in-depth security model with 7 layers of protection against reverse engineering, tampering, and unauthorized access.

---

## Layer 1: Hermes Bytecode

React Native's Hermes engine compiles JavaScript to bytecode at build time. Release builds contain only `.hbc` (Hermes Bytecode) files — not readable JavaScript source.

**Configuration:**
- Hermes is enabled by default in React Native 0.76+
- Source maps are NOT shipped in release builds
- Console statements are stripped via ProGuard/babel transforms

---

## Layer 2: Native Code Obfuscation

### Android (ProGuard)
Located in `android/app/proguard-rules.pro`:
- Shrinks, optimizes, and obfuscates Java/Kotlin code
- Keeps only RN bridge classes and native modules
- Removes debug logging in release builds

### iOS
- Swift optimization level set to `-O` for release
- Symbol stripping enabled (`STRIP_SWIFT_SYMBOLS = YES`)

---

## Layer 3: Runtime Integrity Verification

**File:** `src/services/security/IntegrityChecker.ts`

Verifies at runtime that the app binary has not been tampered with:
- **Android**: Validates APK package name matches expected value
- **iOS**: Validates bundle identifier matches expected value

To update integrity checks:
1. Set the expected bundle ID in `IntegrityChecker.ts`
2. For advanced checks, implement native modules that verify APK/IPA signatures

---

## Layer 4: Root/Jailbreak Detection

**File:** `src/services/security/RootDetector.ts`

### Android Checks:
- Build fingerprint for test-keys
- Build tags analysis
- Can be extended with: su binary detection, Magisk detection, known root app package checks

### iOS Checks:
- Can be extended with: Cydia detection, sandbox integrity, fork() behavior analysis

---

## Layer 5: SSL Certificate Pinning

**File:** `src/services/security/SSLPinning.ts`

Pins SHA-256 hashes of the server's public key for all API communication.

### Pin Configuration:
```typescript
{
  hostname: 'average-api.railway.app',
  sha256Pins: [
    'PRIMARY_PIN_HASH',  // Current certificate
    'BACKUP_PIN_HASH',   // For rotation
  ]
}
```

### Rotating Pins:
1. Generate new certificate on server
2. Add the new certificate's SHA-256 hash as a backup pin
3. Deploy app update with new pins
4. Switch server to new certificate
5. Remove old pin in next app update

---

## Layer 6: Environment Detection

### Debug Detection (`DebugDetector.ts`)
- Checks `__DEV__` flag
- In production, can detect remote debugging and attached debuggers

### Emulator Detection (`EmulatorDetector.ts`)
- Uses `react-native-device-info` `isEmulator()` check
- Detects simulators, emulators, and virtualized environments

---

## Layer 7: Request Signing

**File:** `src/services/security/RequestSigner.ts`

Every API request is signed with HMAC-SHA256:
- **Payload**: `{timestamp}.{nonce}.{body}`
- **Headers added**: `X-Timestamp`, `X-Nonce`, `X-Signature`
- **Server validates**: signature match, timestamp freshness (prevents replay attacks)

### Anti-Replay Protection:
- Nonce ensures uniqueness
- Timestamp prevents old requests from being replayed
- Server should reject requests older than 5 minutes

---

## Security Gate

**File:** `src/services/security/SecurityGate.ts`

Orchestrates all security checks on app launch:

```
App Launch → SecurityGate.checkAsync()
  ├── RootDetector.check()
  ├── EmulatorDetector.check()
  ├── IntegrityChecker.check()
  ├── DebugDetector.check()
  └── Result: { safe: boolean, reasons: string[] }

If !safe in production → Show error → Exit app
```

---

## Best Practices

1. **Never ship source maps** in release builds
2. **Rotate SSL pins** before certificate expiry
3. **Update integrity hashes** after each release
4. **Monitor security events** via backend logging
5. **Keep dependencies updated** for security patches
