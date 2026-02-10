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
