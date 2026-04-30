import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

const supportedLanguageCodes = new Set<string>(
  SUPPORTED_LANGUAGES.map((language) => language.code)
);

export const trimmedString = z.string().trim();

export const nonEmptyTrimmedString = trimmedString.min(1);

export const boundedString = (maxLength: number) =>
  trimmedString.max(maxLength);

export const emailSchema = trimmedString
  .email("Please enter a valid email address")
  .transform((email) => email.toLowerCase());

export const languageCodeSchema = trimmedString.refine(
  (code) => supportedLanguageCodes.has(code),
  { message: "Unsupported language code" }
);

export const nativeLanguageSchema = z.union([
  languageCodeSchema,
  z.literal("en"),
]);

export const jsonValueSchema = z.json();

export const positiveIntWithMax = (max: number) =>
  z
    .number({ error: "Expected a number" })
    .int("Expected an integer")
    .positive("Must be greater than zero")
    .max(max, `Must be at most ${max}`);

export const nonNegativeIntWithMax = (max: number) =>
  z
    .number({ error: "Expected a number" })
    .int("Expected an integer")
    .min(0, "Must be zero or greater")
    .max(max, `Must be at most ${max}`);
