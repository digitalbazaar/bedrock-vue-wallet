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

export function getHighlights({credential, highlights = []}) {
  return highlights.slice(0, 2).map(({field, pointer, format, joinWith}) => {
    const raw = _getValueFromPointer(credential, pointer, joinWith);
    return {field, value: _formatString(raw, format)};
  });
}
