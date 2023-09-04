# bedrock-vue-wallet ChangeLog

## 21.1.0 - 2023-09-04

### Added
- Add option to settings page to show wallet in the browser wallet selector.

### Changed
- Move "allow wallet" feature such that it occurs during registration.

## 21.0.0 - 2023-08-21

### Changed
- **BREAKING**: Decouple `token-client-registration` from email authentication
  and remove it as a required authentication method for any account that
  successfully logs in. This means that device registration can still be
  required for accounts that are created with it as a requirement -- but only
  once and then it will be subsequently removed as a requirement. Device
  registration, if enabled, will occur after email authentication now as it
  is expected to be phased out (it is no longer a requirement to do it prior
  to email authentication). Deployments may be updated to use this version
  and expect a smooth transition that removes device registration as users
  login again over time. Deployments should also be updated to remove device
  registration as a requirement from new accounts to avoid it entirely.

## 20.1.0 - 2023-08-15

### Added
- Add refresh button to retrieve new credentials.

## 20.0.0 - 2023-08-15

### Added
- `CredentialsList.vue` now contains an option to select the VCs shared.
- `CredentialSelect.vue` is a new component that adds a selection box to VCs.
- Support and-or semantics for QueryByExample.
- Support advanced credential filtering for OpenBadgeCredentials.

## 19.0.2 - 2023-08-06

### Fixed
- Show error for exchanges that have both nothing to store and nothing
  requested.

## 19.0.1 - 2023-08-03

### Fixed
- Handle empty Verifiable Presentation from exchange; there is nothing
  to store if the properties in the VP that the wallet understands are
  not present or are empty.

## 19.0.0 - 2023-08-03

### Added
- A new notification asks the user if they want their wallet to manage
  credentials on the home page.
- A new config option `disableChapi` for disabling chapi.

### Changed
- **BREAKING**: Require node >= 18.
- Require peer dependency `@bedrock/web-wallet@11.3`.

### Fixed
- Typo in error message: occurred not occured.
- RemoveItemModel now emits a value for show.
- On initial app load, the wallet layout component will not render any route
  component until the current route in the router has been set to match
  whatever route is associated with `window.location`.

### Removed
- **BREAKING**: The CHAPI share and store routes have been consoldated to a
  single CHAPI exchange page. Existing deployments need to update their
  credential handler implementations to redirect to
  `/credential-handler/exchange` instead of `/credential-handler/share|store`.
- **BREAKING**: Credential Management prompt no longer occurs after
  registration automatically, instead, a notification message is shown that
  the user must click on to show the prompt.

## 18.0.0 - 2023-01-24

### Changed
- **BREAKING**: Update peer deps:
  - `@bedrock/web-wallet@11`.
  - This change requires `@bedrock/account@9` as an indirect peer dependency,
    which includes database layout and record format changes that are
    incompatible with previous releases.

## 17.0.2 - 2022-12-19

### Fixed
- Do not call obsolete `hints` API on credential handler polyfill.

## 17.0.1 - 2022-12-19

### Fixed
- Fix `BrRoot.vue` component file name (changed to `WalletLayout.vue`).

## 17.0.0 - 2022-12-19

### Changed
- **BREAKING**: Rename `BrRoot` component to `WalletLayout`.
- **BREAKING**: Require node >= 16.
- **BREAKING**: Use `@digitalbazaar/web-app-manifest-utils@2` which
  is now an ESM module.

## 16.0.0 - 2022-11-13

### Changed
- **BREAKING**: Use `@bedrock/web-wallet@10` to get better default safe
  mode protections for signatures, etc.

## 15.1.1 - 2022-09-22

### Fixed
- Fix share view text.

## 15.1.0 - 2022-09-14

### Added
- Add minimal support for `DIDAuthentication` queries. Existing `DIDAuth`
  queries were unaffected.

## 15.0.2 - 2022-08-22

### Fixed
- Ensure components and routes are exported.

## 15.0.1 - 2022-08-22

### Fixed
- Use `exports` in `package.json`.

## 15.0.0 - 2022-08-22

