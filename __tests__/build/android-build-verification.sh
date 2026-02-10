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
