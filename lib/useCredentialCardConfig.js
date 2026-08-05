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
      return fields.reduce((v, f) => (v ? v[f] : obj[f]), '');
    } catch(e) {
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
