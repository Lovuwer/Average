#!/bin/bash
# Fixes common Android build issues

echo "Fixing common Android build issues..."

# Fix 1: Clear Gradle caches
rm -rf android/.gradle
rm -rf android/app/build

# Fix 2: Ensure Jetifier is enabled
if [ -f android/gradle.properties ]; then
  if ! grep -q "android.enableJetifier=true" android/gradle.properties; then
    echo "android.enableJetifier=true" >> android/gradle.properties
  fi

  # Fix 3: Ensure AndroidX is enabled
  if ! grep -q "android.useAndroidX=true" android/gradle.properties; then
    echo "android.useAndroidX=true" >> android/gradle.properties
  fi

  # Fix 4: Increase Gradle memory
  if ! grep -q "org.gradle.jvmargs" android/gradle.properties; then
    echo 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m' >> android/gradle.properties
  fi

  # Fix 5: Ensure new architecture flags
  if ! grep -q "newArchEnabled=true" android/gradle.properties; then
    echo "newArchEnabled=true" >> android/gradle.properties
  fi
else
  echo "⚠️  android/gradle.properties not found"
fi

echo "✅ Android build fixes applied. Run 'cd android && ./gradlew assembleDebug'"
