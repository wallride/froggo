import * as z from 'zod/v4';

// Path the API serves the asset files at (outside of the /api prefix).
export const ASSETS_ROUTE = '/assets';

// Files the mobile app loads at runtime (avatar images, ...), served from
// rootPath at ASSETS_ROUTE.
export const assetsOptionsSchema = z.object({
  rootPath: z.string(),
  // Where the app should get the files instead, e.g. a CDN or a reverse proxy
  // serving rootPath as it is: "https://cdn.example.com/assets". Omit to have
  // the app get them from the API itself.
  publicBaseUrl: z.url().optional(),
});

export type AssetsOptions = z.infer<typeof assetsOptionsSchema>;
