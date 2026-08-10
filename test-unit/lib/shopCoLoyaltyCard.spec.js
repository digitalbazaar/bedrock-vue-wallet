/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
// A real credential, not a constructed one. This is the ShopCo loyalty card
// from digitalbazaar/vc-viewer#17 -- the shape that actually issues today.
//
// Which contexts it carries is load-bearing, and easy to "tidy" into something
// that no longer issues:
//
//   render-method/v2rc1  defines no TemplateRenderMethod, so nothing collides
//                        with the copy retail-dw/v1rc1 vendors
//   no outputPreference  because v2rc1 does not define that term
//   mediaType top-level  the position retail-dw's TemplateRenderMethod defines
//
// Moving to v2rc2, or adding outputPreference back, reintroduces a
// `protected term redefinition` on TemplateRenderMethod and the credential
// stops issuing. Verified against the published contexts with jsonld in
// safe mode.
import {describe, expect, it} from 'vitest';
import {getRenderedDisplays, selectDisplay} from '../../lib/renderMethod.js';
import credential from '../fixtures/shopco-loyalty-card.json';

describe('the ShopCo loyalty card', () => {
  it('offers exactly one rendering, and it is html', async () => {
    const displays = await getRenderedDisplays({credential});
    expect(displays).toHaveLength(1);
    expect(displays[0].kind).toBe('html');
    expect(displays[0].name).toBe('HTML');
  });

  it('takes its media type from the render method itself', async () => {
    // this credential predates `outputPreference`, so the only statement of
    // media type is on the render method. Reading solely `outputPreference`
    // would fall through to the suite default -- the right answer arrived at
    // for the wrong reason, and wrong for any other suite.
    const [display] = await getRenderedDisplays({credential});
    expect(credential.renderMethod[0].outputPreference).toBeUndefined();
    expect(credential.renderMethod[0].mediaType).toBe('text/html');
    expect(display.mediaType).toBe('text/html');
  });

  it('is shown as the hero rendering', async () => {
    const displays = await getRenderedDisplays({credential});
    const hero = selectDisplay({displays});
    expect(hero.kind).toBe('html');
    expect(hero.renderMethod).toBe(credential.renderMethod[0]);
  });

  it('states no access mode, and is not filtered out for it', async () => {
    // `accessMode` is optional; absent must not read as excluded
    const [display] = await getRenderedDisplays({credential});
    expect(display.accessMode).toEqual([]);
    expect(selectDisplay({displays: [display], accessMode: 'visual'}))
      .toBe(display);
  });

  it('carries the fields its template reads', async () => {
    // the template writes issuer name, account, programIdentifier and draws a
    // barcode from barCodeData; every one has to be disclosed or the card
    // renders blank in those places
    const {renderProperty} = credential.renderMethod[0];
    expect(renderProperty).toEqual(expect.arrayContaining([
      '/issuer/name', '/credentialSubject/account',
      '/credentialSubject/barCodeData', '/credentialSubject/programIdentifier'
    ]));
  });

  it('keeps the template inline rather than fetching it', async () => {
    // an inline template travels inside the signed credential; a fetched one
    // does not, and would put a network dependency in the render path
    expect(credential.renderMethod[0].template).toMatch(/^data:text\/html;/);
    expect(credential.renderMethod[0].url).toBeUndefined();
  });
});
