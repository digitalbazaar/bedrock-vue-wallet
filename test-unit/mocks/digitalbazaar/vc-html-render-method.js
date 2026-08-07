/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
// The real renderer builds a nested sandboxed iframe and talks to it over a
// MessageChannel, which jsdom cannot run. Specs that care about the rendering
// stub `CredentialHtmlDisplay` itself; this only has to keep the import
// resolvable for the components that reach it transitively.

export class HtmlRenderer {
  render() {
    return {
      ready: Promise.resolve(),
      element: null,
      on() {},
      destroy() {}
    };
  }
}

export class RenderHandle {}

export function supportsHtml() {
  return false;
}

export function findHtmlRenderMethod() {
  return null;
}

export function findHtmlRenderMethods() {
  return [];
}

export function filterCredential({credential}) {
  return credential;
}

export function createHostDocument() {
  return '';
}

export function createTemplateDocument() {
  return '';
}
