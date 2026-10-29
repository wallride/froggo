import { Platform } from 'react-native';
import { InterstitialAdLoader, MobileAds } from 'yandex-mobile-ads';

import type { MobileAdsConfiguration } from '@dead-lines-inc/common.models';

// Past this, the player goes on without an ad rather than keep waiting.
const LOAD_TIMEOUT_MS = 10_000;

let initialized: Promise<void> | undefined;

// Starts the Yandex Mobile Ads SDK (Easy Monetization): early, at app start,
// so the first ad loads faster. Safe to call more than once.
export function initializeAds(): Promise<void> {
  initialized ??= Promise.resolve(MobileAds.initialize()).then(
    () => undefined,
    () => undefined,
  );
  return initialized;
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error(`Timed out after ${ms} ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Loads and shows the penalty interstitial, and resolves once it's over —
// closed by the player, or failed to load or show: a missing ad never keeps
// the player from going on.
export async function showPenaltyAd(ads: MobileAdsConfiguration): Promise<void> {
  const adUnitId = Platform.OS === 'ios' ? ads.penaltyAdUnitId.ios : ads.penaltyAdUnitId.android;
  try {
    await initializeAds();
    const loader = await InterstitialAdLoader.create();
    const ad = await withTimeout(loader.loadAd({ adUnitId }), LOAD_TIMEOUT_MS, () => {
      loader.cancelLoading().catch(() => undefined);
    });
    await new Promise<void>((resolve) => {
      ad.onAdDismissed = resolve;
      ad.onAdFailedToShow = () => resolve();
      ad.show().catch(() => resolve());
    });
  } catch {
    // No ad this time.
  }
}
