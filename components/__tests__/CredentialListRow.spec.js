/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {beforeEach, describe, expect, it} from 'vitest';
import {config} from '@bedrock/web';
import CredentialListRow from '../CredentialListRow.vue';
import {mount} from '@vue/test-utils';

const ALUMNI_SEAL = 'data:image/png;base64,AAAA';
const ISSUER_LOGO = 'https://example.com/logo.svg';

// mirrors the shape of a `cardDesigns` entry in the app's config
const DESIGNS = [{
  title: 'Permanent Resident Card',
  matches: {'/type': 'PermanentResidentCard'},
  // deliberately not `/name`: pointing it there would make a pointer-sourced
  // title indistinguishable from a name-sourced one, and the test could not
  // tell the two apart
  overrides: {
    title: {pointer: '/credentialSubject/givenName'},
    imagePointer: '/issuer/image'
  },
  // a different field from the title, so 'the highlight is not rendered' and
  // 'the title is rendered' cannot be satisfied by the same string
  highlights: [
    {field: 'Family Name', pointer: '/credentialSubject/familyName'}
  ]
}];

function record({credential = {}, meta = {}} = {}) {
  return {
    credential: {type: ['VerifiableCredential'], ...credential},
    meta: {id: 'urn:uuid:record-1', holder: 'urn:uuid:profile-1', ...meta}
  };
}

function render(credentialRecord) {
  return mount(CredentialListRow, {props: {credentialRecord}});
}

describe('CredentialListRow', () => {
  beforeEach(() => {
    config.vueWallet = {cardDesigns: DESIGNS};
  });

  describe('title', () => {
    // each case names the source the title must come from, so a regression
    // reports which link of the fallback chain broke
    const cases = [
      {
        from: 'the configured title pointer of a matching design',
        credential: {
          type: ['VerifiableCredential', 'PermanentResidentCard'],
          name: 'Name must not win over a resolved pointer',
          credentialSubject: {givenName: 'Jane'}
        },
        expected: 'Jane'
      },
      {
        from: 'the credential name when no design matches',
        credential: {
          type: ['VerifiableCredential'], name: 'Utopia Fire Fighter'
        },
        expected: 'Utopia Fire Fighter'
      },
      {
        from: 'the granular type, separated into words',
        credential: {type: ['VerifiableCredential', 'MovieTicketCredential']},
        expected: 'Movie Ticket Credential'
      },
      {
        from: 'the base type when the credential has nothing else',
        credential: {type: ['VerifiableCredential']},
        expected: 'Verifiable Credential'
      }
    ];
    for(const {from, credential, expected} of cases) {
      it(`takes the title from ${from}`, () => {
        const wrapper = render(record({credential}));
        expect(wrapper.text()).toContain(expected);
      });
    }

    it('never renders a row without a title', () => {
      // a credential with no name, no matching design and no granular type
      const wrapper = render(record({credential: {type: []}}));
      expect(wrapper.text().trim().length).toBeGreaterThan(0);
    });
  });

  describe('image', () => {
    it('uses the credential image when present', () => {
      const wrapper = render(record({
        credential: {image: ALUMNI_SEAL, issuer: {image: ISSUER_LOGO}}
      }));
      expect(wrapper.find('img').attributes('src')).toBe(ALUMNI_SEAL);
    });

    it('falls back to the issuer image', () => {
      const wrapper = render(
        record({credential: {issuer: {image: ISSUER_LOGO}}}));
      expect(wrapper.find('img').attributes('src')).toBe(ISSUER_LOGO);
    });

    it('falls back to the issuer logo', () => {
      const wrapper = render(
        record({credential: {issuer: {logo: ISSUER_LOGO}}}));
      expect(wrapper.find('img').attributes('src')).toBe(ISSUER_LOGO);
    });

    it('reads the id of an image expressed as an object', () => {
      const wrapper = render(record({
        credential: {image: {id: ALUMNI_SEAL, type: 'Image'}}
      }));
      expect(wrapper.find('img').attributes('src')).toBe(ALUMNI_SEAL);
    });

    it('renders no img element when the credential carries no image', () => {
      const wrapper = render(record({credential: {name: 'No Image Here'}}));
      expect(wrapper.find('img').exists()).toBe(false);
    });
  });

  it('renders the title alone, without highlight fields', () => {
    const wrapper = render(record({
      credential: {
        type: ['VerifiableCredential', 'PermanentResidentCard'],
        name: 'Unused',
        credentialSubject: {givenName: 'Jane', familyName: 'Doe'}
      }
    }));
    expect(wrapper.text()).toContain('Jane');
    // 'Family Name' is a configured highlight on the matching design; neither
    // its label nor its value belongs on a row
    expect(wrapper.text()).not.toContain('Family Name');
    expect(wrapper.text()).not.toContain('Doe');
  });

  it('emits the whole record on select, not just the credential', async () => {
    const credentialRecord = record({credential: {name: 'Tapped'}});
    const wrapper = render(credentialRecord);
    await wrapper.find('.credential-list-row').trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(1);
    // the details view needs `meta.holder` to delete, so the record has to
    // travel with the credential
    expect(wrapper.emitted('select')[0][0]).toStrictEqual(credentialRecord);
  });
});
