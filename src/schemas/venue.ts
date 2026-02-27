import { z } from 'zod';

export const CreateVenueSchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  address: z.string().max(200).optional(),
  nearestStation: z.string().max(100).optional(),
  walkMinutes: z.number().int().min(0).max(120).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  xUrl: z.string().url().optional().or(z.literal('')),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  bookingUrl: z.string().url().optional().or(z.literal('')),
  bookingPhone: z.string().max(20).optional(),
});

export const UpdateVenueSchema = CreateVenueSchema.partial();

export type CreateVenueInput = z.infer<typeof CreateVenueSchema>;
export type UpdateVenueInput = z.infer<typeof UpdateVenueSchema>;
