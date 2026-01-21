/**
 * Public entry point for the client-side translation module.
 *
 * This file defines the minimal API surface exposed to host applications,
 * re-exporting only the functions and types required for integration.
 */

export { installAutoTranslator } from "./installAutoTranslator";
export { NoTranslate } from "./NoTranslate";
export type { InstallAutoTranslatorOptions } from "./installAutoTranslator";
