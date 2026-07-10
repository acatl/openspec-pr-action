# openspec-pr-action

[![CI](https://github.com/acatl/openspec-pr-action/actions/workflows/ci.yml/badge.svg)](https://github.com/acatl/openspec-pr-action/actions/workflows/ci.yml)

A GitHub Action that automatically validates OpenAPI specification files changed in a pull request and posts a summary comment with the results.

## Features

- 🔍 Detects changed OpenAPI spec files (`.yaml`, `.yml`, `.json`) in a PR
- ✅ Validates specs using [Spectral](https://stoplight.io/open-source/spectral) with the OAS recommended ruleset
- 💬 Posts (or updates) a PR comment with a detailed validation report
- ⚙️ Supports custom Spectral rulesets
- 🚦 Configurable pass/fail thresholds for errors and warnings

## Usage

Add the following step to your workflow:

```yaml
name: Validate OpenAPI Specs

on:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate OpenAPI specs
        uses: acatl/openspec-pr-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API requests and posting PR comments | Yes | `${{ github.token }}` |
| `spec-glob` | Glob pattern to identify OpenAPI spec files | No | `**/*.{yaml,yml,json}` |
| `ruleset` | Path to a custom Spectral ruleset file | No | _(built-in OAS recommended)_ |
| `fail-on-error` | Fail the action when validation errors are found | No | `true` |
| `fail-on-warning` | Fail the action when validation warnings are found | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `result` | Overall result: `passed`, `warnings`, or `failed` |
| `error-count` | Total number of validation errors found |
| `warning-count` | Total number of validation warnings found |

## Examples

### Custom spec glob

```yaml
- uses: acatl/openspec-pr-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    spec-glob: 'api/**/*.yaml'
```

### Custom Spectral ruleset

```yaml
- uses: acatl/openspec-pr-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    ruleset: '.spectral.yaml'
```

### Fail on warnings too

```yaml
- uses: acatl/openspec-pr-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    fail-on-warning: 'true'
```

### Use the outputs

```yaml
- id: validate
  uses: acatl/openspec-pr-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- run: echo "Result=${{ steps.validate.outputs.result }}, Errors=${{ steps.validate.outputs.error-count }}"
```

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Package (bundle for distribution)

```bash
npm run package
```

This uses [`@vercel/ncc`](https://github.com/vercel/ncc) to bundle the compiled TypeScript and all dependencies into a single `dist/index.js` file. **Always run this before pushing changes** so the `dist/` folder stays up to date.

## License

MIT