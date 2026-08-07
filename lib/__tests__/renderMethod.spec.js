/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getRenderedDisplays, selectDisplay} from '../renderMethod.js';

const DATA_URI = 'data:image/svg+xml;base64,PHN2Zy8+';

const decode = dataUri =>
  decodeURIComponent(dataUri.replace('data:image/svg+xml;charset=utf-8,', ''));

function credential({renderMethod, ...rest} = {}) {
  return {
    type: ['VerifiableCredential'],
    credentialSubject: {name: 'Sam Doe'},
    ...rest,
    ...(renderMethod ? {renderMethod} : {})
  };
}

const svg2023 = (overrides = {}) =>
  ({type: 'SvgRenderingTemplate2023', id: DATA_URI, ...overrides});

const svg2024 = (template, overrides = {}) =>
  ({type: 'SvgRenderingTemplate2024', template, ...overrides});

const html = (overrides = {}) => ({
  type: 'TemplateRenderMethod',
  renderSuite: 'html',
  template: '<p>hello</p>',
  ...overrides
});

describe('getRenderedDisplays', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('returns nothing for a credential that does not render itself',
    async () => {
      expect(await getRenderedDisplays({credential: credential()})).toEqual([]);
      expect(await getRenderedDisplays({credential: undefined})).toEqual([]);
      expect(await getRenderedDisplays({
        credential: credential({renderMethod: []})
      })).toEqual([]);
    });

  it('accepts a single render method that is not in an array', async () => {
    // the spec allows `renderMethod` to be one object rather than a list, and
    // a credential written that way used to render nothing at all
    const displays = await getRenderedDisplays({
      credential: credential({renderMethod: svg2023()})
    });
    expect(displays).toHaveLength(1);
    expect(displays[0].content).toBe(DATA_URI);
  });

  it('ignores render methods it does not support', async () => {
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [{type: 'SomeFutureRenderingTemplate', id: DATA_URI}]
      })
    });
    expect(displays).toEqual([]);
  });

  it('uses the id of an SvgRenderingTemplate2023 as the image', async () => {
    const displays = await getRenderedDisplays({
      credential: credential({renderMethod: [svg2023()]})
    });
    expect(displays).toHaveLength(1);
    expect(displays[0]).toMatchObject({kind: 'image', content: DATA_URI});
  });

  it('substitutes credential values into a 2024 inline template', async () => {
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [
          svg2024('<svg><text>{{credentialSubject.name}}</text></svg>')
        ]
      })
    });
    expect(displays).toHaveLength(1);
    expect(decode(displays[0].content)).toContain('Sam Doe');
    expect(decode(displays[0].content)).not.toContain('{{');
  });

  it('renders a credential whose values are not Latin-1', async () => {
    // `btoa` throws on any code point above U+00FF, which silently cost every
    // credential with a CJK, Arabic or emoji value its artwork
    const displays = await getRenderedDisplays({
      credential: credential({
        credentialSubject: {name: '陳大文'},
        renderMethod: [
          svg2024('<svg><text>{{credentialSubject.name}}</text></svg>')
        ]
      })
    });
    expect(displays).toHaveLength(1);
    expect(decode(displays[0].content)).toContain('陳大文');
  });

  it('prefers an inline template over a url', async () => {
    // the inline template travels inside the signed credential; a fetched one
    // does not
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [svg2024('<svg>inline</svg>', {
          url: 'https://templates.example/card.svg'
        })]
      })
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(decode(displays[0].content)).toContain('inline');
  });

  it('refuses a render method with no template and no usable url', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [{type: 'SvgRenderingTemplate2024'}]
      })
    });
    // `fetch(undefined)` would have requested the wallet's own origin and
    // rendered its markup as the credential's artwork
    expect(fetchMock).not.toHaveBeenCalled();
    expect(displays).toEqual([]);
  });

  it('refuses a template url that is not https', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [svg2024(undefined, {url: 'file:///etc/passwd'})]
      })
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(displays).toEqual([]);
  });

  it('refuses an error page as artwork', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 404, text: async () => '<html>Not found</html>'
    }));
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [svg2024(undefined, {
          url: 'https://templates.example/missing.svg'
        })]
      })
    });
    expect(errorSpy).toHaveBeenCalled();
    expect(displays).toEqual([]);
  });

  it('fetches a template when the render method gives a url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<svg><text>{{credentialSubject.name}}</text></svg>'
    });
    vi.stubGlobal('fetch', fetchMock);
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [svg2024(undefined, {
          url: 'https://templates.example/card.svg'
        })]
      })
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://templates.example/card.svg', expect.objectContaining({
        credentials: 'omit', signal: expect.anything()
      }));
    expect(decode(displays[0].content)).toContain('Sam Doe');
  });

  it('drops a render method that fails without losing the others', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [
          svg2024(undefined, {url: 'https://unreachable/card.svg'}),
          svg2023()
        ]
      })
    });
    // the failure is reported rather than swallowed
    expect(errorSpy).toHaveBeenCalled();
    expect(displays).toHaveLength(1);
    expect(displays[0].content).toBe(DATA_URI);
  });

  it('keeps render methods in the order the credential declares them',
    async () => {
      const displays = await getRenderedDisplays({
        credential: credential({
          renderMethod: [
            svg2024('<svg>first</svg>'), svg2024('<svg>second</svg>')
          ]
        })
      });
      expect(decode(displays[0].content)).toContain('first');
      expect(decode(displays[1].content)).toContain('second');
    });

  it('describes an HTML render method without rendering it', async () => {
    // the HTML suite renders into a live sandboxed frame, so this layer can
    // only name it; the component owning the mount does the rendering
    const renderMethod = html();
    const displays = await getRenderedDisplays({
      credential: credential({renderMethod: [renderMethod]})
    });
    expect(displays).toHaveLength(1);
    expect(displays[0]).toMatchObject({kind: 'html', renderMethod});
    expect(displays[0].content).toBeUndefined();
  });

  it('ignores a TemplateRenderMethod of some other render suite', async () => {
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [html({renderSuite: 'pdf'})]
      })
    });
    expect(displays).toEqual([]);
  });

  it('carries the issuer output preference onto every display', async () => {
    const outputPreference = {
      accessMode: ['visual'],
      mediaType: 'application/html',
      style: {width: '800px', height: '800px'}
    };
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [html({name: 'Full card', outputPreference})]
      })
    });
    expect(displays[0]).toMatchObject({
      name: 'Full card',
      accessMode: ['visual'],
      style: {width: '800px', height: '800px'}
    });
  });

  it('gives a display the media type its render suite produces', async () => {
    // no credential in circulation declares `outputPreference` yet; without a
    // suite-implied media type they would all fall out of preference ordering
    const [svg, page] = await getRenderedDisplays({
      credential: credential({renderMethod: [svg2023(), html()]})
    });
    expect(svg.mediaType).toBe('image/svg+xml');
    expect(page.mediaType).toBe('text/html');
  });

  it('lets a declared media type override the one the suite implies',
    async () => {
      const displays = await getRenderedDisplays({
        credential: credential({
          renderMethod: [svg2023({
            outputPreference: {mediaType: 'image/png'}
          })]
        })
      });
      expect(displays[0].mediaType).toBe('image/png');
    });

  it('reads `application/html` as `text/html`', async () => {
    // `application/html` is what the spec's own example writes and it is not
    // an IANA registration; ranking a spec-conformant credential last for
    // following the spec would be the wrong failure
    const displays = await getRenderedDisplays({
      credential: credential({
        renderMethod: [
          html({outputPreference: {mediaType: 'application/html'}})
        ]
      })
    });
    expect(displays[0].mediaType).toBe('text/html');
  });
});

