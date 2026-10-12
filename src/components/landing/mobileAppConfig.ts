export type StoreAvailability = 'coming_soon' | 'available';

export interface MobileAppBannerConfig {
  enabled: boolean;
  heading: string;
  description: string;
  showDownloadButtons: boolean;
  ios: { availability: StoreAvailability; url: string | null };
  android: { availability: StoreAvailability; url: string | null };
}

// Shape mirrors the future Super Admin "Mobile app banner" settings. Until those exist, this static default is the source of truth.
export const MOBILE_APP_BANNER: MobileAppBannerConfig = {
  enabled: true,
  heading: 'Take Your Business Network Everywhere.',
  description: 'Your professional identity, business connections, supplier network and industry insights — always within reach.',
  showDownloadButtons: true,
  ios: { availability: 'coming_soon', url: null },
  android: { availability: 'coming_soon', url: null },
};

export const isStoreLive = (store: MobileAppBannerConfig['ios']) => store.availability === 'available' && !!store.url;
