import { z } from 'zod';

export const CreateSessionSchema = z.object({
  title: z.string().min(1).max(100),
  venueId: z.string().optional(),
  studioId: z.string().optional(),
  studioRoomId: z.string().optional(),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(30).max(480).optional(),
  format: z.enum(['OPEN', 'INVITE', 'THEME']).default('OPEN'),
  isSyncroom: z.boolean().default(false),
  syncroomInfo: z.record(z.unknown()).optional(),
  moodFlags: z.array(z.string()).default([]),
  maxParticipants: z.number().int().min(1).max(200).optional(),
  registrationRequired: z.boolean().default(false),
  description: z.string().max(2000).optional(),
});

export const AddSongToQueueSchema = z.object({
  songId: z.string(),
  keyOverride: z.string().max(10).optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type AddSongToQueueInput = z.infer<typeof AddSongToQueueSchema>;
