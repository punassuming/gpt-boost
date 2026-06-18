# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- Fixed infinite oscillation between adjacent virtualization boundary counts (e.g. rendered=10 ↔ rendered=11): the mutation observer now ignores the extension's own article↔spacer DOM swaps, so converting an article to a spacer (or vice versa) no longer re-triggers `scheduleVirtualization` and causes a feedback loop.
- Removed spurious right-side gap: extension floating controls (search, download, scroll buttons) no longer shift left when ChatGPT's native TOC is present, since the two are at different vertical positions and do not overlap.
- Native TOC hover tooltips now anchor to the left edge of the hovered button instead of a fixed viewport offset, preventing them from overlapping the virtualization indicator or the TOC dash lines. Font size reduced to 11px.
- Search now finds matches across all messages, including those ChatGPT has content-lightened off-screen. Text is captured on each article's dataset at the moment of first virtualId assignment (while the article still has full content), and the search index uses this cache as its primary text source instead of the potentially-stripped live DOM.

### Changed
- Extension minimap panel is now suppressed when ChatGPT's native TOC sidebar is detected, deferring scroll navigation to the native control instead of overlapping it.
- ChatGPT's native TOC prompt buttons are enhanced with hover tooltips showing a preview of each user message, pulled from the extension's article map.
- Extension floating controls (scroll, search, download buttons) now shift left automatically to avoid overlapping ChatGPT's native TOC sidebar.

### Fixed
- Mutation observer now ignores ChatGPT's in-place markdown content swaps (SPAN/BR/H4 node replacements used for progressive rendering), preventing constant `scheduleVirtualization` thrashing that occurred whenever ChatGPT updated rendered content inside articles.
- Articles that still have active ChatGPT streaming markers (`data-start` attributes) are no longer converted to spacers mid-stream, preventing incomplete/stale content from being frozen into the spacer cache.

## [1.0.22] - 2026-04-04
### Changed
- Release pipeline workflow (`bump-manifest-version.yml`) now supports manual triggering via `workflow_dispatch` with a `bump_type` input (`patch`, `minor`, `major`, defaulting to `patch`).

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

[Unreleased]: https://github.com/punassuming/gpt-boost/compare/v1.0.22...HEAD
[1.0.16]: https://github.com/punassuming/gpt-boost/releases/tag/v1.0.16
[1.0.17]: https://github.com/punassuming/gpt-boost/compare/v1.0.16...v1.0.17
[1.0.18]: https://github.com/punassuming/gpt-boost/compare/v1.0.17...v1.0.18
[1.0.19]: https://github.com/punassuming/gpt-boost/compare/v1.0.18...v1.0.19
[1.0.20]: https://github.com/punassuming/gpt-boost/compare/v1.0.19...v1.0.20
[1.0.21]: https://github.com/punassuming/gpt-boost/compare/v1.0.20...v1.0.21
[1.0.22]: https://github.com/punassuming/gpt-boost/compare/v1.0.21...v1.0.22
