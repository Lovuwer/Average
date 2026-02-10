import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..');

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

const results: CheckResult[] = [];

function checkFileExists(filePath: string): boolean {
  return fs.existsSync(path.join(projectRoot, filePath));
}

function checkFileContains(filePath: string, content: string): boolean {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) return false;
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  return fileContent.includes(content);
}

// Check 1: AndroidManifest.xml contains ACCESS_FINE_LOCATION
const androidManifestPath = 'android/app/src/main/AndroidManifest.xml';
if (!checkFileExists(androidManifestPath)) {
  results.push({
    name: 'AndroidManifest.xml',
    status: 'warn',
    message: `File not found: ${androidManifestPath}`,
  });
} else if (!checkFileContains(androidManifestPath, 'ACCESS_FINE_LOCATION')) {
  results.push({
    name: 'AndroidManifest.xml — ACCESS_FINE_LOCATION',
    status: 'warn',
    message: 'ACCESS_FINE_LOCATION permission not found in AndroidManifest.xml',
  });
} else {
  results.push({
    name: 'AndroidManifest.xml — ACCESS_FINE_LOCATION',
    status: 'pass',
    message: 'ACCESS_FINE_LOCATION permission present',
  });
}

// Check 2: Info.plist contains NSLocationWhenInUseUsageDescription
const infoPlistPath = 'ios/Average/Info.plist';
if (!checkFileExists(infoPlistPath)) {
  results.push({
    name: 'Info.plist',
    status: 'warn',
    message: `File not found: ${infoPlistPath}`,
  });
} else if (!checkFileContains(infoPlistPath, 'NSLocationWhenInUseUsageDescription')) {
  results.push({
    name: 'Info.plist — NSLocationWhenInUseUsageDescription',
    status: 'warn',
    message: 'NSLocationWhenInUseUsageDescription not found in Info.plist',
  });
} else {
  results.push({
    name: 'Info.plist — NSLocationWhenInUseUsageDescription',
    status: 'pass',
    message: 'NSLocationWhenInUseUsageDescription present',
  });
}

// Check 3: package.json contains react-native dependency
const packageJsonPath = 'package.json';
if (!checkFileExists(packageJsonPath)) {
  results.push({
    name: 'package.json',
    status: 'fail',
    message: 'package.json not found — this is critical!',
  });
} else {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, packageJsonPath), 'utf-8'),
  );
  const deps = packageJson.dependencies || {};
  if (deps['react-native']) {
    results.push({
      name: 'package.json — react-native dependency',
      status: 'pass',
      message: `react-native@${deps['react-native']} found`,
    });
  } else {
    results.push({
      name: 'package.json — react-native dependency',
      status: 'fail',
      message: 'react-native dependency not found in package.json',
    });
  }
}

// Print results
console.log('==========================================');
console.log('  Native Configuration Verification');
console.log('==========================================\n');

let hasCriticalFailure = false;

for (const result of results) {
  const icon =
    result.status === 'pass'
      ? '✅'
      : result.status === 'warn'
        ? '⚠️'
        : '❌';
  console.log(`${icon}  ${result.name}`);
  console.log(`    ${result.message}\n`);

  if (result.status === 'fail') {
    hasCriticalFailure = true;
  }
}

console.log('==========================================');
if (hasCriticalFailure) {
  console.log('  RESULT: CRITICAL FAILURES DETECTED ❌');
  process.exit(1);
} else {
  console.log('  RESULT: ALL CHECKS PASSED ✅');
  process.exit(0);
}
