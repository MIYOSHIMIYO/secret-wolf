type Reason = "END" | "ABORT";

let lastShown = 0;
let cooldownMs = 120000;

export function setCooldownMs(ms: number) {
  cooldownMs = ms;
}

export function showBanner(place: string) {
  // TODO wire AdMob banner; placeholder no-op
}
export function hideBanner() {}

export function canShowInterstitial(reason: Reason) {
  const now = Date.now();
  return now - lastShown >= cooldownMs;
}
export function showInterstitial(_reason: Reason) {
  lastShown = Date.now();
} 