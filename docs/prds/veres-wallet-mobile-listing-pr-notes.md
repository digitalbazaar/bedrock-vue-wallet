# PR: Veres Wallet Mobile Listing Redesign

Mobile listing redesign for veres-wallet's credential dashboard: category filtering, compact row display, and pull-to-refresh, fully scoped to mobile breakpoint. Desktop layout and behavior unchanged.

## Summary of Changes

### 1. Lifted Credential-Details Dialog to `CredentialDashboard.vue` (Atomic Tasks F01, T02, V02)

**Why this change?** The new `CredentialListRow.vue` component (mobile-only) has no dialog state of its own. Rather than add dialog ownership to `CredentialListRow` or a compact mode to the existing `CredentialCardBundle` (which would collide with Benjamin's in-flight PR #137 edits), we lifted a single `<credential-details>` dialog instance to `CredentialDashboard.vue`. Both `CredentialListRow` (mobile) and `CredentialCardBundle` (desktop) now emit a `select` event; the dashboard listens and controls the dialog.

**What changed:**
- `CredentialDashboard.vue`: Added `selectedCredential` and `showDetails` state (lines 49–50). Lifted the `<q-dialog>` wrapper holding `<credential-details>` from per-row to dashboard level (lines 83–97). Listens for `select` events from child components (line 66).
- Dead-code removal: Removed unused `filteredProfiles` ref, `filtered-profiles` emit, and associated watcher from `CredentialDashboard.vue` that had no consumer anywhere.

**Desktop behavior:** Unchanged. `CredentialCardBundle` still renders and responds to clicks exactly as before (via the `select` event seam — see coordination section below).

### 2. Category Chip Band — Auto-Generated from Credential Types (Atomic Tasks T03, V03)

**Why this change?** Mobile users need a quick way to filter credentials by type (e.g., "All", "UniversityDegree", "EmploymentCredential"). The category band is auto-generated from the types present in the credential set (not curated), keeping the feature lightweight and maintenance-free.

**What changed:**
- `CredentialDashboard.vue`: Added `activeCategory` state and `credentialCategories` computed (filters live credential types), visible only on mobile and only when >1 category exists (lines 32–54).
- Category chips use the existing `search` and `activeCategory` filters in tandem to narrow the credential list.

**Desktop behavior:** Category chip band does not appear; search remains the only filter.

### 3. New `CredentialListRow.vue` Component + Shared `cardDesigns` Composable Extraction (Atomic Tasks T04, V04)

**Why this change?** Mobile needs a compact row layout (icon + title + ≤2 highlight fields) instead of the full card. To avoid duplicating the credential-matching and highlight logic, we extracted `getCredentialConfig()` and `getHighlights()` into a shared composable (`lib/useCredentialCardConfig.js`) that both `CredentialListRow` and `CredentialCardBundle` use.

**What changed:**
- `CredentialListRow.vue`: New component rendering a compact row. Uses the same `getCredentialConfig()` matcher and `getHighlights()` formatter that `CredentialCardBundle` uses to pull icon, title, and up to 2 highlight fields from the credential's `cardDesigns` config. Emits `select` on click with the credential record.
- `lib/useCredentialCardConfig.js`: New composable exporting `getCredentialConfig()` and `getHighlights()`, extracted from `CredentialCardBundle.vue`'s logic. Both components now import and call these functions.
- `CredentialCardBundle.vue`: No visual or behavioral changes; still renders the full card. Now uses the shared `getCredentialConfig()` instead of its own copy.

**Desktop behavior:** `CredentialCardBundle` renders exactly as before, with no change to styling, spacing, or interaction. The shared helper extraction is invisible to the user.

### 4. Pull-to-Refresh Replaces Manual Refresh Button on Mobile (Atomic Tasks T06, W06)

**Why this change?** Mobile UX prefers pull-to-refresh over a manual sync button. The button is hidden on mobile (`v-if="!isMobile"`); the pull gesture emits the same `refresh` event that `HomePage.vue`'s `getCredentials()` already consumes.

**What changed:**
- `CredentialDashboard.vue`: Manual refresh button hidden on mobile (line 22). Pull-to-refresh gesture wraps the credentials list on mobile (lines 55–68), emits the same `refresh` event (line 58).
- `CredentialsList.vue`: Wiring to bubble the `select` event and respect the `isMobile` breakpoint (lines 81–83).

**Desktop behavior:** Manual refresh button remains visible and functional.

## Known Scope & Coordination

### Batch-First Initial Load — Out of Scope

`HomePage.vue` (lines 67–70) has a known FIXME: the component pulls **all** displayable credentials for every profile on load, rather than implementing pagination. This is a known inefficiency and was preserved unchanged during this refactoring. Fixing this properly requires an EDV `.find()` pagination investigation and is tracked as a separate backlog item, not part of this PRD.

### `select`-Event Seam for Benjamin's Router Work

The lifted dialog listens for `select` events from child rows/cards and currently does:
```javascript
// CredentialDashboard.vue
onSelect(credentialRecord) {
  selectedCredential.value = credentialRecord;
  showDetails.value = true;
}
```

Once Benjamin's router work lands (credential details as a routed page), this handler becomes:
```javascript
onSelect(credentialRecord) {
  router.push({name: 'credential', params: {id: credentialRecord.credential.id}});
}
```

**No further changes needed on this side.** The seam is in place; Benjamin's implementation plugs in here.

## Verification Checklist

- [x] All atomic tasks complete and tests passing
- [x] Mobile-width viewport: category chips filter the list, tapping a row opens the lifted detail dialog
- [x] Pull-to-refresh gesture re-fetches credentials (emits `refresh` event)
- [x] Desktop layout unchanged: `CredentialCardBundle` renders and behaves identically
- [x] Dialog lift does not break `CredentialCardBundle` or `CredentialDashboard` interaction model
- [x] Shared `cardDesigns` composable logic is correct (used by both `CredentialListRow` and `CredentialCardBundle`)

## Split & Merge Strategy

This branch is split into two PRs:
1. **PR 1**: Dialog lift + category band (V02, V03, F01 tasks)
2. **PR 2**: List row + pull-to-refresh (V04, W05, W06 tasks)

Both land together for functional completeness before Manu and Benjamin's Friday review.
