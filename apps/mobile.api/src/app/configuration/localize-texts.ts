import {
  FALLBACK_LANGUAGE,
  isPhrase,
  Language,
  MobileTexts,
  MobileTextsSource,
} from '@dead-lines-inc/common.models';

// The language, out of the offered ones, that serves a requested BCP 47 tag
// or comma-separated list of tags (most preferred first): for each tag in
// turn, the tag itself ("pt-br"), then its primary subtag ("pt"); otherwise
// the fallback language.
export function resolveLanguage(requested: string | undefined, languages: readonly Language[]): string {
  const offered = languages.map((language) => language.code);
  const tags = (requested ?? '')
    .split(',')
    .map((tag) => tag.trim().toLowerCase().replace(/_/g, '-'))
    .filter(Boolean);

  for (const tag of tags) {
    const code = [tag, tag.split('-')[0]].find((candidate) => offered.includes(candidate));
    if (code) return code;
  }
  return FALLBACK_LANGUAGE;
}

function localizeNode(node: unknown, candidates: string[]): unknown {
  if (node === undefined) return undefined;
  const record = node as Record<string, unknown>;

  if (isPhrase(record)) {
    const language = candidates.find((code) => code in record) ?? FALLBACK_LANGUAGE;
    return record[language];
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, child]) => [key, localizeNode(child, candidates)]),
  );
}

// Picks, for each phrase, its values in the language — falling back to the
// language's primary subtag ("pt-br" -> "pt"), then to English, for phrases
// that have none in it.
export function localizeTexts(language: string, texts: MobileTextsSource): MobileTexts {
  return localizeNode(texts, [language, language.split('-')[0]]) as MobileTexts;
}
