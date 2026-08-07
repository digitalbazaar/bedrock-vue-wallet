# PRD: Veres Wallet Mobile Listing Redesign

## Status: Draft

## Problem Statement
The mobile wallet home screen has no way to group credentials by type, a
manual refresh button instead of pull-to-refresh, and pulls every displayable
credential for every profile in one shot on load (`HomePage.vue`'s own FIXME
already flags this). It needs a purely functional pass -- no animation, no
card-grid -- before a stakeholder review.

## Goals
Ship a functional mobile listing (category chips + compact rows +
pull-to-refresh) for Manu's review on **Friday 2026-08-07**, with Benjamin
signing off alongside him. "Functional" means: works correctly on real
credential data, matches the simplest layout discussed in the design-review
meeting, no polish/animation pass.

## Anti-Goals
- Card-grid view (list-first only; card view is a fallback only if Manu
  explicitly asks for it Friday)
- Frecency-based ordering, curated (non-auto) category groupings,
  selective-disclosure share screen, swipeable "lifestyle" strip -- all
  explicitly deferred per the design-review meeting
- Any transition/flip animation
- The credential-detail dialog-to-route conversion -- **Benjamin's track**,
  out of scope here (see Coordination below)
- Batch-first initial load -- real fix needs an EDV `.find()` pagination
  investigation; **stretch goal only**, not blocking Friday

