/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getRenderedDisplays} from '../../lib/renderMethod.js';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg">{{name}}</svg>';

const credentialWith = renderMethod => ({
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential'],
  name: 'Card',
  renderMethod
});

describe('getRenderedDisplays', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // `restoreAllMocks` does not undo `stubGlobal`, so a stubbed `fetch`
    // otherwise leaks into every later test in the file
    vi.unstubAllGlobals();
  });

  it('keeps the order the credential declares, not completion order',
    async () => {
      // the first method must fetch and so resolves last; before #146 this
      // used `forEach` over an async callback and the later one landed first
      vi.stubGlobal('fetch', vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return {ok: true, text: async () => '<svg>fetched</svg>'};
      }));
      const displays = await getRenderedDisplays({
        credential: credentialWith([
          {
            type: 'SvgRenderingTemplate2024', name: 'fetched-first',
            url: 'https://example.com/a.svg'
          },
          {
            type: 'SvgRenderingTemplate2023', name: 'inline-second',
            id: 'data:image/svg+xml,inline'
          }
        ])
      });
      // assert on the declared names, not the rendered content: the content
      // depends on the encoding, so asserting it makes this test fire for
      // reasons that have nothing to do with ordering
      expect(displays.map(display => display.name))
        .toEqual(['fetched-first', 'inline-second']);
    });

  it('contains a failure to the render method that caused it', async () => {
    const displays = await getRenderedDisplays({
      credential: credentialWith([
        // no template and no usable url: must not take the others down
        {type: 'SvgRenderingTemplate2024'},
        {type: 'SvgRenderingTemplate2023', id: 'data:image/svg+xml,survivor'}
      ])
    });
    expect(displays).toHaveLength(1);
    expect(displays[0].content).toBe('data:image/svg+xml,survivor');
  });

  it('prefers an inline template over a url', async () => {
    // the inline template travels inside the signed credential; a fetched one
    // does not, so it cannot be allowed to win
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const displays = await getRenderedDisplays({
      credential: credentialWith([{
        type: 'SvgRenderingTemplate2024',
        template: SVG,
        url: 'https://example.com/other.svg'
      }])
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(displays).toHaveLength(1);
  });

  it.each([
    ['a non-https url', {url: 'http://example.com/a.svg'}],
    ['no url at all', {}]
  ])('refuses to fetch with %s', async (_label, extra) => {
    // `fetch(undefined)` requested the wallet's own origin and rendered the
    // wallet's own markup as the credential's artwork
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const displays = await getRenderedDisplays({
      credential: credentialWith([{type: 'SvgRenderingTemplate2024', ...extra}])
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(displays).toHaveLength(0);
  });

  it('refuses a non-ok response rather than rendering an error page',
    async () => {
      vi.stubGlobal('fetch', vi.fn(async () => (
        {ok: false, status: 404, text: async () => '<html>Not found</html>'})));
      const displays = await getRenderedDisplays({
        credential: credentialWith([
          {type: 'SvgRenderingTemplate2024', url: 'https://example.com/a.svg'}
        ])
      });
      expect(displays).toHaveLength(0);
    });

  it.each([
    ['Chinese', '张伟'],
    ['Arabic', 'محمد'],
    ['Japanese', '田中']
  ])('keeps artwork for a %s name above U+00FF', async (_label, name) => {
    // `btoa` is Latin-1 only: it threw, and the throw escaped an unawaited
    // async callback, so the tab span forever with no error
    const displays = await getRenderedDisplays({
      credential: {...credentialWith([
        {type: 'SvgRenderingTemplate2024', template: SVG}
      ]), name}
    });
    expect(displays).toHaveLength(1);
    expect(decodeURIComponent(displays[0].content)).toContain(name);
  });

  it.each([
    ['an unwrapped object', {
      type: 'SvgRenderingTemplate2023', id: 'data:image/svg+xml,solo'
    }],
    ['a one-element array', [{
      type: 'SvgRenderingTemplate2023', id: 'data:image/svg+xml,solo'
    }]]
  ])('accepts renderMethod as %s', async (_label, renderMethod) => {
    // the term is `@container: @set`, so a single value may appear unwrapped
    const displays = await getRenderedDisplays({
      credential: credentialWith(renderMethod)
    });
    expect(displays.map(display => display.content))
      .toEqual(['data:image/svg+xml,solo']);
  });

  it('survives a renderMethod that is a bare node reference', async () => {
    // this threw `renderMethods.map is not a function` out of a call nothing
    // awaited, surfacing as an unhandled rejection rather than a missing image
    const displays = await getRenderedDisplays({
      credential: credentialWith('https://example.com/render-method')
    });
    expect(displays).toEqual([]);
  });

  it('does not resolve an inherited member as a media type', async () => {
    // the alias table was an object literal, so `mediaType: 'constructor'`
    // resolved to `Object.prototype.constructor` -- a function -- and that
    // became the display's media type
    const displays = await getRenderedDisplays({
      credential: credentialWith([{
        type: 'SvgRenderingTemplate2024', template: SVG,
        mediaType: 'constructor'
      }])
    });
    expect(typeof displays[0].mediaType).toBe('string');
    expect(displays[0].mediaType).toBe('constructor');
  });

  it('does not tell the template host which wallet asked', async () => {
    // the default `Referer` on a cross-origin request names the wallet origin,
    // which is not the template host's business
    const fetchSpy = vi.fn(async () => ({ok: true, text: async () => SVG}));
    vi.stubGlobal('fetch', fetchSpy);
    await getRenderedDisplays({
      credential: credentialWith([{
        type: 'SvgRenderingTemplate2024', url: 'https://issuer.example/t.svg'
      }])
    });
    expect(fetchSpy).toHaveBeenCalledWith('https://issuer.example/t.svg',
      expect.objectContaining({referrerPolicy: 'no-referrer'}));
  });

  it('refuses a body that declares more than the template limit',
    async () => {
      // `response.text()` read whatever an issuer served straight into memory
      const fetchSpy = vi.fn(async () => ({
        ok: true,
        headers: {get: name => name === 'content-length' ? '99999999' : null},
        text: async () => {
          throw new Error('the body must not be read');
        }
      }));
      vi.stubGlobal('fetch', fetchSpy);
      const displays = await getRenderedDisplays({
        credential: credentialWith([{
          type: 'SvgRenderingTemplate2024', url: 'https://issuer.example/big'
        }])
      });
      expect(displays).toHaveLength(0);
    });

  it('stops reading a body that runs past the template limit', async () => {
    // a host that declares no length can still serve one, so the read is
    // metered as it arrives and cancelled rather than finished
    let cancelled = false;
    const chunk = new Uint8Array(64 * 1024);
    let sent = 0;
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      headers: {get: () => null},
      body: {
        getReader: () => ({
          read: async () => {
            sent += chunk.byteLength;
            return {done: false, value: chunk};
          },
          cancel: async () => {
            cancelled = true;
          }
        })
      }
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const displays = await getRenderedDisplays({
      credential: credentialWith([{
        type: 'SvgRenderingTemplate2024', url: 'https://issuer.example/stream'
      }])
    });
    expect(displays).toHaveLength(0);
    expect(cancelled, 'the transfer must be stopped, not drained').toBe(true);
    // 512KB cap, so it gives up rather than reading forever
    expect(sent).toBeLessThan(2 * 1024 * 1024);
  });

  it('contains an oversized template to its own render method', async () => {
    // one issuer serving something enormous must not cost the credential its
    // other renderings
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      headers: {get: name => name === 'content-length' ? '99999999' : null},
      text: async () => SVG
    })));
    const displays = await getRenderedDisplays({
      credential: credentialWith([
        {type: 'SvgRenderingTemplate2024', url: 'https://issuer.example/big'},
        {type: 'SvgRenderingTemplate2024', template: SVG, name: 'inline'}
      ])
    });
    expect(displays).toHaveLength(1);
    expect(decodeURIComponent(displays[0].content)).toContain('Card');
  });

  it('fetches under an abort signal so a hung host cannot pend forever',
    async () => {
      // every render method is awaited together, so one host that accepts the
      // connection and never answers left the whole thing pending and the
      // Displays tab spinning with no error.
      //
      // This asserts the signal is wired, not that it fires after 8s:
      // `AbortSignal.timeout` is a platform primitive that vitest's fake
      // timers do not intercept, so asserting the duration would mean really
      // waiting for it. The containment test above covers what happens once
      // it does fire.
      const fetchSpy = vi.fn(async () => (
        {ok: true, text: async () => '<svg/>'}));
      vi.stubGlobal('fetch', fetchSpy);
      await getRenderedDisplays({
        credential: credentialWith([
          {type: 'SvgRenderingTemplate2024', url: 'https://example.com/a.svg'}
        ])
      });
      const [, options] = fetchSpy.mock.calls[0];
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(options.signal.aborted).toBe(false);
    });

  it('returns an html render method unrendered, for a mount owner',
    async () => {
      const renderMethod = {
        type: 'TemplateRenderMethod', renderSuite: 'html', template: '<p>hi</p>'
      };
      const displays = await getRenderedDisplays({
        credential: credentialWith([renderMethod])
      });
      expect(displays).toEqual([expect.objectContaining({
        kind: 'html', renderMethod
      })]);
    });

  it.each([
    ['on the render method itself', {mediaType: 'image/svg+xml'}],
    ['inside outputPreference',
      {outputPreference: {mediaType: 'image/svg+xml'}}]
  ])('reads a media type declared %s', async (_label, extra) => {
    const displays = await getRenderedDisplays({
      credential: credentialWith([
        {type: 'SvgRenderingTemplate2024', template: SVG, ...extra}
      ])
    });
    expect(displays[0].mediaType).toBe('image/svg+xml');
  });

  it.each([
    ['mode', {mode: 'auditory'}],
    ['accessMode', {accessMode: 'auditory'}]
  ])('reads the access mode spelled %s', async (_label, outputPreference) => {
    const displays = await getRenderedDisplays({
      credential: credentialWith([{
        type: 'SvgRenderingTemplate2024', template: SVG, outputPreference
      }])
    });
    expect(displays[0].accessMode).toEqual(['auditory']);
  });

  // How a template is loaded is not this module's decision. A deployment
  // sending its requests through a proxy or an OHTTP relay substitutes a
  // loader; nothing here changes, and nothing here reaches `fetch` directly.
  describe('loading a template through a supplied loader', () => {
    it('calls the loader it is given instead of fetching', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const loadDocument = vi.fn(async () => '<svg>from loader</svg>');

      const displays = await getRenderedDisplays({
        credential: credentialWith([{
          type: 'SvgRenderingTemplate2024',
          url: 'https://issuer.example/t.svg'
        }]),
        loadDocument
      });

      expect(loadDocument).toHaveBeenCalledWith(
        {url: 'https://issuer.example/t.svg'});
      expect(fetchSpy, 'the default loader must not also run')
        .not.toHaveBeenCalled();
      expect(decodeURIComponent(displays[0].content))
        .toContain('<svg>from loader</svg>');
    });

    it('contains a failing loader to its own render method', async () => {
      // one template that cannot be loaded must not take the other renderings
      // of the same credential down with it
      const loadDocument = vi.fn(async () => {
        throw new Error('refused');
      });
      const displays = await getRenderedDisplays({
        credential: credentialWith([
          {type: 'SvgRenderingTemplate2024',
            url: 'https://issuer.example/t.svg', name: 'fetched'},
          {type: 'SvgRenderingTemplate2024', template: SVG, name: 'inline'}
        ]),
        loadDocument
      });
      expect(displays.map(d => d.name)).toEqual(['inline']);
    });
  });
});
