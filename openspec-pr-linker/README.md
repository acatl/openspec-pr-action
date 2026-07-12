# OpenSpec PR Linker

A CI step that prepends a managed **"OpenSpec Changes"** section to the top of a pull request's description, linking the [OpenSpec](https://github.com/Fission-AI/OpenSpec) artifacts for the change(s) on the branch.

## What it does

Keeps a marker-delimited block at the top of the PR body in sync with the branch's OpenSpec state, so a reviewer sees — without leaving the PR — which change it carries, its task progress, and one-click links to the proposal / design / tasks.

```text
<!-- openspec-pr-linker:start -->
### OpenSpec Changes

**<change-name>** — 8/8 tasks
[proposal](…/proposal.md) · [design](…/design.md) · [tasks](…/tasks.md)
<!-- openspec-pr-linker:end -->
```

If the repository has no `openspec/config.yaml`, the step skips.

## Usage

The job needs `pull-requests: write` (it edits the PR body). Guard it to same-repo, non-Dependabot PRs — fork and Dependabot PRs get a read-only token, so the body PATCH would 403.

```yaml
jobs:
  openspec-pr-linker:
    if: >
      github.event_name == 'pull_request' &&
      github.event.pull_request.head.repo.full_name == github.repository &&
      github.event.pull_request.user.login != 'dependabot[bot]'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: acatl/openspec-pr-action/openspec-pr-linker@v1
```

The action reads the Node version from your repo's `.nvmrc`, so make sure one exists.

## Inputs

| Input              | Required | Default | Description                                              |
| ------------------ | -------- | ------- | -------------------------------------------------------- |
| `openspec-version` | No       | `1.3.1` | Version of the `@fission-ai/openspec` CLI to install (must be `N.N.N`) |

## How it works

```text
1. openspec/config.yaml missing? → skip
2. Install the OpenSpec CLI, run `openspec list --json`, fetch the PR body
3. Reconcile the managed block:
   - active change      → listed with "<done>/<total> tasks" + artifact links
   - previously-listed change now archived → flips to "archived" + archive links
   - no active changes and no block         → nothing to do
4. PATCH the PR body via `gh api` (idempotent — only the marked region changes,
   and an unchanged body skips the write entirely)
```

Only artifacts that exist on disk are linked, so a change missing `design.md` won't produce a 404 link.
