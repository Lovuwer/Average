import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const tripSyncSchema = z.object({
  trips: z.array(
    z.object({
      id: z.string().uuid().optional(),
      startTime: z.string().datetime(),
      endTime: z.string().datetime().optional(),
      distance: z.number().min(0),
      avgSpeed: z.number().min(0),
      maxSpeed: z.number().min(0),
      duration: z.number().int().min(0),
      speedUnit: z.enum(['kmh', 'mph']).default('kmh'),
    }),
  ),
});

export const tripHistorySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const licenseValidateSchema = z.object({
  key: z.string().min(1, 'License key is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  platform: z.string().min(1),
  model: z.string().min(1),
  osVersion: z.string().min(1),
  appVersion: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type TripSyncInput = z.infer<typeof tripSyncSchema>;
export type TripHistoryInput = z.infer<typeof tripHistorySchema>;
export type LicenseValidateInput = z.infer<typeof licenseValidateSchema>;
