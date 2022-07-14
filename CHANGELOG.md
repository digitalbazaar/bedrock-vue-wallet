# bedrock-vue-wallet ChangeLog

## 13.0.0 - 2022-xx-xx

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
