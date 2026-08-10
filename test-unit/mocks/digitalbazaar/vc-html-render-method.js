/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
// The real renderer builds a nested sandboxed iframe and talks to it over a
// MessageChannel, which jsdom cannot run. Specs that care about the rendering
// stub `CredentialHtmlDisplay` itself; this only has to keep the import
// resolvable for the components that reach it transitively.

// the handle from the most recent render, so a spec can drive the events the
// real renderer would emit from inside the frame
export let lastHandle = null;

export class HtmlRenderer {
  render() {
    const listeners = {};
    lastHandle = {
      ready: Promise.resolve(),
      element: null,
      destroyed: false,
      on(event, fn) {
        listeners[event] = fn;
      },
      emit(event, payload) {
        listeners[event]?.(payload);
      },
      destroy() {
        this.destroyed = true;
      }
    };
    return lastHandle;
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
