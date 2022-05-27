# bedrock-vue-wallet ChangeLog

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
