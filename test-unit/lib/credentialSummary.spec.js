/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {getCredentialSummary} from '../../lib/credentialSummary.js';

const credential = (extra = {}) => ({
  type: ['VerifiableCredential', 'MovieTicketCredential'],
  credentialSubject: {},
  ...extra
});

const design = (extra = {}) => ({
  matches: {'/type': 'MovieTicketCredential'},
  ...extra
});

const summarise = (c, ...designs) =>
  getCredentialSummary({credential: c, cardDesigns: designs});

describe('the credential summary', () => {
  describe('its title', () => {
    // The reason this helper exists. `CredentialCardBundle` and
    // `CredentialDetailsMobile` applied the configured format and
    // `CredentialListRow` did not, so a title configured as a date rendered
    // formatted on two surfaces and raw on the third.
    it('applies the format the design configures', () => {
      const {title} = summarise(
        credential({credentialSubject: {holder: 'JANE DOE'}}),
        design({overrides: {title: {pointer: '/credentialSubject/holder',
          format: 'capitalize'}}}));
      expect(title).toBe('Jane Doe');
    });

    it('prefers the credential\'s own name over the design title', () => {
      const {title} = summarise(
        credential({name: 'Front Row, Tuesday'}),
        design({title: 'Movie Ticket'}));
      expect(title).toBe('Front Row, Tuesday');
    });

    it('falls back to the design title when the credential is unnamed', () => {
      expect(summarise(credential(), design({title: 'Movie Ticket'})).title)
        .toBe('Movie Ticket');
    });

    it('falls back to the separated type when no design matches', () => {
      expect(summarise(credential()).title).toBe('Movie Ticket Credential');
    });

    it('falls all the way through rather than rendering untitled', () => {
      // a configured pointer naming a field this credential does not carry
      // resolves to nothing, and a row with no text at all is unidentifiable
      const {title} = summarise(
        credential({type: []}),
        design({overrides: {title: {pointer: '/credentialSubject/absent'}}}));
      expect(title).toBe('Verifiable Credential');
    });
  });

  describe('its image', () => {
    it.each([
      ['a logo on the design', design({logo: 'https://x/logo.svg'}),
        {image: 'https://x/own.svg'}, 'https://x/logo.svg'],
      ['the configured pointer',
        design({overrides: {imagePointer: '/credentialSubject/art'}}),
        {credentialSubject: {art: 'https://x/art.svg'},
          image: 'https://x/own.svg'}, 'https://x/art.svg'],
      ['the credential image', design(), {image: 'https://x/own.svg'},
        'https://x/own.svg'],
      ['the issuer image', design(),
        {issuer: {image: 'https://x/iss.svg'}}, 'https://x/iss.svg'],
      ['the issuer logo', design(),
        {issuer: {logo: 'https://x/log.svg'}}, 'https://x/log.svg']
    ])('resolves %s', (_name, d, extra, expected) => {
      expect(summarise(credential(extra), d).image).toBe(expected);
    });

    it('unwraps an image given as an object', () => {
      // binding `{id, type}` straight to `src` renders "[object Object]"
      expect(summarise(credential({
        image: {id: 'https://x/own.svg', type: 'Image'}
      })).image).toBe('https://x/own.svg');
    });

    it('answers empty when the credential carries no image', () => {
      expect(summarise(credential()).image).toBe('');
    });
  });

  describe('its subtitle', () => {
    it('formats the configured row subtitle', () => {
      const {subtitle} = summarise(
        credential({credentialSubject: {seat: 'ROW A'}}),
        design({overrides: {rowSubtitle: {pointer: '/credentialSubject/seat',
          format: 'capitalize'}}}));
      expect(subtitle).toBe('Row A');
    });

    it('answers empty when none is configured', () => {
      expect(summarise(credential(), design()).subtitle).toBe('');
    });

    it('answers empty when the pointer resolves to nothing', () => {
      expect(summarise(credential(), design({
        overrides: {rowSubtitle: {pointer: '/credentialSubject/absent'}}
      })).subtitle).toBe('');
    });
  });

  describe('its description', () => {
    it('prefers the configured pointer', () => {
      expect(summarise(
        credential({description: 'own',
          credentialSubject: {blurb: 'configured'}}),
        design({overrides: {descriptionPointer: '/credentialSubject/blurb'}})
      ).description).toBe('configured');
    });

    it('falls back to the credential description', () => {
      expect(summarise(credential({description: 'own'})).description)
        .toBe('own');
    });
  });

  describe('its fields', () => {
    it('formats the configured highlights, in order', () => {
      const {fields} = summarise(
        // a midday UTC timestamp, not a date-only string: `formatString`'s
        // `date` renders in local time, so '2026-08-20' comes out as the 19th
        // anywhere west of UTC
        credential({credentialSubject: {
          seat: 'ROW A', when: '2026-08-20T12:00:00Z'
        }}),
        design({highlights: [
          {field: 'Seat', pointer: '/credentialSubject/seat',
            format: 'capitalize'},
          {field: 'When', pointer: '/credentialSubject/when', format: 'date'}
        ]}));
      expect(fields).toEqual([
        {label: 'Seat', value: 'Row A'},
        {label: 'When', value: '2026-08-20'}
      ]);
    });

    it('drops a highlight whose pointer resolves to nothing', () => {
      const {fields} = summarise(credential(), design({highlights: [
        {field: 'Seat', pointer: '/credentialSubject/absent'}
      ]}));
      expect(fields).toEqual([]);
    });

    it.each([
      ['a description, which has its own line above',
        {field: 'Description', pointer: '/credentialSubject/d'}, {d: 'text'}],
      ['artwork named as an image',
        {field: 'Card Image', pointer: '/credentialSubject/i'}, {i: 'url'}],
      ['a data URI, which is a rendering not a fact',
        {field: 'Art', pointer: '/credentialSubject/a'}, {a: 'data:image/x,y'}]
    ])('omits %s', (_name, highlight, subject) => {
      expect(summarise(
        credential({credentialSubject: subject}),
        design({highlights: [highlight]})).fields).toEqual([]);
    });

    it('falls back to the subject when no highlights are configured', () => {
      const {fields} = summarise(credential({
        credentialSubject: {seatNumber: 'A1', cardImage: 'url'}
      }));
      // the key becomes a label; the image field is still excluded
      expect(fields).toEqual([{label: 'Seat Number', value: 'A1'}]);
    });
  });

  it('answers an empty summary for no credential, never undefined', () => {
    // every caller reads `.title` straight into a template
    expect(getCredentialSummary({})).toEqual({
      title: '', subtitle: '', description: '', image: '', fields: []
    });
  });
});
