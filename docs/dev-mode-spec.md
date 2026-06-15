# Spec: Developer Mode Overlay

Status: FINALIZED — ready to implement
Date: 2026-06-dd
Repo: bedrock-vue-wallet (public / treated as `green`)

## Goal

A developer-only UI overlay for desktop development of the wallet, where
hardware (camera) and live counterparties (relying parties / issuers) are
unavailable. Lets a developer drive wallet flows by hand instead of scanning
QR codes and running real exchanges.

## Trigger

- Gated by a `localStorage` flag `wallet.devMode` (any truthy value enables).
  Flip in DevTools, no rebuild. Off by default; never on for normal users.
- When enabled, pressing **backtick (`` ` ``) three times** in quick succession
  (within ~500 ms) toggles the dev panel open/closed.
- When the flag is absent/falsy, the key listener is never installed — zero
  behavior change in production.

## Architecture

- Global overlay component mounted in `components/WalletLayout.vue`, as a
  sibling of `<q-page-container>` inside `<q-layout>`, so it is reachable on
  every page.
- New component: `components/DevModeOverlay.vue` (Quasar `q-dialog`/drawer).
- Pure helpers in `lib/devMode.js`:
  - `isDevModeEnabled()` — reads `localStorage['wallet.devMode']`.
  - `createTripleKeyDetector({key, window, onTrigger})` — trigger logic.
  - `parseExchangeInput(text)` — validates a pasted URL is a supported protocol
    (`https:` + `iuv=1`, `openid-credential-offer:`, `openid4vp:`) before
    handing off. Mirrors the checks in `ScannerExchangePage.handleQrCode`.
- TDD: skipped per decision (dev-only tooling). Light tests may be added after
  for `parseExchangeInput` / detector if cheap.

## Tools (finalized after review)

### 1. Paste exchange URL — primary deliverable

- Text area + "Open exchange" button.
- On submit, navigate to `/scanner` and feed the text into the existing scan
  pipeline as `handleScan({type: 'QR_CODE', text})`
  (`routes/ScannerExchangePage.vue:164`). No new exchange logic — reuses
  `handleQrCode` end to end.
- Handoff mechanism: **route query param** (decided). Overlay does
  `router.push({path: '/scanner', query: {devUrl: <text>}})`;
  `ScannerExchangePage` reads `route.query.devUrl` on mount (only when dev mode
  on), skips `BarcodeScanner`, and calls
  `handleScan({type: 'QR_CODE', text: devUrl})`. Chosen over a shared ref
  because it is reload-safe and visible/editable in the address bar during dev.

### 2. Quick login bypass — DROPPED (per review)

- Not doable as a UI-layer change: session is server-backed via
  `@bedrock/web-session`; `requireLogin` checks `session.data.account !== null`
  (`lib/router.js:222`). Faking it in memory fails on the next real API call.
- Out of scope. Revisit only if a backend dev session endpoint becomes
  available.

### 3. Seed test credentials — KEPT (independent value, post-login)

- `getCredentialStore({profileId, password: profileId})` then
  `.add({credentials})` (pattern at `ScannerExchangePage.vue:372`).
- `profileId` comes from `profileManager.getProfiles()` (`HomePage.vue:42`),
  which requires a real logged-in account — so seeding works **after** a normal
  login; it cannot bootstrap an empty/unauthenticated wallet.
- **Why it's useful today:** the only current way to get a credential into the
  wallet is to run a full exchange (issuer → QR/URL → click through store).
  Seeding lets a dev, once logged in, one-click populate the dashboard so they
  can iterate on credential *display* and *management* UIs (dashboard cards,
  details view, delete, share-selection) without re-running an exchange each
  reload. It does not test issuance itself — that's tool #1.
- Fixtures: synthetic, no-PII VCs. Starter set:
  1. **OpenBadgeCredential** — the JFF x VC-EDU PlugFest 3 example taken from
     `vc-playground-docs/_includes/example-issued-credential.html` (image +
     achievement layout).
  2. **UniversityDegreeCredential** — canonical W3C example, text-heavy card.
  3. A **photo-bearing ID-style** VC — exercises subject image rendering.
  Committed as JSON in `lib/devModeFixtures.js`. Source: sibling
  `../vc-playground-docs` and standard W3C examples (all public, synthetic).

## Privacy / Security notes

- No customer/personal data. Fixture VCs are synthetic.
- Dev mode is off by default and the key listener is not installed unless the
  `localStorage` flag is set. No new network surface — only reuses existing
  exchange / credential-store APIs the user already has access to.
- Nothing here weakens server-side auth (that's why login-bypass is dropped,
  which is the correct security posture).

## Files touched

- NEW `components/DevModeOverlay.vue`
- NEW `lib/devMode.js`
- NEW `lib/devModeFixtures.js`
- EDIT `components/WalletLayout.vue` (mount overlay)
- EDIT `routes/ScannerExchangePage.vue` (consume pasted-URL handoff)
- NEW/EDIT `README.md` — document dev mode (how to enable the `localStorage`
  flag, the triple-backtick trigger, and the available tools). Per review (c5)
  and repo PR convention, README is updated in this branch.

## Resolved review questions

1. Login-bypass — **dropped** (c1).
2. Seeding — **kept**; rationale documented above (c2).
3. Fixtures — modeled on VC Playground catalog (c3); 2–3 starter VCs.
4. Pasted-URL handoff — **route query param**, reload-safe and debuggable (c4).
5. README — **added/updated in this branch** (c5).
