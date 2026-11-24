import { useEffect, useMemo, useState } from 'react';

import type { LocalizedText, MobileTexts } from '@dead-lines-inc/common.models';

import { useConfiguration } from '../configuration/configuration-context';

// MobileTexts with every LocalizedText collapsed to the one string shown.
export type ResolvedTexts<T> = T extends LocalizedText
  ? string
  : { [K in keyof T]: ResolvedTexts<T[K]> };

// Picks one variant of a text at random (a plain string has just the one) —
// another one than `previous`, if there is another.
export function pickText(text: LocalizedText, previous?: string): string {
  if (typeof text === 'string') return text;
  const variants = text.length > 1 ? text.filter((variant) => variant !== previous) : text;
  return variants[Math.floor(Math.random() * variants.length)];
}

// Picks a variant for every text in a (nested) section.
export function resolveTexts<T>(section: T): ResolvedTexts<T> {
  if (section === undefined || section === null) return section as ResolvedTexts<T>;
  if (typeof section === 'string' || Array.isArray(section)) {
    return pickText(section as LocalizedText) as ResolvedTexts<T>;
  }
  return Object.fromEntries(
    Object.entries(section as object).map(([key, value]) => [key, resolveTexts(value)]),
  ) as ResolvedTexts<T>;
}

// Fills `{name}` placeholders. Unknown placeholders are left as they are.
export function formatText(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

// One section of the configured texts, with variants already picked. The
// pick is made once per mount — texts don't change under the user on
// re-render — so a component that appears again (e.g. the next play's result
// overlay) gets a fresh pick.
export function useTexts<K extends keyof MobileTexts>(section: K): ResolvedTexts<MobileTexts[K]> {
  const { texts } = useConfiguration();
  return useMemo(() => resolveTexts(texts[section]), [texts, section]);
}

// One phrase of a section, picked anew whenever `revision` changes — for a
// phrase that must be different each time its screen is shown again (the home
// screen's quote), unlike useTexts' pick made once per mount. `revision` is
// anything that changes on that event, e.g. a counter bumped on focus.
export function useRepickedText<
  K extends keyof MobileTexts,
  P extends keyof MobileTexts[K],
>(section: K, key: P, revision: unknown): string {
  const { texts } = useConfiguration();
  const phrase = texts[section][key] as LocalizedText;
  const [picked, setPicked] = useState(() => pickText(phrase));

  useEffect(() => {
    // Another variant than the one on screen, if the phrase has a choice.
    setPicked((previous) => pickText(phrase, previous));
  }, [phrase, revision]);

  return picked;
}