### Changed
- **BREAKING**: Update peer deps:
  - `@bedrock/quasar@9`
  - `@bedrock/vc-vue@2`
  - `@bedrock/web-wallet@9`.

## 14.0.0 - 2022-08-13

### Changed
- **BREAKING**: Require `@vueuse/core@9` peer dependency.

## 13.1.0 - 2022-08-12

### Added
- Add partial support for rendering credentials without an `id` property.

### Changed
- Require `@bedrock/web-wallet@8.2` to support credentials without an
  `id` property.

## 13.0.0 - 2022-08-08

### Changed
- **BREAKING**: Switch to using generic credential display functionality
  through the `credential-switch` component. See `@bedrock/vue-vc` for more
  information on the `credential-switch` component.

## 12.0.0 - 2022-05-30

### Changed
- **BREAKING**: Update peer deps:
  - Use `@bedrock/web-wallet@8`.

## 11.0.1 - 2022-05-28

### Fixed
- Remove obsolete `next` param from route guards.

## 11.0.0 - 2022-05-28

### Changed
- **BREAKING**: Do not automatically set authentication requirements when
  an account is registered via `Register.vue`. This version of the module
  should be combined with `@bedrock/authn-token@10.2` and a bedrock
  configuration that sets the default authentication methods for new
  accounts (to avoid the extra HTTP call to set them).

## 10.1.1 - 2022-05-26

### Fixed
- Handle case where session is undefined early.

## 10.1.0 - 2022-05-26

### Added
- Export `session` and `sessionDataRef`.

## 10.0.1 - 2022-05-26

### Fixed
- Remove erroneous and old Vue 2 async computed plugin.

## 10.0.0 - 2022-05-26

### Changed
- **BREAKING**: Require Quasar 2 and Vue 3.
- **BREAKING**: Require `@bedrock/quasar@8` and `@bedrock/vue@4`.
- **BREAKING**: Use `@vueuse/core` for computed async properties.

## 9.1.0 - 2022-05-17

### Changed
- Use profile cache, if available, when processing inbox. Update
  `@bedrock/web-wallet@7.1` peer dep to get profile cache feature.

## 9.0.0 - 2022-05-05

### Changed
- **BREAKING**: Update peer dependencies:
  - `@bedrock/web-wallet@7`.

## 8.0.0 - 2022-04-18

### Changed
- **BREAKING**: Update peer dependencies:
  - `@bedrock/web-wallet@6`.

## 7.0.2 - 2022-04-11

### Fixed
- Fix import path to have `.js` extension.

## 7.0.1 - 2022-04-11

### Fixed
- Remove broken `addConfig` API.

## 7.0.0 - 2022-04-10

### Changed
- **BREAKING**: Rename package to `@bedrock/vue-wallet`.
- **BREAKING**: Convert to module (ESM).
- **BREAKING**: Disable `rsvp` features.

## 6.0.0 - 2022-03-16

### Changed
- **BREAKING**: Replace `getRootData` async function with `rootData`
  singleton export.
- **BREAKING**: Change default local VC storage password.

### Removed
- **BREAKING**: Remove `bedrock-web-store` dependency.

## 5.0.0 - 2022-03-10

### Changed
- **BREAKING**: Use `bedrock-web-wallet@4`.

## 4.0.0 - 2022-03-08

### Changed
- **BREAKING**: Use `6` digit email codes.

## 3.0.0 - 2022-03-01

### Changed
- **BREAKING**: Require `bedrock-web-wallet@13` as a peer dependency.

## 2.0.2 - 2022-02-23

### Fixed
- Fix import of missing function.

## 2.0.1 - 2022-02-23

### Fixed
- Fix credential card bundle component code.

## 2.0.0 - 2022-02-23

### Changed
- **BREAKING**: Use `bedrock-web-wallet@2`. This package includes
  breaking changes to how encrypted indexes for EDVs are computed
  and is incompatible with previous versions.

## 1.0.1 - 2022-02-18

### Fixed
- Fix compact bundle bug.

## 1.0.0 - 2020-02-10

- See git history for changes.
