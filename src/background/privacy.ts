import type { Settings } from '../settings/schema';
// Curated endpoint list. No remote updates and no request-content inspection.
export const trackerDomains = [
  'google-analytics.com',
  'analytics.google.com',
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'scorecardresearch.com',
  'hotjar.com',
  'hotjar.io',
  'clarity.ms',
  'mouseflow.com',
  'fullstory.com',
  'segment.io',
  'api.segment.io',
  'mixpanel.com',
  'api.amplitude.com',
  'bat.bing.com',
  'connect.facebook.net',
  'analytics.tiktok.com',
  'ads-twitter.com',
  'analytics.twitter.com',
  'snap.licdn.com',
  'px.ads.linkedin.com',
  'criteo.com',
  'criteo.net',
  'quantserve.com',
  'outbrain.com',
  'taboola.com',
  'adnxs.com',
  'pubmatic.com',
  'rubiconproject.com',
  'casalemedia.com',
  'demdex.net',
  'omtrdc.net',
  'everesttech.net',
];
export function trackerRules(privacy: Settings['privacy']): chrome.declarativeNetRequest.Rule[] {
  if (!privacy.blockTrackers) return [];
  return trackerDomains.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
    condition: {
      requestDomains: [domain],
      excludedInitiatorDomains: privacy.exceptions,
      resourceTypes: [
        'script',
        'image',
        'xmlhttprequest',
        'sub_frame',
        'ping',
        'other',
      ] as chrome.declarativeNetRequest.ResourceType[],
    },
  }));
}
let pending = Promise.resolve();
export function syncPrivacy(settings: Settings) {
  pending = pending
    .catch(() => {})
    .then(async () => {
      if (!(await chrome.permissions.contains({ permissions: ['declarativeNetRequest'] }))) return;
      const previous = await chrome.declarativeNetRequest.getDynamicRules();
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: previous.map((r) => r.id),
        addRules: trackerRules(settings.privacy),
      });
    });
  return pending;
}
