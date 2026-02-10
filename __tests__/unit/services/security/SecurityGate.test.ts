import { SecurityGate } from '../../../../src/services/security/SecurityGate';
import { RootDetector } from '../../../../src/services/security/RootDetector';
import { DebugDetector } from '../../../../src/services/security/DebugDetector';
import { EmulatorDetector } from '../../../../src/services/security/EmulatorDetector';
import { IntegrityChecker } from '../../../../src/services/security/IntegrityChecker';

jest.mock('../../../../src/services/security/RootDetector', () => ({
  RootDetector: {
    check: jest.fn(() => Promise.resolve({ detected: false, indicators: [] })),
  },
}));
jest.mock('../../../../src/services/security/DebugDetector', () => ({
  DebugDetector: {
    check: jest.fn(() => ({ detected: false, indicators: [] })),
  },
}));
jest.mock('../../../../src/services/security/EmulatorDetector', () => ({
  EmulatorDetector: {
    check: jest.fn(() => Promise.resolve({ detected: false, indicators: [] })),
  },
}));
jest.mock('../../../../src/services/security/IntegrityChecker', () => ({
  IntegrityChecker: {
    check: jest.fn(() => Promise.resolve({ valid: true, reasons: [] })),
  },
}));

const mockDebugDetector = DebugDetector as jest.Mocked<typeof DebugDetector>;
const mockRootDetector = RootDetector as jest.Mocked<typeof RootDetector>;
const mockEmulatorDetector = EmulatorDetector as jest.Mocked<typeof EmulatorDetector>;
const mockIntegrityChecker = IntegrityChecker as jest.Mocked<typeof IntegrityChecker>;

describe('SecurityGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to safe defaults
    (mockDebugDetector.check as jest.Mock).mockReturnValue({ detected: false, indicators: [] });
    (mockRootDetector.check as jest.Mock).mockResolvedValue({ detected: false, indicators: [] });
    (mockEmulatorDetector.check as jest.Mock).mockResolvedValue({
      detected: false,
      indicators: [],
    });
    (mockIntegrityChecker.check as jest.Mock).mockResolvedValue({ valid: true, reasons: [] });
  });

  describe('check() (sync)', () => {
    it('returns safe: true when all checks pass', () => {
      const result = SecurityGate.check();
      expect(result.safe).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it('detects debug mode and returns indicators', () => {
      (mockDebugDetector.check as jest.Mock).mockReturnValue({
        detected: true,
        indicators: ['debugger attached'],
      });
      const result = SecurityGate.check();
      expect(result.safe).toBe(false);
      expect(result.reasons).toContain('debugger attached');
    });

    it('in dev mode with only development mode indicators, still safe: true', () => {
      (mockDebugDetector.check as jest.Mock).mockReturnValue({
        detected: true,
        indicators: ['development mode'],
      });
      const result = SecurityGate.check();
      expect(result.safe).toBe(true);
      expect(result.reasons).toContain('development mode');
    });
  });

  describe('checkAsync()', () => {
    it('returns safe: true when all async checks pass', async () => {
      const result = await SecurityGate.checkAsync();
      expect(result.safe).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it('detects root and returns indicators', async () => {
      (mockRootDetector.check as jest.Mock).mockResolvedValue({
        detected: true,
        indicators: ['su binary found'],
      });
      const result = await SecurityGate.checkAsync();
      expect(result.safe).toBe(false);
      expect(result.reasons).toContain('su binary found');
    });

    it('detects emulator and returns indicators', async () => {
      (mockEmulatorDetector.check as jest.Mock).mockResolvedValue({
        detected: true,
        indicators: ['emulator detected'],
      });
      const result = await SecurityGate.checkAsync();
      expect(result.safe).toBe(false);
      expect(result.reasons).toContain('emulator detected');
    });

    it('aggregates multiple failure reasons', async () => {
      (mockRootDetector.check as jest.Mock).mockResolvedValue({
        detected: true,
        indicators: ['su binary found'],
      });
      (mockEmulatorDetector.check as jest.Mock).mockResolvedValue({
        detected: true,
        indicators: ['emulator detected'],
      });
      (mockIntegrityChecker.check as jest.Mock).mockResolvedValue({
        valid: false,
        reasons: ['tampered binary'],
      });
      const result = await SecurityGate.checkAsync();
      expect(result.safe).toBe(false);
      expect(result.reasons).toContain('su binary found');
      expect(result.reasons).toContain('emulator detected');
      expect(result.reasons).toContain('tampered binary');
    });
  });
});
