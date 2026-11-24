import * as z from 'zod/v4';

// A release version of the app as "x.y.z": numbers only, no leading zeros, no
// build metadata (the store's build number isn't part of the app version).
export const appVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'expected a version as "x.y.z"');

export type AppVersion = z.infer<typeof appVersionSchema>;
