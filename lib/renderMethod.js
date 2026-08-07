/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {date} from 'quasar';
import Mustache from 'mustache';

const {formatDate} = date;

// the render suites this wallet knows how to turn into something on screen.
// An SVG suite becomes an image here; the `html` suite becomes a live
// sandboxed frame, which only the component owning the mount can create.
const SVG_RENDER_METHODS = [
  'SvgRenderingTemplate2023', 'SvgRenderingTemplate2024'
];
const TEMPLATE_RENDER_METHOD = 'TemplateRenderMethod';
const HTML_RENDER_SUITE = 'html';

// The media type a render suite produces when the issuer states none.
// `outputPreference` is optional and no credential in circulation carries it
// yet, so without this every existing credential would drop out of preference
// ordering and the choice would collapse back to declaration order.
const SUITE_MEDIA_TYPE = {
  SvgRenderingTemplate2023: 'image/svg+xml',
  SvgRenderingTemplate2024: 'image/svg+xml',
  [HTML_RENDER_SUITE]: 'text/html'
};

// `application/html` is what the render-method spec's own `html` suite example
// writes, and it is not an IANA registration. Ranking a credential last for
// having followed the spec would be the wrong failure.
const MEDIA_TYPE_ALIASES = {'application/html': 'text/html'};

// what a visual credential surface can render, best first. The spec defines no
// issuer-side priority field -- `outputPreference` states what a rendering IS,
// not which one wins -- so the ranking is the wallet's to declare.
export const VISUAL_MEDIA_TYPES = ['text/html', 'image/svg+xml'];

// a template host that accepts the connection and never answers would
// otherwise leave the details view without artwork and without an error
const FETCH_TIMEOUT_MS = 8000;

/*
 * Functions available to a Mustache template.
 * See: https://github.com/janl/mustache.js#functions
 *
 * Example use in a template: {{#formatDate}}{{issuanceDate}}{{/formatDate}}
 */
const formattingFunctions = {
  formatDate: () => (text, render) => formatDate(render(text), 'YYYY-MM-DD')
};

/**
 * Renders one `SvgRenderingTemplate2024` entry: the template comes inline or
 * from a url, then credential values are substituted into it.
 *
 * @param {object} options - The options to use.
 * @param {string} [options.template] - An inline SVG template.
 * @param {string} [options.url] - Where to fetch the template from.
 * @param {object} options.values - The credential supplying the values.
 *
 * @returns {Promise<string>} An SVG data URI.
 */
