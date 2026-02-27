import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  areaLabel: z.string().max(100).optional(),
  travelRadiusKm: z.number().int().min(1).max(999).optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ANY']).optional(),
  levelPref: z.enum(['SAME', 'BETTER', 'ANY']).optional(),
  sessionGoal: z.enum(['FUN', 'IMPROVE', 'BOTH']).optional(),
  feedbackPref: z.enum(['DETAILED', 'LIGHT', 'NONE']).optional(),
  sessionStyle: z.enum(['DEEP', 'BROAD', 'EITHER']).optional(),
  instruments: z
    .array(
      z.object({
        instrument: z.string().min(1).max(50),
        proficiency: z.string().max(50).optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
  genres: z.array(z.string().min(1).max(50)).optional(),
});

export const CoverageAreaSchema = z.object({
  areaLabel: z.string().min(1).max(100),
  isHome: z.boolean().default(false),
  isSyncroom: z.boolean().default(false),
  syncroomNotes: z.string().max(300).optional(),
  isPublic: z.boolean().default(true),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type CoverageAreaInput = z.infer<typeof CoverageAreaSchema>;
