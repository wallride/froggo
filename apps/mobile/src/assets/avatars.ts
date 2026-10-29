import { Image } from 'expo-image';

import type { MobileConfiguration } from '@dead-lines-inc/common.models';

import { assetUrl } from '../api/api-url';
import { useConfiguration } from '../configuration/configuration-context';

// Avatar image URLs by avatar id, worked out once per loaded configuration.
const urlsByConfiguration = new WeakMap<MobileConfiguration['avatars'], Map<string, string>>();

function getAvatarUrls(configuration: MobileConfiguration): Map<string, string> {
  let urls = urlsByConfiguration.get(configuration.avatars);
  if (!urls) {
    urls = new Map(
      configuration.avatars.map((avatar) => [avatar.id, assetUrl(configuration.api, avatar.url)]),
    );
    urlsByConfiguration.set(configuration.avatars, urls);
  }
  return urls;
}

// Where the avatar's image is, or undefined for an avatar the configuration
// doesn't know.
export function useAvatarUrl(avatarId: string): string | undefined {
  return getAvatarUrls(useConfiguration()).get(avatarId);
}

// Downloads every avatar image into the disk cache ahead of time, so they
// show at once wherever they appear, telling how far it's got (0..1).
// Best-effort: one that fails counts as done and is simply loaded when shown.
export async function prefetchAvatars(
  configuration: MobileConfiguration,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const urls = [...getAvatarUrls(configuration).values()];
  if (urls.length === 0) {
    onProgress(1);
    return;
  }

  let settled = 0;
  await Promise.all(
    urls.map((url) =>
      Image.prefetch(url, 'disk')
        .catch(() => false)
        .finally(() => onProgress(++settled / urls.length)),
    ),
  );
}
