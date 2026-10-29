import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  Language,
  MobileTextsSource,
  mobileConfigurationSourceSchema,
  mobileTextsSourceSchema,
} from '@dead-lines-inc/common.models';

import { configurationSchema } from '../../Configuration';
import { localizeTexts, resolveLanguage } from './localize-texts';

const config = configurationSchema.parse(
  JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../../../../../.mount/cfg/mobile-api-configuration.json'),
      'utf-8',
    ),
  ),
);
const { languages, texts } = config.mobileConfiguration;

// The real texts, with one Russian phrase removed and Portuguese added to another.
function withPartialTranslations(): MobileTextsSource {
  const partial: MobileTextsSource = structuredClone(texts);
  delete (partial.common.goHome as Record<string, unknown>)['ru'];
  partial.common.playNext = { ...partial.common.playNext, 'pt-br': 'Próximo', pt: 'Seguinte' };
  return partial;
}

describe('resolveLanguage', () => {
  const offered: Language[] = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' },
    { code: 'pt-br', name: 'Português' },
  ];

  it('matches the exact tag, case-insensitively', () => {
    expect(resolveLanguage('pt-BR', offered)).toBe('pt-br');
    expect(resolveLanguage('pt_BR', offered)).toBe('pt-br');
  });

  it('falls back to the primary subtag', () => {
    expect(resolveLanguage('ru-RU', offered)).toBe('ru');
  });

  it('takes the first offered language from a list, in order', () => {
    expect(resolveLanguage('de-DE,ru-RU,en-US', offered)).toBe('ru');
    expect(resolveLanguage('en-US, ru-RU', offered)).toBe('en');
    expect(resolveLanguage('de-DE,fr-FR', offered)).toBe('en');
  });

  it('falls back to English when the language is not offered', () => {
    expect(resolveLanguage('de-DE', offered)).toBe('en');
    expect(resolveLanguage('pt', offered)).toBe('en');
    expect(resolveLanguage('', offered)).toBe('en');
    expect(resolveLanguage(undefined, offered)).toBe('en');
  });
});

describe('localizeTexts', () => {
  it('uses the language', () => {
    const localized = localizeTexts('ru', texts);
    expect(localized.common.play).toBe('Играть →');
    expect(localized.modes.freePlay.footnote).toBe('Вне отчётности · Без ограничений · Без записи');
  });

  it('keeps variants of a phrase as an array', () => {
    expect(Array.isArray(localizeTexts('ru', texts).death.playWon)).toBe(true);
  });

  it('falls back to English per phrase, not per language', () => {
    const localized = localizeTexts('ru', withPartialTranslations());
    expect(localized.common.goHome).toBe('Go home'); // no ru
    expect(localized.common.play).toBe('Играть →'); // has ru
  });

  it('prefers the exact regional code, then its primary subtag', () => {
    const partial = withPartialTranslations();
    partial.common.goHome = { ...partial.common.goHome, pt: 'Início' };
    expect(localizeTexts('pt-br', partial).common.playNext).toBe('Próximo');
    expect(localizeTexts('pt-br', partial).common.goHome).toBe('Início');
    expect(localizeTexts('pt-br', partial).common.play).toBe('Play →');
  });
});

describe('mobileTextsSourceSchema', () => {
  it('requires English for every phrase', () => {
    const partial = withPartialTranslations();
    delete (partial.leaderboard.title as Record<string, unknown>)['en'];
    expect(mobileTextsSourceSchema.safeParse(partial).success).toBe(false);
  });

  it('rejects uppercase language codes', () => {
    const partial = withPartialTranslations();
    partial.leaderboard.title = { ...partial.leaderboard.title, RU: 'x' };
    expect(mobileTextsSourceSchema.safeParse(partial).success).toBe(false);
  });
});

describe('mobileConfigurationSourceSchema', () => {
  const source = config.mobileConfiguration;

  it('accepts the configuration', () => {
    expect(mobileConfigurationSourceSchema.safeParse(source).success).toBe(true);
  });

  it('requires English among the languages', () => {
    const noEnglish = { ...source, languages: [{ code: 'ru', name: 'Русский' }] };
    expect(mobileConfigurationSourceSchema.safeParse(noEnglish).success).toBe(false);
  });

  it('rejects texts in a language that is not listed', () => {
    const unlisted = { ...source, languages: [{ code: 'en', name: 'English' }] };
    expect(mobileConfigurationSourceSchema.safeParse(unlisted).success).toBe(false);
  });

  it('rejects duplicate language codes', () => {
    const duplicated = { ...source, languages: [...source.languages, source.languages[0]] };
    expect(mobileConfigurationSourceSchema.safeParse(duplicated).success).toBe(false);
  });
});
