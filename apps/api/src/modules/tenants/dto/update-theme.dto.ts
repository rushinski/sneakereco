import { z } from 'zod';

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #000000)');

export const UpdateThemeDtoSchema = z.object({
  colorPrimary:    hexColor.optional(),
  colorSecondary:  hexColor.optional(),
  colorAccent:     hexColor.optional(),
  colorBackground: hexColor.optional(),
  colorSurface:    hexColor.optional(),
  colorText:       hexColor.optional(),
  colorTextMuted:  hexColor.optional(),
  colorBorder:     hexColor.optional(),
  fontHeading:     z.string().min(1).max(64).optional(),
  fontBody:        z.string().min(1).max(64).optional(),
  borderRadius:    z.string().regex(/^\d+(px|rem|em|%)$/).optional(),
  authVariant:     z.enum(['simple', 'bold']).optional(),
  authHeadline:    z.string().max(120).nullable().optional(),
  authDescription: z.string().max(300).nullable().optional(),
});

export type UpdateThemeDto = z.infer<typeof UpdateThemeDtoSchema>;
