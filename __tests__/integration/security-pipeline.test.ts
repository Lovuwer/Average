const mockRootCheck = jest.fn(() =>
  Promise.resolve({ detected: false, indicators: [] }),
);
const mockDebugCheck = jest.fn(() => ({
  detected: false,
  indicators: [],
}));
const mockEmulatorCheck = jest.fn(() =>
  Promise.resolve({ detected: false, indicators: [] }),
);
const mockIntegrityCheck = jest.fn(() =>
  Promise.resolve({ valid: true, reasons: [] }),
);

jest.mock('../../src/services/security/RootDetector', () => ({
  RootDetector: { check: mockRootCheck },
}));
jest.mock('../../src/services/security/DebugDetector', () => ({
  DebugDetector: { check: mockDebugCheck },
}));
jest.mock('../../src/services/security/EmulatorDetector', () => ({
  EmulatorDetector: { check: mockEmulatorCheck },
}));
jest.mock('../../src/services/security/IntegrityChecker', () => ({
  IntegrityChecker: { check: mockIntegrityCheck },
}));

import { SecurityGate } from '../../src/services/security/SecurityGate';

describe('Security Pipeline Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRootCheck.mockReturnValue(
      Promise.resolve({ detected: false, indicators: [] }),
    );
    mockDebugCheck.mockReturnValue({ detected: false, indicators: [] });
    mockEmulatorCheck.mockReturnValue(
      Promise.resolve({ detected: false, indicators: [] }),
    );
    mockIntegrityCheck.mockReturnValue(
      Promise.resolve({ valid: true, reasons: [] }),
    );
  });

  it('all checks pass → safe: true', async () => {
    const result = await SecurityGate.checkAsync();

    expect(result.safe).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(mockRootCheck).toHaveBeenCalled();
    expect(mockEmulatorCheck).toHaveBeenCalled();
    expect(mockIntegrityCheck).toHaveBeenCalled();
    expect(mockDebugCheck).toHaveBeenCalled();
  });

  it('root detection failure → safe: false with root indicator', async () => {
    mockRootCheck.mockReturnValue(
      Promise.resolve({
        detected: true,
        indicators: ['Device is rooted'],
      }),
    );

    const result = await SecurityGate.checkAsync();

    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('Device is rooted');
  });

  it('emulator detection failure → safe: false with emulator indicator', async () => {
    mockEmulatorCheck.mockReturnValue(
      Promise.resolve({
        detected: true,
        indicators: ['Running on emulator'],
      }),
    );

    const result = await SecurityGate.checkAsync();

    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('Running on emulator');
  });

  it('integrity check failure → safe: false with integrity reason', async () => {
    mockIntegrityCheck.mockReturnValue(
      Promise.resolve({
        valid: false,
        reasons: ['Bundle ID mismatch'],
      }),
    );

    const result = await SecurityGate.checkAsync();

    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('Bundle ID mismatch');
  });

  it('multiple failures → aggregated reasons', async () => {
    mockRootCheck.mockReturnValue(
      Promise.resolve({
        detected: true,
        indicators: ['Device is rooted'],
      }),
    );
    mockEmulatorCheck.mockReturnValue(
      Promise.resolve({
        detected: true,
        indicators: ['Running on emulator'],
      }),
    );
    mockIntegrityCheck.mockReturnValue(
      Promise.resolve({
        valid: false,
        reasons: ['Bundle ID mismatch'],
      }),
    );

    const result = await SecurityGate.checkAsync();

    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('Device is rooted');
    expect(result.reasons).toContain('Running on emulator');
    expect(result.reasons).toContain('Bundle ID mismatch');
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it('debug detection with development mode → still safe: true in sync check()', () => {
    mockDebugCheck.mockReturnValue({
      detected: true,
      indicators: ['Running in development mode'],
    });

    const result = SecurityGate.check();

    expect(result.safe).toBe(true);
    expect(result.reasons).toContain('Running in development mode');
  });
});
