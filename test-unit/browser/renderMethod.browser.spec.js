/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {getRenderedDisplays} from '../../lib/renderMethod.js';

// Needs a real engine: jsdom will hand back any string as a data URI without
// ever decoding it, so a URI that no browser can actually load still passes a
// jsdom assertion. The encoding is the thing under test here -- `btoa` lost
// the artwork of every credential with a name above U+00FF -- so it has to be
// a real image decoder that says whether the result loads.
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">' +
  '<title>{{name}}</title><rect width="40" height="40" fill="blue"/></svg>';

const load = src => new Promise(resolve => {
  const img = new Image();
  img.onload = () => resolve({ok: true, width: img.naturalWidth});
  img.onerror = () => resolve({ok: false});
  img.src = src;
});

describe('getRenderedDisplays in a browser', () => {
  it.each([
    ['ASCII', 'Card'],
    ['Chinese', '张伟'],
    ['Arabic', 'محمد']
  ])('produces a data URI a browser can decode for a %s name',
    async (_label, name) => {
      const [display] = await getRenderedDisplays({
        credential: {
          '@context': ['https://www.w3.org/ns/credentials/v2'],
          type: ['VerifiableCredential'],
          name,
          renderMethod: [{type: 'SvgRenderingTemplate2024', template: SVG}]
        }
      });
      const result = await load(display.content);
      expect(result.ok, `${name} should decode as an image`).toBe(true);
      expect(result.width).toBe(40);
    });
});