async function _renderTemplate2024({template, url, values}) {
  let svg = template;
  // the inline template travels inside the signed credential and the fetched
  // one does not, so an inline template wins when both are present
  if(!svg) {
    if(typeof url !== 'string' || !/^https:\/\//.test(url)) {
      throw new Error(`Unusable render method template url "${url}".`);
    }
    const response = await fetch(url, {
      credentials: 'omit',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if(!response.ok) {
      // an error page would otherwise be rendered as the credential's artwork
      throw new Error(
        `Render method template fetch failed with ${response.status}.`);
    }
    svg = await response.text();
  }
  const rendered = Mustache.render(svg, {...values, ...formattingFunctions});
  // not `btoa`: it is Latin-1 only, so a credential holding any character
  // above U+00FF (a name in Chinese, Japanese, Korean, Arabic...) threw and
  // lost its artwork entirely
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rendered)}`;
}

/**
 * Reads the parts of a render method that describe the rendering rather than
 * produce it, so a caller can choose between renderings without building any
 * of them.
 *
 * @param {object} renderMethod - The render method to describe.
 * @param {string} suiteKey - Which entry of `SUITE_MEDIA_TYPE` applies.
 *
 * @returns {object} The `name`, `mediaType`, `accessMode` and `style` to
 *   carry onto the display.
 */
function _describe(renderMethod, suiteKey) {
  const {name = '', outputPreference = {}} = renderMethod;
  const {mediaType, style} = outputPreference;
  const declared = typeof mediaType === 'string' ?
    mediaType.toLowerCase() : undefined;
  // the render-method JSON-LD context names this term `mode`; the spec prose
  // calls it `accessMode`. Reading only one of them silently drops the access
  // mode of every credential that used the other spelling.
  const mode = outputPreference.mode ?? outputPreference.accessMode;
  return {
    name,
    mediaType: MEDIA_TYPE_ALIASES[declared] ?? declared ??
      SUITE_MEDIA_TYPE[suiteKey],
    // the term is `@container: @set`, so a single value may appear unwrapped
    accessMode: _toArray(mode),
    style
  };
}

/**
 * Wraps a `@set` value that may legitimately appear unwrapped in JSON.
 *
 * @param {*} value - The value to normalize.
 *
 * @returns {Array} The value as an array; empty when absent.
 */
function _toArray(value) {
  if(Array.isArray(value)) {
    return value;
  }
  return typeof value === 'string' ? [value] : [];
}

/**
 * Produces the renderings a credential declares for itself, from its
 * `renderMethod` property. A credential with no supported render method
 * yields none, which is the caller's cue to fall back to its own presentation.
 *
 * An image display carries its `content` -- a data URI, already rendered. An
 * html display carries only its `renderMethod`: the `html` suite runs issuer
 * script inside a sandboxed frame, so it can only be rendered by whoever owns
 * a mount point in the DOM.
 *
 * @param {object} options - The options to use.
 * @param {object} options.credential - The credential to render.
 *
 * @returns {Promise<Array<object>>} Displays, in render-method order, each
 *   `{kind: 'image'|'html', content?, renderMethod, name, mediaType,
 *   accessMode, style}`.
 */
export async function getRenderedDisplays({credential}) {
  let methods = credential?.renderMethod;
  if(!methods) {
    return [];
  }
  // the spec allows a single render method in place of a list
  if(!Array.isArray(methods)) {
    methods = [methods];
  }
  const displays = await Promise.all(methods.map(async renderMethod => {
    const {type, renderSuite} = renderMethod;
    if(type === TEMPLATE_RENDER_METHOD && renderSuite === HTML_RENDER_SUITE) {
      return {
        kind: 'html', renderMethod,
        ..._describe(renderMethod, HTML_RENDER_SUITE)
      };
    }
    if(!SVG_RENDER_METHODS.includes(type)) {
      // an issuer shipping a render method this wallet cannot draw is worth
      // knowing about; the credential still shows its plain card
      console.warn('Unsupported credential render method type', type,
        renderSuite);
      return null;
    }
    try {
      // for 2023 the id is itself the image
      const content = type === 'SvgRenderingTemplate2023' ?
        renderMethod.id : await _renderTemplate2024({
          template: renderMethod.template,
          url: renderMethod.url,
          values: credential
        });
      if(typeof content !== 'string' || content.length === 0) {
        return null;
      }
      return {
        kind: 'image', content, renderMethod, ..._describe(renderMethod, type)
      };
    } catch(e) {
      // a template that cannot be fetched or rendered must not take the whole
      // credential view down with it
      console.error('Failed to render credential render method', type, e);
      return null;
    }
  }));
  return displays.filter(display => display !== null);
}

/**
 * Chooses the one rendering a surface should show. Preference is expressed as
 * the media types that surface can render, best first; a credential that
 * declares an `outputPreference` steers the choice through it, and one that
 * declares none is ranked by what its render suite produces.
 *
 * @param {object} options - The options to use.
 * @param {Array<object>} [options.displays] - Displays from
 *   `getRenderedDisplays`.
 * @param {Array<string>} [options.mediaTypes] - Renderable media types, best
 *   first.
 * @param {string} [options.accessMode] - The access mode this surface serves.
 *
 * @returns {object|null} The chosen display, or `null` if none can be shown.
 */
export function selectDisplay({
  displays, mediaTypes = VISUAL_MEDIA_TYPES, accessMode = 'visual'
} = {}) {
  if(!Array.isArray(displays) || displays.length === 0) {
    return null;
  }
  // `accessMode` is optional, so an absent one means unstated, not excluded;
  // a rendering the issuer marked auditory must not be shown as artwork
  const usable = displays.filter(display => display.accessMode.length === 0 ||
    display.accessMode.includes(accessMode));
  if(usable.length === 0) {
    return null;
  }
  // an unranked media type still beats falling back to the plain card, so it
  // sorts last rather than out
  const rank = display => {
    const index = mediaTypes.indexOf(display.mediaType);
    return index === -1 ? mediaTypes.length : index;
  };
  // `reduce` rather than `sort`: a strict improvement keeps the first of any
  // equally preferred displays, which is the order the credential declared
  return usable.reduce((best, display) =>
    rank(display) < rank(best) ? display : best);
}
