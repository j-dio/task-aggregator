import { z } from "zod/v4";

/**
 * Validation schema for the UVEC iCal URL.
 * Requires a valid https:// URL only — actual calendar verification happens
 * server-side in saveUvecIcalUrl via a real fetch + BEGIN:VCALENDAR check.
 */
export const uvecIcalUrlSchema = z
  .string()
  .url("Please enter a valid URL")
  .refine(
    (url) => url.startsWith("https://"),
    "URL must use HTTPS for security",
  );

/**
 * Schema for onboarding form data.
 */
export const onboardingSchema = z.object({
  uvecIcalUrl: uvecIcalUrlSchema,
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
