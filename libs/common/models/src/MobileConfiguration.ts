import * as z from 'zod/v4';

import { avatarSchema } from './Avatar';
import {
  collectPhraseLanguages,
  FALLBACK_LANGUAGE,
  mobileTextsSchema,
  mobileTextsSourceSchema,
} from './MobileTexts';

// Where and how the mobile app reaches mobile.api. Routes are paths relative
// to baseUrl.
export const mobileApiConfigurationSchema = z.object({
  // Origin (and optional path prefix) of mobile.api. Omit to keep using the
  // address the configuration itself was fetched from.
  baseUrl: z.string().optional(),
  routes: z.object({
    identifyPlayer: z.string(),
    registerPlayer: z.string(),
    activeChallenges: z.string(),
    joinChallenge: z.string(),
    startPlay: z.string(),
    acceptPlayResults: z.string(),
    leaderboard: z.string(),
    setPlayerAvatar: z.string(),
    setPlayerName: z.string(),
    completeOnboarding: z.string(),
  }),
});
export type MobileApiConfiguration = z.infer<typeof mobileApiConfigurationSchema>;

// Ad units of the Yandex Mobile Ads SDK (Easy Monetization), per platform —
// from the Yandex Boost account; "demo-…" ones serve test ads.
export const mobileAdsConfigurationSchema = z.object({
  // Interstitial shown on the penalty screen, after a play with mistakes.
  penaltyAdUnitId: z.object({
    android: z.string().min(1),
    ios: z.string().min(1),
  }),
});
export type MobileAdsConfiguration = z.infer<typeof mobileAdsConfigurationSchema>;

// An avatar with where to get its image: a URL that changes whenever the
// image does, so a cached copy never needs checking. Either absolute or a
// path on the API's address (see MobileApiConfiguration.baseUrl).
export const avatarAssetSchema = avatarSchema.extend({
  url: z.string(),
});
export type AvatarAsset = z.infer<typeof avatarAssetSchema>;

// A language the app can be shown in.
export const languageSchema = z.object({
  // Lowercase language code ("en", "pt-br") — what phrases are keyed by.
  code: z.string(),
  // How the language is called in the language itself ("Deutsch"), so it can
  // be recognized by its speakers whatever the current language is.
  name: z.string().min(1),
});
export type Language = z.infer<typeof languageSchema>;

// Everything the mobile app needs to know before it can identify the player:
// served by mobile.api, loaded once at app start.
export const mobileConfigurationSchema = z.object({
  api: mobileApiConfigurationSchema,
  ads: mobileAdsConfigurationSchema,
  // The language that best matched what the app asked for. `texts` are in it,
  // except for phrases that have nothing in it — those are in English.
  language: z.string(),
  // Everything the app can be switched to; `language` is one of them.
  languages: z.array(languageSchema),
  texts: mobileTextsSchema,
  // All avatars in the game, from the API's avatar pool — those not
  // available to the player too.
  avatars: z.array(avatarAssetSchema),
});
export type MobileConfiguration = z.infer<typeof mobileConfigurationSchema>;

// What the server is configured with: the same, but with texts in every
// language they're translated to (see phraseSchema). The server hands each
// client just one language's worth.
export const mobileConfigurationSourceSchema = z
  .object({
    api: mobileApiConfigurationSchema,
    ads: mobileAdsConfigurationSchema,
    // The languages offered to the player. Must include the fallback one.
    languages: z.array(languageSchema).min(1),
    texts: mobileTextsSourceSchema,
  })
  .superRefine((source, ctx) => {
    const codes = source.languages.map((language) => language.code);
    const problems = [
      ...(codes.every((code) => code === code.toLowerCase())
        ? []
        : ['language codes must be lowercase']),
      ...(new Set(codes).size === codes.length ? [] : ['language codes must be unique']),
      ...(codes.includes(FALLBACK_LANGUAGE)
        ? []
        : [`languages must include the fallback language "${FALLBACK_LANGUAGE}"`]),
      ...[...collectPhraseLanguages(source.texts)]
        .filter((code) => !codes.includes(code))
        .map((code) => `texts use language "${code}" that isn't listed in languages`),
    ];
    problems.forEach((message) => ctx.addIssue({ code: 'custom', message, path: ['languages'] }));
  });
export type MobileConfigurationSource = z.infer<typeof mobileConfigurationSourceSchema>;
