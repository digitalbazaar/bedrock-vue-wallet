/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */

// artwork is analysed at this width; enough detail to find edges and colours
// without the cost of a full-resolution read
const ANALYSIS_WIDTH = 320;

// the width a trimmed image is re-rendered at, so it stays sharp on a 3x screen
const OUTPUT_WIDTH = 900;

// how far a pixel may differ from the border colour and still count as border
const BORDER_TOLERANCE = 10;

// pixels more transparent than this say nothing about the artwork
const MIN_ALPHA = 16;

// a pixel must be at least this saturated to count as a colour rather than as
// part of a white/grey/black frame
const MIN_SATURATION = 0.18;

// trimming is only worth doing when it removes a visible margin
const MIN_TRIM_FRACTION = 0.02;

function _loadImage(src) {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = src;
  });
}

function _saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function _toHex(r, g, b) {
  const channel = v => Math.round(v).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * Finds the box that excludes a uniform border, so artwork that bakes its own
 * frame into the image can be shown edge to edge rather than as a card inside
 * a card.
 *
 * @param {ImageData} imageData - Pixels to inspect.
 *
 * @returns {{left: number, top: number, right: number, bottom: number}} The
 *   content box, in pixels.
 */
function _findContentBox(imageData) {
  const {data, width, height} = imageData;
  const at = (x, y) => {
    const i = ((y * width) + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const [br, bg, bb] = at(0, 0);
  const isBorder = (x, y) => {
    const [r, g, b, a] = at(x, y);
    if(a < MIN_ALPHA) {
      return true;
    }
    return Math.abs(r - br) <= BORDER_TOLERANCE &&
      Math.abs(g - bg) <= BORDER_TOLERANCE &&
      Math.abs(b - bb) <= BORDER_TOLERANCE;
  };
  const rowIsBorder = y => {
    for(let x = 0; x < width; ++x) {
      if(!isBorder(x, y)) {
        return false;
      }
    }
    return true;
  };
  const colIsBorder = x => {
    for(let y = 0; y < height; ++y) {
      if(!isBorder(x, y)) {
        return false;
      }
    }
    return true;
  };
  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;
  while(top < bottom && rowIsBorder(top)) {
    top++;
  }
  while(bottom > top && rowIsBorder(bottom)) {
    bottom--;
  }
  while(left < right && colIsBorder(left)) {
    left++;
  }
  while(right > left && colIsBorder(right)) {
    right--;
  }
  return {left, top, right, bottom};
}

/**
 * Inspects credential artwork: trims any uniform frame it draws around itself,
 * and reports the colour a surface behind it should be derived from. The colour
 * comes from saturated pixels where the artwork has any, so a white or grey
 * frame does not decide the colour of the band behind it.
 *
 * @param {object} options - The options to use.
 * @param {string} options.src - The image source; a data URI or a URL.
 *
 * @returns {Promise<{src: string, color: string|undefined}>} The artwork to
 *   display (trimmed when it had a frame) and its colour, if one could be read.
 */
export async function analyzeArtwork({src}) {
  if(typeof src !== 'string' || src.length === 0) {
    return {src, color: undefined};
  }
  const image = await _loadImage(src);
  if(!image) {
    return {src, color: undefined};
  }
  try {
    const ratio = (image.naturalHeight || 1) / (image.naturalWidth || 1);
    const width = ANALYSIS_WIDTH;
    const height = Math.max(1, Math.round(width * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', {willReadFrequently: true});
    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const box = _findContentBox(imageData);

    // colour, read from the content box only
    const {data} = imageData;
    let saturated = {r: 0, g: 0, b: 0, n: 0};
    let all = {r: 0, g: 0, b: 0, n: 0};
    for(let y = box.top; y <= box.bottom; ++y) {
      for(let x = box.left; x <= box.right; ++x) {
        const i = ((y * width) + x) * 4;
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
        if(a < MIN_ALPHA) {
          continue;
        }
        all = {r: all.r + r, g: all.g + g, b: all.b + b, n: all.n + 1};
        if(_saturation(r, g, b) >= MIN_SATURATION) {
          saturated = {
            r: saturated.r + r, g: saturated.g + g, b: saturated.b + b,
            n: saturated.n + 1
          };
        }
      }
    }
    const source = saturated.n > 0 ? saturated : all;
    const color = source.n > 0 ?
      _toHex(source.r / source.n, source.g / source.n, source.b / source.n) :
      undefined;

    // trim, only when there is a frame worth removing
    const boxWidth = (box.right - box.left) + 1;
    const boxHeight = (box.bottom - box.top) + 1;
    const trimmed = ((width - boxWidth) / width) > MIN_TRIM_FRACTION ||
      ((height - boxHeight) / height) > MIN_TRIM_FRACTION;
    if(!trimmed || boxWidth < 2 || boxHeight < 2) {
      return {src, color};
    }
    const output = document.createElement('canvas');
    output.width = OUTPUT_WIDTH;
    output.height = Math.max(1, Math.round(
      OUTPUT_WIDTH * (boxHeight / boxWidth)));
    const outputContext = output.getContext('2d');
    // scale the box back up to the source image's own coordinates
    const scale = (image.naturalWidth || width) / width;
    outputContext.drawImage(
      image,
      box.left * scale, box.top * scale, boxWidth * scale, boxHeight * scale,
      0, 0, output.width, output.height);
    return {src: output.toDataURL('image/png'), color};
  } catch(error) {
    // cross-origin artwork taints the canvas; the caller falls back to the
    // untrimmed image and a configured colour
    console.warn('Could not analyse credential artwork', error);
    return {src, color: undefined};
  }
}
