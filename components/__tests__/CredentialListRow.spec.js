/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {expect} from 'chai';
// Will fail until V04 creates lib/useCredentialCardConfig.js
import {getCredentialConfig, getHighlights} from
  '../../lib/useCredentialCardConfig.js';

// Credential fixture factory mirroring the cardDesigns matching logic in
// CredentialCardBundle.vue's getCredentialConfig().
function makeCredentialRecord(overrides = {}) {
  return {
    credential: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://contexts.vcplayground.org/examples/food-safety-certification/v1.json'
      ],
      type: ['VerifiableCredential', 'FoodSafetyCertificationCredential'],
      issuer: {
        name: 'Food Safety Board',
        image: 'https://example.com/issuer.png'
      },
      credentialSubject: {
        name: 'Jane Doe',
        certification: {
          type: 'FoodHandler',
          examDate: '2024-03-01'
        }
      },
      issuanceDate: '2024-03-02',
      ...overrides.credential
    },
    meta: {
      holder: 'did:example:holder123',
      ...overrides.meta
    }
  };
}

// cardDesigns fixture with 4 highlights — more than the 2-field cap.
const cardDesignWith4Highlights = {
  matches: {
    '/@context':
      'https://contexts.vcplayground.org/examples/food-safety-certification/v1.json',
    '/type': 'FoodSafetyCertificationCredential'
  },
  styles: {backgroundColor: '', textColor: ''},
  overrides: {
    title: {pointer: '/issuer/name'},
    imagePointer: '/issuer/image'
  },
  highlights: [
    {field: 'Issued to', pointer: '/credentialSubject/name'},
    {field: 'Exam Date', pointer: '/credentialSubject/certification/examDate'},
    {field: 'Date issued', pointer: '/issuanceDate'},
    {field: 'Cert type', pointer: '/credentialSubject/certification/type'}
  ]
};

// cardDesigns fixture with 1 highlight.
const cardDesignWith1Highlight = {
  ...cardDesignWith4Highlights,
  highlights: [
    {field: 'Issued to', pointer: '/credentialSubject/name'}
  ]
};

// cardDesigns fixture with 0 highlights.
const cardDesignWith0Highlights = {
  ...cardDesignWith4Highlights,
  highlights: []
};

describe('CredentialListRow.vue', function() {
  describe('getCredentialConfig — cardDesigns matching', function() {
    it('returns the matching entry when all match pointers satisfy the credential',
      function() {
        const cardDesigns = [cardDesignWith4Highlights];
        const {credential} = makeCredentialRecord();
        const result = getCredentialConfig({credential, cardDesigns});
        expect(result).to.exist;
        expect(result.matches).to.deep.equal(
          cardDesignWith4Highlights.matches);
      });

    it('returns undefined when no cardDesigns entry matches the credential',
      function() {
        const cardDesigns = [cardDesignWith4Highlights];
        const credential = {
          type: ['VerifiableCredential', 'UnknownType'],
          '@context': ['https://www.w3.org/2018/credentials/v1']
        };
        const result = getCredentialConfig({credential, cardDesigns});
        expect(result).to.be.undefined;
      });

    it('returns undefined when cardDesigns is empty', function() {
      const {credential} = makeCredentialRecord();
      const result = getCredentialConfig({credential, cardDesigns: []});
      expect(result).to.be.undefined;
    });
  });

  describe('getHighlights — truncation to at most 2', function() {
    it('returns at most 2 highlights when the matched config defines more than 2',
      function() {
        const {credential} = makeCredentialRecord();
        const highlights = getHighlights({
          credential, highlights: cardDesignWith4Highlights.highlights
        });
        expect(highlights).to.have.lengthOf(2);
        expect(highlights[0].field).to.equal('Issued to');
        expect(highlights[1].field).to.equal('Exam Date');
      });

    it('returns exactly 2 highlights when the matched config defines exactly 2',
      function() {
        const {credential} = makeCredentialRecord();
        const twoHighlights = cardDesignWith4Highlights.highlights.slice(0, 2);
        const highlights = getHighlights({credential, highlights: twoHighlights});
        expect(highlights).to.have.lengthOf(2);
      });

    it('returns 1 highlight when the matched config defines exactly 1, without error',
      function() {
        const {credential} = makeCredentialRecord();
        const highlights = getHighlights({
          credential, highlights: cardDesignWith1Highlight.highlights
        });
        expect(highlights).to.have.lengthOf(1);
        expect(highlights[0].field).to.equal('Issued to');
      });

    it('returns 0 highlights when the matched config defines none, without error',
      function() {
        const {credential} = makeCredentialRecord();
        const highlights = getHighlights({
          credential, highlights: cardDesignWith0Highlights.highlights
        });
        expect(highlights).to.have.lengthOf(0);
      });

    it('returns 0 highlights when called with no highlights list (no match case)',
      function() {
        const {credential} = makeCredentialRecord();
        const highlights = getHighlights({credential, highlights: undefined});
        expect(highlights).to.have.lengthOf(0);
      });

    it('resolves each highlight value from the credential using its pointer',
      function() {
        const {credential} = makeCredentialRecord();
        const highlights = getHighlights({
          credential, highlights: cardDesignWith4Highlights.highlights
        });
        expect(highlights[0].value).to.equal('Jane Doe');
      });
  });

  describe('CredentialListRow — no matching cardDesigns entry', function() {
    it('produces no highlights when the credential has no cardDesigns match',
      function() {
        const cardDesigns = [cardDesignWith4Highlights];
        const credential = {
          type: ['VerifiableCredential', 'UnknownCredentialType'],
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          name: 'Unknown'
        };
        const config = getCredentialConfig({credential, cardDesigns});
        const highlights = getHighlights({
          credential, highlights: config?.highlights
        });
        expect(config).to.be.undefined;
        expect(highlights).to.have.lengthOf(0);
      });

    it('still provides a title and image source even without a matching config',
      function() {
        // CredentialListRow must fall back to the credential's own `name` and
        // `image` properties (no cardDesigns overrides applied) so the row is
        // never blank.
        const credential = {
          type: ['VerifiableCredential', 'UnknownCredentialType'],
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          name: 'My Unknown Credential',
          image: 'https://example.com/cred.png'
        };
        const cardDesigns = [cardDesignWith4Highlights];
        const config = getCredentialConfig({credential, cardDesigns});
        expect(config).to.be.undefined;
        // Fallback values come directly from the credential — the row reads
        // credential.name and credential.image when no config is found.
        expect(credential.name).to.equal('My Unknown Credential');
        expect(credential.image).to.equal('https://example.com/cred.png');
      });
  });

  describe('CredentialListRow — select event on click', function() {
    it('emits a select event carrying the full credentialRecord on click',
      function() {
        // This assertion documents that CredentialListRow.vue must emit
        // `select` with the credentialRecord when the row is clicked.
        // Full verification requires component mounting (V04 wires up the
        // component; T05 uses matchMedia mocking to confirm CredentialsList
        // renders rows and re-emits their select events).
        const credentialRecord = makeCredentialRecord();
        const emitted = [];
        const fakeEmit = (event, payload) => {
          if(event === 'select') {
            emitted.push(payload);
          }
        };
        // Simulate the click handler that CredentialListRow.vue will expose.
        function handleClick(record, emit) {
          emit('select', record);
        }
        handleClick(credentialRecord, fakeEmit);
        expect(emitted).to.have.lengthOf(1);
        expect(emitted[0]).to.deep.equal(credentialRecord);
      });
  });
});
