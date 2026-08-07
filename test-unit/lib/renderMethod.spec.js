/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getRenderedImages} from '../../lib/renderMethod.js';

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

describe('getRenderedImages', () => {
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
      expect(await getRenderedImages({credential: credential()})).toEqual([]);
      expect(await getRenderedImages({credential: undefined})).toEqual([]);
      expect(await getRenderedImages({
        credential: credential({renderMethod: []})
      })).toEqual([]);
    });

  it('ignores render methods it does not support', async () => {
    const images = await getRenderedImages({
      credential: credential({
        renderMethod: [{type: 'SomeFutureRenderingTemplate', id: DATA_URI}]
      })
    });
    expect(images).toEqual([]);
  });

  it('uses the id of an SvgRenderingTemplate2023 as the image', async () => {
    const images = await getRenderedImages({
      credential: credential({
        renderMethod: [{type: 'SvgRenderingTemplate2023', id: DATA_URI}]
      })
    });
    expect(images).toEqual([DATA_URI]);
  });

  it('substitutes credential values into a 2024 inline template', async () => {
    const images = await getRenderedImages({
      credential: credential({
        renderMethod: [{
          type: 'SvgRenderingTemplate2024',
          template: '<svg><text>{{credentialSubject.name}}</text></svg>'
        }]
      })
    });
    expect(images).toHaveLength(1);
    expect(decode(images[0])).toContain('Sam Doe');
    expect(decode(images[0])).not.toContain('{{');
  });

  it('renders a credential whose values are not Latin-1', async () => {
    // `btoa` throws on any code point above U+00FF, which silently cost every
    // credential with a CJK, Arabic or emoji value its artwork
    const images = await getRenderedImages({
      credential: credential({
        credentialSubject: {name: '陳大文'},
        renderMethod: [{
          type: 'SvgRenderingTemplate2024',
          template: '<svg><text>{{credentialSubject.name}}</text></svg>'
        }]
      })
    });
    expect(images).toHaveLength(1);
    expect(decode(images[0])).toContain('陳大文');
  });

  it('prefers an inline template over a url', async () => {
    // the inline template travels inside the signed credential; a fetched one
    // does not
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const images = await getRenderedImages({
      credential: credential({
        renderMethod: [{
          type: 'SvgRenderingTemplate2024',
          template: '<svg>inline</svg>',
          url: 'https://templates.example/card.svg'
        }]
      })
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(decode(images[0])).toContain('inline');
  });

  it('refuses a render method with no template and no usable url', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const images = await getRenderedImages({
      credential: credential({
        renderMethod: [{type: 'SvgRenderingTemplate2024'}]
      })
    });
    // `fetch(undefined)` would have requested the wallet's own origin and
    // rendered its markup as the credential's artwork
    expect(fetchMock).not.toHaveBeenCalled();
    expect(images).toEqual([]);
  });

  it('refuses a template url that is not https', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const images = await getRenderedImages({
      credential: credential({
        renderMethod: [{
          type: 'SvgRenderingTemplate2024', url: 'file:///etc/passwd'
        }]
      })
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(images).toEqual([]);
  });

  it('refuses an error page as artwork', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 404, text: async () => '<html>Not found</html>'
    }));
    const images = await getRenderedImages({
      credential: credential({
        renderMethod: [{
          type: 'SvgRenderingTemplate2024',
          url: 'https://templates.example/missing.svg'
        }]
      })
    });
    expect(errorSpy).toHaveBeenCalled();
    expect(images).toEqual([]);
  });

  it('fetches a template when the render method gives a url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<svg><text>{{credentialSubject.name}}</text></svg>'
    });
    vi.stubGlobal('fetch', fetchMock);
    const images = await getRenderedImages({
      credential: credential({
        renderMethod: [{
          type: 'SvgRenderingTemplate2024',
          url: 'https://templates.example/card.svg'
        }]
      })
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://templates.example/card.svg', expect.objectContaining({
        credentials: 'omit', signal: expect.anything()
      }));
    expect(decode(images[0])).toContain('Sam Doe');
  });

  it('drops a render method that fails without losing the others', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const images = await getRenderedImages({
      credential: credential({
        renderMethod: [
          {type: 'SvgRenderingTemplate2024', url: 'https://unreachable/card.svg'},
          {type: 'SvgRenderingTemplate2023', id: DATA_URI}
        ]
      })
    });
    // the failure is reported rather than swallowed
    expect(errorSpy).toHaveBeenCalled();
    expect(images).toEqual([DATA_URI]);
  });

  it('keeps render methods in the order the credential declares them',
    async () => {
      const images = await getRenderedImages({
        credential: credential({
          renderMethod: [
            {type: 'SvgRenderingTemplate2024', template: '<svg>first</svg>'},
            {type: 'SvgRenderingTemplate2024', template: '<svg>second</svg>'}
          ]
        })
      });
      expect(decode(images[0])).toContain('first');
      expect(decode(images[1])).toContain('second');
    });
});
