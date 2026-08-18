/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {
  getCategoryOrder, getCredentialCategory, UNCATEGORISED
} from '../../lib/useCredentialCardConfig.js';

// The rules carry the vocabulary -- which types count as "Retail" -- and the
// library only matches them, so it stays free of credential-type knowledge.
// These fixtures are the library's own, not a deployment's: a test bound to a
// deployment's config breaks when that deployment changes its taxonomy, which
// says nothing about this code.
const RULES = [
  {category: 'Payment', matches: {'/credentialSubject/type': 'PaymentToken'}},
  {category: 'Retail', matches: {'/type': 'MovieTicketCredential'}},
  {category: 'Retail', matches: {'/type': 'LoyaltyCardCredential'}},
  {category: 'Identity', matches: {'/type': 'PermanentResidentCard'}}
];

const credential = (type, subjectType) => ({
  type: ['VerifiableCredential', type],
  credentialSubject: subjectType ? {type: subjectType} : {}
});

const TICKET = credential('MovieTicketCredential');
const LOYALTY = credential('LoyaltyCardCredential');
const RESIDENT = credential('PermanentResidentCard');
const TOKEN = credential('PaymentCredential', 'PaymentToken');
const UNKNOWN = credential('SomethingNobodyConfigured');

describe('getCredentialCategory', () => {
  it.each([
    [TICKET, 'Retail'],
    [LOYALTY, 'Retail'],
    [RESIDENT, 'Identity'],
    [TOKEN, 'Payment']
  ])('matches a configured rule', (cred, expected) => {
    expect(getCredentialCategory({credential: cred, categories: RULES}))
      .toBe(expected);
  });

  it('puts a credential no rule claims in the catch-all', () => {
    expect(getCredentialCategory({credential: UNKNOWN, categories: RULES}))
      .toBe(UNCATEGORISED);
  });

  it.each([
    ['no rules configured', undefined],
    ['an empty rule list', []]
  ])('falls back to the catch-all with %s', (_label, categories) => {
    expect(getCredentialCategory({credential: TICKET, categories}))
      .toBe(UNCATEGORISED);
  });

  it('takes the first matching rule, so a narrow rule can precede a broad one',
    () => {
      const narrowFirst = [
        {category: 'Tickets', matches: {'/type': 'MovieTicketCredential'}},
        ...RULES
      ];
      expect(getCredentialCategory({credential: TICKET,
        categories: narrowFirst})).toBe('Tickets');
    });

  it('ignores a rule with no matches rather than throwing on it', () => {
    const categories = [{category: 'Broken'}, ...RULES];
    expect(getCredentialCategory({credential: TICKET, categories}))
      .toBe('Retail');
  });
});

describe('getCategoryOrder', () => {
  it('lists categories in configured order, catch-all last', () => {
    const order = getCategoryOrder({
      credentials: [UNKNOWN, RESIDENT, TICKET, TOKEN], categories: RULES
    });
    expect(order).toEqual(['Payment', 'Retail', 'Identity', UNCATEGORISED]);
  });

  it('omits a configured category with nothing in it', () => {
    const order = getCategoryOrder({
      credentials: [TICKET], categories: RULES
    });
    // asserted as an exact list: `not.toContain` would also be satisfied by
    // an empty array, so it passes when the band fails to render at all
    expect(order).toEqual(['Retail']);
  });

  it('collapses several credentials of one category into one entry', () => {
    // two DIFFERENT Retail credentials: passing the same object twice cannot
    // distinguish collapsing by category from deduplicating by identity
    const order = getCategoryOrder({
      credentials: [TICKET, LOYALTY], categories: RULES
    });
    expect(order).toEqual(['Retail']);
  });

  it('lists only the catch-all when no credential matches a rule', () => {
    expect(getCategoryOrder({credentials: [UNKNOWN], categories: RULES}))
      .toEqual([UNCATEGORISED]);
  });

  it('does not repeat the catch-all when a rule also declares it', () => {
    // a deployment is free to configure a rule named 'Other'; an unguarded
    // push produced it twice, and a duplicate `v-for` key with it
    const categories = [
      {category: UNCATEGORISED, matches: {'/type': 'MovieTicketCredential'}}
    ];
    expect(getCategoryOrder({credentials: [TICKET, UNKNOWN], categories}))
      .toEqual([UNCATEGORISED]);
  });

  it('is empty when there are no credentials', () => {
    expect(getCategoryOrder({credentials: [], categories: RULES})).toEqual([]);
  });
});
