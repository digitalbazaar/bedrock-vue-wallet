# Browser harness — HTML render method

```sh
cd test-unit && npm install
npm run browser          # http://localhost:8765/
```

Loads the ShopCo loyalty card from `shopco.json` and renders it through the
**installed** `@digitalbazaar/vc-html-render-method` — `/lib/*` is served
straight out of `node_modules`, so this cannot drift from what the wallet
actually ships. Paste any other credential into the left pane to test it.

## Why this exists rather than a unit test

The renderer builds a nested sandboxed iframe and drives it over a
`MessageChannel`. jsdom implements none of that, so every assertion about
isolation, CSP or selective disclosure is untestable in the vitest suite —
`CredentialHtmlDisplay.spec.js` stubs the library entirely. Those properties
are the whole point of the design, so they need somewhere to be checked.

## What it reports

**Render** draws the credential through its own template. **Run sandbox
checks** renders the same render method a second time with the template
swapped for a probe, leaving `renderProperty` exactly as the issuer wrote it —
so what the probe reports is what the issuer's own template sees.

Two buttons because a real issuer template has no reason to probe itself, and
this page cannot reach into the frame to do it for them: that isolation is the
property under test. The checks run **inside the template frame**, the only
place they mean anything, and paint their verdicts onto the card:

| check | expected |
|---|---|
| `cannot reach window.top` | `SecurityError` |
| `cannot reach parent document` | `SecurityError` |
| `origin is opaque` | `origin=null` |
| `credential is filtered` | only the `renderProperty` fields, plus `@context` and `type` |
| `network egress blocked` | refused |

and the left pane reports the host frame's CSP, the template frame's `sandbox`
attribute, and every `resize` the frame emits.

Two traps this is built to avoid, both of which produced false results by hand:

- **Running the checks in `top`.** A page can always reach its own
  `window.top`, and `script[name="credential"]` exists only inside the frame.
  Run from the wrong frame, the results look alarming and mean nothing.
- **Probing a host that has no CORS headers.** `example.com` rejects a fetch
  from any ordinary page, so "blocked" proves nothing. This probes
  `api.github.com`, which sends `Access-Control-Allow-Origin: *` — if that is
  refused, the CSP did it.

## What it has caught

A **resize feedback loop**. Setting the mount height from a reported height
re-lays-out the frame, which reports again: 324, 325, 326, 325, 326, 325…
oscillating on sub-pixel rounding. `CredentialHtmlDisplay` now ignores changes
at or below a 2px epsilon; `CredentialHtmlDisplay.spec.js` covers it.

Nothing here runs in CI — it needs a real browser and a human looking at a
card. Run it when the renderer, the library version, or a credential's
template changes.
