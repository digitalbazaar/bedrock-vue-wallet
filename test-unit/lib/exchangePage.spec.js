/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {getExchangePage} from '../../lib/useCredentialCardConfig.js';

// The pages carry the vocabulary -- which offered credential gets a page --
// and the library only matches them. These fixtures are the library's own.
const TICKET_PAGE = {
  matches: {'/type': 'TicketOfferCredential'},
  request: 'would like you to confirm a ticket',
  component: () => {}
};
const PAGES = [TICKET_PAGE];

const credential = type => ({type: ['VerifiableCredential', type]});

describe('getExchangePage()', () => {
  it('picks the page a matching offered credential names', () => {
    const credentials = [credential('TicketOfferCredential')];
    expect(getExchangePage({credentials, exchangePages: PAGES}))
      .toBe(TICKET_PAGE);
  });

  it('matches any offered credential, not only the first', () => {
    const credentials = [
      credential('SomethingElse'), credential('TicketOfferCredential')
    ];
    expect(getExchangePage({credentials, exchangePages: PAGES}))
      .toBe(TICKET_PAGE);
  });

  it('returns nothing when no offered credential matches', () => {
    const credentials = [credential('SomethingElse')];
    expect(getExchangePage({credentials, exchangePages: PAGES}))
      .toBeUndefined();
  });

  it('returns nothing when no pages are configured', () => {
    const credentials = [credential('TicketOfferCredential')];
    expect(getExchangePage({credentials, exchangePages: []}))
      .toBeUndefined();
    expect(getExchangePage({credentials})).toBeUndefined();
  });

  it('skips a page without matches', () => {
    const credentials = [credential('TicketOfferCredential')];
    expect(getExchangePage({
      credentials, exchangePages: [{component: () => {}}]
    })).toBeUndefined();
  });
});
