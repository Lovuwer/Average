import React from 'react';
import { render } from '@testing-library/react-native';
import SensorStatusIndicator from '../../src/components/SensorStatusIndicator';

describe('SensorStatusIndicator', () => {
  const defaultProps = {
    gpsAccuracy: 5,
    confidence: 'high' as const,
    motionState: 'vehicle',
    primarySource: 'gps',
    sensorHealth: {
      gps: true,
      accelerometer: true,
      gyroscope: true,
      pedometer: false,
      barometer: true,
    },
  };

  it('renders without crash', () => {
    const { getByTestId } = render(<SensorStatusIndicator {...defaultProps} />);
    expect(getByTestId('sensor-status-indicator')).toBeTruthy();
  });

  it('renders GPS bars based on accuracy', () => {
    const { getByTestId } = render(<SensorStatusIndicator {...defaultProps} />);
    expect(getByTestId('gps-bars')).toBeTruthy();
  });

  it('renders accelerometer sensor dot when active', () => {
    const { getByTestId } = render(<SensorStatusIndicator {...defaultProps} />);
    expect(getByTestId('accel-dot')).toBeTruthy();
  });

  it('renders pedometer dot only during walking/running', () => {
    const walkingProps = {
      ...defaultProps,
      motionState: 'walking',
      sensorHealth: { ...defaultProps.sensorHealth, pedometer: true },
    };
    const { getByTestId } = render(<SensorStatusIndicator {...walkingProps} />);
    expect(getByTestId('pedometer-dot')).toBeTruthy();
  });

  it('does not render pedometer dot during driving', () => {
    const { queryByTestId } = render(<SensorStatusIndicator {...defaultProps} />);
    expect(queryByTestId('pedometer-dot')).toBeNull();
  });

  it('renders confidence dot', () => {
    const { getByTestId } = render(<SensorStatusIndicator {...defaultProps} />);
    expect(getByTestId('confidence-dot')).toBeTruthy();
  });

  it('renders without crash when all sensors are unavailable', () => {
    const noSensorsProps = {
      gpsAccuracy: null,
      confidence: 'low' as const,
      motionState: 'stationary',
      primarySource: 'gps',
      sensorHealth: {
        gps: false,
        accelerometer: false,
        gyroscope: false,
        pedometer: false,
        barometer: false,
      },
    };
    const { getByTestId } = render(<SensorStatusIndicator {...noSensorsProps} />);
    expect(getByTestId('sensor-status-indicator')).toBeTruthy();
  });
});
