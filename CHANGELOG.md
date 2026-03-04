# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Release pipeline now correctly extracts `[Unreleased]` changelog content even when it is the last section in the file (replaced invalid `\Z` JavaScript regex anchor with a string-based approach).
- PR CI check now validates that the `[Unreleased]` section contains actual content, not just that `CHANGELOG.md` was modified — preventing releases from showing "No changelog entry."

## [1.0.18] - 2026-03-03
### Changed
- See PR for details.

## [1.0.17] - 2026-03-03
### Changed
- See PR for details.

## [1.0.16] - 2026-03-03
### Changed
- Initial tracked release; changelog introduced from this version onward.

[Unreleased]: https://github.com/punassuming/gpt-boost/compare/v1.0.18...HEAD
[1.0.16]: https://github.com/punassuming/gpt-boost/releases/tag/v1.0.16
[1.0.17]: https://github.com/punassuming/gpt-boost/compare/v1.0.16...v1.0.17
[1.0.18]: https://github.com/punassuming/gpt-boost/compare/v1.0.17...v1.0.18
