import { z } from 'zod';

export const CreateTendencySchema = z.object({
  name: z.string().min(1).max(100),
  typicalDayOfWeek: z.number().int().min(0).max(6).optional(),
  typicalStartTime: z.string().max(10).optional(), // HH:MM
  typicalEndTime: z.string().max(10).optional(),
  genres: z.array(z.string().max(50)).default([]),
  atmosphere: z.string().max(500).optional(),
  levelRange: z.string().max(100).optional(),
  entrySystem: z.string().max(200).optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  houseEquipment: z.string().max(300).optional(),
  equipmentDetails: z.string().max(500).optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
});

export type CreateTendencyInput = z.infer<typeof CreateTendencySchema>;