describe('selectDisplay', () => {
  const image = (mediaType, extra = {}) =>
    ({kind: 'image', content: DATA_URI, mediaType, accessMode: [], ...extra});
  const page = (mediaType, extra = {}) =>
    ({kind: 'html', renderMethod: html(), mediaType, accessMode: [], ...extra});

  it('has nothing to choose from an empty list', () => {
    expect(selectDisplay({displays: []})).toBe(null);
    expect(selectDisplay({displays: undefined})).toBe(null);
  });

  it('chooses the media type the surface prefers, not the first declared',
    () => {
      // the spec defines no issuer-side priority field, so the choice is the
      // wallet's to make against what this surface can actually render
      const svg = image('image/svg+xml');
      const chosen = selectDisplay({
        displays: [svg, page('text/html')],
        mediaTypes: ['text/html', 'image/svg+xml']
      });
      expect(chosen.kind).toBe('html');
      expect(selectDisplay({
        displays: [svg, page('text/html')],
        mediaTypes: ['image/svg+xml', 'text/html']
      })).toBe(svg);
    });

  it('falls back to declaration order among equally preferred displays', () => {
    const first = image('image/svg+xml', {content: 'first'});
    const second = image('image/svg+xml', {content: 'second'});
    expect(selectDisplay({
      displays: [first, second], mediaTypes: ['image/svg+xml']
    })).toBe(first);
  });

  it('skips a display whose access mode excludes this surface', () => {
    // a rendering the issuer marked auditory must not be shown as artwork
    const spoken = page('text/html', {accessMode: ['auditory']});
    const seen = image('image/svg+xml');
    expect(selectDisplay({
      displays: [spoken, seen],
      mediaTypes: ['text/html', 'image/svg+xml'],
      accessMode: 'visual'
    })).toBe(seen);
  });

  it('keeps a display that declares no access mode at all', () => {
    // `accessMode` is optional; absent must not mean excluded
    const seen = page('text/html');
    expect(selectDisplay({
      displays: [seen], mediaTypes: ['text/html'], accessMode: 'visual'
    })).toBe(seen);
  });

  it('chooses a display this surface does not prefer over showing none', () => {
    // an unranked media type still beats falling back to the plain card
    const png = image('image/png');
    expect(selectDisplay({displays: [png], mediaTypes: ['text/html']}))
      .toBe(png);
  });

  it('prefers any ranked display over an unranked one', () => {
    const png = image('image/png');
    const svg = image('image/svg+xml');
    expect(selectDisplay({
      displays: [png, svg], mediaTypes: ['image/svg+xml']
    })).toBe(svg);
  });

  it('returns nothing when every display is excluded', () => {
    expect(selectDisplay({
      displays: [page('text/html', {accessMode: ['tactile']})],
      accessMode: 'visual'
    })).toBe(null);
  });
});
