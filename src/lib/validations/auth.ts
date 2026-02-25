import { z } from "zod/v4";

/**
 * Validation schema for the UVEC iCal URL.
 * Must be a valid HTTPS URL pointing to the UVEC calendar export.
 */
export const uvecIcalUrlSchema = z
  .string()
  .url("Please enter a valid URL")
  .refine(
    (url) => url.startsWith("https://"),
    "URL must use HTTPS for security",
  )
  .refine(
    (url) =>
      url.includes("calendar/export") || url.includes("export_execute.php"),
    "This doesn't look like a UVEC iCal export URL. Please follow the instructions above.",
  )
  .refine((url) => {
    try {
      const { hostname } = new URL(url);
      return (
        hostname.endsWith(".edu") ||
        hostname.endsWith(".edu.ph") ||
        hostname.includes("uvec") ||
        hostname.includes("moodle")
      );
    } catch {
      return false;
    }
  }, "URL must be from your university's UVEC/Moodle server");

/**
 * Schema for onboarding form data.
 */
export const onboardingSchema = z.object({
  uvecIcalUrl: uvecIcalUrlSchema,
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
