#!/bin/bash
# Fixes common Android build issues

echo "Fixing common Android build issues..."

# Fix 1: Clear Gradle caches
rm -rf android/.gradle
rm -rf android/app/build

# Fix 2: Generate JS bundle into assets
echo "Generating JS bundle..."
mkdir -p android/app/src/main/assets
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
echo "  ✅ JS bundle generated"

# Fix 3: Ensure Jetifier is enabled
if [ -f android/gradle.properties ]; then
  if ! grep -q "android.enableJetifier=true" android/gradle.properties; then
    echo "android.enableJetifier=true" >> android/gradle.properties
  fi

  # Fix 4: Ensure AndroidX is enabled
  if ! grep -q "android.useAndroidX=true" android/gradle.properties; then
    echo "android.useAndroidX=true" >> android/gradle.properties
  fi

  # Fix 5: Increase Gradle memory
  if ! grep -q "org.gradle.jvmargs" android/gradle.properties; then
    echo 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m' >> android/gradle.properties
  fi

  # Fix 6: Ensure new architecture flags
  if ! grep -q "newArchEnabled=true" android/gradle.properties; then
    echo "newArchEnabled=true" >> android/gradle.properties
  fi
else
  echo "⚠️  android/gradle.properties not found"
fi

echo "✅ Android build fixes applied. Run 'cd android && ./gradlew assembleDebug'"
