# Average

A speedometer application for CarPlay and Android Auto with advanced sensor fusion technology for accurate speed tracking.

## Features

- **Multi-Platform Support**: Native integration with CarPlay and Android Auto
- **Sensor Fusion Engine**: Combines GPS, accelerometer, gyroscope, pedometer, and barometer data for precise speed calculation
- **Real-Time Monitoring**: Live speed tracking with statistics (current, average, maximum)
- **Stationary Detection**: Intelligent zero-speed detection to prevent GPS drift
- **Unit Support**: Multiple speed units (mph, km/h)

## Technical Stack

- **Frontend**: React Native with TypeScript
- **Native Modules**: iOS (Objective-C/Swift) and Android (Kotlin/Java)
- **Backend**: Node.js API with authentication
- **Deployment**: Docker containerization with Railway hosting support

## Architecture

### Sensor Fusion Engine

The core of Average is its sensor fusion engine, which intelligently combines multiple sensor inputs:

- **GPS**: Primary source for speed and location data
- **Accelerometer**: Motion classification and movement detection
- **Gyroscope**: Orientation and rotation tracking
- **Pedometer**: Step-based speed estimation for walking scenarios
- **Barometer**: Altitude tracking and vertical movement detection

The engine uses GPS-first motion classification with advanced filtering algorithms to eliminate common issues like stuck-at-zero speeds and GPS drift.

### Native Modules

Custom native modules provide direct access to device sensors:

- `AccelerometerModule`: Motion sensing and classification
- `StepDetectorModule`: Pedometer integration (CoreMotion on iOS, SensorManager on Android)
- Platform-specific sensor timestamp synchronization

## Installation

### Prerequisites

- Node.js 16 or higher
- React Native development environment
- For iOS: Xcode 12 or higher
- For Android: Android Studio with SDK 21+

### Setup

```bash
# Clone the repository
git clone https://github.com/Lovuwer/Average.git
cd Average

# Install dependencies
npm install

# iOS specific
cd ios && pod install && cd ..

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```
API_BASE_URL=your_api_endpoint
AUTH_USERNAME=your_username
AUTH_PASSWORD=your_password
```

### Backend Deployment

The application includes Docker support for containerized deployment:

```bash
# Build Docker image
docker build -t average-app .

# Run container
docker run -p 3000:3000 average-app
```

For Railway deployment, the application automatically uses the `PORT` environment variable provided by the platform.

## Usage

### CarPlay Integration

1. Connect your iOS device to your vehicle's CarPlay system
2. Launch Average from the CarPlay interface
3. Speed tracking begins automatically with GPS lock

### Android Auto Integration

1. Connect your Android device to your vehicle's Android Auto system
2. Open Average from the Android Auto launcher
3. Grant necessary location and sensor permissions

### Speed Tracking

- **Current Speed**: Real-time speed display
- **Average Speed**: Calculated over the duration of your trip
- **Maximum Speed**: Highest speed recorded during the session
- **Speed History**: Historical data and analytics

## Testing

The project includes comprehensive unit tests for core components:

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- SensorFusionEngine.test.ts

# Run with coverage
npm test -- --coverage
```

Test coverage includes:
- Sensor fusion engine (17+ test cases)
- Accelerometer service
- Step detector service
- Speed calculation algorithms

## Development

### Project Structure

```
Average/
├── src/
│   ├── services/          # TypeScript service layer
│   ├── hooks/             # React hooks
│   ├── screens/           # Application screens
│   ├── store/             # State management
│   └── native/            # Native module interfaces
├── ios/                   # iOS native code
├── android/               # Android native code
├── backend/               # API server
└── tests/                 # Test files
```

### Key Components

- **SpeedEngine**: Core speed calculation and management
- **SensorFusionEngine**: Multi-sensor data fusion and processing
- **AccelerometerService**: Motion detection and classification
- **StepDetectorService**: Pedometer-based speed estimation

## Known Issues

- GPS accuracy may vary depending on device hardware and environmental conditions
- Initial GPS lock may take 10-30 seconds in some locations
- Sensor fusion requires calibration period for optimal accuracy

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with appropriate tests
4. Submit a pull request with a clear description

## Security

- Never commit sensitive credentials to the repository
- Use environment variables for all configuration
- Authentication credentials should be managed securely
- API endpoints should use HTTPS in production
