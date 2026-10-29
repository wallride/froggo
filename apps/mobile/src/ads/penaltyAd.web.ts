import type { MobileAdsConfiguration } from '@dead-lines-inc/common.models';

// The Yandex Mobile Ads SDK is Android/iOS only: on the web there's no ad
// (yet), so the penalty passes straight away.

export function initializeAds(): Promise<void> {
  return Promise.resolve();
}

export function showPenaltyAd(_ads: MobileAdsConfiguration): Promise<void> {
  return Promise.resolve();
}
