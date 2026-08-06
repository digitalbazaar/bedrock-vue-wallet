/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getRenderedImages} from '../renderMethod.js';

const DATA_URI = 'data:image/svg+xml;base64,PHN2Zy8+';

const decode = dataUri =>
  atob(dataUri.replace('data:image/svg+xml;base64,', ''));

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

  it('fetches a template when the render method gives a url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
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
    expect(fetchMock).toHaveBeenCalledWith('https://templates.example/card.svg');
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