## Solution Overview
Scoped entirely to `bedrock-vue-wallet`'s mobile `matchMedia` breakpoint
(same pattern PR #137 established for the credential-detail dialog) --
`veres-wallet`'s desktop layout is untouched.

Component chain today: `routes/HomePage.vue` -> `CredentialDashboard.vue` ->
`CredentialsList.vue` -> `CredentialCardBundle.vue` per row. On mobile,
`CredentialsList.vue` will branch to a new `CredentialListRow.vue` (icon +
title + up to 2 highlight fields) instead of the full `CredentialCardBundle`;
desktop keeps the card bundle unchanged.

`CredentialDashboard.vue` gets a category chip band, `matchMedia`-scoped like
the rest of this pass, derived from the credential types actually present
(auto-generated, not curated) -- and its manual refresh button
(`fas fa-sync-alt`, currently wired to `emit('refresh')` ->
`HomePage.vue`'s `getCredentials()`) is replaced by pull-to-refresh on mobile,
reusing the same `refresh` event.

### The dialog-lift decision
`CredentialCardBundle.vue` currently owns its own `showDetails` dialog state
per row (`toggleDetailsWindow()`, `<q-dialog v-model="showDetails">`). Since
`CredentialListRow.vue` is a **new, separate** component (chosen over adding
a compact mode to `CredentialCardBundle.vue`, to avoid file collisions with
Benjamin's in-flight PR #137 edits to that file), it has no dialog to open.

Fix: lift a single `<credential-details>` dialog instance up to
`CredentialDashboard.vue`, holding `selectedCredential`/`showDetails` state
there instead of per-row. Both `CredentialListRow` (mobile) and
`CredentialCardBundle` (desktop, once it forwards its own click instead of
opening its own dialog) emit a `select` event with the credential; the
dashboard decides what to do with it.

This is also the interface seam for Benjamin's router work: today
`select` -> `showDetails.value = true`; once his route exists, that handler
becomes `select` -> `router.push({name: 'credential', params: {id}})`. No
further change needed on this side when that lands.

## Technical Approach

### Data Model
No new backend model. Same decrypted credential store already consumed via
`getCredentialStore()` (`@bedrock/web-wallet`, backed by
`bedrock-web-wallet/lib/state.js` + `CredentialStore.js`). Category grouping
derives from each credential's existing `type`.

### Platform Targets
Mobile-width `matchMedia` breakpoint inside `bedrock-vue-wallet` (web only).
`bedrock-rn-wallet` (the native app) is untouched.

### Patterns & Reuse
- `matchMedia`-driven breakpoint pattern from PR #137 (not Quasar's
  `$q.screen`, per that PR's own reasoning).
- `cardDesigns.js` matcher system (styles/overrides/highlights) already
  used by `CredentialCardBundle.vue`'s `getCredentialConfig()` -- extracted
  into a shared composable so `CredentialListRow.vue` can reuse the same
  matching logic without duplicating it.
- Dead code found and removed as part of this pass: `CredentialDashboard.vue`
  has an unused `filteredProfiles` ref + `filtered-profiles` emit (profile
  filtering, not credential-type filtering) with no consumer anywhere --
  not reusable for the category band, just dead weight.

### Dependencies
None new. Everything lives inside `bedrock-vue-wallet` (consumed by
`veres-wallet` via the existing `@bedrock/vue-wallet` symlink).

### Performance
Batch-first initial load is a stretch goal (see Anti-Goals) -- tracked
separately, not blocking this PRD.

## Coordination with Benjamin's track
Benjamin owns converting the credential-detail dialog to a real routed page
(`bedrock-vue-wallet/lib/router.js` + `CredentialDetails.vue`/
`CredentialCardBundle.vue`). This PRD's only contract with that work is the
`select` event described above -- no shared files are edited by both tracks,
so no merge coordination is required before either side starts.

## Atomic Task Table (TDD order)

| ID | Phase | Task | Type | Agent | Deps | Est |
|----|-------|------|------|-------|------|-----|
| F01 | 0 | Remove dead `filteredProfiles` ref/watch/emit from `CredentialDashboard.vue` | fix | haiku | [] | 15m |
| T02 | 0 | Write tests: a single lifted `<credential-details>` dialog in `CredentialDashboard.vue` opens with the right credential on a `select` event from a child | test | sonnet | [] | 30m |
| V02 | 0 | Implement the dialog lift: `selectedCredential`/`showDetails` state in `CredentialDashboard.vue`, listens for `select` | view | sonnet | [T02] | 45m |
| T03 | 1 | Write tests: `credentialCategories` computed (auto-derived from types present) + `activeCategory` filtering composes correctly with the existing search filter | test | haiku | [] | 30m |
| V03 | 1 | Implement the category chip band UI + `activeCategory` state in `CredentialDashboard.vue` | view | sonnet | [T03] | 45m |
| T04 | 2 | Write tests: `CredentialListRow.vue` renders icon/title/<=2 highlight fields from a credential's `cardDesigns` config, truncates extra fields, emits `select` on click | test | sonnet | [] | 30m |
| V04 | 2 | Implement `CredentialListRow.vue`; extract the `cardDesigns` matching logic out of `CredentialCardBundle.vue`'s `getCredentialConfig()` into a shared composable used by both | view | sonnet | [T04] | 1h |
| T05 | 2 | Write tests: `CredentialsList.vue` renders `CredentialListRow` at mobile `matchMedia` width, `CredentialCardBundle` at desktop width | test | sonnet | [] | 30m |
| W05 | 2 | Wire `CredentialsList.vue`'s `matchMedia` branch; bubble `select` up to `CredentialDashboard.vue` | wiring | sonnet | [T05, V04, V02] | 45m |
| T06 | 3 | Write tests: pull gesture emits the same `refresh` event the sync button emits today; manual refresh button is gone on mobile | test | haiku | [] | 20m |
| W06 | 3 | Replace the manual refresh button with pull-to-refresh on mobile, reusing the existing `refresh` emit consumed by `HomePage.vue`'s `getCredentials()` | wiring | sonnet | [T06] | 45m |
| D07 | 3 | PR description: name the 4 disclosure points (dialog lift, category band, list row + composable extraction, pull-to-refresh), the deferred batch-load FIXME, and the `select`-event seam for Benjamin's router work | docs | haiku | [W05, W06, V03] | 20m |

## Verification
- [ ] All tasks complete
- [ ] All test tasks written before implementation
- [ ] All tests passing after implementation
- [ ] Manual smoke test on mobile-width viewport: category chips filter the
      list, tapping a row opens the (lifted) detail dialog, pull-to-refresh
      re-fetches, desktop layout unchanged
- [ ] Manu + Benjamin review before merge

## Priority & Timeline
Must-have (Friday 2026-08-07): F01, V02, V03, V04/W05, W06.
Stretch, not blocking: batch-first initial load (`HomePage.vue`
`getCredentials()`, lines 64-100 -- tracked as a separate backlog item, not
in this workplan).

## Implementation note
Split into PRs of <=400 lines at push time. Natural seam: dialog-lift +
category band as one PR, list-row + pull-to-refresh as a second.
