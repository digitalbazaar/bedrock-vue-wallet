/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {date} from 'quasar';
import Mustache from 'mustache';

const {formatDate} = date;

// the render method types this wallet knows how to turn into an image
const SUPPORTED_RENDER_METHODS = [
  'SvgRenderingTemplate2023', 'SvgRenderingTemplate2024'
];

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
  if(!template || url) {
    const response = await fetch(url);
    svg = await response.text();
  }
  const rendered = Mustache.render(svg, {...values, ...formattingFunctions});
  return `data:image/svg+xml;base64,${btoa(rendered)}`;
}

/**
 * Produces the images a credential renders itself as, from its `renderMethod`
 * property. A credential with no supported render method yields none, which is
 * the caller's cue to fall back to its own presentation.
 *
 * @param {object} options - The options to use.
 * @param {object} options.credential - The credential to render.
 *
 * @returns {Promise<Array<string>>} Image sources, in render-method order.
 */
export async function getRenderedImages({credential}) {
  const methods = credential?.renderMethod;
  if(!Array.isArray(methods) || methods.length === 0) {
    return [];
  }
  const images = await Promise.all(methods.map(async renderMethod => {
    const {type} = renderMethod;
    if(!SUPPORTED_RENDER_METHODS.includes(type)) {
      return '';
    }
    try {
      if(type === 'SvgRenderingTemplate2023') {
        // the id is itself the image
        return renderMethod.id ?? '';
      }
      return await _renderTemplate2024({
        template: renderMethod.template,
        url: renderMethod.url,
        values: credential
      });
    } catch(e) {
      // a template that cannot be fetched or rendered must not take the whole
      // credential view down with it
      console.error('Failed to render credential render method', type, e);
      return '';
    }
  }));
  return images.filter(image => typeof image === 'string' && image.length > 0);
}
