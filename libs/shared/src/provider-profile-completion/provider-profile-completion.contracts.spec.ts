import { describe, expect, it } from 'vitest';

import {
  PROVIDER_PROFILE_COMPLETION_ITEM_IDS,
  PROVIDER_PROFILE_COMPLETION_ITEM_STATUSES,
  type ProviderProfileCompletionResponse,
  type ProviderSocialLinksUpdateRequest,
} from './index';

describe('provider profile completion contracts', () => {
  it('publishes exactly the four canonical item identifiers', () => {
    expect(PROVIDER_PROFILE_COMPLETION_ITEM_IDS).toEqual([
      'BANK_ACCOUNT',
      'PHOTO',
      'SOCIAL_LINKS',
      'ADDRESS',
    ]);
  });

  it('publishes all canonical item statuses', () => {
    expect(PROVIDER_PROFILE_COMPLETION_ITEM_STATUSES).toEqual([
      'PENDING',
      'PROCESSING',
      'COMPLETE',
      'ERROR',
    ]);
  });

  it('accepts a JSON-safe aggregate fixture with every identifier and status', () => {
    const response: ProviderProfileCompletionResponse = {
      payoutReady: false,
      allComplete: false,
      required: { completed: 0, total: 1 },
      recommended: { completed: 1, total: 3 },
      items: PROVIDER_PROFILE_COMPLETION_ITEM_IDS.map((id, index) => ({
        id,
        status: PROVIDER_PROFILE_COMPLETION_ITEM_STATUSES[index],
        requiredForPayout: id === 'BANK_ACCOUNT',
      })),
    };

    expect(JSON.parse(JSON.stringify(response))).toEqual(response);
    expect(typeof response.required.completed).toBe('number');
    expect(typeof response.recommended.total).toBe('number');
    expect(typeof response.payoutReady).toBe('boolean');
    expect(typeof response.allComplete).toBe('boolean');
  });

  it('accepts populated, absent, and null social-link updates', () => {
    const populated: ProviderSocialLinksUpdateRequest = {
      whatsapp: '+5511999999999',
      instagram: '@provider',
      facebook: 'provider',
      linkedin: 'provider',
    };
    const absent: ProviderSocialLinksUpdateRequest = {};
    const cleared: ProviderSocialLinksUpdateRequest = {
      whatsapp: null,
      instagram: null,
      facebook: null,
      linkedin: null,
    };

    expect(populated.linkedin).toBe('provider');
    expect(absent).toEqual({});
    expect(cleared.whatsapp).toBeNull();
  });
});
