import {
  tripSyncSchema,
  tripHistorySchema,
} from '../../src/schemas/validation';

describe('Trip Route Validation', () => {
  describe('tripSyncSchema', () => {
    const validTrip = {
      startTime: '2024-01-15T10:30:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      distance: 25.5,
      avgSpeed: 51.0,
      maxSpeed: 80.0,
      duration: 1800,
      speedUnit: 'kmh' as const,
    };

    it('accepts valid trip data', () => {
      const result = tripSyncSchema.safeParse({ trips: [validTrip] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trips).toHaveLength(1);
        expect(result.data.trips[0].distance).toBe(25.5);
      }
    });

    it('rejects negative distance', () => {
      const result = tripSyncSchema.safeParse({
        trips: [{ ...validTrip, distance: -10 }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative avgSpeed', () => {
      const result = tripSyncSchema.safeParse({
        trips: [{ ...validTrip, avgSpeed: -5 }],
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional id field', () => {
      const tripWithId = {
        ...validTrip,
        id: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = tripSyncSchema.safeParse({ trips: [tripWithId] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trips[0].id).toBe(
          '550e8400-e29b-41d4-a716-446655440000',
        );
      }
    });

    it('accepts optional endTime', () => {
      const { endTime, ...tripWithoutEnd } = validTrip;
      const result = tripSyncSchema.safeParse({ trips: [tripWithoutEnd] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trips[0].endTime).toBeUndefined();
      }
    });

    it('defaults speedUnit to kmh', () => {
      const { speedUnit, ...tripWithoutUnit } = validTrip;
      const result = tripSyncSchema.safeParse({ trips: [tripWithoutUnit] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trips[0].speedUnit).toBe('kmh');
      }
    });
  });

  describe('tripHistorySchema', () => {
    it('accepts valid page and limit', () => {
      const result = tripHistorySchema.safeParse({ page: 2, limit: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('defaults page to 1', () => {
      const result = tripHistorySchema.safeParse({ limit: 10 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('defaults limit to 20', () => {
      const result = tripHistorySchema.safeParse({ page: 1 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('rejects page less than 1', () => {
      const result = tripHistorySchema.safeParse({ page: 0, limit: 20 });
      expect(result.success).toBe(false);
    });

    it('rejects limit greater than 100', () => {
      const result = tripHistorySchema.safeParse({ page: 1, limit: 101 });
      expect(result.success).toBe(false);
    });
  });
});
