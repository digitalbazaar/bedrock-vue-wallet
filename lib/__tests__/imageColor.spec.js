/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {analyzeArtwork} from '../imageColor.js';

const SRC = 'data:image/svg+xml;base64,PHN2Zy8+';
const TRIMMED_SRC = 'data:image/png;base64,TRIMMED';

/**
 * Builds pixels for an image with a uniform border around a solid centre, the
 * shape a render method produces when it draws its own card frame.
 *
 * @param root0
 * @param root0.width
 * @param root0.height
 * @param root0.border
 * @param root0.content
 * @param root0.margin
 */
function artwork({
  width, height, border = [235, 235, 235], content = [200, 40, 40],
  margin = 0
} = {}) {
  const data = new Uint8ClampedArray(width * height * 4);
  for(let y = 0; y < height; ++y) {
    for(let x = 0; x < width; ++x) {
      const inContent = margin === 0 || (x >= margin && x < width - margin &&
        y >= margin && y < height - margin);
      const [r, g, b] = inContent ? content : border;
      const i = ((y * width) + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return {data, width, height};
}

let drawCalls;

function stubCanvas({pixels, failContext = false}) {
  drawCalls = [];
  const context = {
    drawImage: (...args) => drawCalls.push(args),
    getImageData: () => pixels
  };
  vi.stubGlobal('Image', class {
    constructor() {
      this.naturalWidth = pixels.width;
      this.naturalHeight = pixels.height;
    }
    set src(value) {
      this._src = value;
      setTimeout(() => this.onload && this.onload(), 0);
    }
    get src() {
      return this._src;
    }
  });
  vi.spyOn(document, 'createElement').mockImplementation(tag => {
    if(tag !== 'canvas') {
      return {};
    }
    return {
      width: 0,
      height: 0,
      getContext: () => {
        if(failContext) {
          throw new Error('canvas unavailable');
        }
        return context;
      },
      toDataURL: () => TRIMMED_SRC
    };
  });
}

describe('analyzeArtwork', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the source untouched when there is nothing to read', async () => {
    expect(await analyzeArtwork({src: ''}))
      .toEqual({src: '', color: undefined});
    expect(await analyzeArtwork({src: undefined}))
      .toEqual({src: undefined, color: undefined});
  });

  it('trims a uniform frame the artwork draws around itself', async () => {
    stubCanvas({pixels: artwork({width: 320, height: 200, margin: 20})});
    const {src} = await analyzeArtwork({src: SRC});
    expect(src).toBe(TRIMMED_SRC);
    // the second draw crops to the content box rather than the whole image
    const [, sx, sy, sWidth, sHeight] = drawCalls[1];
    expect(sx).toBeGreaterThan(0);
    expect(sy).toBeGreaterThan(0);
    expect(sWidth).toBeLessThan(320);
    expect(sHeight).toBeLessThan(200);
  });

  it('leaves artwork with no frame alone', async () => {
    stubCanvas({pixels: artwork({width: 320, height: 200, margin: 0})});
    const {src} = await analyzeArtwork({src: SRC});
    expect(src).toBe(SRC);
    expect(drawCalls).toHaveLength(1);
  });

  it('reads colour from saturated pixels, not surrounding white',
    async () => {
      // the shape real artwork takes: a grey frame, a mostly white card inside
      // it, and a coloured stripe within that. Once the frame is trimmed the
      // content is still mostly white, so a plain average returns near-white
      // and only the saturation filter finds the stripe.
      const pixels = artwork({
        width: 320, height: 200, margin: 20,
        border: [235, 235, 235], content: [250, 250, 250]
      });
      for(let y = 20; y < 40; ++y) {
        for(let x = 20; x < 300; ++x) {
          const i = ((y * 320) + x) * 4;
          pixels.data[i] = 200;
          pixels.data[i + 1] = 30;
          pixels.data[i + 2] = 30;
        }
      }
      stubCanvas({pixels});
      const {color} = await analyzeArtwork({src: SRC});
      const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
      expect(r).toBeGreaterThan(150);
      expect(g).toBeLessThan(90);
      expect(b).toBeLessThan(90);
    });

  it('falls back to an average when the artwork has no saturated colour',
    async () => {
      stubCanvas({pixels: artwork({
        width: 320, height: 200, margin: 0,
        border: [128, 128, 128], content: [128, 128, 128]
      })});
      const {color} = await analyzeArtwork({src: SRC});
      expect(color).toBe('#808080');
    });

  it('gives back the original artwork when the canvas cannot be read',
    async () => {
      stubCanvas({
        pixels: artwork({width: 320, height: 200, margin: 20}),
        failContext: true
      });
      const result = await analyzeArtwork({src: SRC});
      // cross-origin artwork taints the canvas; that must not be silent
      expect(warnSpy).toHaveBeenCalled();
      expect(result).toEqual({src: SRC, color: undefined});
    });

  it('gives back the original artwork when the image cannot load', async () => {
    vi.stubGlobal('Image', class {
      set src(value) {
        setTimeout(() => this.onerror && this.onerror(), 0);
      }
    });
    const result = await analyzeArtwork({src: SRC});
    expect(result).toEqual({src: SRC, color: undefined});
  });
});
