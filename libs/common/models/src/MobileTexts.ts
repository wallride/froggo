import * as z from 'zod/v4';

import { AvatarRarityEnum } from './Avatar';
import { PlayTypeEnum } from './play/PlayTypeEnum';

// A single text of the mobile app. An array holds interchangeable variants —
// the app shows one of them, picked at random. `{name}` placeholders are
// filled in by the app with runtime values.
export const localizedTextSchema = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
]);
export type LocalizedText = z.infer<typeof localizedTextSchema>;

// Every phrase must exist in this language; it's what a device gets when a
// phrase has nothing for the language it asked for.
export const FALLBACK_LANGUAGE = 'en';

// A phrase as configured: its values in each language it's translated to,
// keyed by lowercase language code ("en", "pt-br"). Only English is
// required — a device asking for another language gets English for the
// phrases that lack it.
export const phraseSchema = z
  .object({ [FALLBACK_LANGUAGE]: localizedTextSchema })
  .catchall(localizedTextSchema)
  .refine((phrase) => Object.keys(phrase).every((code) => code === code.toLowerCase()), {
    message: 'language codes must be lowercase',
  });
export type Phrase = z.infer<typeof phraseSchema>;

// A phrase is a leaf of the texts tree: its values are texts, where a
// group's values are further groups/phrases.
export function isPhrase(node: object): node is Phrase {
  const english = (node as Record<string, unknown>)[FALLBACK_LANGUAGE];
  return typeof english === 'string' || Array.isArray(english);
}

// Every language code used by any phrase in the texts tree.
export function collectPhraseLanguages(node: unknown, into = new Set<string>()): Set<string> {
  if (node === undefined) return into;
  const record = node as Record<string, unknown>;

  if (isPhrase(record)) {
    Object.keys(record).forEach((code) => into.add(code));
  } else {
    Object.values(record).forEach((child) => collectPhraseLanguages(child, into));
  }
  return into;
}

// Every text the mobile app displays, grouped by the context it's shown in
// (group -> phrase). The structure is shared by both forms of the texts;
// `t` is what a single text is: a LocalizedText once resolved to one language
// (MobileTexts), a Phrase with all its languages in the server's
// configuration (MobileTextsSource).
function buildTextsSchema<T extends z.ZodType>(t: T) {
  const modeTexts = z.object({
    label: t,
    description: t,
    footnote: t.optional(),
  });

  return z.object({
    common: z.object({
      play: t,
      goHome: t,
      playNext: t,
      continue: t,
      loading: t,
      secondsShort: t, // {seconds}
    }),
    // Death, CEO of Dead Lines Inc.
    death: z.object({
      tag: t,
      welcome: t, // home screen greeting
      playWon: t, // board solved
      playLost: t, // board failed
    }),
    // First launch, before the player exists: an invitation, then the
    // tutorial on a training board.
    onboarding: z.object({
      invitation: z.object({
        // Death's speech bubble: a greeting, the message under it and
        // Death's signature at the end.
        welcome: t,
        message: t,
        signature: t,
        getStarted: t, // button on to the tutorial
      }),
      tutorial: z.object({
        // What each step of the tutorial says, keyed by the step's id (see
        // the app's tutorial script). A step without one shows no text.
        steps: z.record(z.string(), t),
        next: t, // button on to the next step
        finish: t, // button after the last step, that registers the player
      }),
    }),
    home: z.object({
      profileRank: t, // {rank}
    }),
    modes: z.object({
      [PlayTypeEnum.score]: modeTexts,
      [PlayTypeEnum.time]: modeTexts,
      [PlayTypeEnum.accuracy]: modeTexts,
      [PlayTypeEnum.freePlay]: modeTexts,
      timeLeft: t, // {hours} {minutes}
      finished: t, // card button once the challenge is over
    }),
    playBoard: z.object({
      giveUp: t,
      soulsSaved: t, // {found} {total}
    }),
    playResult: z.object({
      won: t,
      lost: t,
      soulsSaved: t,
      stars: t,
      time: t,
      score: t,
      bonus: t, // caption above the score multiplier
    }),
    leaderboard: z.object({
      title: t,
      online: t, // played within the last couple of minutes
      lastSeenMinutes: t, // {minutes}
      lastSeenHours: t, // {hours} {minutes}
    }),
    // Popup with the player's final result in a finished challenge.
    challengeResult: z.object({
      title: t,
      place: t,
      score: t,
      avgTime: t,
      boardsWon: t,
      newTask: t,
    }),
    // Shown while the penalty ad plays, after a play with mistakes.
    penalty: z.object({
      title: t,
      description: t,
    }),
    screens: z.object({
      archive: z.object({ title: t, description: t }),
      dailyTasks: z.object({ title: t, description: t }),
      settings: z.object({ title: t, languageHeading: t }),
      profile: z.object({
        title: t,
        namePlaceholder: t,
        avatarsHeading: t,
        rarity: z.object({
          [AvatarRarityEnum.common]: t,
          [AvatarRarityEnum.rare]: t,
          [AvatarRarityEnum.epic]: t,
          [AvatarRarityEnum.legendary]: t,
        }),
      }),
    }),
    // Shown instead of the technical error when a request fails.
    errors: z.object({
      identifyPlayer: t,
      registerPlayer: t,
      loadHome: t,
      startPlay: t,
      loadLeaderboard: t,
      joinChallenge: t,
      changeLanguage: t,
      setPlayerAvatar: t,
      setPlayerName: t,
    }),
  });
}

// The texts in one language, as the app receives them.
export const mobileTextsSchema = buildTextsSchema(localizedTextSchema);
export type MobileTexts = z.infer<typeof mobileTextsSchema>;

// The texts as the server is configured with them: every phrase in all its
// languages.
export const mobileTextsSourceSchema = buildTextsSchema(phraseSchema);
export type MobileTextsSource = z.infer<typeof mobileTextsSourceSchema>;
