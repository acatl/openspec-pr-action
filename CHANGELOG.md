# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-07-11)


### Features

* add OpenSpec merge-guard and PR-linker composite actions ([#2](https://github.com/acatl/openspec-pr-action/issues/2)) ([1c7a2e2](https://github.com/acatl/openspec-pr-action/commit/1c7a2e2904104fd048b88b16d1e50722de56caf6))

## [Unreleased]

### Added

- `openspec-merge-guard` composite action — fails a PR that still carries an unarchived OpenSpec change.
- `openspec-pr-linker` composite action — prepends a managed "OpenSpec Changes" section to the PR body with links to each change's proposal / design / tasks.
- CI: actionlint on workflows and shellcheck on the composite `run:` blocks.
- Open-source project docs (README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, issue/PR templates, Dependabot).

[Unreleased]: https://github.com/acatl/openspec-pr-action/commits/main
