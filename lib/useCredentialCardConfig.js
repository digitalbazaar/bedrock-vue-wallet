/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */

function _getValueFromPointer(obj, pointer, joinWith) {
  function resolve(obj, pointer) {
    try {
      if(pointer === '') {
        return obj;
      }
      if(pointer[0] !== '/') {
        return '';
      }
      const fields = pointer.slice(1).split('/').map(p =>
        p.replaceAll('~1', '/').replaceAll('~0', '~'));
      // a missing segment resolves to nothing. Re-rooting at `obj` when an
      // intermediate is absent silently answers a different question: on a
      // credential with no `issuer`, `/issuer/image` came back as the
      // credential's own top-level `image`.
      const value = fields.reduce(
        (v, f) => (v === undefined || v === null ? undefined : v[f]), obj);
      return value ?? '';
    } catch(e) {
      console.error('Failed to get json value from pointer', e);
      return '';
    }
  }
  if(Array.isArray(pointer)) {
    return pointer
      .map(p => resolve(obj, p))
      .join(joinWith !== undefined ? joinWith : ', ');
  }
  return resolve(obj, pointer);
}

function _formatString(value, format) {
  if(format === 'capitalize') {
    const lower = value.toLowerCase().split(' ');
    return lower.map(v => v[0].toUpperCase() + v.slice(1)).join(' ');
  }
  if(format === 'capitalizeAndSeparate') {
    const result = value.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
  // 'date' format requires quasar's formatDate; callers that need it should
  // apply formatting separately after resolving the raw value here.
  return value;
}

export function getCredentialConfig({credential, cardDesigns}) {
  return cardDesigns?.find(design => {
    const pointers = Object.keys(design.matches);
    return pointers.every(pointer => {
      const value = _getValueFromPointer(credential, pointer);
      return Array.isArray(value) ?
        value.includes(design.matches[pointer]) :
        value === design.matches[pointer];
    });
  });
}

/**
 * The category a credential belongs to, from configured rules. The rules carry
 * the vocabulary (which types count as "Retail", and so on); this only matches
 * them, so the wallet library stays free of credential-type knowledge.
 *
 * Rules are evaluated in order and the first match wins, so a narrower rule
 * must be configured before a broader one it overlaps.
 *
 * @param {object} options - The options to use.
 * @param {object} options.credential - The credential to categorise.
 * @param {Array} [options.categories] - Configured `{category, matches}` rules.
 *
 * @returns {string|undefined} The category, or undefined when no rule matches.
 */
export function getCredentialCategory({credential, categories}) {
  if(!credential || !Array.isArray(categories)) {
    return undefined;
  }
  const rule = categories.find(({matches}) => {
    if(!matches) {
      return false;
    }
    return Object.keys(matches).every(pointer => {
      const value = _getValueFromPointer(credential, pointer);
      return Array.isArray(value) ?
        value.includes(matches[pointer]) :
        value === matches[pointer];
    });
  });
  return rule?.category;
}

/**
 * Names the kind of credential a record holds, for grouping and filtering.
 * Deliberately ignores instance-specific fields like `name` -- a credential
 * named after its subject ('Tim Doe') must still group under its kind
 * ('Birth Certificate Credential').
 *
 * @param {object} options - The options to use.
 * @param {object} options.credential - The credential to label.
 * @param {Array} [options.cardDesigns] - Configured card designs.
 *
 * @returns {string|undefined} The label, or undefined if the credential has
 *   no matching design and no type of its own.
 */
export function getCredentialTypeLabel({credential, cardDesigns}) {
  if(!credential) {
    return undefined;
  }
  const vcConfig = getCredentialConfig({credential, cardDesigns});
  if(vcConfig?.title) {
    return vcConfig.title;
  }
  const {type} = credential;
  const granularType = Array.isArray(type) ? type[type.length - 1] : type;
  if(typeof granularType !== 'string' || granularType.length === 0) {
    return undefined;
  }
  // 'MovieTicketCredential' -> 'Movie Ticket Credential', matching how
  // `@bedrock/vue-vc` names a credential with no configured title
  return granularType.replace(/(?!^)([A-Z]|\d+)/g, ' $1');
}

export function getHighlights({credential, highlights = []}) {
  return highlights.slice(0, 2).map(({field, pointer, format, joinWith}) => {
    const raw = _getValueFromPointer(credential, pointer, joinWith);
    return {field, value: _formatString(raw, format)};
  });
}
