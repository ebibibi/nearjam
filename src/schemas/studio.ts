import { z } from 'zod';

export const CreateStudioSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(200).optional(),
  nearestStation: z.string().max(100).optional(),
  walkMinutes: z.number().int().min(0).max(120).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  openingHours: z.string().max(200).optional(),
  bookingMethod: z.enum(['ONLINE', 'PHONE', 'WALKIN']).optional(),
});

export const CreateStudioRoomSchema = z.object({
  name: z.string().min(1).max(100),
  capacityPersons: z.number().int().min(1).max(100).optional(),
  sizeSqm: z.number().min(0).optional(),
  hasDrums: z.boolean().default(false),
  drumSpec: z.string().max(200).optional(),
  hasPA: z.boolean().default(false),
  paSpec: z.string().max(200).optional(),
  hasPiano: z.boolean().default(false),
  hasAmps: z.boolean().default(false),
  hasMics: z.boolean().default(false),
  hourlyRateYen: z.number().int().min(0).optional(),
  hourlyRatePeak: z.number().int().min(0).optional(),
  minBookingHours: z.number().int().min(1).max(24).default(1),
  notes: z.string().max(500).optional(),
});

export type CreateStudioInput = z.infer<typeof CreateStudioSchema>;
export type CreateStudioRoomInput = z.infer<typeof CreateStudioRoomSchema>;
