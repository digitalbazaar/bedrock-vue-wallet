# bedrock-vue-wallet

Vue 3 + Quasar UI components for a Bedrock-based digital credential wallet.
Stores and shares [Verifiable Credentials][] and drives credential exchanges
(OID4VCI, OID4VP, and CHAPI).

## Usage

This package is a **library**, not a runnable application. It is published as
`@bedrock/vue-wallet` and consumed by a host Bedrock web app, which provides the
backend (sessions, KMS, credential store) and the peer dependencies listed in
`package.json` (`vue`, `vue-router`, `@bedrock/quasar`, `@bedrock/web-wallet`,
etc.).

The host app wires the wallet in via the `initialize()` export:

```js
import {initialize} from '@bedrock/vue-wallet';

await initialize({app, router /*, features, quasarOptions */});
```

## Developer Mode (planned)

> Status: **specified, not yet implemented.** See
> [`docs/dev-mode-spec.md`](./docs/dev-mode-spec.md).

A developer-only UI overlay for desktop development, where camera hardware and
live issuers / relying parties are unavailable. It lets a developer drive wallet
flows by hand instead of scanning QR codes and running real exchanges.

- **Enable:** set a truthy `localStorage` flag `wallet.devMode` (e.g. in
  DevTools: `localStorage.setItem('wallet.devMode', '1')`). Off by default; the
  trigger is never installed in normal use, so production behavior is unchanged.
- **Open the panel:** press backtick (`` ` ``) three times in quick succession.
- **Tools:**
  - **Paste exchange URL** — paste an `https:` (`iuv=1`),
    `openid-credential-offer:`, or `openid4vp:` URL instead of scanning a QR
    code; it is fed into the existing scanner exchange pipeline.
  - **Seed test credentials** — once logged in, populate the dashboard with
    synthetic credentials so credential display/management UIs can be developed
    without running a full exchange.

[Verifiable Credentials]: https://www.w3.org/TR/vc-data-model-2.0/
