# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Refined sidebar tool visualization with labeled icon tabs and larger click targets while keeping Search/Marks/Code as the primary sidebar tool row.
- Improved standalone minimap readability with centered marker lanes, stronger contrast, and richer content cues (user blocks, simulated text lines, and code/pre-style markers).

## [1.0.21] - 2026-03-06
### Changed
- Removed the broken Outline/Map sidebar tab button so the sidebar now shows Search, Marks, and Code tabs only.
- Increased standalone minimap panel width, strengthened edge feather masking, and added negative right margin so the larger minimap does not consume extra horizontal space.

## [1.0.20] - 2026-03-06
### Changed
- Sidebar tool tabs now distribute evenly across the full tab bar width, include an Outline tab icon, and keep Settings only in the top header action row.
- Minimap panel edges now use stronger feathered masking and blur so the minimap fades out smoothly without a hard outer border.

## [1.0.19] - 2026-03-05
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

[Unreleased]: https://github.com/punassuming/gpt-boost/compare/v1.0.21...HEAD
[1.0.16]: https://github.com/punassuming/gpt-boost/releases/tag/v1.0.16
[1.0.17]: https://github.com/punassuming/gpt-boost/compare/v1.0.16...v1.0.17
[1.0.18]: https://github.com/punassuming/gpt-boost/compare/v1.0.17...v1.0.18
[1.0.19]: https://github.com/punassuming/gpt-boost/compare/v1.0.18...v1.0.19
[1.0.20]: https://github.com/punassuming/gpt-boost/compare/v1.0.19...v1.0.20
[1.0.21]: https://github.com/punassuming/gpt-boost/compare/v1.0.20...v1.0.21
